
-- Function to award a badge to a user (checks duplicates, gives XP + SwapCoins)
CREATE OR REPLACE FUNCTION public.award_badge(_user_id uuid, _badge_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _badge RECORD;
  _already_has boolean;
  _new_total_xp integer;
  _new_level integer;
BEGIN
  -- Get badge info
  SELECT * INTO _badge FROM badges WHERE key = _badge_key AND is_active = true;
  IF _badge IS NULL THEN RETURN false; END IF;

  -- Check if already earned
  SELECT EXISTS (
    SELECT 1 FROM user_badges WHERE user_id = _user_id AND badge_id = _badge.id
  ) INTO _already_has;
  IF _already_has THEN RETURN false; END IF;

  -- Award badge
  INSERT INTO user_badges (user_id, badge_id) VALUES (_user_id, _badge.id);

  -- Add XP
  IF _badge.xp_reward > 0 THEN
    INSERT INTO xp_log (user_id, amount, reason) VALUES (_user_id, _badge.xp_reward, 'Badge: ' || _badge.name);
    
    INSERT INTO user_xp (user_id, total_xp, level)
    VALUES (_user_id, _badge.xp_reward, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      total_xp = user_xp.total_xp + _badge.xp_reward,
      level = FLOOR((user_xp.total_xp + _badge.xp_reward) / 100) + 1,
      updated_at = now();
  END IF;

  -- Add SwapCoins
  IF _badge.swapcoins_reward > 0 THEN
    UPDATE profiles SET swap_coins = swap_coins + _badge.swapcoins_reward WHERE id = _user_id;
  END IF;

  RETURN true;
END;
$$;

-- Function to check and award badges based on user stats
CREATE OR REPLACE FUNCTION public.check_user_badges(_user_id uuid)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      WHEN 'first_login' THEN
        _count := 1; -- User is logged in, so they qualify
      WHEN 'listings_created' THEN
        SELECT COUNT(*) INTO _count FROM listings WHERE user_id = _user_id;
      WHEN 'purchases_made' THEN
        SELECT COUNT(*) INTO _count FROM orders WHERE buyer_id = _user_id AND status != 'cancelled';
      WHEN 'sales_made' THEN
        SELECT COUNT(*) INTO _count FROM orders WHERE seller_id = _user_id AND status != 'cancelled';
      WHEN 'matches_made' THEN
        SELECT COUNT(*) INTO _count FROM matches WHERE user1_id = _user_id OR user2_id = _user_id;
      WHEN 'swipes_made' THEN
        SELECT COUNT(*) INTO _count FROM swipe_actions WHERE user_id = _user_id;
      WHEN 'messages_sent' THEN
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
$$;

-- Add unique constraint on user_xp.user_id for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_xp_user_id_key'
  ) THEN
    ALTER TABLE user_xp ADD CONSTRAINT user_xp_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Add unique constraint on daily_streaks.user_id for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_streaks_user_id_key'
  ) THEN
    ALTER TABLE daily_streaks ADD CONSTRAINT daily_streaks_user_id_key UNIQUE (user_id);
  END IF;
END $$;
