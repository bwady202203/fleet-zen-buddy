UPDATE public.chart_of_accounts
SET level = 4,
    organization_id = COALESCE(organization_id, '8449f832-4c11-4f27-b650-294106680b15'::uuid),
    updated_at = now()
WHERE code IN ('510410','510411');