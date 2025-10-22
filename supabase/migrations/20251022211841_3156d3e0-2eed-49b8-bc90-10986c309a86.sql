-- Create trial balance entries table
CREATE TABLE public.trial_balance_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_debit NUMERIC DEFAULT 0,
  opening_credit NUMERIC DEFAULT 0,
  opening_balance NUMERIC DEFAULT 0,
  period_debit NUMERIC DEFAULT 0,
  period_credit NUMERIC DEFAULT 0,
  closing_debit NUMERIC DEFAULT 0,
  closing_credit NUMERIC DEFAULT 0,
  closing_balance NUMERIC DEFAULT 0,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_balance_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their organization trial balance"
ON public.trial_balance_entries
FOR SELECT
USING (
  (organization_id = get_user_organization(auth.uid())) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Accountants and admins can manage trial balance"
ON public.trial_balance_entries
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'accountant'::app_role)
);

-- Create indexes
CREATE INDEX idx_trial_balance_account ON public.trial_balance_entries(account_id);
CREATE INDEX idx_trial_balance_period ON public.trial_balance_entries(period_start, period_end);
CREATE INDEX idx_trial_balance_org ON public.trial_balance_entries(organization_id);
CREATE INDEX idx_trial_balance_branch ON public.trial_balance_entries(branch_id);