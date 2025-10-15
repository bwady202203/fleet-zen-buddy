-- Create delivery receipts table
CREATE TABLE public.delivery_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  entry_time TIMESTAMP WITH TIME ZONE,
  exit_time TIMESTAMP WITH TIME ZONE,
  material_type TEXT,
  customer_name TEXT,
  driver_id UUID REFERENCES public.drivers(id),
  truck_number TEXT,
  supplier_company TEXT,
  empty_weight NUMERIC DEFAULT 0,
  full_weight NUMERIC DEFAULT 0,
  net_weight NUMERIC DEFAULT 0,
  driver_signature TEXT,
  receiver_signature TEXT,
  supervisor_signature TEXT,
  organization_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create delivery system users table
CREATE TABLE public.delivery_system_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_system_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_receipts
CREATE POLICY "Admins and managers can manage delivery receipts"
ON public.delivery_receipts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can view delivery receipts"
ON public.delivery_receipts
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for delivery_system_users
CREATE POLICY "Admins can manage delivery system users"
ON public.delivery_system_users
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view delivery system users"
ON public.delivery_system_users
FOR SELECT
TO authenticated
USING (true);

-- Insert default user (password: 222324)
-- Using a simple hash for demonstration - in production, use proper password hashing
INSERT INTO public.delivery_system_users (username, password_hash, is_active)
VALUES ('remal2233', crypt('222324', gen_salt('bf')), true)
ON CONFLICT (username) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_delivery_receipts_updated_at
BEFORE UPDATE ON public.delivery_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_system_users_updated_at
BEFORE UPDATE ON public.delivery_system_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();