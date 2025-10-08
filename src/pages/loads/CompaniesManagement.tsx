import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CompanyPricesDialog } from "@/components/CompanyPricesDialog";
import { CompanyDriverCommissionsDialog } from "@/components/CompanyDriverCommissionsDialog";

const CompaniesManagement = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [pricesDialogOpen, setPricesDialogOpen] = useState(false);
  const [commissionsDialogOpen, setCommissionsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحميل الشركات",
        variant: "destructive"
      });
    } else {
      setCompanies(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({
            name: formData.name,
            phone: formData.phone,
            email: formData.email
          })
          .eq('id', editingCompany.id);

        if (error) throw error;

        toast({
          title: "تم التحديث",
          description: "تم تحديث بيانات الشركة بنجاح"
        });
      } else {
        const { error } = await supabase.from('companies').insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email
        });

        if (error) throw error;

        toast({
          title: "تم الإضافة",
          description: "تم إضافة الشركة بنجاح"
        });
      }

      setFormData({ name: '', phone: '', email: '' });
      setEditingCompany(null);
      setDialogOpen(false);
      loadCompanies();
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

  const handleEdit = (company: any) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      phone: company.phone || '',
      email: company.email || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الشركة؟')) return;

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل حذف الشركة",
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم الحذف",
        description: "تم حذف الشركة بنجاح"
      });
      loadCompanies();
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
              <h1 className="text-3xl font-bold">إدارة الشركات</h1>
              <p className="text-muted-foreground mt-1">عرض وإضافة العملاء</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingCompany(null); setFormData({ name: '', phone: '', email: '' }); }}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة شركة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCompany ? 'تعديل الشركة' : 'إضافة شركة جديدة'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم الشركة</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="أدخل اسم الشركة"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الجوال</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="أدخل رقم الجوال"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="أدخل البريد الإلكتروني"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {editingCompany ? 'تحديث' : 'إضافة'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-3">{company.name}</CardTitle>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <p className="text-2xl font-bold text-primary">
                          {company.total_balance.toLocaleString('ar-SA')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">الرصيد المالي (ر.س)</p>
                      </div>
                      
                      <div className="bg-secondary/10 p-3 rounded-lg">
                        <p className="text-2xl font-bold text-secondary-foreground">
                          {(company.total_quantity || 0).toLocaleString('ar-SA')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">إجمالي الكميات</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {company.phone && (
                    <p className="text-sm">
                      <span className="font-semibold">الجوال:</span> {company.phone}
                    </p>
                  )}
                  {company.email && (
                    <p className="text-sm">
                      <span className="font-semibold">البريد:</span> {company.email}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="default" 
                      onClick={() => {
                        setSelectedCompany(company);
                        setPricesDialogOpen(true);
                      }}
                    >
                      <DollarSign className="h-4 w-4 ml-1" />
                      الأسعار
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => {
                        setSelectedCompany(company);
                        setCommissionsDialogOpen(true);
                      }}
                    >
                      <DollarSign className="h-4 w-4 ml-1" />
                      عمولة النقل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(company)}>
                      <Edit className="h-4 w-4 ml-1" />
                      تعديل
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(company.id)}>
                      <Trash2 className="h-4 w-4 ml-1" />
                      حذف
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedCompany && (
          <>
            <CompanyPricesDialog
              open={pricesDialogOpen}
              onOpenChange={setPricesDialogOpen}
              companyId={selectedCompany.id}
              companyName={selectedCompany.name}
            />
            <CompanyDriverCommissionsDialog
              open={commissionsDialogOpen}
              onOpenChange={setCommissionsDialogOpen}
              companyId={selectedCompany.id}
              companyName={selectedCompany.name}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default CompaniesManagement;
