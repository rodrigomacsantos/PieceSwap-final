CREATE OR REPLACE FUNCTION public.deduct_boost_coins(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_balance integer;
BEGIN
  SELECT swap_coins INTO v_balance FROM profiles WHERE id = p_user_id;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  UPDATE profiles SET swap_coins = swap_coins - p_amount WHERE id = p_user_id;
END;
$$;