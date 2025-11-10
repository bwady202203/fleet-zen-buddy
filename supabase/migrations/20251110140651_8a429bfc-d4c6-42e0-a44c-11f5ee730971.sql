-- Add debit_account_id to maintenance_purchase_invoices table
ALTER TABLE public.maintenance_purchase_invoices
ADD COLUMN IF NOT EXISTS debit_account_id UUID REFERENCES public.chart_of_accounts(id);