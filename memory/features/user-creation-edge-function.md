---
name: User Creation via Edge Function
description: New users must be created through the create-org-user edge function, never via client signUp, to guarantee org link + role
type: feature
---
Creating users from UsersManagement must call the `create-org-user` edge function (admin-only, service role). It creates the auth user (email confirmed), links `user_organizations`, upserts `user_roles`, inserts `user_module_permissions`, and rolls back the auth user if any step fails — preventing orphaned users with no organization/role (the "حارس" incident). Client-side `supabase.auth.signUp` in admin flows is forbidden. **Why:** client-side multi-step creation could fail midway, leaving users invisible in user lists.
