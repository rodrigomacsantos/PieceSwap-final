
-- 1. Drop overly permissive SELECT policy on profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- 2. New SELECT policy: owner or admin only on base table
CREATE POLICY "Owner or admin can read profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id OR public.is_admin_user(auth.uid()));

-- 3. Public-safe view (security_invoker so the caller's RLS does not apply to base table; we want anyone to read)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT
  id,
  username,
  full_name,
  avatar_url,
  bio,
  location,
  rating,
  total_ratings,
  is_verified,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 4. Helper for owner to fetch own full profile (avoids select-all from base table being restricted)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 5. Restrict storage.objects listing on listings_images bucket
DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;

CREATE POLICY "Owners and admins can list their listing images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'listings_images'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.is_admin_user(auth.uid())
  )
);
-- Note: the bucket remains public so direct file URLs at /storage/v1/object/public/listings_images/... continue to work.
