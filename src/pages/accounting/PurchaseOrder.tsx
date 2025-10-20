import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FileText, Plus, Printer, Eye, Pencil, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent_id?: string | null;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  order_date: string;
  supplier_name: string;
  description: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: number;
  debit_account?: Account;
  credit_account?: Account;
}

export default function PurchaseOrder() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);

  const [formData, setFormData] = useState({
    order_date: format(new Date(), "yyyy-MM-dd"),
    supplier_name: "",
    description: "",
    debit_account_id: "",
    credit_account_id: "",
    amount: "",
  });

  const [debitOpen, setDebitOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data: allAccounts, error } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name_ar, name_en, parent_id")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      
      const accountIds = new Set(allAccounts?.map(acc => acc.id) || []);
      const parentIds = new Set(allAccounts?.map(acc => acc.parent_id).filter(Boolean) || []);
      
      const leafAccounts = allAccounts?.filter(acc => !parentIds.has(acc.id)) || [];
      
      setAccounts(leafAccounts);
    } catch (error: any) {
      toast.error("خطأ في تحميل الحسابات: " + error.message);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("order_date", { ascending: false });

      if (error) throw error;

      const ordersWithAccounts = await Promise.all(
        (data || []).map(async (order) => {
          const [debitAccountRes, creditAccountRes] = await Promise.all([
            supabase
              .from("chart_of_accounts")
              .select("id, code, name_ar, name_en")
              .eq("id", order.debit_account_id)
              .single(),
            supabase
              .from("chart_of_accounts")
              .select("id, code, name_ar, name_en")
              .eq("id", order.credit_account_id)
              .single(),
          ]);

          return {
            ...order,
            debit_account: debitAccountRes.data,
            credit_account: creditAccountRes.data,
          };
        })
      );

      setOrders(ordersWithAccounts);
    } catch (error: any) {
      toast.error("خطأ في تحميل طلبات الشراء: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateOrderNumber = async () => {
    const { data } = await supabase
      .from("purchase_orders")
      .select("order_number")
      .order("order_number", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].order_number);
      return String(lastNumber + 1).padStart(6, "0");
    }
    return "000001";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplier_name.trim()) {
      toast.error("يرجى إدخال اسم المورد");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("يرجى إدخال وصف المواد");
      return;
    }

    if (!formData.debit_account_id || !formData.credit_account_id) {
      toast.error("يرجى اختيار الحسابات المدين والدائن");
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    try {
      const orderNumber = editingOrder ? editingOrder.order_number : await generateOrderNumber();
      const amount = parseFloat(formData.amount);

      const orderData = {
        order_number: orderNumber,
        order_date: formData.order_date,
        supplier_name: formData.supplier_name,
        description: formData.description,
        debit_account_id: formData.debit_account_id,
        credit_account_id: formData.credit_account_id,
        amount: amount,
        created_by: user?.id,
      };

      if (editingOrder) {
        const { error } = await supabase
          .from("purchase_orders")
          .update(orderData)
          .eq("id", editingOrder.id);

        if (error) throw error;
        toast.success("تم تحديث طلب الشراء بنجاح");
      } else {
        const { error } = await supabase
          .from("purchase_orders")
          .insert([orderData]);

        if (error) throw error;
        toast.success("تم إضافة طلب الشراء بنجاح");
      }

      fetchOrders();
      resetForm();
    } catch (error: any) {
      toast.error("خطأ في حفظ طلب الشراء: " + error.message);
    }
  };

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setFormData({
      order_date: order.order_date,
      supplier_name: order.supplier_name,
      description: order.description,
      debit_account_id: order.debit_account_id,
      credit_account_id: order.credit_account_id,
      amount: order.amount.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;

    try {
      const { error } = await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("تم حذف طلب الشراء بنجاح");
      fetchOrders();
    } catch (error: any) {
      toast.error("خطأ في حذف طلب الشراء: " + error.message);
    }
  };

  const handleView = (order: PurchaseOrder) => {
    setViewingOrder(order);
    setShowView(true);
  };

  const resetForm = () => {
    setFormData({
      order_date: format(new Date(), "yyyy-MM-dd"),
      supplier_name: "",
      description: "",
      debit_account_id: "",
      credit_account_id: "",
      amount: "",
    });
    setEditingOrder(null);
    setShowForm(false);
  };

  const handlePrint = (order: PurchaseOrder) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const debitAccount = order.debit_account;
    const creditAccount = order.credit_account;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>طلب شراء - ${order.order_number}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              padding: 40px;
              direction: rtl;
              text-align: right;
            }
            .order-container {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #333;
              padding: 30px;
              background: white;
            }
            .company-header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #333;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 5px;
            }
            .company-name-en {
              font-size: 16px;
              color: #7f8c8d;
            }
            .document-title {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px double #333;
              padding-bottom: 20px;
            }
            .document-title h1 {
              font-size: 28px;
              color: #333;
              margin-bottom: 10px;
            }
            .document-title-en {
              font-size: 14px;
              color: #666;
              margin-top: 5px;
            }
            .order-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 8px;
            }
            .order-info div {
              font-size: 16px;
            }
            .info-table {
              width: 100%;
              margin: 20px 0;
              border-collapse: collapse;
            }
            .info-table td {
              padding: 12px;
              border: 1px solid #ddd;
              font-size: 16px;
            }
            .info-table td:first-child {
              background: #f9f9f9;
              font-weight: bold;
              width: 30%;
              color: #555;
            }
            .amount-box {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background: #f0f0f0;
              border: 2px solid #333;
              border-radius: 8px;
            }
            .amount-label {
              font-size: 18px;
              font-weight: bold;
              color: #555;
              margin-bottom: 10px;
            }
            .amount-value {
              font-size: 32px;
              font-weight: bold;
              color: #2c3e50;
            }
            .description-box {
              margin: 20px 0;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 8px;
              background: #fafafa;
            }
            .description-label {
              font-weight: bold;
              margin-bottom: 8px;
              color: #555;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .signature-box {
              text-align: center;
              width: 30%;
            }
            .signature-line {
              border-top: 2px solid #333;
              margin-top: 60px;
              padding-top: 10px;
              font-weight: bold;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="order-container">
            <div class="company-header">
              <div class="company-name">شركة الرمال الناعمة</div>
              <div class="company-name-en">Soft Sands Company</div>
            </div>
            
            <div class="document-title">
              <h1>طلب شراء</h1>
              <div class="document-title-en">Purchase Order</div>
            </div>
            
            <div class="order-info">
              <div><strong>رقم الطلب:</strong> ${order.order_number}</div>
              <div><strong>التاريخ:</strong> ${format(new Date(order.order_date), "dd/MM/yyyy", { locale: ar })}</div>
            </div>

            <table class="info-table">
              <tr>
                <td>اسم المورد</td>
                <td>${order.supplier_name}</td>
              </tr>
              <tr>
                <td>الحساب المدين</td>
                <td>${debitAccount?.code} - ${debitAccount?.name_ar}</td>
              </tr>
              <tr>
                <td>الحساب الدائن</td>
                <td>${creditAccount?.code} - ${creditAccount?.name_ar}</td>
              </tr>
            </table>

            <div class="amount-box">
              <div class="amount-label">المبلغ الإجمالي</div>
              <div class="amount-value">${order.amount.toLocaleString('ar-SA')} ريال</div>
            </div>

            <div class="description-box">
              <div class="description-label">وصف المواد المشتراة:</div>
              <div>${order.description}</div>
            </div>

            <div class="signatures">
              <div class="signature-box">
                <div class="signature-line">المحاسب</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">المدير المالي</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">مدير المشتريات</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const selectedDebitAccount = accounts.find(acc => acc.id === formData.debit_account_id);
  const selectedCreditAccount = accounts.find(acc => acc.id === formData.credit_account_id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">طلبات الشراء</CardTitle>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="ml-2 h-4 w-4" />
            طلب شراء جديد
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      {format(new Date(order.order_date), "dd/MM/yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell>{order.supplier_name}</TableCell>
                    <TableCell>{order.amount.toLocaleString('ar-SA')} ريال</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(order)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(order)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      لا توجد طلبات شراء
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? "تعديل طلب الشراء" : "طلب شراء جديد"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_date">التاريخ</Label>
                <Input
                  id="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier_name">اسم المورد</Label>
                <Input
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="أدخل اسم المورد"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">وصف المواد المشتراة</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="أدخل وصف تفصيلي للمواد المشتراة"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الحساب المدين</Label>
                <Popover open={debitOpen} onOpenChange={setDebitOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={debitOpen}
                      className="w-full justify-between"
                    >
                      {selectedDebitAccount
                        ? `${selectedDebitAccount.code} - ${selectedDebitAccount.name_ar}`
                        : "اختر الحساب المدين"}
                      <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="ابحث عن حساب..." />
                      <CommandList>
                        <CommandEmpty>لا توجد نتائج</CommandEmpty>
                        <CommandGroup>
                          {accounts.map((account) => (
                            <CommandItem
                              key={account.id}
                              value={`${account.code} ${account.name_ar}`}
                              onSelect={() => {
                                setFormData({ ...formData, debit_account_id: account.id });
                                setDebitOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  formData.debit_account_id === account.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {account.code} - {account.name_ar}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>الحساب الدائن</Label>
                <Popover open={creditOpen} onOpenChange={setCreditOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={creditOpen}
                      className="w-full justify-between"
                    >
                      {selectedCreditAccount
                        ? `${selectedCreditAccount.code} - ${selectedCreditAccount.name_ar}`
                        : "اختر الحساب الدائن"}
                      <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="ابحث عن حساب..." />
                      <CommandList>
                        <CommandEmpty>لا توجد نتائج</CommandEmpty>
                        <CommandGroup>
                          {accounts.map((account) => (
                            <CommandItem
                              key={account.id}
                              value={`${account.code} ${account.name_ar}`}
                              onSelect={() => {
                                setFormData({ ...formData, credit_account_id: account.id });
                                setCreditOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  formData.credit_account_id === account.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {account.code} - {account.name_ar}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ (ريال)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={resetForm}>
                إلغاء
              </Button>
              <Button type="submit">
                {editingOrder ? "تحديث" : "حفظ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>عرض طلب الشراء</DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>رقم الطلب</Label>
                  <div className="font-medium">{viewingOrder.order_number}</div>
                </div>
                <div>
                  <Label>التاريخ</Label>
                  <div>{format(new Date(viewingOrder.order_date), "dd/MM/yyyy", { locale: ar })}</div>
                </div>
              </div>
              
              <div>
                <Label>اسم المورد</Label>
                <div className="font-medium">{viewingOrder.supplier_name}</div>
              </div>

              <div>
                <Label>وصف المواد</Label>
                <div className="p-3 bg-muted rounded-md">{viewingOrder.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الحساب المدين</Label>
                  <div>{viewingOrder.debit_account?.code} - {viewingOrder.debit_account?.name_ar}</div>
                </div>
                <div>
                  <Label>الحساب الدائن</Label>
                  <div>{viewingOrder.credit_account?.code} - {viewingOrder.credit_account?.name_ar}</div>
                </div>
              </div>

              <div>
                <Label>المبلغ</Label>
                <div className="text-2xl font-bold">{viewingOrder.amount.toLocaleString('ar-SA')} ريال</div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button onClick={() => handlePrint(viewingOrder)}>
                  <Printer className="ml-2 h-4 w-4" />
                  طباعة
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
