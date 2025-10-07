import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounting } from "@/contexts/AccountingContext";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Pencil, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

const CostCenters = () => {
  const { costCenters, addCostCenter, updateCostCenter, deleteCostCenter, searchCostCenters } = useAccounting();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(true);
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    nameEn: "",
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      nameEn: "",
      isActive: true,
    });
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال الرمز والاسم",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      updateCostCenter(editingId, formData);
      toast({
        title: "تم التحديث بنجاح",
        description: `تم تحديث مركز التكلفة ${formData.name}`,
      });
    } else {
      addCostCenter(formData);
      toast({
        title: "تم الإضافة بنجاح",
        description: `تم إضافة مركز التكلفة ${formData.name}`,
      });
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (costCenter: any) => {
    setFormData({
      code: costCenter.code,
      name: costCenter.name,
      nameEn: costCenter.nameEn,
      isActive: costCenter.isActive,
    });
    setEditingId(costCenter.id);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المركز؟")) {
      deleteCostCenter(id);
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف مركز التكلفة",
      });
    }
  };

  const filteredCostCenters = searchCostCenters(searchQuery, caseSensitive);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/accounting" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">مراكز التكلفة</h1>
                <p className="text-muted-foreground mt-1">
                  إدارة مراكز التكلفة
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 ml-2" />
                  مركز تكلفة جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "تعديل مركز التكلفة" : "مركز تكلفة جديد"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>الرمز</Label>
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="مثال: CC001"
                      />
                    </div>
                    <div>
                      <Label>الاسم بالعربية</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="مثال: قسم المبيعات"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>الاسم بالإنجليزية</Label>
                    <Input
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Example: Sales Department"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label>نشط</Label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button type="button" onClick={handleSubmit}>
                      {editingId ? "تحديث" : "حفظ"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              البحث والفلترة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>بحث (رمز، اسم عربي، أو إنجليزي)</Label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={caseSensitive}
                  onCheckedChange={setCaseSensitive}
                />
                <Label>حساس لحالة الأحرف</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الرمز</TableHead>
                  <TableHead className="text-right">الاسم بالعربية</TableHead>
                  <TableHead className="text-right">الاسم بالإنجليزية</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCostCenters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      لا توجد مراكز تكلفة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCostCenters.map((cc) => (
                    <TableRow key={cc.id}>
                      <TableCell className="font-medium">{cc.code}</TableCell>
                      <TableCell>{cc.name}</TableCell>
                      <TableCell>{cc.nameEn}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${
                          cc.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {cc.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(cc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CostCenters;
