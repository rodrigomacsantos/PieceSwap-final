-- 1. Reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  reviewed_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(order_id, reviewer_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for their orders" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        AND orders.status = 'completed'
    )
  );

CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_review_rating
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles SET
    rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE reviewed_id = NEW.reviewed_id),
    total_ratings = (SELECT COUNT(*) FROM reviews WHERE reviewed_id = NEW.reviewed_id)
  WHERE id = NEW.reviewed_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_profile_rating
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_rating();

-- 2. Category follows table
CREATE TABLE public.category_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.category_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follows" ON public.category_follows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own follows" ON public.category_follows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own follows" ON public.category_follows
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_category_followers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _follower RECORD;
  _user_name text;
BEGIN
  SELECT COALESCE(full_name, username, 'Alguém') INTO _user_name FROM profiles WHERE id = NEW.user_id;

  FOR _follower IN
    SELECT user_id FROM category_follows
    WHERE category = NEW.category AND user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      _follower.user_id,
      'Novo anúncio na tua categoria! 📦',
      _user_name || ' publicou "' || NEW.title || '" em ' || NEW.category,
      'category_alert',
      jsonb_build_object('listing_id', NEW.id, 'category', NEW.category)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_category_followers
  AFTER INSERT ON public.listings
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.notify_category_followers();

-- 3. Add is_verified to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;