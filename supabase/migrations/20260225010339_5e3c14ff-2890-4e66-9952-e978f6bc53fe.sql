
-- Allow users to insert their own notifications (for client-side match notifications)
-- Keep existing admin insert policy, add user self-insert
CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger: auto-create notifications when a match is created
CREATE OR REPLACE FUNCTION public.notify_on_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user1_name text;
  v_user2_name text;
  v_listing1_title text;
  v_listing2_title text;
BEGIN
  SELECT COALESCE(full_name, username, 'Utilizador') INTO v_user1_name FROM profiles WHERE id = NEW.user1_id;
  SELECT COALESCE(full_name, username, 'Utilizador') INTO v_user2_name FROM profiles WHERE id = NEW.user2_id;
  SELECT title INTO v_listing1_title FROM listings WHERE id = NEW.listing1_id;
  SELECT title INTO v_listing2_title FROM listings WHERE id = NEW.listing2_id;

  -- Notify user1
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    NEW.user1_id,
    'Novo Match! 🎉',
    v_user2_name || ' também quer trocar! Artigo: ' || COALESCE(v_listing2_title, 'anúncio'),
    'match',
    jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user2_id, 'listing_id', NEW.listing2_id)
  );

  -- Notify user2
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    NEW.user2_id,
    'Novo Match! 🎉',
    v_user1_name || ' também quer trocar! Artigo: ' || COALESCE(v_listing1_title, 'anúncio'),
    'match',
    jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user1_id, 'listing_id', NEW.listing1_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_match_created
AFTER INSERT ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_match();

-- Trigger: auto-create notifications on order status changes
CREATE OR REPLACE FUNCTION public.notify_on_order_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_listing_title text;
  v_buyer_name text;
  v_seller_name text;
BEGIN
  SELECT title INTO v_listing_title FROM listings WHERE id = NEW.listing_id;
  SELECT COALESCE(full_name, username, 'Utilizador') INTO v_buyer_name FROM profiles WHERE id = NEW.buyer_id;
  SELECT COALESCE(full_name, username, 'Utilizador') INTO v_seller_name FROM profiles WHERE id = NEW.seller_id;

  -- New order created
  IF TG_OP = 'INSERT' THEN
    -- Notify seller of new sale
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.seller_id,
      'Nova Venda! 💰',
      v_buyer_name || ' comprou "' || COALESCE(v_listing_title, 'artigo') || '" por ' || NEW.amount_swapcoins || ' SC',
      'order',
      jsonb_build_object('order_id', NEW.id, 'listing_id', NEW.listing_id, 'status', 'pending')
    );

    -- Notify buyer of purchase confirmation
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.buyer_id,
      'Compra Confirmada! ✅',
      'Compraste "' || COALESCE(v_listing_title, 'artigo') || '" por ' || NEW.amount_swapcoins || ' SC',
      'order',
      jsonb_build_object('order_id', NEW.id, 'listing_id', NEW.listing_id, 'status', 'pending')
    );
    RETURN NEW;
  END IF;

  -- Status changed
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'shipped' THEN
      -- Notify buyer that order was shipped
      INSERT INTO notifications (user_id, title, message, type, data)
      VALUES (
        NEW.buyer_id,
        'Encomenda Enviada! 📦',
        v_seller_name || ' enviou "' || COALESCE(v_listing_title, 'artigo') || '"',
        'order',
        jsonb_build_object('order_id', NEW.id, 'listing_id', NEW.listing_id, 'status', 'shipped')
      );
    ELSIF NEW.status = 'completed' THEN
      -- Notify seller that buyer confirmed receipt
      INSERT INTO notifications (user_id, title, message, type, data)
      VALUES (
        NEW.seller_id,
        'Entrega Confirmada! 🎉',
        v_buyer_name || ' confirmou a receção de "' || COALESCE(v_listing_title, 'artigo') || '"',
        'order',
        jsonb_build_object('order_id', NEW.id, 'listing_id', NEW.listing_id, 'status', 'completed')
      );
    ELSIF NEW.status = 'cancelled' THEN
      -- Notify seller that order was cancelled
      INSERT INTO notifications (user_id, title, message, type, data)
      VALUES (
        NEW.seller_id,
        'Encomenda Cancelada ❌',
        v_buyer_name || ' cancelou a compra de "' || COALESCE(v_listing_title, 'artigo') || '"',
        'order',
        jsonb_build_object('order_id', NEW.id, 'listing_id', NEW.listing_id, 'status', 'cancelled')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_changed
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_change();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
