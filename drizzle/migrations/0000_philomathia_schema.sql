CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type text NOT NULL CHECK (media_type IN ('film','book')),
  title_en text NOT NULL,
  title_ka text,
  original_title text,
  creator text NOT NULL DEFAULT '',
  year int,
  description_en text NOT NULL DEFAULT '',
  description_ka text,
  genres text[] NOT NULL DEFAULT '{}',
  mood_tags text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  is_georgian boolean NOT NULL DEFAULT false,
  isbn text,
  runtime_minutes int,
  page_count int,
  trailer_key text,
  poster_url text,
  tmdb_id int UNIQUE,
  openlibrary_key text UNIQUE,
  wikidata_id text UNIQUE,
  source text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','tmdb','openlibrary','googlebooks','wikidata')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.items TO anon, authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.app_role AS ENUM ('user','shop','admin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  shop_id uuid,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "items readable" ON public.items FOR SELECT USING (true);
CREATE POLICY "admin insert items" ON public.items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update items" ON public.items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete items" ON public.items FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.items TO authenticated;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','ka')),
  avoided_genres text[] NOT NULL DEFAULT '{}',
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile delete" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, split_part(NEW.email,'@',1)) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('like','pass')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
CREATE TABLE public.logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('want','in_progress','seen')),
  rating numeric(2,1) CHECK (rating IS NULL OR (rating >= 0.5 AND rating <= 5 AND (rating*2) = floor(rating*2))),
  review text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
CREATE TABLE public.tag_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tag text NOT NULL,
  weight numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swipes, public.logs, public.tag_weights TO authenticated;
GRANT ALL ON public.swipes, public.logs, public.tag_weights TO service_role;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own swipes" ON public.swipes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own logs" ON public.logs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own tags" ON public.tag_weights FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_tags(_tags text[], _delta numeric)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  INSERT INTO public.tag_weights (user_id, tag, weight, updated_at)
  SELECT auth.uid(), t, _delta, now() FROM (SELECT DISTINCT unnest(_tags) AS t) s WHERE t IS NOT NULL AND t <> ''
  ON CONFLICT (user_id, tag) DO UPDATE SET weight = public.tag_weights.weight + EXCLUDED.weight, updated_at = now();
$$;
GRANT EXECUTE ON FUNCTION public.bump_tags(text[], numeric) TO authenticated;

CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, address text NOT NULL, city text NOT NULL, lat double precision, lng double precision
);
CREATE TABLE public.shop_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  price_gel numeric NOT NULL, quantity int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, item_id)
);
GRANT SELECT ON public.shops, public.shop_stock TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_stock TO authenticated;
GRANT ALL ON public.shops, public.shop_stock TO service_role;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shops readable" ON public.shops FOR SELECT USING (true);
CREATE POLICY "stock readable" ON public.shop_stock FOR SELECT USING (true);
CREATE POLICY "shop writes own stock" ON public.shop_stock FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'shop' AND r.shop_id = shop_stock.shop_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'shop' AND r.shop_id = shop_stock.shop_id));