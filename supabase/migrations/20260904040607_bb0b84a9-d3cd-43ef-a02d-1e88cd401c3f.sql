-- employees extra fields
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_number TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department TEXT;

CREATE SEQUENCE IF NOT EXISTS public.employee_advance_number_seq;

CREATE TABLE public.employee_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  advance_number TEXT NOT NULL,
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  employee_number TEXT,
  department TEXT,
  position TEXT,
  residence_number TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  advance_type TEXT NOT NULL DEFAULT 'personal',
  installments_count INTEGER NOT NULL DEFAULT 1,
  installment_amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  first_installment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_installment_date DATE,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_advances_number_unique UNIQUE (advance_number),
  CONSTRAINT employee_advances_status_check CHECK (status IN ('draft','pending','approved','rejected','completed','cancelled')),
  CONSTRAINT employee_advances_frequency_check CHECK (frequency IN ('monthly','weekly','semimonthly'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_advances TO authenticated;
GRANT ALL ON public.employee_advances TO service_role;
ALTER TABLE public.employee_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advances_select" ON public.employee_advances FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY "advances_insert" ON public.employee_advances FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NULL OR organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY "advances_update" ON public.employee_advances FOR UPDATE TO authenticated
  USING (organization_id IS NULL OR organization_id IN (SELECT public.get_user_organizations(auth.uid())));
CREATE POLICY "advances_delete" ON public.employee_advances FOR DELETE TO authenticated
  USING (organization_id IS NULL OR organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE TABLE public.advance_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id UUID NOT NULL REFERENCES public.employee_advances(id) ON DELETE CASCADE,
  organization_id UUID,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_after NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming',
  payroll_reference TEXT,
  deducted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT advance_installments_unique UNIQUE (advance_id, installment_number),
  CONSTRAINT advance_installments_status_check CHECK (status IN ('upcoming','due','deducted','paid','late','cancelled'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advance_installments TO authenticated;
GRANT ALL ON public.advance_installments TO service_role;
ALTER TABLE public.advance_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advance_installments_all" ON public.advance_installments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employee_advances a WHERE a.id = advance_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employee_advances a WHERE a.id = advance_id));

CREATE UNIQUE INDEX advance_installments_payroll_unique
  ON public.advance_installments (advance_id, installment_number, payroll_reference)
  WHERE payroll_reference IS NOT NULL;

CREATE TABLE public.advance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id UUID NOT NULL REFERENCES public.employee_advances(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES public.advance_installments(id) ON DELETE SET NULL,
  organization_id UUID,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'payroll',
  payroll_reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT advance_payments_method_check CHECK (method IN ('payroll','early','cash','bank'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advance_payments TO authenticated;
GRANT ALL ON public.advance_payments TO service_role;
ALTER TABLE public.advance_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advance_payments_all" ON public.advance_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employee_advances a WHERE a.id = advance_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employee_advances a WHERE a.id = advance_id));

CREATE TABLE public.advance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id UUID NOT NULL REFERENCES public.employee_advances(id) ON DELETE CASCADE,
  organization_id UUID,
  action TEXT NOT NULL,
  description TEXT,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.advance_audit_logs TO authenticated;
GRANT ALL ON public.advance_audit_logs TO service_role;
ALTER TABLE public.advance_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advance_audit_select" ON public.advance_audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employee_advances a WHERE a.id = advance_id));
CREATE POLICY "advance_audit_insert" ON public.advance_audit_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.employee_advances a WHERE a.id = advance_id));

CREATE INDEX idx_employee_advances_employee ON public.employee_advances(employee_id);
CREATE INDEX idx_employee_advances_status ON public.employee_advances(status);
CREATE INDEX idx_advance_installments_advance ON public.advance_installments(advance_id);
CREATE INDEX idx_advance_installments_due ON public.advance_installments(due_date);
CREATE INDEX idx_advance_payments_advance ON public.advance_payments(advance_id);
CREATE INDEX idx_advance_audit_advance ON public.advance_audit_logs(advance_id);

CREATE TRIGGER update_employee_advances_updated_at BEFORE UPDATE ON public.employee_advances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_advance_installments_updated_at BEFORE UPDATE ON public.advance_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_advance_payments_updated_at BEFORE UPDATE ON public.advance_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.next_advance_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN 'ADV-' || LPAD(nextval('public.employee_advance_number_seq')::TEXT, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_advance_number() TO authenticated, service_role;