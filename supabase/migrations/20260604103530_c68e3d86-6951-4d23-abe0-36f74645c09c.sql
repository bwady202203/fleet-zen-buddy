
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS driver_commission numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_commission numeric NOT NULL DEFAULT 0;

ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS driver_commission numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_commission numeric NOT NULL DEFAULT 0;
