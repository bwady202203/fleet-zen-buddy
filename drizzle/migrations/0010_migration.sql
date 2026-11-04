CREATE TABLE public.data_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'عام',
  title text NOT NULL DEFAULT '',
  number text NOT NULL DEFAULT '',
  secret text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.data_cards ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_cards TO authenticated;
CREATE POLICY "org admins manage data cards" ON public.data_cards FOR ALL TO authenticated
USING (public.user_in_org(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.user_in_org(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER data_cards_updated BEFORE UPDATE ON public.data_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();