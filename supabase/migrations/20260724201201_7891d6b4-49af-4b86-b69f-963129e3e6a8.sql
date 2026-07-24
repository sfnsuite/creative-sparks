
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "Anyone can submit custom order" ON public.custom_orders;
CREATE POLICY "Anyone can submit custom order" ON public.custom_orders
  FOR INSERT TO anon
  WITH CHECK (length(full_name) BETWEEN 2 AND 120 AND length(phone) BETWEEN 6 AND 30 AND length(description) BETWEEN 5 AND 4000);

DROP POLICY "Anyone can submit wholesale lead" ON public.wholesale_leads;
CREATE POLICY "Anyone can submit wholesale lead" ON public.wholesale_leads
  FOR INSERT TO anon
  WITH CHECK (length(full_name) BETWEEN 2 AND 120 AND length(phone) BETWEEN 6 AND 30);

DROP POLICY "Anyone can place order" ON public.orders;
CREATE POLICY "Anyone can place order" ON public.orders
  FOR INSERT TO anon
  WITH CHECK (length(full_name) BETWEEN 2 AND 120 AND length(phone) BETWEEN 6 AND 30 AND length(address) BETWEEN 5 AND 500 AND quantity BETWEEN 1 AND 1000);
