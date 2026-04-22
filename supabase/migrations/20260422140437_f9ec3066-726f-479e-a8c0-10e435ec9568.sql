
-- ZATCA Approved Invoices
CREATE TABLE public.zatca_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  invoice_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  invoice_type TEXT NOT NULL DEFAULT 'standard' CHECK (invoice_type IN ('standard','simplified')),
  invoice_subtype TEXT NOT NULL DEFAULT 'invoice' CHECK (invoice_subtype IN ('invoice','credit','debit')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_time TIME NOT NULL DEFAULT CURRENT_TIME,
  -- Seller (snapshot)
  seller_name TEXT NOT NULL,
  seller_vat TEXT NOT NULL,
  seller_crn TEXT,
  seller_address JSONB,
  -- Buyer
  buyer_name TEXT,
  buyer_vat TEXT,
  buyer_address JSONB,
  -- Totals
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_with_tax NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  -- Items (denormalized for simplicity)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  -- ZATCA cryptographic / counter fields
  icv INTEGER NOT NULL DEFAULT 0, -- Invoice Counter Value
  pih TEXT, -- Previous Invoice Hash
  invoice_hash TEXT, -- Current invoice hash
  qr_base64 TEXT, -- TLV QR base64
  xml_content TEXT, -- UBL 2.1 XML payload
  signed_xml TEXT, -- Signed XML
  -- Submission status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','submitted','cleared','reported','rejected','warning')),
  zatca_uuid TEXT,
  zatca_response JSONB,
  cleared_at TIMESTAMPTZ,
  reported_at TIMESTAMPTZ,
  rejection_reason TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_zatca_invoices_status ON public.zatca_invoices(status);
CREATE INDEX idx_zatca_invoices_date ON public.zatca_invoices(issue_date DESC);
CREATE UNIQUE INDEX idx_zatca_invoices_number ON public.zatca_invoices(invoice_number);

ALTER TABLE public.zatca_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view zatca invoices"
ON public.zatca_invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins/accountants manage zatca invoices"
ON public.zatca_invoices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role));

CREATE TRIGGER zatca_invoices_updated_at
BEFORE UPDATE ON public.zatca_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ZATCA Submission Log (audit trail of every API call)
CREATE TABLE public.zatca_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  invoice_id UUID REFERENCES public.zatca_invoices(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('clearance','reporting','compliance','validation')),
  environment TEXT NOT NULL DEFAULT 'sandbox',
  request_payload JSONB,
  response_payload JSONB,
  status_code INTEGER,
  result TEXT CHECK (result IN ('success','warning','error','pending')),
  message TEXT,
  warnings JSONB,
  errors JSONB,
  zatca_uuid TEXT,
  cleared_invoice TEXT, -- base64 cleared invoice
  qr_code TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_zatca_submissions_invoice ON public.zatca_submissions(invoice_id);
CREATE INDEX idx_zatca_submissions_created ON public.zatca_submissions(created_at DESC);

ALTER TABLE public.zatca_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view submissions"
ON public.zatca_submissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins/accountants insert submissions"
ON public.zatca_submissions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role));
