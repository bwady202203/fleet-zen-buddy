-- Add trigger to delete journal entries when custody transfer is deleted
CREATE OR REPLACE FUNCTION delete_custody_transfer_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete journal entry with reference to this transfer
  DELETE FROM journal_entries
  WHERE reference = 'custody_transfer_' || OLD.id::text;
  
  RETURN OLD;
END;
$$;

-- Create trigger on custody_transfers
DROP TRIGGER IF EXISTS trigger_delete_custody_transfer_journal ON custody_transfers;
CREATE TRIGGER trigger_delete_custody_transfer_journal
BEFORE DELETE ON custody_transfers
FOR EACH ROW
EXECUTE FUNCTION delete_custody_transfer_journal_entry();

-- Add trigger to delete journal entries when custody expense is deleted
CREATE OR REPLACE FUNCTION delete_custody_expense_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete journal entry with reference to this expense
  DELETE FROM journal_entries
  WHERE reference = 'custody_expense_' || OLD.id::text;
  
  RETURN OLD;
END;
$$;

-- Create trigger on custody_expenses
DROP TRIGGER IF EXISTS trigger_delete_custody_expense_journal ON custody_expenses;
CREATE TRIGGER trigger_delete_custody_expense_journal
BEFORE DELETE ON custody_expenses
FOR EACH ROW
EXECUTE FUNCTION delete_custody_expense_journal_entry();