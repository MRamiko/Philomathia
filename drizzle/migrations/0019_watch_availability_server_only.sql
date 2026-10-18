DROP POLICY IF EXISTS watch_read ON public.watch_availability;
REVOKE SELECT ON public.watch_availability FROM anon, authenticated;
GRANT ALL ON public.watch_availability TO service_role;