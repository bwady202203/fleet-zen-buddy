ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS medical_insurance_expiry DATE,
  ADD COLUMN IF NOT EXISTS establishment_name TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_number TEXT;