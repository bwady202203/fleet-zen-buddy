-- Create driver transfer receipts table
CREATE TABLE IF NOT EXISTS public.driver_transfer_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  organization_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_transfer_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization driver transfer receipts"
ON public.driver_transfer_receipts
FOR SELECT
USING (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid()))
);

CREATE POLICY "Users can manage their organization driver transfer receipts"
ON public.driver_transfer_receipts
FOR ALL
USING (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid())) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid()))
);

-- Create index for better performance
CREATE INDEX idx_driver_transfer_receipts_driver_id ON public.driver_transfer_receipts(driver_id);
CREATE INDEX idx_driver_transfer_receipts_org_id ON public.driver_transfer_receipts(organization_id);