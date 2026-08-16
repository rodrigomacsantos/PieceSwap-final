
CREATE OR REPLACE FUNCTION public.notify_on_new_offer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    jsonb_build_object('offer_id', NEW.id, 'listing_id', NEW.listing_id, 'amount', NEW.amount_swapcoins, 'other_user_id', NEW.buyer_id)
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_offer_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      jsonb_build_object('offer_id', NEW.id, 'listing_id', NEW.listing_id, 'status', NEW.status, 'other_user_id', NEW.seller_id)
    );
  END IF;

  RETURN NEW;
END;
$function$;
