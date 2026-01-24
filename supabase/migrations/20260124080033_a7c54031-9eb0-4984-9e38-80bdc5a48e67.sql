-- Drop and recreate custody_journal_entries table with proper structure for expense linking
DROP TABLE IF EXISTS custody_journal_entries;

CREATE TABLE public.custody_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  custody_expense_id UUID REFERENCES custody_expenses(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  debit_account_id UUID NOT NULL,
  debit_account_name TEXT,
  credit_account_id UUID NOT NULL,
  credit_account_name TEXT,
  amount NUMERIC NOT NULL,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  description TEXT,
  entry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  organization_id UUID REFERENCES organizations(id),
  UNIQUE(custody_expense_id)
);

-- Enable RLS
ALTER TABLE public.custody_journal_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view custody journal entries"
ON public.custody_journal_entries
FOR SELECT
USING (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Users can manage custody journal entries"
ON public.custody_journal_entries
FOR ALL
USING (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid()))
);

-- Create indexes for faster lookups
CREATE INDEX idx_custody_journal_expense ON custody_journal_entries(custody_expense_id);
CREATE INDEX idx_custody_journal_entry ON custody_journal_entries(journal_entry_id);
CREATE INDEX idx_custody_journal_date ON custody_journal_entries(entry_date);