-- Add received_from column to collection_receipts table
ALTER TABLE public.collection_receipts 
ADD COLUMN IF NOT EXISTS received_from text;