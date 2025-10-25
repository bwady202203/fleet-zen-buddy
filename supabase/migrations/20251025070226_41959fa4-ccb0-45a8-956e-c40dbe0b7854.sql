-- Create maintenance_cost_items table
CREATE TABLE IF NOT EXISTS public.maintenance_cost_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'spare_part',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  spare_part_id UUID,
  notes TEXT,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_cost_items ENABLE ROW LEVEL SECURITY;

-- Create policies for maintenance_cost_items
CREATE POLICY "Users can manage maintenance cost items"
ON public.maintenance_cost_items
FOR ALL
USING (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid()))
);

CREATE POLICY "Users can view maintenance cost items"
ON public.maintenance_cost_items
FOR SELECT
USING (
  (organization_id IS NULL) OR 
  (organization_id = get_user_organization(auth.uid()))
);

-- Create index for better performance
CREATE INDEX idx_maintenance_cost_items_request_id ON public.maintenance_cost_items(maintenance_request_id);
CREATE INDEX idx_maintenance_cost_items_organization ON public.maintenance_cost_items(organization_id);