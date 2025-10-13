-- Add invoice_date column to loads table
ALTER TABLE public.loads
ADD COLUMN invoice_date date;