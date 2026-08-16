
CREATE OR REPLACE FUNCTION public.process_referral(p_new_user_id uuid, p_referral_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_reward_coins integer := 25;
BEGIN
  SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = UPPER(TRIM(p_referral_code));
  IF v_referrer_id IS NULL THEN RETURN false; END IF;
  IF v_referrer_id = p_new_user_id THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_new_user_id AND referred_by IS NOT NULL) THEN
    RETURN false;
  END IF;

  UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;
  UPDATE profiles SET swap_coins = swap_coins + v_referral_reward_coins WHERE id = v_referrer_id;
  UPDATE profiles SET swap_coins = swap_coins + v_referral_reward_coins WHERE id = p_new_user_id;

  -- Award 1 superlike to both
  INSERT INTO daily_superlikes (user_id, superlike_date, used_count)
  VALUES (v_referrer_id, CURRENT_DATE, -1)
  ON CONFLICT (user_id, superlike_date) DO UPDATE SET used_count = daily_superlikes.used_count - 1;

  INSERT INTO daily_superlikes (user_id, superlike_date, used_count)
  VALUES (p_new_user_id, CURRENT_DATE, -1)
  ON CONFLICT (user_id, superlike_date) DO UPDATE SET used_count = daily_superlikes.used_count - 1;

  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    v_referrer_id,
    'Referral bem-sucedido! 🎉',
    'Um amigo usou o teu código! Recebeste ' || v_referral_reward_coins || ' SwapCoins + 1 SuperLike ⭐',
    'referral',
    jsonb_build_object('referred_user_id', p_new_user_id, 'reward', v_referral_reward_coins)
  );

  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    p_new_user_id,
    'Bónus de referral! 🎁',
    'Recebeste ' || v_referral_reward_coins || ' SwapCoins + 1 SuperLike ⭐ por usares um código de referral!',
    'referral',
    jsonb_build_object('referrer_id', v_referrer_id, 'reward', v_referral_reward_coins)
  );

  RETURN true;
END;
$$;
