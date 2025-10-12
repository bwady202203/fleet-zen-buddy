-- حذف الدور المكرر للمستخدم الرئيسي
DELETE FROM user_roles 
WHERE id = '965ad3ab-15aa-4cd3-9c9f-d0cafb3be228';

-- التأكد من أن المستخدم الرئيسي لديه دور admin
-- (إذا لم يكن موجوداً، سيتم إضافته)
INSERT INTO user_roles (user_id, role, organization_id)
SELECT '70791dfb-637c-49ec-bbd3-0b1d92c250c0', 'admin', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = '70791dfb-637c-49ec-bbd3-0b1d92c250c0' 
  AND role = 'admin'
  LIMIT 1
);

-- إضافة جميع صلاحيات الأقسام للمستخدم الرئيسي (إن لم تكن موجودة)
INSERT INTO user_module_permissions (user_id, module_name, can_view, can_create, can_edit, can_delete)
VALUES 
  ('70791dfb-637c-49ec-bbd3-0b1d92c250c0', 'accounting', true, true, true, true),
  ('70791dfb-637c-49ec-bbd3-0b1d92c250c0', 'hr', true, true, true, true),
  ('70791dfb-637c-49ec-bbd3-0b1d92c250c0', 'fleet', true, true, true, true),
  ('70791dfb-637c-49ec-bbd3-0b1d92c250c0', 'loads', true, true, true, true),
  ('70791dfb-637c-49ec-bbd3-0b1d92c250c0', 'spare_parts', true, true, true, true),
  ('70791dfb-637c-49ec-bbd3-0b1d92c250c0', 'custody', true, true, true, true)
ON CONFLICT (user_id, module_name) 
DO UPDATE SET 
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = true;