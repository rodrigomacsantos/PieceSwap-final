-- Permitir admins atualizar qualquer listing (para moderar anúncios)
CREATE POLICY "Admins can update any listing"
ON public.listings
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Permitir admins atualizar qualquer profile (para suspensões)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()));