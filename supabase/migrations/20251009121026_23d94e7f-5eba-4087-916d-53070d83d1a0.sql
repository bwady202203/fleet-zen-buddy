-- Add supplier_id to load_invoices table
ALTER TABLE public.load_invoices 
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);