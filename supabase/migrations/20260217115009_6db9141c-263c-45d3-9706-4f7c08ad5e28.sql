
-- Create a sequence starting at 110000
CREATE SEQUENCE IF NOT EXISTS public.universal_journal_serial START WITH 110000 INCREMENT BY 1;

-- Add universal_serial column to journal_entries
ALTER TABLE public.journal_entries ADD COLUMN universal_serial TEXT UNIQUE;

-- Create function to generate next serial with prefix
CREATE OR REPLACE FUNCTION public.generate_universal_serial(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_val BIGINT;
BEGIN
  next_val := nextval('public.universal_journal_serial');
  RETURN prefix || '-' || next_val::TEXT;
END;
$$;

-- Backfill existing 2026 journal entries with JE prefix
-- We need to determine type: check if linked to custody_journal_entries or transfer_requests
DO $$
DECLARE
  rec RECORD;
  serial_prefix TEXT;
  next_serial TEXT;
BEGIN
  FOR rec IN 
    SELECT je.id, je.date,
      CASE 
        WHEN EXISTS (SELECT 1 FROM custody_journal_entries cje WHERE cje.journal_entry_id = je.id) THEN 'ST'
        WHEN EXISTS (SELECT 1 FROM transfer_requests tr WHERE tr.journal_entry_id = je.id) THEN 'TR'
        ELSE 'JE'
      END AS entry_type
    FROM journal_entries je
    WHERE je.date >= '2026-01-01'
      AND je.universal_serial IS NULL
    ORDER BY je.date ASC, je.created_at ASC
  LOOP
    next_serial := generate_universal_serial(rec.entry_type);
    UPDATE journal_entries SET universal_serial = next_serial WHERE id = rec.id;
  END LOOP;
END;
$$;
