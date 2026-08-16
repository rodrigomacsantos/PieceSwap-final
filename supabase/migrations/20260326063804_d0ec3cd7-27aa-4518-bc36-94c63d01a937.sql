
-- Add referral columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid;

-- Generate referral codes for existing users
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTRING(md5(id::text || now()::text) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Make referral_code NOT NULL with a default
ALTER TABLE public.profiles ALTER COLUMN referral_code SET DEFAULT UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 8));

-- Create function to auto-generate referral code on new profile
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(md5(NEW.id::text || now()::text || random()::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Function to process referral: awards both referrer and referee
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
  -- Find referrer by code
  SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = UPPER(TRIM(p_referral_code));
  IF v_referrer_id IS NULL THEN RETURN false; END IF;
  
  -- Can't refer yourself
  IF v_referrer_id = p_new_user_id THEN RETURN false; END IF;
  
  -- Check if already referred
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_new_user_id AND referred_by IS NOT NULL) THEN
    RETURN false;
  END IF;
  
  -- Set referred_by
  UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;
  
  -- Reward both users with SwapCoins
  UPDATE profiles SET swap_coins = swap_coins + v_referral_reward_coins WHERE id = v_referrer_id;
  UPDATE profiles SET swap_coins = swap_coins + v_referral_reward_coins WHERE id = p_new_user_id;
  
  -- Notify referrer
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    v_referrer_id,
    'Referral bem-sucedido! 🎉',
    'Um amigo usou o teu código de referral! Recebeste ' || v_referral_reward_coins || ' SwapCoins.',
    'referral',
    jsonb_build_object('referred_user_id', p_new_user_id, 'reward', v_referral_reward_coins)
  );
  
  -- Notify new user
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    p_new_user_id,
    'Bónus de referral! 🎁',
    'Recebeste ' || v_referral_reward_coins || ' SwapCoins por usares um código de referral!',
    'referral',
    jsonb_build_object('referrer_id', v_referrer_id, 'reward', v_referral_reward_coins)
  );
  
  RETURN true;
END;
$$;
