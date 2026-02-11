
CREATE TABLE public.watched_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, organization_id)
);

ALTER TABLE public.watched_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view watched accounts" ON public.watched_accounts FOR SELECT USING (true);
CREATE POLICY "Users can insert watched accounts" ON public.watched_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete watched accounts" ON public.watched_accounts FOR DELETE USING (true);
