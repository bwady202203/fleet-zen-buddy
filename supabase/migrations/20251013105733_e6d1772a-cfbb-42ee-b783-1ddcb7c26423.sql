-- Drop the old foreign key constraint on custody_expenses
ALTER TABLE custody_expenses
DROP CONSTRAINT IF EXISTS custody_expenses_representative_id_fkey;

-- Add new foreign key constraint pointing to chart_of_accounts
ALTER TABLE custody_expenses
ADD CONSTRAINT custody_expenses_representative_id_fkey
FOREIGN KEY (representative_id) REFERENCES chart_of_accounts(id) ON DELETE CASCADE;

-- Modify expense_type column to be UUID instead of text
ALTER TABLE custody_expenses
ALTER COLUMN expense_type TYPE uuid USING expense_type::uuid;

-- Add foreign key constraint for expense_type pointing to chart_of_accounts
ALTER TABLE custody_expenses
ADD CONSTRAINT custody_expenses_expense_type_fkey
FOREIGN KEY (expense_type) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT;