CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (is_admin_user(auth.uid()));