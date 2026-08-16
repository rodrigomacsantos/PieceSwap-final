
-- 1. Lock down order/purchase RPCs to caller's own auth.uid()
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
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

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

  SELECT * INTO v_commission FROM sales_commissions 
  WHERE listing_id = v_order.listing_id AND seller_id = v_order.seller_id AND status = 'pending'
  LIMIT 1;

  v_seller_amount := v_order.amount_swapcoins - COALESCE(v_commission.commission_amount, ROUND(v_order.amount_swapcoins * 0.05));

  UPDATE profiles SET 
    pending_swap_coins = pending_swap_coins - v_seller_amount,
    swap_coins = swap_coins + v_seller_amount
  WHERE id = v_order.seller_id;

  UPDATE orders SET status = 'completed' WHERE id = p_order_id;
  UPDATE sales_commissions SET status = 'collected' WHERE listing_id = v_order.listing_id AND seller_id = v_order.seller_id;
END;
$function$;

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
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.buyer_id != p_user_id AND v_order.seller_id != p_user_id THEN
    RAISE EXCEPTION 'Only the buyer or seller can cancel';
  END IF;

  IF v_order.status != 'pending' THEN
    RAISE EXCEPTION 'Order can only be cancelled when pending';
  END IF;

  v_is_buyer := (v_order.buyer_id = p_user_id);
  v_order_age := now() - v_order.created_at;

  SELECT * INTO v_commission FROM sales_commissions 
  WHERE listing_id = v_order.listing_id AND seller_id = v_order.seller_id AND status = 'pending'
  LIMIT 1;

  v_commission_amount := COALESCE(v_commission.commission_amount, ROUND(v_order.amount_swapcoins * public.get_commission_rate()));
  v_seller_pending_amount := v_order.amount_swapcoins - v_commission_amount;

  IF v_is_buyer THEN
    IF v_order_age >= interval '14 days' THEN
      v_buyer_refund := v_order.amount_swapcoins;
    ELSE
      v_buyer_refund := v_order.amount_swapcoins - v_commission_amount;
    END IF;
  ELSE
    v_buyer_refund := v_order.amount_swapcoins;
  END IF;

  UPDATE profiles SET swap_coins = swap_coins + v_buyer_refund WHERE id = v_order.buyer_id;
  UPDATE profiles SET pending_swap_coins = pending_swap_coins - v_seller_pending_amount WHERE id = v_order.seller_id;
  UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;
  UPDATE sales_commissions SET status = 'collected' WHERE listing_id = v_order.listing_id AND seller_id = v_order.seller_id AND status = 'pending';
  UPDATE listings SET status = 'active' WHERE id = v_order.listing_id;
END;
$function$;

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
  IF auth.uid() IS NULL OR auth.uid() <> p_buyer_id THEN
    RAISE EXCEPTION 'Unauthorized: can only purchase for yourself';
  END IF;

  v_commission_rate := public.get_commission_rate();

  SELECT status INTO v_listing_status FROM listings WHERE id = p_listing_id;
  IF v_listing_status IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF v_listing_status != 'active' THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;

  SELECT swap_coins INTO v_buyer_balance FROM profiles WHERE id = p_buyer_id;
  IF v_buyer_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient SwapCoins balance';
  END IF;

  v_commission_amount := ROUND(p_amount * v_commission_rate);
  v_seller_amount := p_amount - v_commission_amount;

  UPDATE profiles SET swap_coins = swap_coins - p_amount WHERE id = p_buyer_id;
  UPDATE profiles SET pending_swap_coins = pending_swap_coins + v_seller_amount WHERE id = p_seller_id;

  INSERT INTO orders (buyer_id, seller_id, listing_id, amount_swapcoins, shipping_address)
  VALUES (p_buyer_id, p_seller_id, p_listing_id, p_amount, p_shipping_address)
  RETURNING id INTO v_order_id;

  INSERT INTO sales_commissions (listing_id, seller_id, buyer_id, sale_price_eur, commission_rate, commission_amount, status)
  VALUES (p_listing_id, p_seller_id, p_buyer_id, p_amount, v_commission_rate, v_commission_amount, 'pending');

  UPDATE listings SET status = 'sold' WHERE id = p_listing_id;

  RETURN v_order_id;
END;
$function$;

-- 2. Prevent AI prompt poisoning: require auth on feedback insert; drop auto-promote trigger
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.ai_agent_feedback;
CREATE POLICY "Authenticated users can submit own feedback"
ON public.ai_agent_feedback FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_auto_promote_positive_feedback ON public.ai_agent_feedback;
DROP TRIGGER IF EXISTS auto_promote_positive_feedback_trigger ON public.ai_agent_feedback;
DROP TRIGGER IF EXISTS auto_promote_positive_feedback ON public.ai_agent_feedback;
DROP FUNCTION IF EXISTS public.auto_promote_positive_feedback() CASCADE;

-- 3. Restrict ai_agents SELECT to admins (system prompts are sensitive)
DROP POLICY IF EXISTS "Anyone can read active agents config" ON public.ai_agents;
CREATE POLICY "Only admins can read agents config"
ON public.ai_agents FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Restrict partnerships SELECT to admins (contact_email is sensitive)
DROP POLICY IF EXISTS "Anyone can view active partnerships" ON public.partnerships;
CREATE POLICY "Only admins can view partnerships"
ON public.partnerships FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()));
