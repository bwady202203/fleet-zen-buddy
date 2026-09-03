CREATE TABLE public.journal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  reference_number TEXT,
  doc_date DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  beneficiary_name TEXT,
  sender_name TEXT,
  account_number TEXT,
  notes TEXT,
  image_path TEXT,
  extracted_data JSONB,
  debit_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  credit_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_documents TO authenticated;
GRANT ALL ON public.journal_documents TO service_role;

ALTER TABLE public.journal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view journal documents"
ON public.journal_documents FOR SELECT TO authenticated
USING (organization_id IS NULL OR organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE POLICY "Org members can insert journal documents"
ON public.journal_documents FOR INSERT TO authenticated
WITH CHECK (organization_id IS NULL OR organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE POLICY "Org members can update journal documents"
ON public.journal_documents FOR UPDATE TO authenticated
USING (organization_id IS NULL OR organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE POLICY "Org members can delete journal documents"
ON public.journal_documents FOR DELETE TO authenticated
USING (organization_id IS NULL OR organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE TRIGGER update_journal_documents_updated_at
BEFORE UPDATE ON public.journal_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_journal_documents_date ON public.journal_documents(doc_date);
CREATE INDEX idx_journal_documents_ref ON public.journal_documents(reference_number);