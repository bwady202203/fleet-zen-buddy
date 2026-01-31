-- Create table for storing smart journal account order per user
CREATE TABLE public.smart_journal_account_order (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_order TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on user_id
CREATE UNIQUE INDEX smart_journal_account_order_user_id_key ON public.smart_journal_account_order(user_id);

-- Enable RLS
ALTER TABLE public.smart_journal_account_order ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own account order"
ON public.smart_journal_account_order
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account order"
ON public.smart_journal_account_order
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own account order"
ON public.smart_journal_account_order
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_smart_journal_account_order_updated_at
BEFORE UPDATE ON public.smart_journal_account_order
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();