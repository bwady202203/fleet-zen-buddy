-- Ensure each account has only one net opening balance entry
-- Delete duplicate opening balance entries and keep only one per account

-- First, create a temporary table with the net opening balance for each account
CREATE TEMP TABLE temp_opening_balances AS
SELECT 
  jel.account_id,
  SUM(jel.debit) - SUM(jel.credit) as net_balance,
  MIN(je.date) as earliest_date
FROM journal_entry_lines jel
INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE je.reference = 'OPENING_BALANCE'
GROUP BY jel.account_id
HAVING SUM(jel.debit) - SUM(jel.credit) != 0;

-- Delete all existing opening balance entries
DELETE FROM journal_entry_lines
WHERE journal_entry_id IN (
  SELECT id FROM journal_entries WHERE reference = 'OPENING_BALANCE'
);

-- Delete orphaned opening balance journal entries
DELETE FROM journal_entries WHERE reference = 'OPENING_BALANCE';

-- Insert one clean opening balance entry per account
INSERT INTO journal_entries (date, entry_number, description, reference)
SELECT DISTINCT
  earliest_date,
  'OB-' || account_id,
  'رصيد افتتاحي موحد',
  'OPENING_BALANCE'
FROM temp_opening_balances;

-- Insert the journal entry lines with net balances
INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
SELECT 
  je.id,
  tob.account_id,
  CASE WHEN tob.net_balance > 0 THEN tob.net_balance ELSE 0 END as debit,
  CASE WHEN tob.net_balance < 0 THEN ABS(tob.net_balance) ELSE 0 END as credit,
  'رصيد افتتاحي موحد'
FROM temp_opening_balances tob
INNER JOIN journal_entries je ON je.entry_number = 'OB-' || tob.account_id AND je.reference = 'OPENING_BALANCE';

-- Clean up
DROP TABLE temp_opening_balances;