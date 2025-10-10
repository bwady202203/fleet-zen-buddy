-- Delete any opening balance entries that might be duplicated on parent accounts
-- This ensures opening balances only exist on leaf (final level) accounts

DELETE FROM journal_entry_lines
WHERE id IN (
  SELECT jel.id
  FROM journal_entry_lines jel
  INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
  INNER JOIN chart_of_accounts acc ON jel.account_id = acc.id
  WHERE je.reference = 'OPENING_BALANCE'
  AND EXISTS (
    -- Check if this account has any children (is a parent account)
    SELECT 1 
    FROM chart_of_accounts child 
    WHERE child.parent_id = acc.id
  )
);

-- Also delete any orphaned journal entries (entries with no lines)
DELETE FROM journal_entries
WHERE id NOT IN (
  SELECT DISTINCT journal_entry_id 
  FROM journal_entry_lines
);