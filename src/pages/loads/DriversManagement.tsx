import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Plus, Edit, Trash2, Upload, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';

const DriversManagement = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [bulkDrivers, setBulkDrivers] = useState<Array<{ name: string; phone: string }>>([
    { name: '', phone: '' }
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحميل السائقين",
        variant: "destructive"
      });
    } else {
      setDrivers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingDriver) {
        const { error } = await supabase
          .from('drivers')
          .update({
            name: formData.name,
            phone: formData.phone
          })
          .eq('id', editingDriver.id);

        if (error) throw error;

        toast({
          title: "تم التحديث",
          description: "تم تحديث بيانات السائق بنجاح"
        });
      } else {
        const { error } = await supabase.from('drivers').insert({
          name: formData.name,
          phone: formData.phone
        });

        if (error) throw error;

        toast({
          title: "تم الإضافة",
          description: "تم إضافة السائق بنجاح"
        });
      }

      setFormData({ name: '', phone: '' });
      setEditingDriver(null);
      setDialogOpen(false);
      loadDrivers();
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

  const handleEdit = (driver: any) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السائق؟')) return;

    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل حذف السائق",
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم الحذف",
        description: "تم حذف السائق بنجاح"
      });
      loadDrivers();
    }
  };

  const handleBulkAdd = () => {
    setBulkDrivers([{ name: '', phone: '' }]);
    setBulkDialogOpen(true);
  };

  const addBulkRow = () => {
    setBulkDrivers([...bulkDrivers, { name: '', phone: '' }]);
  };

  const removeBulkRow = (index: number) => {
    if (bulkDrivers.length > 1) {
      setBulkDrivers(bulkDrivers.filter((_, i) => i !== index));
    }
  };

  const updateBulkRow = (index: number, field: 'name' | 'phone', value: string) => {
    const updated = [...bulkDrivers];
    updated[index][field] = value;
    setBulkDrivers(updated);
  };

  const handleBulkSubmit = async () => {
    const validDrivers = bulkDrivers.filter(d => d.name.trim() !== '');
    
    if (validDrivers.length === 0) {
      toast({
        title: "تنبيه",
        description: "يجب إدخال اسم سائق واحد على الأقل",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('drivers').insert(
        validDrivers.map(d => ({
          name: d.name,
          phone: d.phone || null
        }))
      );

      if (error) throw error;

      toast({
        title: "تم الإضافة",
        description: `تم إضافة ${validDrivers.length} سائق بنجاح`
      });

      setBulkDialogOpen(false);
      setBulkDrivers([{ name: '', phone: '' }]);
      loadDrivers();
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const importedDrivers = jsonData.map((row: any) => ({
          name: row['الاسم'] || row['name'] || row['Name'] || '',
          phone: row['الجوال'] || row['phone'] || row['Phone'] || ''
        })).filter(d => d.name);

        if (importedDrivers.length > 0) {
          setBulkDrivers(importedDrivers);
          setBulkDialogOpen(true);
          toast({
            title: "تم الاستيراد",
            description: `تم استيراد ${importedDrivers.length} سائق من الملف`
          });
        } else {
          toast({
            title: "تنبيه",
            description: "لم يتم العثور على بيانات صالحة في الملف",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "خطأ",
          description: "فشل قراءة الملف. تأكد من صيغة الملف",
          variant: "destructive"
        });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
              <h1 className="text-3xl font-bold">إدارة السائقين</h1>
              <p className="text-muted-foreground mt-1">إضافة وتعديل السائقين</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>قائمة السائقين</CardTitle>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 ml-2" />
                استيراد Excel
              </Button>
              <Button variant="outline" onClick={handleBulkAdd}>
                <Users className="h-4 w-4 ml-2" />
                إضافة متعدد
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingDriver(null); setFormData({ name: '', phone: '' }); }}>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة سائق
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingDriver ? 'تعديل السائق' : 'إضافة سائق جديد'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم السائق</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="أدخل اسم السائق"
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
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {editingDriver ? 'تحديث' : 'إضافة'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم السائق</TableHead>
                  <TableHead>رقم الجوال</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.phone || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${driver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {driver.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(driver)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(driver.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة سائقين متعددين</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>اسم السائق</TableHead>
                      <TableHead>رقم الجوال</TableHead>
                      <TableHead className="w-20">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkDrivers.map((driver, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Input
                            value={driver.name}
                            onChange={(e) => updateBulkRow(index, 'name', e.target.value)}
                            placeholder="اسم السائق"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={driver.phone}
                            onChange={(e) => updateBulkRow(index, 'phone', e.target.value)}
                            placeholder="رقم الجوال"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBulkRow(index)}
                            disabled={bulkDrivers.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-2 justify-between">
                <Button variant="outline" onClick={addBulkRow}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة صف
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleBulkSubmit} disabled={loading}>
                    حفظ الكل
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default DriversManagement;
