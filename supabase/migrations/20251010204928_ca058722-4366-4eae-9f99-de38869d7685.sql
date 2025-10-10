-- Delete opening balance entries for accounts that have child accounts
-- This prevents duplication - balances should only be on leaf accounts

DELETE FROM journal_entry_lines
WHERE id IN (
  SELECT jel.id
  FROM journal_entry_lines jel
  INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
  INNER JOIN chart_of_accounts acc ON jel.account_id = acc.id
  WHERE je.reference = 'OPENING_BALANCE'
  AND EXISTS (
    -- Check if this account has any children
    SELECT 1 
    FROM chart_of_accounts child 
    WHERE child.parent_id = acc.id
  )
);