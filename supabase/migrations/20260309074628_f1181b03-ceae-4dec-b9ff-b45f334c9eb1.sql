CREATE OR REPLACE FUNCTION public.check_user_badges(_user_id uuid)
 RETURNS SETOF text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _badge RECORD;
  _count integer;
  _awarded boolean;
  _profile RECORD;
BEGIN
  SELECT * INTO _profile FROM profiles WHERE id = _user_id;

  FOR _badge IN SELECT * FROM badges WHERE is_active = true LOOP
    -- Skip if already earned
    IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = _user_id AND badge_id = _badge.id) THEN
      CONTINUE;
    END IF;

    _count := 0;

    CASE _badge.requirement_type
      WHEN 'first_login', 'login_count' THEN
        _count := 1; -- User is logged in, so they qualify
      WHEN 'listings_created', 'listings_count' THEN
        SELECT COUNT(*) INTO _count FROM listings WHERE user_id = _user_id;
      WHEN 'purchases_made', 'purchases_count' THEN
        SELECT COUNT(*) INTO _count FROM orders WHERE buyer_id = _user_id AND status != 'cancelled';
      WHEN 'sales_made', 'sales_count' THEN
        SELECT COUNT(*) INTO _count FROM orders WHERE seller_id = _user_id AND status != 'cancelled';
      WHEN 'matches_made' THEN
        SELECT COUNT(*) INTO _count FROM matches WHERE user1_id = _user_id OR user2_id = _user_id;
      WHEN 'swipes_made' THEN
        SELECT COUNT(*) INTO _count FROM swipe_actions WHERE user_id = _user_id;
      WHEN 'messages_sent', 'messages_count' THEN
        SELECT COUNT(*) INTO _count FROM messages WHERE sender_id = _user_id;
      WHEN 'streak_days' THEN
        SELECT COALESCE(current_streak, 0) INTO _count FROM daily_streaks WHERE user_id = _user_id;
      WHEN 'profile_complete' THEN
        IF _profile.avatar_url IS NOT NULL AND _profile.bio IS NOT NULL AND _profile.location IS NOT NULL 
           AND _profile.avatar_url != '' AND _profile.bio != '' AND _profile.location != '' THEN
          _count := 1;
        END IF;
      ELSE
        _count := 0;
    END CASE;

    IF _count >= _badge.requirement_value THEN
      SELECT public.award_badge(_user_id, _badge.key) INTO _awarded;
      IF _awarded THEN
        RETURN NEXT _badge.name;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$function$;