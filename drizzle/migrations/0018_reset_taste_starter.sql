CREATE OR REPLACE FUNCTION public.reset_taste()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  DELETE FROM public.swipes WHERE user_id = _uid;
  DELETE FROM public.swipe_receipts WHERE user_id = _uid;
  DELETE FROM public.tag_weights WHERE user_id = _uid;
  DELETE FROM public.taste_events WHERE user_id = _uid;
  DELETE FROM public.user_taste WHERE user_id = _uid;
  DELETE FROM public.user_taste_overrides WHERE user_id = _uid;
  DELETE FROM public.user_taste_portrait WHERE user_id = _uid;
  DELETE FROM public.user_facet_stats WHERE user_id = _uid;
  UPDATE public.profiles
  SET onboarded = false, swipe_no = 0, taste_baseline = NULL
  WHERE id = _uid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reset_taste() TO authenticated;