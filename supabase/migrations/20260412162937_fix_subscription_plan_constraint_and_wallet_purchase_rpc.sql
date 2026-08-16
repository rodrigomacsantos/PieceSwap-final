
-- 1. Remove the restrictive check constraint on plan names to allow 'Premium Plus' etc.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- 2. Add RPC for wallet purchases to bypass RLS restrictions on swap_coins column
CREATE OR REPLACE FUNCTION public.process_wallet_purchase(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Security check: users can only purchase for themselves
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot purchase SwapCoins for another user';
  END IF;

  -- Update the user's balance
  UPDATE public.profiles
  SET swap_coins = swap_coins + p_amount
  WHERE id = p_user_id;
END;
$$;
