
-- 1. Drop legacy conversation_participants INSERT policy (allows self-join to any conversation)
DROP POLICY IF EXISTS "Users can insert own participation" ON public.conversation_participants;

-- 2. Block direct client writes to user_xp (XP must be granted via SECURITY DEFINER functions only)
DROP POLICY IF EXISTS "Users can update own xp" ON public.user_xp;
DROP POLICY IF EXISTS "Users can insert own xp" ON public.user_xp;

-- 3. Block direct client inserts to xp_log (only server-side functions should write)
DROP POLICY IF EXISTS "Users can insert own xp log" ON public.xp_log;

-- 4. Block direct client inserts to sales_commissions (only process_purchase RPC should create these)
DROP POLICY IF EXISTS "Authenticated users can create commissions" ON public.sales_commissions;

-- 5. Block users from self-upgrading subscriptions (requires payment verification)
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- 6. Restrict subscription INSERT to free plan only
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
CREATE POLICY "Users can create free subscription"
  ON public.subscriptions FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = user_id AND
    plan = 'free' AND
    status = 'active'
  );
