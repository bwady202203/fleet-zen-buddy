-- Add new fields to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS residence_number text;