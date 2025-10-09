-- Add commercial_registration and phone to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS commercial_registration text,
ADD COLUMN IF NOT EXISTS phone text;

-- Update the default commercial registration for existing records
UPDATE public.company_settings 
SET commercial_registration = '2050147243' 
WHERE commercial_registration IS NULL;