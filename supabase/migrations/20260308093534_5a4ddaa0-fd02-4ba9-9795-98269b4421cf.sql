
CREATE TABLE public.listing_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

ALTER TABLE public.listing_likes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own likes
CREATE POLICY "Users can view own likes"
ON public.listing_likes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert own likes
CREATE POLICY "Users can insert own likes"
ON public.listing_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete own likes
CREATE POLICY "Users can delete own likes"
ON public.listing_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
