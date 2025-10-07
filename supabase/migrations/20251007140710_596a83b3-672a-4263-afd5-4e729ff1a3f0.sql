-- Create driver payments table to track transfers
CREATE TABLE public.driver_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and managers can manage driver payments"
ON public.driver_payments
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can view driver payments"
ON public.driver_payments
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_driver_payments_updated_at
BEFORE UPDATE ON public.driver_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();