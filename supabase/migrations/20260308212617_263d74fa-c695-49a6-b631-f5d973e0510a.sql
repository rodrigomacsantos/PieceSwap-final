CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (is_admin_user(auth.uid()));