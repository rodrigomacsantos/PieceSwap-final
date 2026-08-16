
-- Add address fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS address_country text DEFAULT 'Portugal';

-- Create orders table
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id),
  amount_swapcoins integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  shipping_address jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS: buyers and sellers can view their own orders
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS: authenticated users can create orders (buyer must be self)
CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- RLS: buyers and sellers can update own orders
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Trigger for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- DB function for purchase transaction (atomic: debit buyer, credit seller, create order, mark listing sold)
CREATE OR REPLACE FUNCTION public.process_purchase(
  p_buyer_id uuid,
  p_seller_id uuid,
  p_listing_id uuid,
  p_amount integer,
  p_shipping_address jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id uuid;
  v_buyer_balance integer;
  v_listing_status text;
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

  -- Debit buyer
  UPDATE profiles SET swap_coins = swap_coins - p_amount WHERE id = p_buyer_id;

  -- Credit seller
  UPDATE profiles SET swap_coins = swap_coins + p_amount WHERE id = p_seller_id;

  -- Create order
  INSERT INTO orders (buyer_id, seller_id, listing_id, amount_swapcoins, shipping_address)
  VALUES (p_buyer_id, p_seller_id, p_listing_id, p_amount, p_shipping_address)
  RETURNING id INTO v_order_id;

  -- Mark listing as sold
  UPDATE listings SET status = 'sold' WHERE id = p_listing_id;

  RETURN v_order_id;
END;
$$;

-- DB function for cancel order (atomic: refund buyer, debit seller, reactivate listing)
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
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

  -- Refund buyer
  UPDATE profiles SET swap_coins = swap_coins + v_order.amount_swapcoins WHERE id = v_order.buyer_id;
  -- Debit seller
  UPDATE profiles SET swap_coins = swap_coins - v_order.amount_swapcoins WHERE id = v_order.seller_id;
  -- Update order status
  UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;
  -- Reactivate listing
  UPDATE listings SET status = 'active' WHERE id = v_order.listing_id;
END;
$$;
