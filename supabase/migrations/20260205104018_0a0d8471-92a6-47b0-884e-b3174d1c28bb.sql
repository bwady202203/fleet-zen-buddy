-- Add tax-related columns to transfer_request_items table
ALTER TABLE public.transfer_request_items
ADD COLUMN has_tax boolean DEFAULT false,
ADD COLUMN is_tax_row boolean DEFAULT false,
ADD COLUMN parent_item_id uuid REFERENCES public.transfer_request_items(id) ON DELETE CASCADE;