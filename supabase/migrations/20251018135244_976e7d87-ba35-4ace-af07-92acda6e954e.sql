-- Add level column to chart_of_accounts for faster queries
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS level INTEGER;

-- Create index on level column for better performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_level ON chart_of_accounts(level);

-- Create index on code for faster search
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(code);

-- Create index on name_ar for faster search
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_name_ar ON chart_of_accounts(name_ar);

-- Create function to calculate account level
CREATE OR REPLACE FUNCTION calculate_account_level(account_id UUID)
RETURNS INTEGER AS $$
DECLARE
  level_count INTEGER := 1;
  current_parent_id UUID;
BEGIN
  SELECT parent_id INTO current_parent_id
  FROM chart_of_accounts
  WHERE id = account_id;
  
  WHILE current_parent_id IS NOT NULL LOOP
    level_count := level_count + 1;
    SELECT parent_id INTO current_parent_id
    FROM chart_of_accounts
    WHERE id = current_parent_id;
  END LOOP;
  
  RETURN level_count;
END;
$$ LANGUAGE plpgsql;

-- Update all existing accounts with their level
UPDATE chart_of_accounts
SET level = calculate_account_level(id);

-- Create trigger to automatically set level on insert/update
CREATE OR REPLACE FUNCTION set_account_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := calculate_account_level(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_account_level
BEFORE INSERT OR UPDATE ON chart_of_accounts
FOR EACH ROW
EXECUTE FUNCTION set_account_level();