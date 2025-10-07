-- Create custody expenses table
CREATE TABLE public.custody_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  representative_id UUID NOT NULL REFERENCES custody_representatives(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  expense_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custody_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and managers can manage expenses"
ON public.custody_expenses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can view expenses"
ON public.custody_expenses
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_custody_expenses_updated_at
BEFORE UPDATE ON public.custody_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();