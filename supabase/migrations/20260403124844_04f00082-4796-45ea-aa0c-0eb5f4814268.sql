ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS boosted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS boost_cost_sc integer DEFAULT 0;