ALTER TABLE public.crusher_shipments ADD COLUMN IF NOT EXISTS program text NOT NULL DEFAULT 'crusher';
ALTER TABLE public.crusher_lookups ADD COLUMN IF NOT EXISTS program text NOT NULL DEFAULT 'crusher';
CREATE INDEX IF NOT EXISTS crusher_shipments_program_idx ON public.crusher_shipments(program);
CREATE INDEX IF NOT EXISTS crusher_lookups_program_idx ON public.crusher_lookups(program);