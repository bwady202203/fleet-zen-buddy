CREATE SEQUENCE public.custody_request_number_seq;
CREATE TABLE public.custody_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 created_by uuid NOT NULL DEFAULT auth.uid(),
 request_date date NOT NULL DEFAULT CURRENT_DATE,
 amount numeric(15,2) NOT NULL CHECK (amount > 0),
 request_number text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.custody_requests TO authenticated;
GRANT ALL ON public.custody_requests TO service_role;
ALTER TABLE public.custody_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY custody_requests_select ON public.custody_requests FOR SELECT TO authenticated USING (public.user_in_org(auth.uid(), organization_id));
CREATE POLICY custody_requests_insert ON public.custody_requests FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.user_in_org(auth.uid(), organization_id));
CREATE FUNCTION public.assign_custody_request_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 NEW.request_number := 'CR-' || extract(year from NEW.request_date)::text || '-' || lpad(nextval('public.custody_request_number_seq')::text, 6, '0');
 RETURN NEW;
END;
$$;
CREATE TRIGGER custody_request_auto_number BEFORE INSERT ON public.custody_requests FOR EACH ROW EXECUTE FUNCTION public.assign_custody_request_number();
CREATE INDEX custody_requests_org_date ON public.custody_requests(organization_id, request_date DESC, created_at DESC);