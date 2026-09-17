import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Only admins can create users
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (roleError || !roleData || roleData.length === 0) {
      throw new Error('Only admins can create users');
    }

    const { email, password, fullName, role, organizationId, permissions } = await req.json();

    if (!email || !password || !fullName || !role || !organizationId) {
      throw new Error('Missing required fields');
    }

    if (typeof password !== 'string' || password.length < 6) {
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    const validRoles = ['admin', 'manager', 'accountant', 'employee'];
    if (!validRoles.includes(role)) {
      throw new Error('صلاحية غير صالحة');
    }

    // Create the auth user (confirmed immediately so they can sign in)
    const { data: newUserData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      throw createError;
    }

    const newUserId = newUserData.user.id;

    // If any step below fails, remove the orphaned auth user so nothing is half-created
    const rollback = async () => {
      await supabaseClient.auth.admin.deleteUser(newUserId);
    };

    try {
      // Ensure profile exists (trigger usually handles it, this is a safety net)
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert([{ id: newUserId, email, full_name: fullName }], { onConflict: 'id' });

      if (profileError) throw profileError;

      // Link user to organization
      const { error: orgError } = await supabaseClient
        .from('user_organizations')
        .upsert([{ user_id: newUserId, organization_id: organizationId }], {
          onConflict: 'user_id,organization_id'
        });

      if (orgError) throw orgError;

      // Assign role
      const { error: roleInsertError } = await supabaseClient
        .from('user_roles')
        .upsert([{ user_id: newUserId, role, organization_id: organizationId }], {
          onConflict: 'user_id,role,organization_id'
        });

      if (roleInsertError) throw roleInsertError;

      // Insert module permissions
      if (Array.isArray(permissions) && permissions.length > 0) {
        const rows = permissions
          .filter((p: any) => p && (p.can_view || p.can_create || p.can_edit || p.can_delete))
          .map((p: any) => ({
            user_id: newUserId,
            module_name: p.module_name,
            can_view: !!p.can_view,
            can_create: !!p.can_create,
            can_edit: !!p.can_edit,
            can_delete: !!p.can_delete,
          }));

        if (rows.length > 0) {
          const { error: permError } = await supabaseClient
            .from('user_module_permissions')
            .insert(rows);

          if (permError) throw permError;
        }
      }
    } catch (innerError) {
      await rollback();
      throw innerError;
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUserId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
