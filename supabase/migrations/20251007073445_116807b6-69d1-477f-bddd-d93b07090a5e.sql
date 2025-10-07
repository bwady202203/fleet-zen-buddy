-- Create table for custody representatives
CREATE TABLE IF NOT EXISTS public.custody_representatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  total_custody NUMERIC DEFAULT 0,
  current_custody NUMERIC DEFAULT 0,
  remaining_custody NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for custody transfers
CREATE TABLE IF NOT EXISTS public.custody_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_date DATE NOT NULL,
  recipient_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  expense_type TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for custody journal entries
CREATE TABLE IF NOT EXISTS public.custody_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  transfer_id UUID REFERENCES public.custody_transfers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custody_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custody_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custody_journal_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for custody_representatives
CREATE POLICY "Admins and managers can manage representatives"
ON public.custody_representatives
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can view representatives"
ON public.custody_representatives
FOR SELECT
USING (true);

-- Create policies for custody_transfers
CREATE POLICY "Admins and managers can manage transfers"
ON public.custody_transfers
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can view transfers"
ON public.custody_transfers
FOR SELECT
USING (true);

-- Create policies for custody_journal_entries
CREATE POLICY "Admins and accountants can manage journal entries"
ON public.custody_journal_entries
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'));

CREATE POLICY "Authenticated users can view journal entries"
ON public.custody_journal_entries
FOR SELECT
USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_custody_representatives_updated_at
BEFORE UPDATE ON public.custody_representatives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custody_transfers_updated_at
BEFORE UPDATE ON public.custody_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custody_journal_entries_updated_at
BEFORE UPDATE ON public.custody_journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();