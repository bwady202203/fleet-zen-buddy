UPDATE public.global_material_prices
SET cost_price = 9,
    updated_at = now()
WHERE cost_price IS DISTINCT FROM 9;