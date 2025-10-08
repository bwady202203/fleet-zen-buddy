-- Add tax_number and address columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS tax_number text,
ADD COLUMN IF NOT EXISTS address text;