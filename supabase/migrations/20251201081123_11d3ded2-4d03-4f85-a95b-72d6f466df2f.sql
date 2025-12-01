-- Add recipient_name column to collection_receipts table
ALTER TABLE public.collection_receipts 
ADD COLUMN IF NOT EXISTS recipient_name TEXT;