-- Drop the old unique constraint that doesn't include organization_id
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Add new unique constraint that includes organization_id
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_role_org_key 
UNIQUE (user_id, role, organization_id);