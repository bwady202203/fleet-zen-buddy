-- Create load types table
CREATE TABLE public.load_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create companies (customers) table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  total_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create loads table
CREATE TABLE public.loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_number TEXT NOT NULL UNIQUE,
  invoice_number TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  load_type_id UUID REFERENCES public.load_types(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  truck_number TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create load invoices table
CREATE TABLE public.load_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  payment_type TEXT DEFAULT 'cash',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create load invoice items table
CREATE TABLE public.load_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.load_invoices(id) ON DELETE CASCADE,
  load_id UUID REFERENCES public.loads(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payment receipts table
CREATE TABLE public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.load_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for load_types
CREATE POLICY "Authenticated users can view load types"
  ON public.load_types FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage load types"
  ON public.load_types FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for drivers
CREATE POLICY "Authenticated users can view drivers"
  ON public.drivers FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage drivers"
  ON public.drivers FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for companies
CREATE POLICY "Authenticated users can view companies"
  ON public.companies FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage companies"
  ON public.companies FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for loads
CREATE POLICY "Authenticated users can view loads"
  ON public.loads FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create loads"
  ON public.loads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins and managers can manage loads"
  ON public.loads FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for load_invoices
CREATE POLICY "Authenticated users can view load invoices"
  ON public.load_invoices FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage load invoices"
  ON public.load_invoices FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for load_invoice_items
CREATE POLICY "Authenticated users can view load invoice items"
  ON public.load_invoice_items FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage load invoice items"
  ON public.load_invoice_items FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for payment_receipts
CREATE POLICY "Authenticated users can view payment receipts"
  ON public.payment_receipts FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage payment receipts"
  ON public.payment_receipts FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Create triggers for updated_at
CREATE TRIGGER update_load_types_updated_at
  BEFORE UPDATE ON public.load_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loads_updated_at
  BEFORE UPDATE ON public.loads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_load_invoices_updated_at
  BEFORE UPDATE ON public.load_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_receipts_updated_at
  BEFORE UPDATE ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();