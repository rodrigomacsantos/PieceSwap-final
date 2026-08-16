
-- Add allows_offers column to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS allows_offers boolean DEFAULT false;

-- Create offers table
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount_swapcoins integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  seller_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- RLS: Buyers can create offers
CREATE POLICY "Buyers can create offers" ON public.offers
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- RLS: Buyers and sellers can view their offers
CREATE POLICY "Users can view own offers" ON public.offers
FOR SELECT TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS: Sellers can update offer status
CREATE POLICY "Sellers can update offers" ON public.offers
FOR UPDATE TO authenticated
USING (auth.uid() = seller_id);

-- Trigger to notify seller on new offer
CREATE OR REPLACE FUNCTION public.notify_on_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buyer_name text;
  v_listing_title text;
BEGIN
  SELECT COALESCE(full_name, username, 'Alguém') INTO v_buyer_name FROM profiles WHERE id = NEW.buyer_id;
  SELECT title INTO v_listing_title FROM listings WHERE id = NEW.listing_id;

  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    NEW.seller_id,
    'Nova Oferta! 💰',
    v_buyer_name || ' fez uma oferta de ' || NEW.amount_swapcoins || ' SC em "' || COALESCE(v_listing_title, 'artigo') || '"',
    'offer',
    jsonb_build_object('offer_id', NEW.id, 'listing_id', NEW.listing_id, 'amount', NEW.amount_swapcoins)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_offer
AFTER INSERT ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_offer();

-- Trigger to notify buyer on offer status change
CREATE OR REPLACE FUNCTION public.notify_on_offer_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_listing_title text;
  v_status_label text;
  v_emoji text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('accepted', 'rejected') THEN
    SELECT title INTO v_listing_title FROM listings WHERE id = NEW.listing_id;
    
    IF NEW.status = 'accepted' THEN
      v_status_label := 'aceite';
      v_emoji := '✅';
    ELSE
      v_status_label := 'recusada';
      v_emoji := '❌';
    END IF;

    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.buyer_id,
      'Oferta ' || v_status_label || ' ' || v_emoji,
      'A tua oferta de ' || NEW.amount_swapcoins || ' SC em "' || COALESCE(v_listing_title, 'artigo') || '" foi ' || v_status_label,
      'offer',
      jsonb_build_object('offer_id', NEW.id, 'listing_id', NEW.listing_id, 'status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_offer_status_change
AFTER UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.notify_on_offer_status_change();
