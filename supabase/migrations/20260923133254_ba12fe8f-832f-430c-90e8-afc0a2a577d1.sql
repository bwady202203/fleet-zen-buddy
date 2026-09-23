INSERT INTO public.global_material_prices (organization_id, load_type_id, cost_price, sale_price)
SELECT NULL, lt.id, 9, 0
FROM public.load_types lt
WHERE COALESCE(lt.is_active, true) = true
ON CONFLICT (organization_id, load_type_id)
DO UPDATE SET
  cost_price = 9,
  updated_at = now();