
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() = _user_id AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

DROP POLICY "Auth can submit custom order" ON public.custom_orders;
CREATE POLICY "Auth can submit custom order" ON public.custom_orders
  FOR INSERT TO authenticated
  WITH CHECK (length(full_name) BETWEEN 2 AND 120 AND length(phone) BETWEEN 6 AND 30 AND length(description) BETWEEN 5 AND 4000);

DROP POLICY "Auth can submit wholesale lead" ON public.wholesale_leads;
CREATE POLICY "Auth can submit wholesale lead" ON public.wholesale_leads
  FOR INSERT TO authenticated
  WITH CHECK (length(full_name) BETWEEN 2 AND 120 AND length(phone) BETWEEN 6 AND 30);

DROP POLICY "Auth can place order" ON public.orders;
CREATE POLICY "Auth can place order" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (length(full_name) BETWEEN 2 AND 120 AND length(phone) BETWEEN 6 AND 30 AND length(address) BETWEEN 5 AND 500 AND quantity BETWEEN 1 AND 1000);

-- Storage policies for product-images bucket (private bucket, public read)
CREATE POLICY "Public can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admins upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
