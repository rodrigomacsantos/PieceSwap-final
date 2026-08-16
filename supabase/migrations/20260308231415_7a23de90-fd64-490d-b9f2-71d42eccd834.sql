
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
  
  -- Allow both buyer AND seller to cancel when pending
  IF v_order.buyer_id != p_user_id AND v_order.seller_id != p_user_id THEN
    RAISE EXCEPTION 'Only the buyer or seller can cancel';
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
