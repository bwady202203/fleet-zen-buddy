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
import { toast } from 'sonner';
import { UserPlus, Trash2, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

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

        toast.success('تم إضافة المستخدم بنجاح');
        setIsAddDialogOpen(false);
        setNewUser({ email: '', password: '', fullName: '', role: 'user' });
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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