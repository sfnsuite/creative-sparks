
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MAD',
  category text,
  images text[] NOT NULL DEFAULT '{}',
  sizes text[] NOT NULL DEFAULT '{}',
  stock int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active products" ON public.products
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated reads all products" ON public.products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage products" ON public.products
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Promo cards (short id used in Instagram ad links)
CREATE TABLE public.promo_cards (
  id text PRIMARY KEY,
  headline text,
  active_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  companion_product_ids uuid[] NOT NULL DEFAULT '{}',
  click_count int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_cards TO authenticated;
GRANT ALL ON public.promo_cards TO service_role;
ALTER TABLE public.promo_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active cards" ON public.promo_cards
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated reads all cards" ON public.promo_cards
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage cards" ON public.promo_cards
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER cards_updated_at BEFORE UPDATE ON public.promo_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Custom design orders
CREATE TABLE public.custom_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  description text NOT NULL,
  reference_images text[] NOT NULL DEFAULT '{}',
  measurements jsonb,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.custom_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_orders TO authenticated;
GRANT ALL ON public.custom_orders TO service_role;
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit custom order" ON public.custom_orders
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth can submit custom order" ON public.custom_orders
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage custom orders" ON public.custom_orders
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER custom_orders_updated_at BEFORE UPDATE ON public.custom_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Wholesale leads
CREATE TABLE public.wholesale_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  company text,
  product_type text,
  quantity int,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.wholesale_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_leads TO authenticated;
GRANT ALL ON public.wholesale_leads TO service_role;
ALTER TABLE public.wholesale_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit wholesale lead" ON public.wholesale_leads
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth can submit wholesale lead" ON public.wholesale_leads
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage wholesale leads" ON public.wholesale_leads
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER wholesale_leads_updated_at BEFORE UPDATE ON public.wholesale_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Direct orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_snapshot jsonb NOT NULL,
  size text,
  quantity int NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place order" ON public.orders
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth can place order" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage orders" ON public.orders
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
