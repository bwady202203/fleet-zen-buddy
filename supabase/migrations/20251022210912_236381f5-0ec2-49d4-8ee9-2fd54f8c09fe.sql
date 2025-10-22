-- Create ledger entries table for better ledger management
CREATE TABLE public.ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  description TEXT,
  reference TEXT,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their organization ledger entries"
ON public.ledger_entries
FOR SELECT
USING (
  (organization_id = get_user_organization(auth.uid())) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Accountants and admins can manage ledger entries"
ON public.ledger_entries
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'accountant'::app_role)
);

-- Create index for better performance
CREATE INDEX idx_ledger_entries_account_date ON public.ledger_entries(account_id, entry_date);
CREATE INDEX idx_ledger_entries_org ON public.ledger_entries(organization_id);
CREATE INDEX idx_ledger_entries_branch ON public.ledger_entries(branch_id);

-- Create function to automatically create ledger entries from journal entry lines
CREATE OR REPLACE FUNCTION public.create_ledger_entry_from_journal_line()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_date DATE;
  v_entry_number TEXT;
  v_organization_id UUID;
  v_previous_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Get journal entry details
  SELECT je.date, je.entry_number, je.organization_id
  INTO v_entry_date, v_entry_number, v_organization_id
  FROM journal_entries je
  WHERE je.id = NEW.journal_entry_id;
  
  -- Get previous balance
  SELECT COALESCE(balance, 0)
  INTO v_previous_balance
  FROM ledger_entries
  WHERE account_id = NEW.account_id
  ORDER BY entry_date DESC, created_at DESC
  LIMIT 1;
  
  -- Calculate new balance (debit increases, credit decreases)
  v_new_balance := v_previous_balance + COALESCE(NEW.debit, 0) - COALESCE(NEW.credit, 0);
  
  -- Insert ledger entry
  INSERT INTO ledger_entries (
    account_id,
    entry_date,
    description,
    reference,
    debit,
    credit,
    balance,
    branch_id,
    journal_entry_id,
    organization_id,
    created_by
  ) VALUES (
    NEW.account_id,
    v_entry_date,
    NEW.description,
    v_entry_number,
    COALESCE(NEW.debit, 0),
    COALESCE(NEW.credit, 0),
    v_new_balance,
    NEW.branch_id,
    NEW.journal_entry_id,
    v_organization_id,
    auth.uid()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create ledger entries
CREATE TRIGGER trigger_create_ledger_entry
AFTER INSERT ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.create_ledger_entry_from_journal_line();

-- Create function to handle updates
CREATE OR REPLACE FUNCTION public.update_ledger_entry_from_journal_line()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete old ledger entry and let the insert trigger recreate it
  DELETE FROM ledger_entries WHERE journal_entry_id = OLD.journal_entry_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for updates
CREATE TRIGGER trigger_update_ledger_entry
AFTER UPDATE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_ledger_entry_from_journal_line();

-- Create function to handle deletions
CREATE OR REPLACE FUNCTION public.delete_ledger_entry_from_journal_line()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM ledger_entries 
  WHERE journal_entry_id = OLD.journal_entry_id 
  AND account_id = OLD.account_id;
  
  RETURN OLD;
END;
$$;

-- Create trigger for deletions
CREATE TRIGGER trigger_delete_ledger_entry
AFTER DELETE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.delete_ledger_entry_from_journal_line();