DROP POLICY "shop writes own stock" ON public.shop_stock;
CREATE POLICY "shop writes own stock" ON public.shop_stock FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = auth.uid() AND r.role = 'shop'::app_role AND r.shop_id = shop_stock.shop_id))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = auth.uid() AND r.role = 'shop'::app_role AND r.shop_id = shop_stock.shop_id));