ALTER TABLE public.shops ADD COLUMN is_sample boolean NOT NULL DEFAULT false;
UPDATE public.shops SET is_sample = true;
DELETE FROM public.shop_stock a USING public.shop_stock b WHERE a.shop_id = b.shop_id AND a.item_id = b.item_id AND a.id < b.id;
ALTER TABLE public.shop_stock ADD CONSTRAINT shop_stock_shop_item_unique UNIQUE (shop_id, item_id);
COMMENT ON COLUMN public.shops.is_sample IS 'True for the built-in demo shops; real shops show an updated date instead of the sample label.';