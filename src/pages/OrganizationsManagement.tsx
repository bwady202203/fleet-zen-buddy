import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Trash2, Edit, Users, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Organization {
  id: string;
  name: string;
  name_en: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_number: string | null;
  commercial_registration: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserOrganization {
  organization_id: string;
  is_default: boolean;
}

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

const OrganizationsManagement = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgUsers, setOrgUsers] = useState<UserWithRole[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    phone: "",
    email: "",
    address: "",
    tax_number: "",
    commercial_registration: "",
  });
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "user",
  });

  useEffect(() => {
    if (user) {
      loadOrganizations();
    }
  }, [user]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      
      // جلب الشركات التي ينتمي لها المستخدم
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user?.id);

      if (userOrgsError) throw userOrgsError;
      setUserOrganizations((userOrgs || []).map(uo => ({ organization_id: uo.organization_id, is_default: false })));

      // جلب بيانات الشركات
      const orgIds = (userOrgs || []).map(uo => uo.organization_id);
      if (orgIds.length > 0) {
        const { data: orgs, error: orgsError } = await supabase
          .from("organizations")
          .select("*")
          .in("id", orgIds)
          .order("created_at", { ascending: false });

        if (orgsError) throw orgsError;
        setOrganizations(orgs || []);
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل الشركات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingOrg) {
        // تحديث شركة موجودة
        const { error } = await supabase
          .from("organizations")
          .update({
            name: formData.name,
            name_en: formData.name_en || null,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
            tax_number: formData.tax_number || null,
            commercial_registration: formData.commercial_registration || null,
          })
          .eq("id", editingOrg.id);

        if (error) throw error;

        toast({
          title: "تم التحديث",
          description: "تم تحديث بيانات الشركة بنجاح",
        });
      } else {
        // إنشاء شركة جديدة
        const { data: newOrg, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: formData.name,
            name_en: formData.name_en || null,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
            tax_number: formData.tax_number || null,
            commercial_registration: formData.commercial_registration || null,
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // ربط المستخدم بالشركة الجديدة
        const { error: linkError } = await supabase
          .from("user_organizations")
          .insert({
            user_id: user?.id,
            organization_id: newOrg.id,
          });

        if (linkError) throw linkError;

        toast({
          title: "تم الإنشاء",
          description: "تم إنشاء الشركة بنجاح",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadOrganizations();
    } catch (error) {
      console.error("Error saving organization:", error);
      toast({
        title: "خطأ",
        description: "فشل حفظ بيانات الشركة",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      name_en: org.name_en || "",
      phone: org.phone || "",
      email: org.email || "",
      address: org.address || "",
      tax_number: org.tax_number || "",
      commercial_registration: org.commercial_registration || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الشركة؟")) return;

    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", orgId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الشركة بنجاح",
      });

      loadOrganizations();
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast({
        title: "خطأ",
        description: "فشل حذف الشركة",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (orgId: string) => {
    toast({
      title: "معلومة",
      description: "سيتم دعم هذه الميزة قريباً",
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_en: "",
      phone: "",
      email: "",
      address: "",
      tax_number: "",
      commercial_registration: "",
    });
    setEditingOrg(null);
  };

  const loadOrgUsers = async (orgId: string) => {
    try {
      // جلب المستخدمين المرتبطين بالشركة
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('user_id')
        .eq('organization_id', orgId);

      if (userOrgsError) throw userOrgsError;

      const userIds = (userOrgs || []).map(uo => uo.user_id);
      
      if (userIds.length === 0) {
        setOrgUsers([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .eq('organization_id', orgId)
            .maybeSingle();

          return {
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name || '',
            role: roleData?.role || 'user',
          };
        })
      );

      setOrgUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading org users:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل المستخدمين',
        variant: 'destructive',
      });
    }
  };

  const handleShowUsers = async (org: Organization) => {
    setSelectedOrg(org);
    await loadOrgUsers(org.id);
    setUsersDialogOpen(true);
  };

  const handleAddUserToOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
        options: {
          data: {
            full_name: newUserData.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // ربط المستخدم بالشركة
        const { error: orgLinkError } = await supabase
          .from('user_organizations')
          .insert([{
            user_id: authData.user.id,
            organization_id: selectedOrg.id
          }]);

        if (orgLinkError) throw orgLinkError;

        // تعيين الدور
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: authData.user.id,
            role: newUserData.role as 'admin' | 'manager' | 'accountant' | 'employee',
            organization_id: selectedOrg.id
          }]);

        if (roleError) throw roleError;

        toast({
          title: 'تم الإضافة',
          description: 'تم إضافة المستخدم بنجاح',
        });

        setAddUserDialogOpen(false);
        setNewUserData({ email: '', password: '', fullName: '', role: 'user' });
        await loadOrgUsers(selectedOrg.id);
      }
    } catch (error: any) {
      console.error('Error adding user:', error);
      if (error.message.includes('User already registered')) {
        toast({
          title: 'خطأ',
          description: 'البريد الإلكتروني مسجل مسبقاً',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'خطأ',
          description: 'فشل إضافة المستخدم',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    if (!selectedOrg) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as 'admin' | 'manager' | 'accountant' | 'employee' })
        .eq('user_id', userId)
        .eq('organization_id', selectedOrg.id);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث الصلاحية بنجاح',
      });
      
      await loadOrgUsers(selectedOrg.id);
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحديث الصلاحية',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveUserFromOrg = async (userId: string) => {
    if (!selectedOrg) return;
    if (!confirm('هل أنت متأكد من إزالة هذا المستخدم من الشركة؟')) return;

    try {
      // حذف دور المستخدم
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', selectedOrg.id);

      // حذف ارتباط المستخدم بالشركة
      const { error } = await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', selectedOrg.id);

      if (error) throw error;

      toast({
        title: 'تم الحذف',
        description: 'تم إزالة المستخدم من الشركة',
      });

      await loadOrgUsers(selectedOrg.id);
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إزالة المستخدم',
        variant: 'destructive',
      });
    }
  };

  const isDefault = (orgId: string) => {
    return userOrganizations.find(uo => uo.organization_id === orgId)?.is_default || false;
  };

  if (userRole !== "admin") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              ليس لديك صلاحية الوصول لهذه الصفحة
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">إدارة الشركات</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة شركة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingOrg ? "تعديل الشركة" : "إضافة شركة جديدة"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">اسم الشركة (عربي) *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name_en">اسم الشركة (إنجليزي)</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">الهاتف</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">العنوان</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tax_number">الرقم الضريبي</Label>
                  <Input
                    id="tax_number"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="commercial_registration">السجل التجاري</Label>
                  <Input
                    id="commercial_registration"
                    value={formData.commercial_registration}
                    onChange={(e) => setFormData({ ...formData, commercial_registration: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit">
                  {editingOrg ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center p-12">
          <p>جاري التحميل...</p>
        </div>
      ) : organizations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد شركات</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <Card key={org.id} className={isDefault(org.id) ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{org.name}</span>
                  {isDefault(org.id) && (
                    <Badge>افتراضي</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {org.name_en && (
                    <p className="text-muted-foreground">{org.name_en}</p>
                  )}
                  {org.phone && (
                    <p><strong>الهاتف:</strong> {org.phone}</p>
                  )}
                  {org.email && (
                    <p><strong>البريد:</strong> {org.email}</p>
                  )}
                  {org.tax_number && (
                    <p><strong>الرقم الضريبي:</strong> {org.tax_number}</p>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleShowUsers(org)}
                    className="flex-1"
                  >
                    <Users className="h-4 w-4 ml-1" />
                    المستخدمين
                  </Button>
                  {!isDefault(org.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(org.id)}
                    >
                      افتراضي
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(org)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(org.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Users Dialog */}
      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>مستخدمو {selectedOrg?.name}</span>
              <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 ml-1" />
                    إضافة مستخدم
                  </Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader>
                    <DialogTitle>إضافة مستخدم جديد</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddUserToOrg} className="space-y-4">
                    <div>
                      <Label htmlFor="new-fullName">الاسم الكامل</Label>
                      <Input
                        id="new-fullName"
                        value={newUserData.fullName}
                        onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-email">البريد الإلكتروني</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-password">كلمة المرور</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-role">الصلاحية</Label>
                      <Select
                        value={newUserData.role}
                        onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">مسؤول</SelectItem>
                          <SelectItem value="manager">مدير</SelectItem>
                          <SelectItem value="accountant">محاسب</SelectItem>
                          <SelectItem value="user">مستخدم</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">إضافة</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {orgUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>لا يوجد مستخدمون في هذه الشركة</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">الصلاحية</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleUpdateUserRole(user.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">مسؤول</SelectItem>
                            <SelectItem value="manager">مدير</SelectItem>
                            <SelectItem value="accountant">محاسب</SelectItem>
                            <SelectItem value="user">مستخدم</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUserFromOrg(user.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizationsManagement;
