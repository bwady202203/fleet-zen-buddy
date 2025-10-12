import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserPlus, Trash2, Shield, ArrowRight, Settings, Key } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface ModulePermission {
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const MODULES = [
  { id: 'accounting', name: 'المحاسبة المالية' },
  { id: 'hr', name: 'الموارد البشرية' },
  { id: 'fleet', name: 'إدارة الأسطول' },
  { id: 'loads', name: 'إدارة الحمولات' },
  { id: 'spare_parts', name: 'قطع الغيار' },
];

const UsersManagement = () => {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<ModulePermission[]>([]);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<string | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user',
    modules: MODULES.map(m => ({
      module_name: m.id,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false
    }))
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .single();

          return {
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name || '',
            role: roleData?.role || 'user',
            created_at: profile.created_at
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('حدث خطأ أثناء جلب المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.email || !newUser.password || !newUser.fullName) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: authData.user.id,
            role: newUser.role as 'admin' | 'manager' | 'accountant' | 'employee'
          }]);

        if (roleError) throw roleError;

        const permissionsToInsert = newUser.modules
          .filter(m => m.can_view || m.can_create || m.can_edit || m.can_delete)
          .map(m => ({
            user_id: authData.user.id,
            module_name: m.module_name,
            can_view: m.can_view,
            can_create: m.can_create,
            can_edit: m.can_edit,
            can_delete: m.can_delete
          }));

        if (permissionsToInsert.length > 0) {
          const { error: permError } = await supabase
            .from('user_module_permissions')
            .insert(permissionsToInsert);

          if (permError) throw permError;
        }

        toast.success('تم إضافة المستخدم بنجاح');
        setIsAddDialogOpen(false);
        setNewUser({ 
          email: '', 
          password: '', 
          fullName: '', 
          role: 'user',
          modules: MODULES.map(m => ({
            module_name: m.id,
            can_view: false,
            can_create: false,
            can_edit: false,
            can_delete: false
          }))
        });
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error adding user:', error);
      if (error.message.includes('User already registered')) {
        toast.error('البريد الإلكتروني مسجل مسبقاً');
      } else {
        toast.error('حدث خطأ أثناء إضافة المستخدم');
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('تم حذف صلاحيات المستخدم');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('حدث خطأ أثناء حذف المستخدم');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as 'admin' | 'manager' | 'accountant' | 'employee' })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('تم تحديث الصلاحية بنجاح');
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('حدث خطأ أثناء تحديث الصلاحية');
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const permissions = MODULES.map(module => {
        const existing = data?.find(p => p.module_name === module.id);
        return {
          module_name: module.id,
          can_view: existing?.can_view || false,
          can_create: existing?.can_create || false,
          can_edit: existing?.can_edit || false,
          can_delete: existing?.can_delete || false
        };
      });

      setUserPermissions(permissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('حدث خطأ أثناء جلب الصلاحيات');
    }
  };

  const handleOpenPermissions = async (userId: string) => {
    setSelectedUserForPermissions(userId);
    await loadUserPermissions(userId);
    setIsPermissionsDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPermissions) return;

    try {
      await supabase
        .from('user_module_permissions')
        .delete()
        .eq('user_id', selectedUserForPermissions);

      const permissionsToInsert = userPermissions
        .filter(p => p.can_view || p.can_create || p.can_edit || p.can_delete)
        .map(p => ({
          user_id: selectedUserForPermissions,
          ...p
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_module_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast.success('تم حفظ الصلاحيات بنجاح');
      setIsPermissionsDialogOpen(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('حدث خطأ أثناء حفظ الصلاحيات');
    }
  };

  const updateModulePermission = (moduleName: string, field: keyof ModulePermission, value: boolean) => {
    setNewUser(prev => ({
      ...prev,
      modules: prev.modules.map(m =>
        m.module_name === moduleName ? { ...m, [field]: value } : m
      )
    }));
  };

  const updateUserPermission = (moduleName: string, field: keyof ModulePermission, value: boolean) => {
    setUserPermissions(prev =>
      prev.map(p =>
        p.module_name === moduleName ? { ...p, [field]: value } : p
      )
    );
  };

  const handleOpenChangePassword = (userId: string) => {
    setSelectedUserForPassword(userId);
    setMasterPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsChangePasswordDialogOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (masterPassword !== '6544743') {
      toast.error('كلمة المرور السرية غير صحيحة');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    if (!selectedUserForPassword) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('الرجاء تسجيل الدخول أولاً');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-user-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: selectedUserForPassword,
            masterPassword,
            newPassword
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'حدث خطأ أثناء تغيير كلمة المرور');
      }

      toast.success('تم تغيير كلمة المرور بنجاح');
      setIsChangePasswordDialogOpen(false);
      setMasterPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSelectedUserForPassword(null);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">غير مصرح</h2>
            <p className="text-muted-foreground mb-6">
              هذه الصفحة متاحة للمسؤولين فقط
            </p>
            <Link to="/">
              <Button>
                العودة للرئيسية
                <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">إدارة المستخدمين والصلاحيات</h1>
              <p className="text-muted-foreground mt-1">
                إضافة وتعديل المستخدمين وصلاحياتهم
              </p>
            </div>
            <Link to="/">
              <Button variant="outline">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>قائمة المستخدمين</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="ml-2 h-4 w-4" />
                    إضافة مستخدم جديد
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>إضافة مستخدم جديد</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">الاسم الكامل</Label>
                      <Input
                        id="fullName"
                        value={newUser.fullName}
                        onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                        placeholder="أدخل الاسم الكامل"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="example@email.com"
                        dir="ltr"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">كلمة المرور</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="••••••"
                        dir="ltr"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">الصلاحية</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">مسؤول (Admin)</SelectItem>
                          <SelectItem value="manager">مدير (Manager)</SelectItem>
                          <SelectItem value="accountant">محاسب (Accountant)</SelectItem>
                          <SelectItem value="user">مستخدم (User)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-semibold">صلاحيات الأقسام</Label>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right w-[200px]">القسم</TableHead>
                              <TableHead className="text-center">عرض</TableHead>
                              <TableHead className="text-center">إضافة</TableHead>
                              <TableHead className="text-center">تعديل</TableHead>
                              <TableHead className="text-center">حذف</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {MODULES.map((module) => {
                              const modulePermission = newUser.modules.find(m => m.module_name === module.id);
                              return (
                                <TableRow key={module.id}>
                                  <TableCell className="font-medium">{module.name}</TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={modulePermission?.can_view || false}
                                      onCheckedChange={(checked) =>
                                        updateModulePermission(module.id, 'can_view', checked as boolean)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={modulePermission?.can_create || false}
                                      onCheckedChange={(checked) =>
                                        updateModulePermission(module.id, 'can_create', checked as boolean)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={modulePermission?.can_edit || false}
                                      onCheckedChange={(checked) =>
                                        updateModulePermission(module.id, 'can_edit', checked as boolean)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={modulePermission?.can_delete || false}
                                      onCheckedChange={(checked) =>
                                        updateModulePermission(module.id, 'can_delete', checked as boolean)
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
                      إضافة المستخدم
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">الصلاحية</TableHead>
                    <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || '-'}</TableCell>
                      <TableCell dir="ltr" className="text-right">{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleUpdateRole(user.id, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">مسؤول (Admin)</SelectItem>
                            <SelectItem value="manager">مدير (Manager)</SelectItem>
                            <SelectItem value="accountant">محاسب (Accountant)</SelectItem>
                            <SelectItem value="user">مستخدم (User)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPermissions(user.id)}
                          >
                            <Settings className="h-4 w-4 ml-1" />
                            الصلاحيات
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenChangePassword(user.id)}
                          >
                            <Key className="h-4 w-4 ml-1" />
                            كلمة المرور
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Permissions Dialog */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
          <DialogContent className="max-w-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل صلاحيات الأقسام</DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-[200px]">القسم</TableHead>
                    <TableHead className="text-center">عرض</TableHead>
                    <TableHead className="text-center">إضافة</TableHead>
                    <TableHead className="text-center">تعديل</TableHead>
                    <TableHead className="text-center">حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULES.map((module) => {
                    const permission = userPermissions.find(p => p.module_name === module.id);
                    return (
                      <TableRow key={module.id}>
                        <TableCell className="font-medium">{module.name}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={permission?.can_view || false}
                            onCheckedChange={(checked) =>
                              updateUserPermission(module.id, 'can_view', checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={permission?.can_create || false}
                            onCheckedChange={(checked) =>
                              updateUserPermission(module.id, 'can_create', checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={permission?.can_edit || false}
                            onCheckedChange={(checked) =>
                              updateUserPermission(module.id, 'can_edit', checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={permission?.can_delete || false}
                            onCheckedChange={(checked) =>
                              updateUserPermission(module.id, 'can_delete', checked as boolean)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSavePermissions}>
                حفظ الصلاحيات
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog for changing password */}
        <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>تغيير كلمة المرور</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="masterPassword">كلمة المرور السرية</Label>
                <Input
                  id="masterPassword"
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور السرية"
                  required
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  يجب إدخال كلمة المرور السرية للمتابعة
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  required
                  dir="ltr"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsChangePasswordDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit">
                  تغيير كلمة المرور
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default UsersManagement;