
CREATE OR REPLACE FUNCTION public.check_mutual_swipe(
  _user_id uuid,
  _liked_listing_id uuid
)
RETURNS TABLE(matched_listing_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _other_user_id uuid;
BEGIN
  -- Get the owner of the listing we just liked
  SELECT user_id INTO _other_user_id FROM listings WHERE id = _liked_listing_id;
  IF _other_user_id IS NULL THEN RETURN; END IF;

  -- Get our active trade listings
  -- Then check if the other user has liked any of them
  RETURN QUERY
  SELECT sa.listing_id AS matched_listing_id
  FROM swipe_actions sa
  JOIN listings l ON l.id = sa.listing_id
  WHERE sa.user_id = _other_user_id
    AND sa.action = 'like'
    AND l.user_id = _user_id
    AND l.status = 'active'
    AND l.accepts_trades = true
  LIMIT 1;
END;
$$;
