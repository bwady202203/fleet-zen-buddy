import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Plus, Edit, Trash2, ChevronDown, ChevronUp, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  total_due: number;
  total_paid: number;
  remaining: number;
}

interface TransferReceipt {
  id: string;
  receipt_number: string;
  amount: number;
  transfer_date: string;
  description: string | null;
  driver_id: string;
}

const DriversPaymentReport = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [receipts, setReceipts] = useState<Record<string, TransferReceipt[]>>({});
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickReceiptDialogOpen, setQuickReceiptDialogOpen] = useState(false);
  const [editReceiptDialogOpen, setEditReceiptDialogOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<TransferReceipt | null>(null);
  const [receiptFormData, setReceiptFormData] = useState({
    receipt_number: '',
    amount: '',
    transfer_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    loadDriversData();
  }, []);

  const loadDriversData = async () => {
    setLoading(true);
    try {
      // Get all drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (driversError) throw driversError;

      // Get all loads with commission amounts
      const { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('driver_id, commission_amount');

      if (loadsError) throw loadsError;

      // Get all transfer receipts
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('driver_transfer_receipts')
        .select('*')
        .order('transfer_date', { ascending: false });

      if (receiptsError) throw receiptsError;

      // Calculate totals for each driver
      const driversWithTotals = driversData?.map(driver => {
        const driverLoads = loadsData?.filter(load => load.driver_id === driver.id) || [];
        const driverReceipts = receiptsData?.filter(receipt => receipt.driver_id === driver.id) || [];
        
        const total_due = driverLoads.reduce((sum, load) => sum + (load.commission_amount || 0), 0);
        const total_paid = driverReceipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
        const remaining = total_due - total_paid;

        return {
          ...driver,
          total_due,
          total_paid,
          remaining
        };
      }) || [];

      setDrivers(driversWithTotals);

      // Organize receipts by driver
      const receiptsByDriver: Record<string, TransferReceipt[]> = {};
      receiptsData?.forEach(receipt => {
        if (!receiptsByDriver[receipt.driver_id]) {
          receiptsByDriver[receipt.driver_id] = [];
        }
        receiptsByDriver[receipt.driver_id].push(receipt);
      });
      setReceipts(receiptsByDriver);

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

  const handleQuickReceipt = (driverId: string) => {
    setSelectedDriverId(driverId);
    setReceiptFormData({
      receipt_number: '',
      amount: '',
      transfer_date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setQuickReceiptDialogOpen(true);
  };

  const handleQuickReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) return;

    setLoading(true);
    try {
      // Get user data for created_by and organization_id
      const { data: userData } = await supabase.auth.getUser();
      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userData?.user?.id)
        .single();

      const { error } = await supabase
        .from('driver_transfer_receipts')
        .insert({
          driver_id: selectedDriverId,
          receipt_number: receiptFormData.receipt_number,
          amount: parseFloat(receiptFormData.amount),
          transfer_date: receiptFormData.transfer_date,
          description: receiptFormData.description || null,
          organization_id: orgData?.organization_id,
          created_by: userData?.user?.id
        });

      if (error) throw error;

      toast({
        title: "تم الإضافة",
        description: "تم إضافة سند التحويل بنجاح"
      });

      setQuickReceiptDialogOpen(false);
      loadDriversData();
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

  const handleEditReceipt = (receipt: TransferReceipt) => {
    setEditingReceipt(receipt);
    setReceiptFormData({
      receipt_number: receipt.receipt_number,
      amount: receipt.amount.toString(),
      transfer_date: receipt.transfer_date,
      description: receipt.description || ''
    });
    setEditReceiptDialogOpen(true);
  };

  const handleEditReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('driver_transfer_receipts')
        .update({
          receipt_number: receiptFormData.receipt_number,
          amount: parseFloat(receiptFormData.amount),
          transfer_date: receiptFormData.transfer_date,
          description: receiptFormData.description || null
        })
        .eq('id', editingReceipt.id);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث سند التحويل بنجاح"
      });

      setEditReceiptDialogOpen(false);
      loadDriversData();
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

  const handleDeleteReceipt = async (receiptId: string) => {
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
      loadDriversData();
    }
  };

  const toggleDriverExpansion = (driverId: string) => {
    setExpandedDriverId(expandedDriverId === driverId ? null : driverId);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads/reports" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">تقرير مستحقات السائقين</h1>
              <p className="text-muted-foreground mt-1">عرض وإدارة مستحقات ومدفوعات السائقين</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>ملخص مستحقات السائقين</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div>
            ) : (
              <div className="space-y-2">
                {drivers.map((driver) => (
                  <Collapsible
                    key={driver.id}
                    open={expandedDriverId === driver.id}
                    onOpenChange={() => toggleDriverExpansion(driver.id)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold">{driver.name}</h3>
                                {driver.phone && (
                                  <p className="text-sm text-muted-foreground">{driver.phone}</p>
                                )}
                              </div>
                              <div className="flex gap-6">
                                <div className="text-center">
                                  <p className="text-sm text-muted-foreground">المستحق</p>
                                  <p className="text-lg font-bold text-primary">
                                    {driver.total_due.toLocaleString('ar-SA')} ريال
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-muted-foreground">المدفوع</p>
                                  <p className="text-lg font-bold text-green-600">
                                    {driver.total_paid.toLocaleString('ar-SA')} ريال
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-muted-foreground">المتبقي</p>
                                  <p className={`text-lg font-bold ${driver.remaining > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {driver.remaining.toLocaleString('ar-SA')} ريال
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickReceipt(driver.id);
                                  }}
                                >
                                  <Plus className="h-4 w-4 ml-2" />
                                  سند تحويل
                                </Button>
                                {expandedDriverId === driver.id ? (
                                  <ChevronUp className="h-5 w-5" />
                                ) : (
                                  <ChevronDown className="h-5 w-5" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-4 border-t">
                          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            سندات التحويل
                          </h4>
                          {receipts[driver.id]?.length > 0 ? (
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
                                  {receipts[driver.id].map((receipt) => (
                                    <TableRow key={receipt.id}>
                                      <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                                      <TableCell>{new Date(receipt.transfer_date).toLocaleDateString('ar-SA')}</TableCell>
                                      <TableCell>{receipt.amount.toLocaleString('ar-SA')} ريال</TableCell>
                                      <TableCell className="max-w-[200px] truncate">{receipt.description || '-'}</TableCell>
                                      <TableCell>
                                        <div className="flex gap-2">
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => handleEditReceipt(receipt)}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="destructive" 
                                            onClick={() => handleDeleteReceipt(receipt.id)}
                                          >
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
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Receipt Dialog */}
        <Dialog open={quickReceiptDialogOpen} onOpenChange={setQuickReceiptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة سند تحويل سريع</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleQuickReceiptSubmit} className="space-y-4">
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
                <Button type="submit" disabled={loading}>إضافة</Button>
                <Button type="button" variant="outline" onClick={() => setQuickReceiptDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Receipt Dialog */}
        <Dialog open={editReceiptDialogOpen} onOpenChange={setEditReceiptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل سند التحويل</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditReceiptSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_receipt_number">رقم السند</Label>
                <Input
                  id="edit_receipt_number"
                  value={receiptFormData.receipt_number}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, receipt_number: e.target.value })}
                  required
                  placeholder="أدخل رقم السند"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_amount">المبلغ</Label>
                <Input
                  id="edit_amount"
                  type="number"
                  step="0.01"
                  value={receiptFormData.amount}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, amount: e.target.value })}
                  required
                  placeholder="أدخل المبلغ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_transfer_date">تاريخ التحويل</Label>
                <Input
                  id="edit_transfer_date"
                  type="date"
                  value={receiptFormData.transfer_date}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, transfer_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">الوصف</Label>
                <Input
                  id="edit_description"
                  value={receiptFormData.description}
                  onChange={(e) => setReceiptFormData({ ...receiptFormData, description: e.target.value })}
                  placeholder="أدخل الوصف (اختياري)"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>تحديث</Button>
                <Button type="button" variant="outline" onClick={() => setEditReceiptDialogOpen(false)}>
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

export default DriversPaymentReport;
