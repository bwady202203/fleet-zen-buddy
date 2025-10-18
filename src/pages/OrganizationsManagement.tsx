import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

const OrganizationsManagement = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    phone: "",
    email: "",
    address: "",
    tax_number: "",
    commercial_registration: "",
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
                  {!isDefault(org.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(org.id)}
                      className="flex-1"
                    >
                      تعيين كافتراضي
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
    </div>
  );
};

export default OrganizationsManagement;
