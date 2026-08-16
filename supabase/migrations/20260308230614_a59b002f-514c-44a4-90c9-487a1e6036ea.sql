
-- Add pending_swap_coins to profiles for escrow
ALTER TABLE profiles ADD COLUMN pending_swap_coins integer NOT NULL DEFAULT 0;

-- Rewrite process_purchase with escrow + commission
CREATE OR REPLACE FUNCTION public.process_purchase(p_buyer_id uuid, p_seller_id uuid, p_listing_id uuid, p_amount integer, p_shipping_address jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_buyer_balance integer;
  v_listing_status text;
  v_commission_rate numeric := 0.05;
  v_commission_amount numeric;
  v_seller_amount integer;
BEGIN
  -- Check listing is active
  SELECT status INTO v_listing_status FROM listings WHERE id = p_listing_id;
  IF v_listing_status IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF v_listing_status != 'active' THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;

  -- Check buyer balance
  SELECT swap_coins INTO v_buyer_balance FROM profiles WHERE id = p_buyer_id;
  IF v_buyer_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient SwapCoins balance';
  END IF;

  -- Calculate commission (5%)
  v_commission_amount := ROUND(p_amount * v_commission_rate);
  v_seller_amount := p_amount - v_commission_amount;

  -- Debit buyer immediately
  UPDATE profiles SET swap_coins = swap_coins - p_amount WHERE id = p_buyer_id;

  -- Add to seller's PENDING balance (not real balance) — minus commission
  UPDATE profiles SET pending_swap_coins = pending_swap_coins + v_seller_amount WHERE id = p_seller_id;

  -- Create order
  INSERT INTO orders (buyer_id, seller_id, listing_id, amount_swapcoins, shipping_address)
  VALUES (p_buyer_id, p_seller_id, p_listing_id, p_amount, p_shipping_address)
  RETURNING id INTO v_order_id;

  -- Record commission
  INSERT INTO sales_commissions (listing_id, seller_id, buyer_id, sale_price_eur, commission_rate, commission_amount, status)
  VALUES (p_listing_id, p_seller_id, p_buyer_id, p_amount, v_commission_rate, v_commission_amount, 'pending');

  -- Mark listing as sold
  UPDATE listings SET status = 'sold' WHERE id = p_listing_id;

  RETURN v_order_id;
END;
$function$;

-- New function: complete order — release escrow to seller
CREATE OR REPLACE FUNCTION public.complete_order(p_order_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_seller_amount integer;
  v_commission_amount integer;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.buyer_id != p_user_id THEN
    RAISE EXCEPTION 'Only the buyer can confirm receipt';
  END IF;
  IF v_order.status != 'shipped' THEN
    RAISE EXCEPTION 'Order can only be completed when shipped';
  END IF;

  -- Calculate amounts
  v_commission_amount := ROUND(v_order.amount_swapcoins * 0.05);
  v_seller_amount := v_order.amount_swapcoins - v_commission_amount;

  -- Move from pending to real balance
  UPDATE profiles SET 
    pending_swap_coins = pending_swap_coins - v_seller_amount,
    swap_coins = swap_coins + v_seller_amount
  WHERE id = v_order.seller_id;

  -- Update order status
  UPDATE orders SET status = 'completed' WHERE id = p_order_id;

  -- Update commission status
  UPDATE sales_commissions SET status = 'collected' WHERE listing_id = v_order.listing_id AND seller_id = v_order.seller_id;
END;
$function$;

-- Rewrite cancel_order for escrow
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_seller_amount integer;
  v_commission_amount integer;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.buyer_id != p_user_id THEN
    RAISE EXCEPTION 'Only the buyer can cancel';
  END IF;
  IF v_order.status != 'pending' THEN
    RAISE EXCEPTION 'Order can only be cancelled when pending';
  END IF;

  -- Calculate seller pending amount
  v_commission_amount := ROUND(v_order.amount_swapcoins * 0.05);
  v_seller_amount := v_order.amount_swapcoins - v_commission_amount;

  -- Refund buyer full amount
  UPDATE profiles SET swap_coins = swap_coins + v_order.amount_swapcoins WHERE id = v_order.buyer_id;

  -- Remove from seller's pending balance
  UPDATE profiles SET pending_swap_coins = pending_swap_coins - v_seller_amount WHERE id = v_order.seller_id;

  -- Update order status
  UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;

  -- Cancel commission
  UPDATE sales_commissions SET status = 'cancelled' WHERE listing_id = v_order.listing_id AND seller_id = v_order.seller_id;

  -- Reactivate listing
  UPDATE listings SET status = 'active' WHERE id = v_order.listing_id;
END;
$function$;
