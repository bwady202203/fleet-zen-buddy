CREATE TABLE public.route_distances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  from_location text NOT NULL,
  to_location text NOT NULL,
  distance_km numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_distances TO authenticated;
GRANT ALL ON public.route_distances TO service_role;

ALTER TABLE public.route_distances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view route distances"
ON public.route_distances FOR SELECT TO authenticated
USING (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can insert route distances"
ON public.route_distances FOR INSERT TO authenticated
WITH CHECK (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can update route distances"
ON public.route_distances FOR UPDATE TO authenticated
USING (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can delete route distances"
ON public.route_distances FOR DELETE TO authenticated
USING (organization_id IS NULL OR organization_id = public.get_user_organization(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX route_distances_unique_route ON public.route_distances (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), from_location, to_location);

CREATE TRIGGER update_route_distances_updated_at
BEFORE UPDATE ON public.route_distances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();