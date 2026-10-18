CREATE OR REPLACE FUNCTION public.trait_coverage() RETURNS bigint LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$ SELECT count(*) FROM (SELECT item_id FROM item_facets GROUP BY item_id HAVING count(*)>=6) f $$; GRANT EXECUTE ON FUNCTION public.trait_coverage() TO authenticated;
CREATE OR REPLACE FUNCTION public.sync_diary_facet_evidence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid; iid uuid; media text; n integer; old_strength numeric:=0; new_strength numeric:=0;
BEGIN
IF TG_OP='DELETE' THEN uid:=OLD.user_id;iid:=OLD.item_id; ELSE uid:=NEW.user_id;iid:=NEW.item_id; END IF;
SELECT swipe_no INTO n FROM profiles WHERE id=uid FOR UPDATE; SELECT media_type INTO media FROM items WHERE id=iid;
IF TG_OP<>'INSERT' THEN old_strength:=CASE WHEN OLD.status IN ('want','in_progress') OR OLD.rating>=4 THEN 1 ELSE 0 END; END IF;
IF TG_OP<>'DELETE' THEN new_strength:=CASE WHEN NEW.status IN ('want','in_progress') OR NEW.rating>=4 THEN 1 ELSE 0 END; END IF;
IF new_strength<>old_strength THEN
INSERT INTO user_facet_stats(user_id,media_type,facet,value,strong_ew,last_swipe_no) SELECT uid,media,f.facet,f.value,new_strength,n FROM item_facets f WHERE f.item_id=iid
ON CONFLICT(user_id,media_type,facet,value) DO UPDATE SET exposures_ew=user_facet_stats.exposures_ew*power(0.5,(n-user_facet_stats.last_swipe_no)/40.0),likes_ew=user_facet_stats.likes_ew*power(0.5,(n-user_facet_stats.last_swipe_no)/40.0),passes_ew=user_facet_stats.passes_ew*power(0.5,(n-user_facet_stats.last_swipe_no)/40.0),strong_ew=greatest(0,user_facet_stats.strong_ew*power(0.5,(n-user_facet_stats.last_swipe_no)/40.0)+new_strength-old_strength),last_swipe_no=n;
END IF;
IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER logs_facet_evidence AFTER INSERT OR UPDATE OR DELETE ON public.logs FOR EACH ROW EXECUTE FUNCTION public.sync_diary_facet_evidence();