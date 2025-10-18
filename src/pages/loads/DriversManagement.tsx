import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Plus, Edit, Trash2, Upload, Users, FileText, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';
import { Badge } from "@/components/ui/badge";

interface TransferReceipt {
  id: string;
  receipt_number: string;
  amount: number;
  transfer_date: string;
  description: string | null;
}

const DriversManagement = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driverReceipts, setDriverReceipts] = useState<Record<string, TransferReceipt[]>>({});
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [editingReceipt, setEditingReceipt] = useState<TransferReceipt | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [receiptFormData, setReceiptFormData] = useState({
    receipt_number: '',
    amount: '',
    transfer_date: new Date().toISOString().split('T')[0],
    description: ''
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
      // Load receipts for all drivers
      if (data && data.length > 0) {
        loadAllReceipts(data.map(d => d.id));
      }
    }
  };

  const loadAllReceipts = async (driverIds: string[]) => {
    const receiptsMap: Record<string, TransferReceipt[]> = {};
    
    for (const driverId of driverIds) {
      const { data } = await supabase
        .from('driver_transfer_receipts')
        .select('*')
        .eq('driver_id', driverId)
        .order('transfer_date', { ascending: false });
      
      receiptsMap[driverId] = data || [];
    }
    
    setDriverReceipts(receiptsMap);
  };

  const loadDriverReceipts = async (driverId: string) => {
    const { data, error } = await supabase
      .from('driver_transfer_receipts')
      .select('*')
      .eq('driver_id', driverId)
      .order('transfer_date', { ascending: false });

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحميل سندات التحويل",
        variant: "destructive"
      });
    } else {
      setDriverReceipts(prev => ({ ...prev, [driverId]: data || [] }));
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

  const handleAddReceipt = (driverId: string) => {
    setSelectedDriverId(driverId);
    setEditingReceipt(null);
    setReceiptFormData({
      receipt_number: '',
      amount: '',
      transfer_date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setReceiptDialogOpen(true);
  };

  const handleEditReceipt = (receipt: TransferReceipt, driverId: string) => {
    setSelectedDriverId(driverId);
    setEditingReceipt(receipt);
    setReceiptFormData({
      receipt_number: receipt.receipt_number,
      amount: receipt.amount.toString(),
      transfer_date: receipt.transfer_date,
      description: receipt.description || ''
    });
    setReceiptDialogOpen(true);
  };

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) return;

    setLoading(true);
    try {
      const receiptData = {
        driver_id: selectedDriverId,
        receipt_number: receiptFormData.receipt_number,
        amount: parseFloat(receiptFormData.amount),
        transfer_date: receiptFormData.transfer_date,
        description: receiptFormData.description || null
      };

      if (editingReceipt) {
        const { error } = await supabase
          .from('driver_transfer_receipts')
          .update(receiptData)
          .eq('id', editingReceipt.id);

        if (error) throw error;

        toast({
          title: "تم التحديث",
          description: "تم تحديث سند التحويل بنجاح"
        });
      } else {
        const { error } = await supabase
          .from('driver_transfer_receipts')
          .insert(receiptData);

        if (error) throw error;

        toast({
          title: "تم الإضافة",
          description: "تم إضافة سند التحويل بنجاح"
        });
      }

      setReceiptDialogOpen(false);
      loadDriverReceipts(selectedDriverId);
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

  const handleDeleteReceipt = async (receiptId: string, driverId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السند؟')) return;

    const { error } = await supabase
      .from('driver_transfer_receipts')
      .delete()
      .eq('id', receiptId);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل حذف سند التحويل",
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم الحذف",
        description: "تم حذف سند التحويل بنجاح"
      });
      loadDriverReceipts(driverId);
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
              <h1 className="text-3xl font-bold">إدارة السائقين / Drivers Management</h1>
              <p className="text-muted-foreground mt-1">إضافة وتعديل السائقين / Add and Edit Drivers</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>قائمة السائقين / Drivers List</CardTitle>
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
                استيراد Excel / Import Excel
              </Button>
              <Button variant="outline" onClick={handleBulkAdd}>
                <Users className="h-4 w-4 ml-2" />
                إضافة متعدد / Bulk Add
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingDriver(null); setFormData({ name: '', phone: '' }); }}>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة سائق / Add Driver
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingDriver ? 'تعديل السائق / Edit Driver' : 'إضافة سائق جديد / Add New Driver'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم السائق / Driver Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="أدخل اسم السائق / Enter driver name"
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
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {editingDriver ? 'تحديث / Update' : 'إضافة / Add'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      إلغاء / Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {drivers.map((driver) => (
                <Card key={driver.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{driver.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{driver.phone || 'لا يوجد رقم جوال'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={driver.is_active ? "default" : "secondary"}>
                          {driver.is_active ? 'نشط' : 'غير نشط'}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(driver)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(driver.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          سندات التحويل
                        </h3>
                        <Button size="sm" onClick={() => handleAddReceipt(driver.id)}>
                          <Plus className="h-4 w-4 ml-2" />
                          إضافة سند
                        </Button>
                      </div>
                      
                      {driverReceipts[driver.id]?.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>رقم السند</TableHead>
                                <TableHead>التاريخ</TableHead>
                                <TableHead>المبلغ</TableHead>
                                <TableHead>الوصف</TableHead>
                                <TableHead>الإجراءات</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {driverReceipts[driver.id].map((receipt) => (
                                <TableRow key={receipt.id}>
                                  <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                                  <TableCell>{new Date(receipt.transfer_date).toLocaleDateString('ar-SA')}</TableCell>
                                  <TableCell>{receipt.amount.toLocaleString('ar-SA')} ريال</TableCell>
                                  <TableCell className="max-w-[200px] truncate">{receipt.description || '-'}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" onClick={() => handleEditReceipt(receipt, driver.id)}>
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="destructive" onClick={() => handleDeleteReceipt(receipt.id, driver.id)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                          <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>لا توجد سندات تحويل لهذا السائق</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة سائقين متعددين / Add Multiple Drivers</DialogTitle>
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

        <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingReceipt ? 'تعديل سند التحويل' : 'إضافة سند تحويل جديد'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleReceiptSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receipt_number">رقم السند</Label>
                <Input
                  id="receipt_number"
                  value={receiptFormData.receipt_number}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, receipt_number: e.target.value })}
                  required
                  placeholder="أدخل رقم السند"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={receiptFormData.amount}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, amount: e.target.value })}
                  required
                  placeholder="أدخل المبلغ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer_date">تاريخ التحويل</Label>
                <Input
                  id="transfer_date"
                  type="date"
                  value={receiptFormData.transfer_date}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, transfer_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Input
                  id="description"
                  value={receiptFormData.description}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, description: e.target.value })}
                  placeholder="أدخل الوصف (اختياري)"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {editingReceipt ? 'تحديث' : 'إضافة'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setReceiptDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default DriversManagement;
