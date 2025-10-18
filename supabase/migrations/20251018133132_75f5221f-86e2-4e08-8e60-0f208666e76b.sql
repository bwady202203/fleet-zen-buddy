-- Create payment vouchers table
CREATE TABLE public.payment_vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_number TEXT NOT NULL,
  voucher_date DATE NOT NULL,
  debit_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  credit_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  organization_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_vouchers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage payment vouchers"
ON public.payment_vouchers
FOR ALL
USING (
  (organization_id = get_user_organization(auth.uid())) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can view payment vouchers"
ON public.payment_vouchers
FOR SELECT
USING (
  (organization_id = get_user_organization(auth.uid())) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create index for faster queries
CREATE INDEX idx_payment_vouchers_organization ON public.payment_vouchers(organization_id);
CREATE INDEX idx_payment_vouchers_date ON public.payment_vouchers(voucher_date);
CREATE INDEX idx_payment_vouchers_number ON public.payment_vouchers(voucher_number);