-- Create table for account visibility preferences in smart journal
CREATE TABLE public.smart_journal_account_visibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id, organization_id)
);

-- Create table for smart journal entry drafts (temporary entries before saving)
CREATE TABLE public.smart_journal_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_code TEXT NOT NULL,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smart_journal_account_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_journal_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for smart_journal_account_visibility
CREATE POLICY "Users can view their own visibility settings"
ON public.smart_journal_account_visibility
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own visibility settings"
ON public.smart_journal_account_visibility
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visibility settings"
ON public.smart_journal_account_visibility
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own visibility settings"
ON public.smart_journal_account_visibility
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for smart_journal_drafts
CREATE POLICY "Users can view their own drafts"
ON public.smart_journal_drafts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts"
ON public.smart_journal_drafts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
ON public.smart_journal_drafts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
ON public.smart_journal_drafts
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_smart_journal_visibility_updated_at
BEFORE UPDATE ON public.smart_journal_account_visibility
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_journal_drafts_updated_at
BEFORE UPDATE ON public.smart_journal_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();