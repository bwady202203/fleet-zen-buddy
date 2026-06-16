ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY name) as rn
  FROM public.drivers WHERE is_active = true
)
UPDATE public.drivers d
SET sort_order = n.rn
FROM numbered n
WHERE d.id = n.id;

CREATE INDEX IF NOT EXISTS idx_drivers_sort_order ON public.drivers(sort_order);
