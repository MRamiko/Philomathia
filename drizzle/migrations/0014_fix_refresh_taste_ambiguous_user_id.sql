CREATE OR REPLACE FUNCTION public.refresh_taste(user_id uuid DEFAULT auth.uid())
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n integer; top_values text; away text;
BEGIN IF auth.uid() IS NULL OR user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
SELECT swipe_no INTO n FROM profiles WHERE id=refresh_taste.user_id;
DELETE FROM user_taste t WHERE t.user_id=refresh_taste.user_id;
INSERT INTO user_taste(user_id,media_type,facet,value,stance,confidence_level,importance,defining)
WITH decayed AS (SELECT s.*,s.exposures_ew*power(0.5,(n-last_swipe_no)/40.0) e,(s.likes_ew+0.5*s.strong_ew)*power(0.5,(n-last_swipe_no)/40.0) l FROM user_facet_stats s WHERE s.user_id=refresh_taste.user_id),base AS (SELECT media_type,least(1.0,sum(l)/greatest(1,sum(e))) b FROM decayed WHERE facet='genre' GROUP BY media_type),rates AS (SELECT d.*,coalesce(b.b,0.5) baseline,least(1.0,(l+4*coalesce(b.b,0.5))/(e+4)) rate FROM decayed d LEFT JOIN base b USING(media_type)),spread AS (SELECT media_type,facet,greatest(0.05,(max(rate)-min(rate))*least(1,sum(e)/10)) importance FROM rates GROUP BY media_type,facet)
SELECT refresh_taste.user_id,r.media_type,r.facet,r.value,CASE WHEN o.stance='love' THEN 'loves' WHEN o.stance='avoid' THEN 'avoids' WHEN e<3 THEN 'exploring' WHEN rate-baseline>=0.2 THEN 'loves' WHEN rate-baseline>=0.06 THEN 'leans_toward' WHEN rate-baseline<=-0.2 THEN 'avoids' WHEN rate-baseline<=-0.06 THEN 'leans_away' ELSE 'neutral' END,CASE WHEN e<3 THEN 'exploring' WHEN e<6 THEN 'emerging' WHEN e<15 THEN 'established' ELSE 'strong' END,s.importance,(rate>baseline+0.06 AND (SELECT count(DISTINCT g) FROM swipes sw JOIN items i ON i.id=sw.item_id JOIN item_facets f ON f.item_id=i.id CROSS JOIN LATERAL unnest(i.genres) g WHERE sw.user_id=refresh_taste.user_id AND sw.action='like' AND f.facet=r.facet AND f.value=r.value AND i.media_type=r.media_type)>=3) FROM rates r JOIN spread s USING(media_type,facet) LEFT JOIN user_taste_overrides o ON o.user_id=refresh_taste.user_id AND o.facet=r.facet AND o.value=r.value;
SELECT string_agg(replace(value,'_',' '),', ') INTO top_values FROM (SELECT DISTINCT value FROM user_taste t WHERE t.user_id=refresh_taste.user_id AND t.defining ORDER BY value LIMIT 3) q;
SELECT string_agg(replace(value,'_',' '),', ') INTO away FROM (SELECT DISTINCT value FROM user_taste t WHERE t.user_id=refresh_taste.user_id AND t.stance IN ('avoids','leans_away') ORDER BY value LIMIT 2) q;
INSERT INTO user_taste_portrait AS p(user_id,archetype,summary,swipe_no) VALUES(refresh_taste.user_id,CASE WHEN top_values IS NULL THEN 'The Curious Explorer' ELSE 'The '||initcap(top_values)||' Explorer' END,CASE WHEN top_values IS NULL THEN 'Your taste is still taking shape. Each choice helps reveal what matters to you.' ELSE 'You keep coming back to '||top_values||'.'||CASE WHEN away IS NOT NULL THEN ' You lean away from '||away||'.' ELSE '' END END,n) ON CONFLICT(user_id) DO UPDATE SET archetype=EXCLUDED.archetype,summary=EXCLUDED.summary,swipe_no=n,updated_at=now();
END $function$;