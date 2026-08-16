
-- Restore Data API grants lost in earlier hardening migration
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- public_profiles view: safe subset, readable by everyone (anon + authenticated)
GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;
