
-- Helper function to get current commission rate from site_config
CREATE OR REPLACE FUNCTION public.get_commission_rate()
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rate numeric;
BEGIN
  SELECT (value::text)::numeric INTO v_rate
  FROM site_config WHERE key = 'marketplace_commission';
  
  IF v_rate IS NULL THEN
    RETURN 0.05; -- default 5%
  END IF;
  
  -- Value is stored as percentage (e.g. 5), convert to decimal
  IF v_rate >= 1 THEN
    RETURN v_rate / 100.0;
  END IF;
  
  RETURN v_rate;
END;
$function$;

-- Update process_purchase to use dynamic commission
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
  v_commission_rate numeric;
  v_commission_amount integer;
  v_seller_amount integer;
BEGIN
  -- Get dynamic commission rate
  v_commission_rate := public.get_commission_rate();

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

  -- Calculate commission
  v_commission_amount := ROUND(p_amount * v_commission_rate);
  v_seller_amount := p_amount - v_commission_amount;

  -- Debit buyer immediately
  UPDATE profiles SET swap_coins = swap_coins - p_amount WHERE id = p_buyer_id;

  -- Add to seller's PENDING balance (minus commission)
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

-- Update complete_order to use dynamic commission
CREATE OR REPLACE FUNCTION public.complete_order(p_order_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_commission RECORD;
  v_seller_amount integer;
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

  -- Get actual commission from sales_commissions record
  SELECT * INTO v_commission FROM sales_commissions 
  WHERE listing_id = v_order.listing_id AND seller_id = v_order.seller_id AND status = 'pending'
  LIMIT 1;
  
  v_seller_amount := v_order.amount_swapcoins - COALESCE(v_commission.commission_amount, ROUND(v_order.amount_swapcoins * 0.05));

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

-- Update cancel_order with penalty logic
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_commission RECORD;
  v_seller_pending_amount integer;
  v_buyer_refund integer;
  v_commission_amount integer;
  v_is_buyer boolean;
  v_order_age interval;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Allow both buyer AND seller to cancel when pending
  IF v_order.buyer_id != p_user_id AND v_order.seller_id != p_user_id THEN
    RAISE EXCEPTION 'Only the buyer or seller can cancel';
  END IF;
  
  IF v_order.status != 'pending' THEN
    RAISE EXCEPTION 'Order can only be cancelled when pending';
  END IF;

  v_is_buyer := (v_order.buyer_id = p_user_id);
  v_order_age := now() - v_order.created_at;

  -- Get actual commission from sales_commissions
  SELECT * INTO v_commission FROM sales_commissions 
  WHERE listing_id = v_order.listing_id AND seller_id = v_order.seller_id AND status = 'pending'
  LIMIT 1;
  
  v_commission_amount := COALESCE(v_commission.commission_amount, ROUND(v_order.amount_swapcoins * public.get_commission_rate()));
  v_seller_pending_amount := v_order.amount_swapcoins - v_commission_amount;

  -- Determine buyer refund based on who cancels and when:
  -- Seller cancels: buyer gets full 100% refund. Seller loses commission as penalty.
  -- Buyer cancels < 2 weeks: buyer gets (amount - commission) back. Loses commission as penalty.
  -- Buyer cancels >= 2 weeks: buyer gets full 100%. Seller is punished (loses commission).
  IF v_is_buyer THEN
    IF v_order_age >= interval '14 days' THEN
      -- After 2 weeks, buyer gets full refund (seller's fault for not shipping)
      v_buyer_refund := v_order.amount_swapcoins;
    ELSE
      -- Within 2 weeks, buyer pays penalty (loses commission amount)
      v_buyer_refund := v_order.amount_swapcoins - v_commission_amount;
    END IF;
  ELSE
    -- Seller cancels: buyer always gets full refund
    v_buyer_refund := v_order.amount_swapcoins;
  END IF;

  -- Refund buyer
  UPDATE profiles SET swap_coins = swap_coins + v_buyer_refund WHERE id = v_order.buyer_id;

  -- Remove seller's pending balance
  UPDATE profiles SET pending_swap_coins = pending_swap_coins - v_seller_pending_amount WHERE id = v_order.seller_id;

  -- Update order status
  UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;

  -- Mark commission as collected (platform keeps the penalty)
  UPDATE sales_commissions SET status = 'collected' WHERE listing_id = v_order.listing_id AND seller_id = v_order.seller_id AND status = 'pending';

  -- Reactivate listing
  UPDATE listings SET status = 'active' WHERE id = v_order.listing_id;
END;
$function$;
