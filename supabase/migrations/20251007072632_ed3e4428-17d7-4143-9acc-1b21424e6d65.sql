-- Create table for user module permissions
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, module_name)
);

-- Enable RLS
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all module permissions"
ON public.user_module_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own module permissions"
ON public.user_module_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_module_permissions_updated_at
BEFORE UPDATE ON public.user_module_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();