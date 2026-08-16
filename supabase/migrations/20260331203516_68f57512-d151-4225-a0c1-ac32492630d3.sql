
-- 1. Fix profile UPDATE policy to prevent self-minting of SwapCoins and manipulation of trust fields
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND swap_coins IS NOT DISTINCT FROM (SELECT swap_coins FROM public.profiles WHERE id = auth.uid())
    AND pending_swap_coins IS NOT DISTINCT FROM (SELECT pending_swap_coins FROM public.profiles WHERE id = auth.uid())
    AND is_verified IS NOT DISTINCT FROM (SELECT is_verified FROM public.profiles WHERE id = auth.uid())
    AND is_suspended IS NOT DISTINCT FROM (SELECT is_suspended FROM public.profiles WHERE id = auth.uid())
    AND rating IS NOT DISTINCT FROM (SELECT rating FROM public.profiles WHERE id = auth.uid())
    AND total_ratings IS NOT DISTINCT FROM (SELECT total_ratings FROM public.profiles WHERE id = auth.uid())
    AND suspended_at IS NOT DISTINCT FROM (SELECT suspended_at FROM public.profiles WHERE id = auth.uid())
    AND suspended_reason IS NOT DISTINCT FROM (SELECT suspended_reason FROM public.profiles WHERE id = auth.uid())
  );

-- 2. Fix conversation_participants INSERT policy
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;

CREATE POLICY "Participants can add new members"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (
      EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id 
        AND cp.user_id = auth.uid()
      )
      OR
      NOT EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
      )
    )
  );

-- 3. Fix get_nearby_users to use caller's own location
CREATE OR REPLACE FUNCTION public.get_nearby_users(
  radius_km numeric DEFAULT 50,
  max_results integer DEFAULT 20,
  user_lat numeric DEFAULT NULL,
  user_lon numeric DEFAULT NULL
)
RETURNS TABLE(id uuid, username text, full_name text, avatar_url text, location text, distance_km numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller_lat numeric;
  caller_lon numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Use caller's profile location, ignore any provided coordinates
  SELECT p.latitude, p.longitude INTO caller_lat, caller_lon
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF caller_lat IS NULL OR caller_lon IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.location,
    public.calculate_distance(caller_lat, caller_lon, p.latitude, p.longitude) as distance_km
  FROM public.profiles p
  WHERE p.id != auth.uid()
    AND p.latitude IS NOT NULL 
    AND p.longitude IS NOT NULL
    AND public.calculate_distance(caller_lat, caller_lon, p.latitude, p.longitude) <= get_nearby_users.radius_km
  ORDER BY distance_km ASC
  LIMIT get_nearby_users.max_results;
END;
$$;

-- 4. Fix storage upload policy to restrict to own folder
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;

CREATE POLICY "Users can upload to own folder only"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listings_images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
