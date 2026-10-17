ALTER FUNCTION public.taste_action(uuid, text, jsonb, jsonb) SECURITY DEFINER;
ALTER FUNCTION public.replay_taste() SECURITY DEFINER;
ALTER FUNCTION public.bump_tags(text[], numeric) SECURITY DEFINER;