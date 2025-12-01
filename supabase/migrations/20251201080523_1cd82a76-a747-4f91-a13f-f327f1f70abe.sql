-- Create collection receipts table
CREATE TABLE IF NOT EXISTS public.collection_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  receipt_date DATE NOT NULL,
  debit_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  credit_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  amount_in_words TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.collection_receipts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view collection receipts"
  ON public.collection_receipts
  FOR SELECT
  USING (
    organization_id = get_user_organization(auth.uid()) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can manage collection receipts"
  ON public.collection_receipts
  FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Create index
CREATE INDEX idx_collection_receipts_organization ON public.collection_receipts(organization_id);
CREATE INDEX idx_collection_receipts_date ON public.collection_receipts(receipt_date);

-- Add trigger for updated_at
CREATE TRIGGER update_collection_receipts_updated_at
  BEFORE UPDATE ON public.collection_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();