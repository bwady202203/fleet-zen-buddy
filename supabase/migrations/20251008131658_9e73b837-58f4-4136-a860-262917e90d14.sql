-- Add total_quantity column to companies table to track loads
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS total_quantity numeric DEFAULT 0;

-- Create function to update company quantity when load is created
CREATE OR REPLACE FUNCTION update_company_quantity_on_load()
RETURNS TRIGGER AS $$
BEGIN
  -- Add quantity to company's total
  UPDATE public.companies
  SET total_quantity = COALESCE(total_quantity, 0) + NEW.quantity
  WHERE id = NEW.company_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update company quantity when load is updated
CREATE OR REPLACE FUNCTION update_company_quantity_on_load_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Subtract old quantity
  UPDATE public.companies
  SET total_quantity = COALESCE(total_quantity, 0) - OLD.quantity
  WHERE id = OLD.company_id;
  
  -- Add new quantity
  UPDATE public.companies
  SET total_quantity = COALESCE(total_quantity, 0) + NEW.quantity
  WHERE id = NEW.company_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update company quantity when load is deleted
CREATE OR REPLACE FUNCTION update_company_quantity_on_load_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Subtract quantity from company's total
  UPDATE public.companies
  SET total_quantity = COALESCE(total_quantity, 0) - OLD.quantity
  WHERE id = OLD.company_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for loads table
DROP TRIGGER IF EXISTS trigger_update_company_quantity_on_load_insert ON public.loads;
CREATE TRIGGER trigger_update_company_quantity_on_load_insert
  AFTER INSERT ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION update_company_quantity_on_load();

DROP TRIGGER IF EXISTS trigger_update_company_quantity_on_load_update ON public.loads;
CREATE TRIGGER trigger_update_company_quantity_on_load_update
  AFTER UPDATE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION update_company_quantity_on_load_update();

DROP TRIGGER IF EXISTS trigger_update_company_quantity_on_load_delete ON public.loads;
CREATE TRIGGER trigger_update_company_quantity_on_load_delete
  AFTER DELETE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION update_company_quantity_on_load_delete();

-- Update existing companies with current totals
UPDATE public.companies c
SET total_quantity = (
  SELECT COALESCE(SUM(l.quantity), 0)
  FROM public.loads l
  WHERE l.company_id = c.id
);