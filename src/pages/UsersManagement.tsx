import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { UserPlus, Trash2, Shield, ArrowRight, Settings } from 'lucide-react';
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
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user'
  });
  const [selectedModules, setSelectedModules] = useState<Record<string, ModulePermission>>({});
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, ModulePermission[]>>({});

  useEffect(() => {
    fetchUsers();
    initializeModules();
  }, []);

  const initializeModules = () => {
    const initial: Record<string, ModulePermission> = {};
    MODULES.forEach(module => {
      initial[module.id] = {
        module_name: module.id,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
    });
    setSelectedModules(initial);
  };

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

          // Fetch module permissions
          const { data: permissions } = await supabase
            .from('user_module_permissions')
            .select('*')
            .eq('user_id', profile.id);

          if (permissions) {
            setUserPermissions(prev => ({
              ...prev,
              [profile.id]: permissions as ModulePermission[]
            }));
          }

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
      // Create user
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
        // Add role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: authData.user.id,
            role: newUser.role as 'admin' | 'manager' | 'accountant' | 'employee'
          }]);

        if (roleError) throw roleError;

        // Add module permissions
        const permissionsToInsert = Object.values(selectedModules).filter(p => p.can_view);
        if (permissionsToInsert.length > 0) {
          const { error: permError } = await supabase
            .from('user_module_permissions')
            .insert(permissionsToInsert.map(p => ({
              user_id: authData.user.id,
              ...p
            })));

          if (permError) throw permError;
        }

        toast.success('تم إضافة المستخدم بنجاح');
        setIsAddDialogOpen(false);
        setNewUser({ email: '', password: '', fullName: '', role: 'user' });
        initializeModules();
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
      // Note: Deleting a user requires admin privileges
      // This will only delete the user role, not the auth user
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

  const handleModulePermissionChange = (
    moduleId: string,
    permission: keyof ModulePermission,
    value: boolean
  ) => {
    setSelectedModules(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [permission]: value,
        // If can_view is unchecked, uncheck all other permissions
        ...(permission === 'can_view' && !value && {
          can_create: false,
          can_edit: false,
          can_delete: false,
        })
      }
    }));
  };

  const handleEditPermissions = async (userId: string) => {
    const permissions = userPermissions[userId] || [];
    const initial: Record<string, ModulePermission> = {};
    
    MODULES.forEach(module => {
      const existing = permissions.find(p => p.module_name === module.id);
      initial[module.id] = existing || {
        module_name: module.id,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
    });
    
    setSelectedModules(initial);
    setEditingPermissions(userId);
  };

  const handleSavePermissions = async (userId: string) => {
    try {
      // Delete existing permissions
      await supabase
        .from('user_module_permissions')
        .delete()
        .eq('user_id', userId);

      // Insert new permissions
      const permissionsToInsert = Object.values(selectedModules).filter(p => p.can_view);
      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_module_permissions')
          .insert(permissionsToInsert.map(p => ({
            user_id: userId,
            ...p
          })));

        if (error) throw error;
      }

      toast.success('تم تحديث الصلاحيات بنجاح');
      setEditingPermissions(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('حدث خطأ أثناء تحديث الصلاحيات');
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
                <DialogContent dir="rtl">
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

                    <div className="space-y-4 pt-4 border-t">
                      <Label>الأقسام المتاحة</Label>
                      <Accordion type="single" collapsible className="w-full">
                        {MODULES.map((module) => (
                          <AccordionItem key={module.id} value={module.id}>
                            <AccordionTrigger className="text-sm">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedModules[module.id]?.can_view || false}
                                  onCheckedChange={(checked) =>
                                    handleModulePermissionChange(module.id, 'can_view', checked as boolean)
                                  }
                                />
                                <span>{module.name}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pr-6">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedModules[module.id]?.can_create || false}
                                    disabled={!selectedModules[module.id]?.can_view}
                                    onCheckedChange={(checked) =>
                                      handleModulePermissionChange(module.id, 'can_create', checked as boolean)
                                    }
                                  />
                                  <Label className="text-sm font-normal">إضافة</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedModules[module.id]?.can_edit || false}
                                    disabled={!selectedModules[module.id]?.can_view}
                                    onCheckedChange={(checked) =>
                                      handleModulePermissionChange(module.id, 'can_edit', checked as boolean)
                                    }
                                  />
                                  <Label className="text-sm font-normal">تعديل</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedModules[module.id]?.can_delete || false}
                                    disabled={!selectedModules[module.id]?.can_view}
                                    onCheckedChange={(checked) =>
                                      handleModulePermissionChange(module.id, 'can_delete', checked as boolean)
                                    }
                                  />
                                  <Label className="text-sm font-normal">حذف</Label>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
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
                    <TableHead className="text-right">الأقسام المتاحة</TableHead>
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
                        <div className="flex flex-col gap-1">
                          {userPermissions[user.id]?.map(perm => {
                            const module = MODULES.find(m => m.id === perm.module_name);
                            return module ? (
                              <span key={perm.module_name} className="text-xs bg-secondary px-2 py-1 rounded">
                                {module.name}
                              </span>
                            ) : null;
                          })}
                          {(!userPermissions[user.id] || userPermissions[user.id].length === 0) && (
                            <span className="text-xs text-muted-foreground">لا توجد أقسام</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog 
                            open={editingPermissions === user.id} 
                            onOpenChange={(open) => !open && setEditingPermissions(null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditPermissions(user.id)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent dir="rtl" className="max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>تعديل صلاحيات الأقسام</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Accordion type="single" collapsible className="w-full">
                                  {MODULES.map((module) => (
                                    <AccordionItem key={module.id} value={module.id}>
                                      <AccordionTrigger className="text-sm">
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={selectedModules[module.id]?.can_view || false}
                                            onCheckedChange={(checked) =>
                                              handleModulePermissionChange(module.id, 'can_view', checked as boolean)
                                            }
                                          />
                                          <span>{module.name}</span>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pr-6">
                                          <div className="flex items-center gap-2">
                                            <Checkbox
                                              checked={selectedModules[module.id]?.can_create || false}
                                              disabled={!selectedModules[module.id]?.can_view}
                                              onCheckedChange={(checked) =>
                                                handleModulePermissionChange(module.id, 'can_create', checked as boolean)
                                              }
                                            />
                                            <Label className="text-sm font-normal">إضافة</Label>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Checkbox
                                              checked={selectedModules[module.id]?.can_edit || false}
                                              disabled={!selectedModules[module.id]?.can_view}
                                              onCheckedChange={(checked) =>
                                                handleModulePermissionChange(module.id, 'can_edit', checked as boolean)
                                              }
                                            />
                                            <Label className="text-sm font-normal">تعديل</Label>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Checkbox
                                              checked={selectedModules[module.id]?.can_delete || false}
                                              disabled={!selectedModules[module.id]?.can_view}
                                              onCheckedChange={(checked) =>
                                                handleModulePermissionChange(module.id, 'can_delete', checked as boolean)
                                              }
                                            />
                                            <Label className="text-sm font-normal">حذف</Label>
                                          </div>
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                                <Button 
                                  onClick={() => handleSavePermissions(user.id)}
                                  className="w-full"
                                >
                                  حفظ التغييرات
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
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
      </main>
    </div>
  );
};

export default UsersManagement;