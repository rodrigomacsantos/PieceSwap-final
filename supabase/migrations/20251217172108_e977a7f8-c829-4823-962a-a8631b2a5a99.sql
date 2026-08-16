-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  price_eur NUMERIC DEFAULT 14.99,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Create daily_swipes table to track swipe usage
CREATE TABLE public.daily_swipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  swipe_date DATE NOT NULL DEFAULT CURRENT_DATE,
  swipe_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, swipe_date)
);

-- Enable RLS
ALTER TABLE public.daily_swipes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own swipes" ON public.daily_swipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own swipes" ON public.daily_swipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own swipes" ON public.daily_swipes FOR UPDATE USING (auth.uid() = user_id);

-- Create superlikes table
CREATE TABLE public.superlikes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.superlikes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own superlikes" ON public.superlikes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own superlikes" ON public.superlikes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create daily_superlikes tracker
CREATE TABLE public.daily_superlikes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  superlike_date DATE NOT NULL DEFAULT CURRENT_DATE,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, superlike_date)
);

-- Enable RLS
ALTER TABLE public.daily_superlikes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own daily superlikes" ON public.daily_superlikes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily superlikes" ON public.daily_superlikes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily superlikes" ON public.daily_superlikes FOR UPDATE USING (auth.uid() = user_id);

-- Add is_highlighted and priority_boost to listings
ALTER TABLE public.listings ADD COLUMN is_highlighted BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN priority_boost INTEGER DEFAULT 0;

-- Create sales_commissions table
CREATE TABLE public.sales_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  sale_price_eur NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL DEFAULT 0.05,
  commission_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own commissions" ON public.sales_commissions FOR SELECT 
USING (auth.uid() = seller_id OR auth.uid() = buyer_id);
CREATE POLICY "Authenticated users can create commissions" ON public.sales_commissions FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create partnerships table
CREATE TABLE public.partnerships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('school', 'store', 'brand')),
  contact_email TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (admins only - for now allow authenticated to view active)
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active partnerships" ON public.partnerships FOR SELECT USING (status = 'active');
CREATE POLICY "Authenticated users can submit partnership requests" ON public.partnerships FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partnerships_updated_at BEFORE UPDATE ON public.partnerships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();