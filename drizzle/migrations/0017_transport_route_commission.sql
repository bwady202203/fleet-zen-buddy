ALTER TABLE public.transport_commission_rules ADD COLUMN from_location TEXT, ADD COLUMN to_location TEXT;
ALTER TABLE public.transport_loads ADD COLUMN from_location TEXT, ADD COLUMN to_location TEXT;