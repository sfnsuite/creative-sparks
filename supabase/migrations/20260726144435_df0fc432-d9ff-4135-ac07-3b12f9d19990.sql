
-- 1. Recreate has_role with empty search_path and fully-qualified refs
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() = _user_id
     AND EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = _user_id AND role = _role
     )
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. PRODUCTS bounds
ALTER TABLE public.products
  ADD CONSTRAINT products_title_len CHECK (length(title) BETWEEN 1 AND 200) NOT VALID,
  ADD CONSTRAINT products_slug_len CHECK (length(slug) BETWEEN 1 AND 120) NOT VALID,
  ADD CONSTRAINT products_slug_shape CHECK (slug ~ '^[a-z0-9-]+$') NOT VALID,
  ADD CONSTRAINT products_desc_len CHECK (description IS NULL OR length(description) <= 8000) NOT VALID,
  ADD CONSTRAINT products_category_len CHECK (category IS NULL OR length(category) <= 80) NOT VALID,
  ADD CONSTRAINT products_price_bounds CHECK (price >= 0 AND price <= 10000000) NOT VALID,
  ADD CONSTRAINT products_stock_bounds CHECK (stock >= 0 AND stock <= 1000000) NOT VALID,
  ADD CONSTRAINT products_images_card CHECK (cardinality(images) <= 20) NOT VALID,
  ADD CONSTRAINT products_sizes_card CHECK (cardinality(sizes) <= 40) NOT VALID;

-- 3. PROMO CARDS bounds
ALTER TABLE public.promo_cards
  ADD CONSTRAINT promo_cards_id_shape CHECK (id ~ '^[a-z0-9][a-z0-9-]{2,63}$') NOT VALID,
  ADD CONSTRAINT promo_cards_headline_len CHECK (headline IS NULL OR length(headline) <= 200) NOT VALID,
  ADD CONSTRAINT promo_cards_click_nonneg CHECK (click_count >= 0) NOT VALID,
  ADD CONSTRAINT promo_cards_companion_card CHECK (cardinality(companion_product_ids) <= 20) NOT VALID;

-- 4. ORDERS bounds + public policy tightened
ALTER TABLE public.orders
  ADD CONSTRAINT orders_full_name_len CHECK (length(full_name) BETWEEN 2 AND 120) NOT VALID,
  ADD CONSTRAINT orders_phone_len CHECK (length(phone) BETWEEN 6 AND 30) NOT VALID,
  ADD CONSTRAINT orders_address_len CHECK (length(address) BETWEEN 5 AND 500) NOT VALID,
  ADD CONSTRAINT orders_city_len CHECK (city IS NULL OR length(city) <= 120) NOT VALID,
  ADD CONSTRAINT orders_notes_len CHECK (notes IS NULL OR length(notes) <= 2000) NOT VALID,
  ADD CONSTRAINT orders_size_len CHECK (size IS NULL OR length(size) <= 40) NOT VALID,
  ADD CONSTRAINT orders_quantity_bounds CHECK (quantity BETWEEN 1 AND 1000) NOT VALID,
  ADD CONSTRAINT orders_snapshot_shape CHECK (jsonb_typeof(product_snapshot) = 'object' AND pg_column_size(product_snapshot) <= 8192) NOT VALID;

DROP POLICY IF EXISTS "Anyone can place order" ON public.orders;
CREATE POLICY "Anyone can place order" ON public.orders
  FOR INSERT TO anon
  WITH CHECK (
    length(full_name) BETWEEN 2 AND 120
    AND length(phone) BETWEEN 6 AND 30
    AND length(address) BETWEEN 5 AND 500
    AND (city IS NULL OR length(city) <= 120)
    AND (notes IS NULL OR length(notes) <= 2000)
    AND (size IS NULL OR length(size) <= 40)
    AND quantity BETWEEN 1 AND 1000
    AND status = 'new'
    AND jsonb_typeof(product_snapshot) = 'object'
    AND pg_column_size(product_snapshot) <= 8192
  );

DROP POLICY IF EXISTS "Auth can place order" ON public.orders;
CREATE POLICY "Auth can place order" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    length(full_name) BETWEEN 2 AND 120
    AND length(phone) BETWEEN 6 AND 30
    AND length(address) BETWEEN 5 AND 500
    AND (city IS NULL OR length(city) <= 120)
    AND (notes IS NULL OR length(notes) <= 2000)
    AND (size IS NULL OR length(size) <= 40)
    AND quantity BETWEEN 1 AND 1000
    AND status = 'new'
    AND jsonb_typeof(product_snapshot) = 'object'
    AND pg_column_size(product_snapshot) <= 8192
  );

-- 5. CUSTOM ORDERS bounds + public policy tightened
ALTER TABLE public.custom_orders
  ADD CONSTRAINT custom_orders_full_name_len CHECK (length(full_name) BETWEEN 2 AND 120) NOT VALID,
  ADD CONSTRAINT custom_orders_phone_len CHECK (length(phone) BETWEEN 6 AND 30) NOT VALID,
  ADD CONSTRAINT custom_orders_email_len CHECK (email IS NULL OR length(email) <= 254) NOT VALID,
  ADD CONSTRAINT custom_orders_desc_len CHECK (length(description) BETWEEN 5 AND 4000) NOT VALID,
  ADD CONSTRAINT custom_orders_refs_card CHECK (cardinality(reference_images) <= 20) NOT VALID,
  ADD CONSTRAINT custom_orders_measurements_shape CHECK (
    measurements IS NULL
    OR (jsonb_typeof(measurements) = 'object' AND pg_column_size(measurements) <= 4096)
  ) NOT VALID;

DROP POLICY IF EXISTS "Anyone can submit custom order" ON public.custom_orders;
CREATE POLICY "Anyone can submit custom order" ON public.custom_orders
  FOR INSERT TO anon
  WITH CHECK (
    length(full_name) BETWEEN 2 AND 120
    AND length(phone) BETWEEN 6 AND 30
    AND (email IS NULL OR length(email) <= 254)
    AND length(description) BETWEEN 5 AND 4000
    AND cardinality(reference_images) <= 20
    AND status = 'new'
    AND (measurements IS NULL OR (jsonb_typeof(measurements) = 'object' AND pg_column_size(measurements) <= 4096))
  );

DROP POLICY IF EXISTS "Auth can submit custom order" ON public.custom_orders;
CREATE POLICY "Auth can submit custom order" ON public.custom_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    length(full_name) BETWEEN 2 AND 120
    AND length(phone) BETWEEN 6 AND 30
    AND (email IS NULL OR length(email) <= 254)
    AND length(description) BETWEEN 5 AND 4000
    AND cardinality(reference_images) <= 20
    AND status = 'new'
    AND (measurements IS NULL OR (jsonb_typeof(measurements) = 'object' AND pg_column_size(measurements) <= 4096))
  );

-- 6. WHOLESALE LEADS bounds + public policy tightened
ALTER TABLE public.wholesale_leads
  ADD CONSTRAINT wl_full_name_len CHECK (length(full_name) BETWEEN 2 AND 120) NOT VALID,
  ADD CONSTRAINT wl_phone_len CHECK (length(phone) BETWEEN 6 AND 30) NOT VALID,
  ADD CONSTRAINT wl_email_len CHECK (email IS NULL OR length(email) <= 254) NOT VALID,
  ADD CONSTRAINT wl_company_len CHECK (company IS NULL OR length(company) <= 200) NOT VALID,
  ADD CONSTRAINT wl_product_type_len CHECK (product_type IS NULL OR length(product_type) <= 200) NOT VALID,
  ADD CONSTRAINT wl_message_len CHECK (message IS NULL OR length(message) <= 2000) NOT VALID,
  ADD CONSTRAINT wl_quantity_bounds CHECK (quantity IS NULL OR (quantity >= 1 AND quantity <= 1000000)) NOT VALID;

DROP POLICY IF EXISTS "Anyone can submit wholesale lead" ON public.wholesale_leads;
CREATE POLICY "Anyone can submit wholesale lead" ON public.wholesale_leads
  FOR INSERT TO anon
  WITH CHECK (
    length(full_name) BETWEEN 2 AND 120
    AND length(phone) BETWEEN 6 AND 30
    AND (email IS NULL OR length(email) <= 254)
    AND (company IS NULL OR length(company) <= 200)
    AND (product_type IS NULL OR length(product_type) <= 200)
    AND (message IS NULL OR length(message) <= 2000)
    AND (quantity IS NULL OR (quantity >= 1 AND quantity <= 1000000))
    AND status = 'new'
  );

DROP POLICY IF EXISTS "Auth can submit wholesale lead" ON public.wholesale_leads;
CREATE POLICY "Auth can submit wholesale lead" ON public.wholesale_leads
  FOR INSERT TO authenticated
  WITH CHECK (
    length(full_name) BETWEEN 2 AND 120
    AND length(phone) BETWEEN 6 AND 30
    AND (email IS NULL OR length(email) <= 254)
    AND (company IS NULL OR length(company) <= 200)
    AND (product_type IS NULL OR length(product_type) <= 200)
    AND (message IS NULL OR length(message) <= 2000)
    AND (quantity IS NULL OR (quantity >= 1 AND quantity <= 1000000))
    AND status = 'new'
  );

-- 7. Safe promo click counter (SECURITY DEFINER, narrow, no data leak)
CREATE OR REPLACE FUNCTION public.increment_promo_card_click(_card_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF _card_id IS NULL OR length(_card_id) < 3 OR length(_card_id) > 64 THEN
    RETURN;
  END IF;
  UPDATE public.promo_cards
     SET click_count = click_count + 1
   WHERE id = _card_id
     AND active = true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.increment_promo_card_click(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_promo_card_click(text) TO anon, authenticated;
