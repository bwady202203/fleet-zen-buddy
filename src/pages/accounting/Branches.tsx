import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, ArrowRight, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Switch } from "@/components/ui/switch";

interface Branch {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  address?: string;
  phone?: string;
  manager_name?: string;
  is_active: boolean;
}

const Branches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: "",
    name_ar: "",
    name_en: "",
    address: "",
    phone: "",
    manager_name: "",
    is_active: true,
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("code");

      if (error) throw error;
      setBranches(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBranch) {
        const { error } = await supabase
          .from("branches")
          .update(formData)
          .eq("id", editingBranch.id);

        if (error) throw error;
        
        toast({
          title: "تم التحديث",
          description: "تم تحديث الفرع بنجاح",
        });
      } else {
        const { error } = await supabase
          .from("branches")
          .insert([formData]);

        if (error) throw error;
        
        toast({
          title: "تم الإضافة",
          description: "تم إضافة الفرع بنجاح",
        });
      }

      setOpen(false);
      resetForm();
      loadBranches();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      code: branch.code,
      name_ar: branch.name_ar,
      name_en: branch.name_en,
      address: branch.address || "",
      phone: branch.phone || "",
      manager_name: branch.manager_name || "",
      is_active: branch.is_active,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفرع؟")) return;

    try {
      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الفرع بنجاح",
      });
      
      loadBranches();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name_ar: "",
      name_en: "",
      address: "",
      phone: "",
      manager_name: "",
      is_active: true,
    });
    setEditingBranch(null);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/accounting" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                الفروع
              </h1>
              <p className="text-muted-foreground mt-1">
                إدارة فروع المؤسسة
              </p>
            </div>
            <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة فرع
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingBranch ? "تعديل فرع" : "إضافة فرع جديد"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">رمز الفرع *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name_ar">الاسم بالعربي *</Label>
                      <Input
                        id="name_ar"
                        value={formData.name_ar}
                        onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name_en">الاسم بالإنجليزي *</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">العنوان</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">الهاتف</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manager_name">اسم المدير</Label>
                      <Input
                        id="manager_name"
                        value={formData.manager_name}
                        onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">فعال</Label>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        resetForm();
                      }}
                    >
                      إلغاء
                    </Button>
                    <Button type="submit">
                      {editingBranch ? "تحديث" : "إضافة"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>قائمة الفروع</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : branches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد فروع مسجلة
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الرمز</TableHead>
                    <TableHead>الاسم بالعربي</TableHead>
                    <TableHead>الاسم بالإنجليزي</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>المدير</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.code}</TableCell>
                      <TableCell>{branch.name_ar}</TableCell>
                      <TableCell>{branch.name_en}</TableCell>
                      <TableCell>{branch.address}</TableCell>
                      <TableCell>{branch.phone}</TableCell>
                      <TableCell>{branch.manager_name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                          branch.is_active 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {branch.is_active ? "فعال" : "غير فعال"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(branch)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(branch.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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

export default Branches;
