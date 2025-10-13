-- Add branch_id column to journal_entry_lines table
ALTER TABLE public.journal_entry_lines
ADD COLUMN branch_id uuid REFERENCES public.branches(id);