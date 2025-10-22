-- Create function to update account balances
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT and UPDATE, update the new account balance
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE chart_of_accounts
    SET balance = (
      SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
      FROM journal_entry_lines
      WHERE account_id = NEW.account_id
    )
    WHERE id = NEW.account_id;
  END IF;
  
  -- For UPDATE, also update the old account if account changed
  IF (TG_OP = 'UPDATE' AND OLD.account_id != NEW.account_id) THEN
    UPDATE chart_of_accounts
    SET balance = (
      SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
      FROM journal_entry_lines
      WHERE account_id = OLD.account_id
    )
    WHERE id = OLD.account_id;
  END IF;
  
  -- For DELETE, update the account balance
  IF (TG_OP = 'DELETE') THEN
    UPDATE chart_of_accounts
    SET balance = (
      SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
      FROM journal_entry_lines
      WHERE account_id = OLD.account_id
    )
    WHERE id = OLD.account_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on journal_entry_lines
DROP TRIGGER IF EXISTS trigger_update_account_balance ON journal_entry_lines;
CREATE TRIGGER trigger_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- Recalculate all existing balances
UPDATE chart_of_accounts
SET balance = (
  SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
  FROM journal_entry_lines
  WHERE account_id = chart_of_accounts.id
);