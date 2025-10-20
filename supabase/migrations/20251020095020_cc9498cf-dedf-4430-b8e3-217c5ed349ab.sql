-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  order_date DATE NOT NULL,
  supplier_name TEXT NOT NULL,
  description TEXT NOT NULL,
  debit_account_id UUID NOT NULL,
  credit_account_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage purchase orders"
ON public.purchase_orders
FOR ALL
USING (
  (organization_id = get_user_organization(auth.uid())) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can view purchase orders"
ON public.purchase_orders
FOR SELECT
USING (
  (organization_id = get_user_organization(auth.uid())) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
