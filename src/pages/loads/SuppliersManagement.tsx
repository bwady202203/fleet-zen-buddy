import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const SuppliersManagement = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    tax_number: '',
    commercial_registration: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحميل الموردين",
        variant: "destructive"
      });
    } else {
      setSuppliers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            name: formData.name,
            address: formData.address,
            tax_number: formData.tax_number,
            commercial_registration: formData.commercial_registration,
            phone: formData.phone,
            email: formData.email
          })
          .eq('id', editingSupplier.id);

        if (error) throw error;

        toast({
          title: "تم التحديث",
          description: "تم تحديث بيانات المورد بنجاح"
        });
      } else {
        const { error } = await supabase.from('suppliers').insert({
          name: formData.name,
          address: formData.address,
          tax_number: formData.tax_number,
          commercial_registration: formData.commercial_registration,
          phone: formData.phone,
          email: formData.email
        });

        if (error) throw error;

        toast({
          title: "تم الإضافة",
          description: "تم إضافة المورد بنجاح"
        });
      }

      setFormData({ name: '', address: '', tax_number: '', commercial_registration: '', phone: '', email: '' });
      setEditingSupplier(null);
      setDialogOpen(false);
      loadSuppliers();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      address: supplier.address || '',
      tax_number: supplier.tax_number || '',
      commercial_registration: supplier.commercial_registration || '',
      phone: supplier.phone || '',
      email: supplier.email || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return;

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل حذف المورد",
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم الحذف",
        description: "تم حذف المورد بنجاح"
      });
      loadSuppliers();
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">إدارة الموردين / Suppliers Management</h1>
              <p className="text-muted-foreground mt-1">عرض وإضافة الموردين / View and Add Suppliers</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingSupplier(null); setFormData({ name: '', address: '', tax_number: '', commercial_registration: '', phone: '', email: '' }); }}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة مورد / Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSupplier ? 'تعديل المورد / Edit Supplier' : 'إضافة مورد جديد / Add New Supplier'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم المورد / Supplier Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="أدخل اسم المورد / Enter supplier name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_number">الرقم الضريبي / Tax Number</Label>
                  <Input
                    id="tax_number"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                    placeholder="أدخل الرقم الضريبي / Enter tax number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercial_registration">السجل التجاري / Commercial Registration</Label>
                  <Input
                    id="commercial_registration"
                    value={formData.commercial_registration}
                    onChange={(e) => setFormData({ ...formData, commercial_registration: e.target.value })}
                    placeholder="أدخل السجل التجاري / Enter commercial registration"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">العنوان / Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="أدخل العنوان / Enter address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الجوال / Mobile Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="أدخل رقم الجوال / Enter mobile number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني / Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="أدخل البريد الإلكتروني / Enter email"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {editingSupplier ? 'تحديث / Update' : 'إضافة / Add'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    إلغاء / Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl mb-3">{supplier.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {supplier.tax_number && (
                    <p className="text-sm">
                      <span className="font-semibold">الرقم الضريبي:</span> {supplier.tax_number}
                    </p>
                  )}
                  {supplier.commercial_registration && (
                    <p className="text-sm">
                      <span className="font-semibold">السجل التجاري:</span> {supplier.commercial_registration}
                    </p>
                  )}
                  {supplier.address && (
                    <p className="text-sm">
                      <span className="font-semibold">العنوان:</span> {supplier.address}
                    </p>
                  )}
                  {supplier.phone && (
                    <p className="text-sm">
                      <span className="font-semibold">الجوال:</span> {supplier.phone}
                    </p>
                  )}
                  {supplier.email && (
                    <p className="text-sm">
                      <span className="font-semibold">البريد:</span> {supplier.email}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(supplier)}>
                      <Edit className="h-4 w-4 ml-1" />
                      تعديل
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(supplier.id)}>
                      <Trash2 className="h-4 w-4 ml-1" />
                      حذف
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default SuppliersManagement;
