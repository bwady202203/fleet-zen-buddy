ALTER TABLE public.archived_documents
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid;

CREATE INDEX IF NOT EXISTS archived_documents_entity_idx
  ON public.archived_documents (entity_type, entity_id);