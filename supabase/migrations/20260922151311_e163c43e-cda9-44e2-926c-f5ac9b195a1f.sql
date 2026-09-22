ALTER TABLE public.company_load_type_prices
  ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price numeric NOT NULL DEFAULT 0;

UPDATE public.company_load_type_prices
SET sale_price = COALESCE(NULLIF(sale_price, 0), COALESCE(unit_price, 0))
WHERE sale_price = 0;