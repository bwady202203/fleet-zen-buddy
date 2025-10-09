-- Add driver_name and color columns to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS driver_name TEXT,
ADD COLUMN IF NOT EXISTS color TEXT;