-- Add balance column to chart_of_accounts table
ALTER TABLE public.chart_of_accounts
ADD COLUMN balance NUMERIC DEFAULT 0 NOT NULL;