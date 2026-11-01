create sequence if not exists public.crusher_doc_seq start 1;
alter table public.crusher_shipments add column if not exists doc_number bigint not null default nextval('public.crusher_doc_seq');
grant usage on sequence public.crusher_doc_seq to authenticated;