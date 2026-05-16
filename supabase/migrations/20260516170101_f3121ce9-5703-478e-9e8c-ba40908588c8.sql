-- Add journal entry reference columns to payment_vouchers
ALTER TABLE public.payment_vouchers
ADD COLUMN journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
ADD COLUMN journal_entry_number TEXT;

-- Add journal entry reference columns to collection_receipts
ALTER TABLE public.collection_receipts
ADD COLUMN journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
ADD COLUMN journal_entry_number TEXT;

-- Backfill existing payment_vouchers with their journal entry numbers
UPDATE public.payment_vouchers pv
SET journal_entry_id = je.id,
    journal_entry_number = je.entry_number
FROM public.journal_entries je
WHERE je.reference = 'payment_voucher_' || pv.id;

-- Backfill existing collection_receipts with their journal entry numbers
UPDATE public.collection_receipts cr
SET journal_entry_id = je.id,
    journal_entry_number = je.entry_number
FROM public.journal_entries je
WHERE je.reference = 'collection_receipt_' || cr.id;