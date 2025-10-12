-- Add commercial_registration column to companies table
ALTER TABLE public.companies 
ADD COLUMN commercial_registration text;