-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'support');

-- Create user_roles table for RBAC
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator', 'support')
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create audit_logs table for tracking admin actions
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    old_value jsonb,
    new_value jsonb,
    reason text,
    ip_address text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Admins can create audit logs
CREATE POLICY "Admins can create audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

-- Create reports table for user/listing reports
CREATE TABLE public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid REFERENCES auth.users(id) NOT NULL,
    reported_user_id uuid REFERENCES auth.users(id),
    reported_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
    report_type text NOT NULL,
    reason text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'new',
    assigned_to uuid REFERENCES auth.users(id),
    resolution text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- Users can view own reports
CREATE POLICY "Users can view own reports"
ON public.reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id OR public.is_admin_user(auth.uid()));

-- Admins can manage reports
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Create site_config table for global settings
CREATE TABLE public.site_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_by uuid REFERENCES auth.users(id),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on site_config
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read config
CREATE POLICY "Anyone can read config"
ON public.site_config
FOR SELECT
TO authenticated
USING (true);

-- Only admins can update config
CREATE POLICY "Admins can manage config"
ON public.site_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create login_attempts table for brute-force protection
CREATE TABLE public.login_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    ip_address text,
    success boolean NOT NULL DEFAULT false,
    attempted_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Anyone can insert (for tracking)
CREATE POLICY "Anyone can create login attempts"
ON public.login_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create swapcoins_packages table
CREATE TABLE public.swapcoins_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    coins integer NOT NULL,
    price_eur numeric NOT NULL,
    bonus_coins integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.swapcoins_packages ENABLE ROW LEVEL SECURITY;

-- Anyone can view active packages
CREATE POLICY "Anyone can view active packages"
ON public.swapcoins_packages
FOR SELECT
USING (is_active = true OR public.is_admin_user(auth.uid()));

-- Admins can manage packages
CREATE POLICY "Admins can manage packages"
ON public.swapcoins_packages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add is_suspended column to profiles for account suspension
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Insert default site config values
INSERT INTO public.site_config (key, value, description) VALUES
('marketplace_commission_rate', '0.05', 'Commission rate for marketplace sales (5%)'),
('daily_swipe_limit_free', '20', 'Daily swipe limit for free users'),
('daily_swipe_limit_premium', '100', 'Daily swipe limit for premium users'),
('daily_superlike_limit_free', '0', 'Daily superlike limit for free users'),
('daily_superlike_limit_premium', '5', 'Daily superlike limit for premium users'),
('premium_price_eur', '14.99', 'Monthly premium subscription price')
ON CONFLICT (key) DO NOTHING;

-- Insert default swapcoins packages
INSERT INTO public.swapcoins_packages (name, coins, price_eur, bonus_coins) VALUES
('Starter', 100, 4.99, 0),
('Popular', 500, 19.99, 50),
('Premium', 1000, 34.99, 150),
('Ultimate', 2500, 74.99, 500)
ON CONFLICT DO NOTHING;

-- Create trigger for reports updated_at
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();