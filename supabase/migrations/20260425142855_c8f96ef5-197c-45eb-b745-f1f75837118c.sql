-- Add cumulative tracking columns
ALTER TABLE public.spare_parts
ADD COLUMN IF NOT EXISTS total_purchased integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_maintenance_used integer NOT NULL DEFAULT 0;

-- Backfill total_purchased from existing purchases
UPDATE public.spare_parts sp
SET total_purchased = COALESCE((
  SELECT SUM(spp.quantity)::integer
  FROM public.spare_parts_purchases spp
  WHERE spp.spare_part_id = sp.id
), 0);

-- Backfill total_maintenance_used from stock_transactions (maintenance is stored as negative)
UPDATE public.spare_parts sp
SET total_maintenance_used = COALESCE((
  SELECT SUM(ABS(st.quantity))::integer
  FROM public.stock_transactions st
  WHERE st.spare_part_id = sp.id
    AND st.type = 'maintenance'
), 0);