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
UPDATE profiles SET taste_baseline=(
 SELECT coalesce(jsonb_object_agg(key, CASE WHEN key=ANY(tags) THEN value::numeric-CASE WHEN old_swipe.action='like' THEN (_rules->>'LIKE_DELTA')::numeric ELSE (_rules->>'PASS_DELTA')::numeric END ELSE value::numeric END),'{}')
 FROM jsonb_each_text(coalesce(taste_baseline,'{}'))
) WHERE id=uid;
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
SELECT * INTO old_log FROM logs WHERE user_id=uid AND item_id=_item;
IF NOT FOUND THEN RETURN false; END IF;
DELETE FROM logs WHERE user_id=uid AND item_id=_item;
UPDATE taste_events SET active=false WHERE user_id=uid AND item_id=_item AND kind='log';
IF NOT FOUND AND old_log.status='seen' THEN
old_delta:=CASE WHEN old_log.rating>=4 THEN (_rules->>'HIGH_RATING_DELTA')::numeric WHEN old_log.rating<=2 THEN (_rules->>'LOW_RATING_DELTA')::numeric ELSE 0 END;
UPDATE profiles SET taste_baseline=(SELECT coalesce(jsonb_object_agg(key, CASE WHEN key=ANY(tags) THEN value::numeric-old_delta ELSE value::numeric END),'{}') FROM jsonb_each_text(coalesce(taste_baseline,'{}'))) WHERE id=uid;
END IF;
PERFORM replay_taste(); RETURN true;
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
CREATE UNIQUE INDEX IF NOT EXISTS items_catalog_identity ON public.items(media_type,lower(trim(title_en)),lower(trim(creator)),coalesce(year,-2147483648));