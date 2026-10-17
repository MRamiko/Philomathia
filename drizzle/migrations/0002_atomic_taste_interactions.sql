ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS taste_baseline jsonb;
CREATE TABLE public.taste_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, item_id uuid REFERENCES public.items(id), kind text NOT NULL, tags text[] NOT NULL DEFAULT '{}', delta numeric NOT NULL DEFAULT 0, decay numeric NOT NULL DEFAULT 1, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taste_events TO authenticated;
GRANT ALL ON public.taste_events TO service_role;
ALTER TABLE public.taste_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own taste events" ON public.taste_events FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.replay_taste() RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE e record; b jsonb;
BEGIN
SELECT taste_baseline INTO b FROM profiles WHERE id=auth.uid();
DELETE FROM tag_weights WHERE user_id=auth.uid();
INSERT INTO tag_weights(user_id,tag,weight) SELECT auth.uid(),key,value::numeric FROM jsonb_each_text(coalesce(b,'{}'));
FOR e IN SELECT * FROM taste_events WHERE user_id=auth.uid() AND active ORDER BY created_at,id LOOP
UPDATE tag_weights SET weight=weight*e.decay,updated_at=now() WHERE user_id=auth.uid();
PERFORM bump_tags(e.tags,e.delta);
END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.taste_action(_item uuid,_kind text,_value jsonb,_rules jsonb) RETURNS boolean LANGUAGE plpgsql SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); i items; old_log logs; old_swipe swipes; tags text[]; delta numeric:=0; old_delta numeric:=0; changed boolean:=true; decay numeric:=coalesce((_rules->>'DECAY')::numeric,0.97);
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
PERFORM 1 FROM profiles WHERE id=uid FOR UPDATE;
UPDATE profiles SET taste_baseline=(SELECT coalesce(jsonb_object_agg(tag,weight),'{}') FROM tag_weights WHERE user_id=uid) WHERE id=uid AND taste_baseline IS NULL;
IF _item IS NOT NULL THEN SELECT * INTO STRICT i FROM items WHERE id=_item; tags:=ARRAY(SELECT DISTINCT lower(t) FROM unnest(i.genres||i.mood_tags||i.keywords) t)||ARRAY['creator:'||i.creator]; END IF;
IF _kind IN ('like','pass') THEN
SELECT * INTO old_swipe FROM swipes WHERE user_id=uid AND item_id=_item;
IF FOUND THEN RETURN false; END IF;
INSERT INTO swipes(user_id,item_id,action) VALUES(uid,_item,_kind);
delta:=CASE WHEN _kind='like' THEN (_rules->>'LIKE_DELTA')::numeric ELSE (_rules->>'PASS_DELTA')::numeric END;
ELSIF _kind='undo' THEN
SELECT * INTO old_swipe FROM swipes WHERE user_id=uid AND item_id=_item;
IF NOT FOUND THEN RETURN false; END IF;
DELETE FROM swipes WHERE user_id=uid AND item_id=_item;
UPDATE taste_events SET active=false WHERE user_id=uid AND item_id=_item AND kind IN ('like','pass') AND active;
IF NOT FOUND THEN
UPDATE profiles SET taste_baseline=coalesce(taste_baseline,'{}') WHERE id=uid;
FOR old_log IN SELECT * FROM logs WHERE false LOOP END LOOP;
UPDATE tag_weights SET weight=weight-CASE WHEN old_swipe.action='like' THEN (_rules->>'LIKE_DELTA')::numeric ELSE (_rules->>'PASS_DELTA')::numeric END WHERE user_id=uid AND tag=ANY(tags);
UPDATE profiles SET taste_baseline=(SELECT coalesce(jsonb_object_agg(tag,weight),'{}') FROM tag_weights WHERE user_id=uid) WHERE id=uid;
END IF;
PERFORM replay_taste(); RETURN true;
ELSIF _kind='log' THEN
SELECT * INTO old_log FROM logs WHERE user_id=uid AND item_id=_item;
IF FOUND AND old_log.status=_value->>'status' AND old_log.rating IS NOT DISTINCT FROM (_value->>'rating')::numeric AND old_log.review IS NOT DISTINCT FROM _value->>'review' THEN RETURN false; END IF;
IF (_value->>'status') NOT IN ('want','in_progress','seen') OR ((_value->>'rating')::numeric NOT BETWEEN 0.5 AND 5) THEN RAISE EXCEPTION 'Invalid diary entry'; END IF;
IF old_log.status='seen' THEN old_delta:=CASE WHEN old_log.rating>=4 THEN (_rules->>'HIGH_RATING_DELTA')::numeric WHEN old_log.rating<=2 THEN (_rules->>'LOW_RATING_DELTA')::numeric ELSE 0 END; END IF;
IF _value->>'status'='seen' THEN delta:=CASE WHEN (_value->>'rating')::numeric>=4 THEN (_rules->>'HIGH_RATING_DELTA')::numeric WHEN (_value->>'rating')::numeric<=2 THEN (_rules->>'LOW_RATING_DELTA')::numeric ELSE 0 END; END IF;
delta:=delta-old_delta;
INSERT INTO logs(user_id,item_id,status,rating,review,logged_at) VALUES(uid,_item,_value->>'status',(_value->>'rating')::numeric,_value->>'review',now()) ON CONFLICT(user_id,item_id) DO UPDATE SET status=EXCLUDED.status,rating=EXCLUDED.rating,review=EXCLUDED.review,logged_at=now();
ELSIF _kind='remove_log' THEN
DELETE FROM logs WHERE user_id=uid AND item_id=_item; IF NOT FOUND THEN RETURN false; END IF;
UPDATE taste_events SET active=false WHERE user_id=uid AND item_id=_item AND kind='log'; PERFORM replay_taste(); RETURN true;
ELSIF _kind='onboard' THEN
IF EXISTS(SELECT 1 FROM taste_events WHERE user_id=uid AND kind='onboard') THEN RETURN false; END IF;
tags:=ARRAY(SELECT jsonb_array_elements_text(_value->'tags')); delta:=(_rules->>'ONBOARD_DELTA')::numeric; decay:=1;
ELSIF _kind IN ('reset','wipe') THEN
DELETE FROM swipes WHERE user_id=uid; DELETE FROM taste_events WHERE user_id=uid; DELETE FROM tag_weights WHERE user_id=uid;
UPDATE profiles SET taste_baseline='{}' WHERE id=uid;
IF _kind='wipe' THEN DELETE FROM logs WHERE user_id=uid; UPDATE profiles SET preferred_language='en',avoided_genres='{}',onboarded=false WHERE id=uid; END IF;
RETURN true;
ELSE RAISE EXCEPTION 'Invalid action'; END IF;
INSERT INTO taste_events(user_id,item_id,kind,tags,delta,decay) VALUES(uid,_item,_kind,tags,delta,decay);
PERFORM replay_taste(); RETURN changed;
END $$;
GRANT EXECUTE ON FUNCTION public.taste_action(uuid,text,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replay_taste() TO authenticated;