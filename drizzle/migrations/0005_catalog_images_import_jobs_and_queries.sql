CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS image_source text, ADD COLUMN IF NOT EXISTS image_ref text, ADD COLUMN IF NOT EXISTS popularity numeric DEFAULT 0;
ALTER TABLE public.items ADD CONSTRAINT items_image_source_allowed CHECK (image_source IS NULL OR image_source IN ('tmdb','openlibrary','googlebooks'));
CREATE INDEX IF NOT EXISTS items_genres_gin ON public.items USING gin(genres);
CREATE INDEX IF NOT EXISTS items_moods_gin ON public.items USING gin(mood_tags);
CREATE INDEX IF NOT EXISTS items_keywords_gin ON public.items USING gin(keywords);
CREATE INDEX IF NOT EXISTS items_media_country_idx ON public.items(media_type,is_georgian);
CREATE INDEX IF NOT EXISTS items_year_idx ON public.items(year);
CREATE INDEX IF NOT EXISTS items_popularity_idx ON public.items(popularity);
CREATE INDEX IF NOT EXISTS items_title_en_trgm ON public.items USING gin(title_en public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS items_title_ka_trgm ON public.items USING gin(title_ka public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS items_original_title_trgm ON public.items USING gin(original_title public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS items_creator_trgm ON public.items USING gin(creator public.gin_trgm_ops);
CREATE TABLE public.import_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider text NOT NULL,pass_name text NOT NULL UNIQUE,params jsonb NOT NULL DEFAULT '{}',cursor jsonb NOT NULL DEFAULT '{}',status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','paused','done','error')),imported_count integer NOT NULL DEFAULT 0,skipped_count integer NOT NULL DEFAULT 0,skipped_reasons jsonb NOT NULL DEFAULT '{}',last_error text,updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.import_jobs TO authenticated;
GRANT ALL ON public.import_jobs TO service_role;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_import_jobs ON public.import_jobs FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.catalog_search(_query text DEFAULT '',_media text DEFAULT 'all',_geo boolean DEFAULT false,_page integer DEFAULT 1) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
WITH matched AS (SELECT i.* FROM public.items i WHERE (_media='all' OR i.media_type=_media) AND (NOT _geo OR i.is_georgian) AND (btrim(_query)='' OR i.title_en ILIKE '%'||_query||'%' OR i.title_ka ILIKE '%'||_query||'%' OR i.original_title ILIKE '%'||_query||'%' OR i.creator ILIKE '%'||_query||'%' OR i.genres && ARRAY[lower(_query)] OR i.keywords && ARRAY[lower(_query)])), page AS (SELECT * FROM matched ORDER BY title_en,id LIMIT 20 OFFSET (greatest(1,_page)-1)*20) SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'),'total',(SELECT count(*) FROM matched)); $$;
GRANT EXECUTE ON FUNCTION public.catalog_search(text,text,boolean,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.catalog_candidates(_media text DEFAULT 'either',_geo boolean DEFAULT false,_avoid text[] DEFAULT '{}',_min_minutes integer DEFAULT NULL,_max_minutes integer DEFAULT NULL,_min_pages integer DEFAULT NULL,_max_pages integer DEFAULT NULL,_cold boolean DEFAULT false) RETURNS SETOF public.items LANGUAGE sql VOLATILE SET search_path=public AS $$
WITH filtered AS (SELECT i.* FROM public.items i WHERE (_media='either' OR i.media_type=_media) AND (NOT _geo OR i.is_georgian) AND NOT i.genres && _avoid AND NOT EXISTS(SELECT 1 FROM public.swipes s WHERE s.user_id=auth.uid() AND s.item_id=i.id) AND NOT EXISTS(SELECT 1 FROM public.logs l WHERE l.user_id=auth.uid() AND l.item_id=i.id AND l.status='seen') AND (i.media_type<>'film' OR ((_min_minutes IS NULL OR i.runtime_minutes>=_min_minutes) AND (_max_minutes IS NULL OR i.runtime_minutes<=_max_minutes))) AND (i.media_type<>'book' OR ((_min_pages IS NULL OR i.page_count>=_min_pages) AND (_max_pages IS NULL OR i.page_count<=_max_pages)))), ranked AS (SELECT f.*,percent_rank() OVER(PARTITION BY is_georgian ORDER BY coalesce(popularity,0) DESC) AS popularity_rank FROM filtered f), candidates AS (SELECT id FROM ranked WHERE NOT _cold OR popularity_rank<=0.3 ORDER BY random() LIMIT 300) SELECT i.* FROM public.items i JOIN candidates c ON c.id=i.id ORDER BY random(); $$;
GRANT EXECUTE ON FUNCTION public.catalog_candidates(text,boolean,text[],integer,integer,integer,integer,boolean) TO authenticated;