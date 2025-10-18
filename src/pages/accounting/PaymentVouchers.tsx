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

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent_id?: string | null;
}

interface PaymentVoucher {
  id: string;
  voucher_number: string;
  voucher_date: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: number;
  description: string;
  debit_account?: Account;
  credit_account?: Account;
}

export default function PaymentVouchers() {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<PaymentVoucher | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<PaymentVoucher | null>(null);

  const [formData, setFormData] = useState({
    voucher_date: format(new Date(), "yyyy-MM-dd"),
    debit_account_id: "",
    credit_account_id: "",
    amount: "",
    description: "",
  });

  const [debitOpen, setDebitOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  useEffect(() => {
    fetchVouchers();
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .is("parent_id", null)
        .eq("is_active", true)
        .order("code");

      if (error) throw error;

      // Get all level 4 accounts (accounts that have parent -> parent -> parent)
      const level4Accounts: Account[] = [];
      
      for (const account of data || []) {
        const { data: children } = await supabase
          .from("chart_of_accounts")
          .select("*")
          .eq("parent_id", account.id)
          .eq("is_active", true);

        if (children) {
          for (const child of children) {
            const { data: grandchildren } = await supabase
              .from("chart_of_accounts")
              .select("*")
              .eq("parent_id", child.id)
              .eq("is_active", true);

            if (grandchildren) {
              for (const grandchild of grandchildren) {
                const { data: greatgrandchildren } = await supabase
                  .from("chart_of_accounts")
                  .select("*")
                  .eq("parent_id", grandchild.id)
                  .eq("is_active", true);

                if (greatgrandchildren && greatgrandchildren.length > 0) {
                  level4Accounts.push(...greatgrandchildren);
                }
              }
            }
          }
        }
      }

      setAccounts(level4Accounts);
    } catch (error: any) {
      toast.error("خطأ في تحميل الحسابات: " + error.message);
    }
  };

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_vouchers")
        .select("*")
        .order("voucher_date", { ascending: false });

      if (error) throw error;

      // Fetch account details separately
      const vouchersWithAccounts = await Promise.all(
        (data || []).map(async (voucher) => {
          const [debitAccountRes, creditAccountRes] = await Promise.all([
            supabase
              .from("chart_of_accounts")
              .select("id, code, name_ar, name_en")
              .eq("id", voucher.debit_account_id)
              .single(),
            supabase
              .from("chart_of_accounts")
              .select("id, code, name_ar, name_en")
              .eq("id", voucher.credit_account_id)
              .single(),
          ]);

          return {
            ...voucher,
            debit_account: debitAccountRes.data,
            credit_account: creditAccountRes.data,
          };
        })
      );

      setVouchers(vouchersWithAccounts);
    } catch (error: any) {
      toast.error("خطأ في تحميل السندات: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateVoucherNumber = async () => {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from("payment_vouchers")
      .select("voucher_number")
      .like("voucher_number", `PV-${year}%`)
      .order("voucher_number", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].voucher_number.slice(-6));
      return `PV-${year}${String(lastNumber + 1).padStart(6, "0")}`;
    }
    return `PV-${year}000001`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.debit_account_id || !formData.credit_account_id) {
      toast.error("يرجى اختيار الحسابات المدين والدائن");
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    try {
      const voucherNumber = editingVoucher ? editingVoucher.voucher_number : await generateVoucherNumber();

      const voucherData = {
        voucher_number: voucherNumber,
        voucher_date: formData.voucher_date,
        debit_account_id: formData.debit_account_id,
        credit_account_id: formData.credit_account_id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        created_by: user?.id,
      };

      if (editingVoucher) {
        const { error } = await supabase
          .from("payment_vouchers")
          .update(voucherData)
          .eq("id", editingVoucher.id);

        if (error) throw error;
        toast.success("تم تحديث السند بنجاح");
      } else {
        const { error } = await supabase
          .from("payment_vouchers")
          .insert([voucherData]);

        if (error) throw error;
        toast.success("تم إضافة السند بنجاح");
      }

      fetchVouchers();
      resetForm();
    } catch (error: any) {
      toast.error("خطأ في حفظ السند: " + error.message);
    }
  };

  const handleEdit = (voucher: PaymentVoucher) => {
    setEditingVoucher(voucher);
    setFormData({
      voucher_date: voucher.voucher_date,
      debit_account_id: voucher.debit_account_id,
      credit_account_id: voucher.credit_account_id,
      amount: voucher.amount.toString(),
      description: voucher.description || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السند؟")) return;

    try {
      const { error } = await supabase
        .from("payment_vouchers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("تم حذف السند بنجاح");
      fetchVouchers();
    } catch (error: any) {
      toast.error("خطأ في حذف السند: " + error.message);
    }
  };

  const handleView = (voucher: PaymentVoucher) => {
    setViewingVoucher(voucher);
    setShowView(true);
  };

  const handlePrint = (voucher: PaymentVoucher) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const debitAccount = voucher.debit_account;
    const creditAccount = voucher.credit_account;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>سند صرف - ${voucher.voucher_number}</title>
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
            .voucher-container {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #333;
              padding: 30px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px double #333;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 28px;
              color: #333;
              margin-bottom: 10px;
            }
            .voucher-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 8px;
            }
            .voucher-info div {
              font-size: 16px;
            }
            .voucher-info strong {
              color: #555;
            }
            .details-table {
              width: 100%;
              margin: 20px 0;
              border-collapse: collapse;
            }
            .details-table td {
              padding: 12px;
              border: 1px solid #ddd;
              font-size: 16px;
            }
            .details-table .label {
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
            .amount-box .label {
              font-size: 18px;
              font-weight: bold;
              color: #555;
              margin-bottom: 10px;
            }
            .amount-box .value {
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
            .description-box .label {
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
              .voucher-container {
                border: 2px solid #000;
              }
            }
          </style>
        </head>
        <body>
          <div class="voucher-container">
            <div class="header">
              <h1>سند صرف</h1>
              <div style="font-size: 14px; color: #666; margin-top: 5px;">Payment Voucher</div>
            </div>
            
            <div class="voucher-info">
              <div><strong>رقم السند:</strong> ${voucher.voucher_number}</div>
              <div><strong>التاريخ:</strong> ${format(new Date(voucher.voucher_date), "dd/MM/yyyy", { locale: ar })}</div>
            </div>

            <table class="details-table">
              <tr>
                <td class="label">الحساب المدين</td>
                <td>${debitAccount?.code} - ${debitAccount?.name_ar}</td>
              </tr>
              <tr>
                <td class="label">الحساب الدائن</td>
                <td>${creditAccount?.code} - ${creditAccount?.name_ar}</td>
              </tr>
            </table>

            <div class="amount-box">
              <div class="label">المبلغ</div>
              <div class="value">${voucher.amount.toLocaleString('ar-SA')} ريال</div>
            </div>

            ${voucher.description ? `
              <div class="description-box">
                <div class="label">البيان:</div>
                <div>${voucher.description}</div>
              </div>
            ` : ''}

            <div class="signatures">
              <div class="signature-box">
                <div class="signature-line">المحاسب</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">المدير المالي</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">المستلم</div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const resetForm = () => {
    setFormData({
      voucher_date: format(new Date(), "yyyy-MM-dd"),
      debit_account_id: "",
      credit_account_id: "",
      amount: "",
      description: "",
    });
    setEditingVoucher(null);
    setShowForm(false);
  };

  const filterAccounts = (searchValue: string) => {
    if (!searchValue) return accounts;
    return accounts.filter(
      (acc) =>
        acc.code.includes(searchValue) ||
        acc.name_ar.includes(searchValue) ||
        acc.name_en.toLowerCase().includes(searchValue.toLowerCase())
    );
  };

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            سندات الصرف
          </CardTitle>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 ml-2" />
            سند صرف جديد
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم السند</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحساب المدين</TableHead>
                  <TableHead className="text-right">الحساب الدائن</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell>{voucher.voucher_number}</TableCell>
                    <TableCell>
                      {format(new Date(voucher.voucher_date), "dd/MM/yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {voucher.debit_account?.code} - {voucher.debit_account?.name_ar}
                    </TableCell>
                    <TableCell>
                      {voucher.credit_account?.code} - {voucher.credit_account?.name_ar}
                    </TableCell>
                    <TableCell>{voucher.amount.toLocaleString('ar-SA')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(voucher)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(voucher)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(voucher)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(voucher.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingVoucher ? "تعديل سند صرف" : "سند صرف جديد"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={formData.voucher_date}
                onChange={(e) =>
                  setFormData({ ...formData, voucher_date: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label>الحساب المدين</Label>
              <Popover open={debitOpen} onOpenChange={setDebitOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={debitOpen}
                    className="w-full justify-between"
                  >
                    {formData.debit_account_id
                      ? accounts.find((acc) => acc.id === formData.debit_account_id)?.code +
                        " - " +
                        accounts.find((acc) => acc.id === formData.debit_account_id)?.name_ar
                      : "اختر الحساب المدين"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" dir="rtl">
                  <Command>
                    <CommandInput placeholder="ابحث عن الحساب..." />
                    <CommandList>
                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                      <CommandGroup>
                        {accounts.map((account) => (
                          <CommandItem
                            key={account.id}
                            value={account.code + " " + account.name_ar}
                            onSelect={() => {
                              setFormData({ ...formData, debit_account_id: account.id });
                              setDebitOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4",
                                formData.debit_account_id === account.id
                                  ? "opacity-100"
                                  : "opacity-0"
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

            <div>
              <Label>الحساب الدائن</Label>
              <Popover open={creditOpen} onOpenChange={setCreditOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={creditOpen}
                    className="w-full justify-between"
                  >
                    {formData.credit_account_id
                      ? accounts.find((acc) => acc.id === formData.credit_account_id)?.code +
                        " - " +
                        accounts.find((acc) => acc.id === formData.credit_account_id)?.name_ar
                      : "اختر الحساب الدائن"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" dir="rtl">
                  <Command>
                    <CommandInput placeholder="ابحث عن الحساب..." />
                    <CommandList>
                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                      <CommandGroup>
                        {accounts.map((account) => (
                          <CommandItem
                            key={account.id}
                            value={account.code + " " + account.name_ar}
                            onSelect={() => {
                              setFormData({ ...formData, credit_account_id: account.id });
                              setCreditOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4",
                                formData.credit_account_id === account.id
                                  ? "opacity-100"
                                  : "opacity-0"
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

            <div>
              <Label>المبلغ</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label>البيان</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={resetForm}>
                إلغاء
              </Button>
              <Button type="submit">
                {editingVoucher ? "تحديث" : "حفظ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>عرض سند الصرف</DialogTitle>
          </DialogHeader>
          {viewingVoucher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>رقم السند</Label>
                  <div className="font-bold">{viewingVoucher.voucher_number}</div>
                </div>
                <div>
                  <Label>التاريخ</Label>
                  <div className="font-bold">
                    {format(new Date(viewingVoucher.voucher_date), "dd/MM/yyyy", { locale: ar })}
                  </div>
                </div>
              </div>
              <div>
                <Label>الحساب المدين</Label>
                <div className="font-bold">
                  {viewingVoucher.debit_account?.code} - {viewingVoucher.debit_account?.name_ar}
                </div>
              </div>
              <div>
                <Label>الحساب الدائن</Label>
                <div className="font-bold">
                  {viewingVoucher.credit_account?.code} - {viewingVoucher.credit_account?.name_ar}
                </div>
              </div>
              <div>
                <Label>المبلغ</Label>
                <div className="font-bold text-xl">
                  {viewingVoucher.amount.toLocaleString('ar-SA')} ريال
                </div>
              </div>
              {viewingVoucher.description && (
                <div>
                  <Label>البيان</Label>
                  <div>{viewingVoucher.description}</div>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button onClick={() => handlePrint(viewingVoucher)}>
                  <Printer className="h-4 w-4 ml-2" />
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
