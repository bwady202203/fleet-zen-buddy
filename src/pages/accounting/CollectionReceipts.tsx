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
import { FileText, Plus, Printer, Eye, Pencil, Trash2, Check, ChevronsUpDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { numberToWords } from "@/lib/numberToWords";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent_id?: string | null;
}

interface CollectionReceipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: number;
  description: string;
  amount_in_words: string;
  debit_account?: Account;
  credit_account?: Account;
}

export default function CollectionReceipts() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<CollectionReceipt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<CollectionReceipt | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<CollectionReceipt | null>(null);

  const [formData, setFormData] = useState({
    receipt_date: format(new Date(), "yyyy-MM-dd"),
    debit_account_id: "",
    credit_account_id: "",
    amount: "",
    description: "",
    recipient_name: "",
  });

  const [debitOpen, setDebitOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  useEffect(() => {
    fetchReceipts();
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

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("collection_receipts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const receiptsWithAccounts = await Promise.all(
        (data || []).map(async (receipt) => {
          const [debitAccountRes, creditAccountRes] = await Promise.all([
            supabase
              .from("chart_of_accounts")
              .select("id, code, name_ar, name_en")
              .eq("id", receipt.debit_account_id)
              .single(),
            supabase
              .from("chart_of_accounts")
              .select("id, code, name_ar, name_en")
              .eq("id", receipt.credit_account_id)
              .single(),
          ]);

          return {
            ...receipt,
            debit_account: debitAccountRes.data,
            credit_account: creditAccountRes.data,
          };
        })
      );

      setReceipts(receiptsWithAccounts);
    } catch (error: any) {
      toast.error("خطأ في تحميل السندات: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptNumber = async () => {
    const { data } = await supabase
      .from("collection_receipts")
      .select("receipt_number")
      .order("receipt_number", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].receipt_number.replace('REC-', ''));
      return `REC-${String(lastNumber + 1).padStart(6, "0")}`;
    }
    return "REC-000001";
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
      const receiptNumber = editingReceipt ? editingReceipt.receipt_number : await generateReceiptNumber();
      const amount = parseFloat(formData.amount);
      const amountInWords = numberToWords(amount);

      const receiptData = {
        receipt_number: receiptNumber,
        receipt_date: formData.receipt_date,
        debit_account_id: formData.debit_account_id,
        credit_account_id: formData.credit_account_id,
        amount: amount,
        description: formData.description,
        amount_in_words: amountInWords,
        recipient_name: formData.recipient_name,
        created_by: user?.id,
      };

      if (editingReceipt) {
        await supabase
          .from("journal_entries")
          .delete()
          .eq("reference", `collection_receipt_${editingReceipt.id}`);

        const { error } = await supabase
          .from("collection_receipts")
          .update(receiptData)
          .eq("id", editingReceipt.id);

        if (error) throw error;

        await createJournalEntry(editingReceipt.id, receiptNumber, formData.receipt_date, amount);
        toast.success("تم تحديث السند بنجاح");
      } else {
        const { data: newReceipt, error } = await supabase
          .from("collection_receipts")
          .insert([receiptData])
          .select()
          .single();

        if (error) throw error;

        await createJournalEntry(newReceipt.id, receiptNumber, formData.receipt_date, amount);
        toast.success("تم إضافة السند بنجاح");
      }

      fetchReceipts();
      resetForm();
    } catch (error: any) {
      toast.error("خطأ في حفظ السند: " + error.message);
    }
  };

  const createJournalEntry = async (receiptId: string, receiptNumber: string, date: string, amount: number) => {
    try {
      const year = new Date().getFullYear();
      const { data: lastEntry } = await supabase
        .from("journal_entries")
        .select("entry_number")
        .like("entry_number", `JE-${year}%`)
        .order("entry_number", { ascending: false })
        .limit(1);

      let entryNumber = `JE-${year}000001`;
      if (lastEntry && lastEntry.length > 0) {
        const lastNumber = parseInt(lastEntry[0].entry_number.slice(-6));
        entryNumber = `JE-${year}${String(lastNumber + 1).padStart(6, "0")}`;
      }

      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert([{
          entry_number: entryNumber,
          date: date,
          description: `سند قبض رقم ${receiptNumber}`,
          reference: `collection_receipt_${receiptId}`,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (entryError) throw entryError;

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: formData.debit_account_id,
            debit: amount,
            credit: 0,
            description: formData.description || `سند قبض رقم ${receiptNumber}`,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: formData.credit_account_id,
            debit: 0,
            credit: amount,
            description: formData.description || `سند قبض رقم ${receiptNumber}`,
          },
        ]);

      if (linesError) throw linesError;
    } catch (error: any) {
      console.error("Error creating journal entry:", error);
      throw error;
    }
  };

  const handleEdit = (receipt: CollectionReceipt) => {
    setEditingReceipt(receipt);
    setFormData({
      receipt_date: receipt.receipt_date,
      debit_account_id: receipt.debit_account_id,
      credit_account_id: receipt.credit_account_id,
      amount: receipt.amount.toString(),
      description: receipt.description || "",
      recipient_name: (receipt as any).recipient_name || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السند؟")) return;

    try {
      await supabase
        .from("journal_entries")
        .delete()
        .eq("reference", `collection_receipt_${id}`);

      const { error } = await supabase
        .from("collection_receipts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("تم حذف السند بنجاح");
      fetchReceipts();
    } catch (error: any) {
      toast.error("خطأ في حذف السند: " + error.message);
    }
  };

  const handleView = (receipt: CollectionReceipt) => {
    setViewingReceipt(receipt);
    setShowView(true);
  };

  const resetForm = () => {
    setFormData({
      receipt_date: format(new Date(), "yyyy-MM-dd"),
      debit_account_id: "",
      credit_account_id: "",
      amount: "",
      description: "",
      recipient_name: "",
    });
    setEditingReceipt(null);
    setShowForm(false);
  };

  const handleDownloadPDF = async (receipt: CollectionReceipt) => {
    const debitAccount = receipt.debit_account;
    const creditAccount = receipt.credit_account;

    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.width = "650px";
    tempDiv.style.background = "white";
    tempDiv.innerHTML = `
      <div style="font-family: 'Arial', sans-serif; padding: 40px; direction: rtl; text-align: right; background: white;">
        <div style="max-width: 650px; margin: 0 auto; border: 3px solid #1e40af; padding: 35px; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 8px; box-shadow: 0 4px 15px rgba(30,64,175,0.3);">
            <div style="font-size: 32px; font-weight: bold; color: white; margin-bottom: 8px; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">شركة الرمال الناعمة</div>
            <div style="font-size: 18px; color: #e0e7ff; letter-spacing: 1px;">Soft Sands Company</div>
          </div>
          
          <div style="text-align: center; margin-bottom: 35px; padding: 25px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
            <div style="font-size: 36px; font-weight: bold; color: white; margin-bottom: 8px; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
              <span style="font-size: 28px; opacity: 0.9;">📄</span> سند قبض
            </div>
            <div style="font-size: 16px; color: #d1fae5; letter-spacing: 1px;">Collection Receipt</div>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 35px; padding: 20px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 8px; border: 2px solid #cbd5e1;">
            <div style="flex: 1; padding: 10px;">
              <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">رقم السند</div>
              <div style="font-size: 22px; font-weight: bold; color: #1e293b;">${receipt.receipt_number}</div>
            </div>
            <div style="flex: 1; padding: 10px; text-align: left;">
              <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">التاريخ</div>
              <div style="font-size: 22px; font-weight: bold; color: #1e293b;">${format(new Date(receipt.receipt_date), "dd/MM/yyyy", { locale: ar })}</div>
            </div>
          </div>

          <div style="margin: 30px 0; padding: 25px; background: white; border-radius: 8px; border: 2px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 15px; border-bottom: 2px solid #e2e8f0; font-size: 16px; font-weight: bold; color: #1e40af; width: 35%;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">📥</span> الحساب المدين
                  </div>
                </td>
                <td style="padding: 15px; border-bottom: 2px solid #e2e8f0; font-size: 17px; color: #334155; font-weight: 600;">
                  ${debitAccount?.code} - ${debitAccount?.name_ar}
                </td>
              </tr>
              <tr>
                <td style="padding: 15px; font-size: 16px; font-weight: bold; color: #059669; width: 35%;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">📤</span> الحساب الدائن
                  </div>
                </td>
                <td style="padding: 15px; font-size: 17px; color: #334155; font-weight: 600;">
                  ${creditAccount?.code} - ${creditAccount?.name_ar}
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 35px 0; padding: 30px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 3px solid #f59e0b; border-radius: 12px; box-shadow: 0 6px 20px rgba(245,158,11,0.3);">
            <div style="font-size: 18px; font-weight: bold; color: #92400e; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="font-size: 24px;">💰</span> المبلغ المستلم
            </div>
            <div style="font-size: 42px; font-weight: bold; color: #b45309; text-shadow: 2px 2px 4px rgba(180,83,9,0.2);">
              ${receipt.amount.toLocaleString('ar-SA')} <span style="font-size: 28px;">ريال</span>
            </div>
          </div>

          <div style="margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 8px; border: 2px solid #3b82f6;">
            <div style="font-size: 15px; font-weight: bold; color: #1e40af; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">✍️</span> المبلغ بالحروف:
            </div>
            <div style="font-size: 18px; color: #1e3a8a; font-weight: 600; line-height: 1.6; padding: 10px;">
              ${receipt.amount_in_words}
            </div>
          </div>

          ${receipt.description ? `
            <div style="margin: 30px 0; padding: 20px; border: 2px solid #e2e8f0; border-radius: 8px; background: white;">
              <div style="font-size: 15px; font-weight: bold; margin-bottom: 10px; color: #475569; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">📝</span> البيان:
              </div>
              <div style="font-size: 16px; color: #334155; line-height: 1.8;">${receipt.description}</div>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; margin-top: 70px; padding-top: 20px; border-top: 2px solid #cbd5e1;">
            <div style="text-align: center; width: 30%;">
              <div style="height: 100px; border-bottom: 2px solid #1e40af;"></div>
              <div style="padding-top: 10px; font-weight: bold; color: #1e40af; font-size: 15px;">المحاسب</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 3px;">Accountant</div>
            </div>
            <div style="text-align: center; width: 30%;">
              <div style="height: 100px; border-bottom: 2px solid #059669;"></div>
              <div style="padding-top: 10px; font-weight: bold; color: #059669; font-size: 15px;">المدير المالي</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 3px;">Finance Manager</div>
            </div>
            <div style="text-align: center; width: 30%;">
              <div style="height: 100px; border-bottom: 2px solid #dc2626;"></div>
              <div style="padding-top: 10px; font-weight: bold; color: #dc2626; font-size: 15px;">المستلم</div>
              ${(receipt as any).recipient_name ? `<div style="font-size: 14px; color: #1e293b; margin-top: 6px; font-weight: 600;">${(receipt as any).recipient_name}</div>` : ''}
              <div style="font-size: 12px; color: #64748b; margin-top: 3px;">Recipient</div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px dashed #cbd5e1;">
            <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
              هذا السند تم إنشاؤه إلكترونياً ولا يحتاج لختم أو توقيع • تاريخ الإصدار: ${format(new Date(), "dd/MM/yyyy - HH:mm", { locale: ar })}
            </div>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`سند_قبض_${receipt.receipt_number}.pdf`);

      toast.success("تم تحميل السند بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء ملف PDF");
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950" dir="rtl">
      <header className="border-b bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <FileText className="h-10 w-10 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">سندات القبض</h1>
              <p className="text-blue-100 mt-1">إدارة سندات القبض المحاسبية</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            onClick={() => setShowForm(true)} 
            size="lg"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-5 w-5 ml-2" />
            سند قبض جديد
          </Button>
        </div>

        <Card className="shadow-xl border-2">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900">
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              قائمة سندات القبض
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900">
                    <TableHead className="font-bold">رقم السند</TableHead>
                    <TableHead className="font-bold">التاريخ</TableHead>
                    <TableHead className="font-bold">الحساب المدين</TableHead>
                    <TableHead className="font-bold">الحساب الدائن</TableHead>
                    <TableHead className="font-bold">المبلغ</TableHead>
                    <TableHead className="font-bold text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                      <TableCell className="font-bold text-blue-600">{receipt.receipt_number}</TableCell>
                      <TableCell>{format(new Date(receipt.receipt_date), "dd/MM/yyyy", { locale: ar })}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-semibold">{receipt.debit_account?.code}</div>
                          <div className="text-muted-foreground">{receipt.debit_account?.name_ar}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-semibold">{receipt.credit_account?.code}</div>
                          <div className="text-muted-foreground">{receipt.credit_account?.name_ar}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-green-600 text-lg">
                        {receipt.amount.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleView(receipt)}
                            className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDownloadPDF(receipt)}
                            className="hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEdit(receipt)}
                            className="hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDelete(receipt.id)}
                            className="hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {receipts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لا توجد سندات قبض مسجلة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={(open) => {
          if (!open) resetForm();
          setShowForm(open);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                {editingReceipt ? "تعديل سند قبض" : "سند قبض جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">التاريخ *</Label>
                  <Input
                    type="date"
                    value={formData.receipt_date}
                    onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                    required
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">المبلغ *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    placeholder="0.00"
                    className="text-base"
                  />
                </div>
              </div>

              {formData.amount && parseFloat(formData.amount) > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">تفقيط المبلغ:</div>
                  <div className="text-base font-bold text-blue-900 dark:text-blue-100">
                    {numberToWords(parseFloat(formData.amount))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-base font-semibold">الحساب المدين (الحساب المستلم) *</Label>
                <Popover open={debitOpen} onOpenChange={setDebitOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={debitOpen}
                      className="w-full justify-between text-base h-12"
                    >
                      {formData.debit_account_id
                        ? accounts.find((acc) => acc.id === formData.debit_account_id)?.code + " - " +
                          accounts.find((acc) => acc.id === formData.debit_account_id)?.name_ar
                        : "اختر الحساب المدين"}
                      <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="بحث..." className="h-10" />
                      <CommandList>
                        <CommandEmpty>لا توجد حسابات</CommandEmpty>
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
                                  formData.debit_account_id === account.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="font-semibold text-blue-600">{account.code}</span>
                              <span className="mr-2">{account.name_ar}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">الحساب الدائن (الحساب المصدر) *</Label>
                <Popover open={creditOpen} onOpenChange={setCreditOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={creditOpen}
                      className="w-full justify-between text-base h-12"
                    >
                      {formData.credit_account_id
                        ? accounts.find((acc) => acc.id === formData.credit_account_id)?.code + " - " +
                          accounts.find((acc) => acc.id === formData.credit_account_id)?.name_ar
                        : "اختر الحساب الدائن"}
                      <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="بحث..." className="h-10" />
                      <CommandList>
                        <CommandEmpty>لا توجد حسابات</CommandEmpty>
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
                                  formData.credit_account_id === account.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="font-semibold text-green-600">{account.code}</span>
                              <span className="mr-2">{account.name_ar}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">البيان / الوصف</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="أدخل وصف السند..."
                  className="text-base resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">اسم المستلم</Label>
                <Input
                  type="text"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  placeholder="أدخل اسم المستلم..."
                  className="text-base"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {editingReceipt ? "تحديث السند" : "إضافة السند"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="lg"
                  onClick={resetForm}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showView} onOpenChange={setShowView}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Eye className="h-6 w-6 text-blue-600" />
                معاينة سند القبض
              </DialogTitle>
            </DialogHeader>
            {viewingReceipt && (
              <div className="max-w-2xl mx-auto p-6 bg-gradient-to-br from-white to-blue-50 dark:from-slate-900 dark:to-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <div className="text-center mb-6 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg">
                  <h2 className="text-3xl font-bold text-white mb-2">سند قبض</h2>
                  <p className="text-blue-100">Collection Receipt</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">رقم السند</p>
                    <p className="text-xl font-bold text-blue-600">{viewingReceipt.receipt_number}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground mb-1">التاريخ</p>
                    <p className="text-xl font-bold">{format(new Date(viewingReceipt.receipt_date), "dd/MM/yyyy", { locale: ar })}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">الحساب المدين (المستلم)</p>
                    <p className="text-lg font-bold">
                      {viewingReceipt.debit_account?.code} - {viewingReceipt.debit_account?.name_ar}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border-2 border-green-200 dark:border-green-800">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">الحساب الدائن (المصدر)</p>
                    <p className="text-lg font-bold">
                      {viewingReceipt.credit_account?.code} - {viewingReceipt.credit_account?.name_ar}
                    </p>
                  </div>
                </div>

                <div className="text-center p-6 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 rounded-lg border-3 border-amber-300 dark:border-amber-700 mb-6">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">المبلغ المستلم</p>
                  <p className="text-4xl font-bold text-amber-900 dark:text-amber-100">
                    {viewingReceipt.amount.toLocaleString('ar-SA')} ريال
                  </p>
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border-2 border-indigo-200 dark:border-indigo-800 mb-6">
                  <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">المبلغ بالحروف:</p>
                  <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100 leading-relaxed">
                    {viewingReceipt.amount_in_words}
                  </p>
                </div>

                {viewingReceipt.description && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-800 mb-6">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">البيان:</p>
                    <p className="text-base text-slate-900 dark:text-slate-100">{viewingReceipt.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 pt-8 mt-8 border-t-2 border-slate-300 dark:border-slate-700">
                  <div className="text-center">
                    <div className="h-24 mb-2 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    <div className="pt-2">
                      <p className="font-bold text-blue-700 dark:text-blue-300 text-sm">المحاسب</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Accountant</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="h-24 mb-2 border-b-2 border-green-600 dark:border-green-400"></div>
                    <div className="pt-2">
                      <p className="font-bold text-green-700 dark:text-green-300 text-sm">المدير المالي</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Finance Manager</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="h-24 mb-2 border-b-2 border-red-600 dark:border-red-400"></div>
                    <div className="pt-2">
                      <p className="font-bold text-red-700 dark:text-red-300 text-sm">المستلم</p>
                      {(viewingReceipt as any).recipient_name && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 font-semibold">{(viewingReceipt as any).recipient_name}</p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Recipient</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <Button 
                    onClick={() => handleDownloadPDF(viewingReceipt)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    size="lg"
                  >
                    <Download className="h-5 w-5 ml-2" />
                    تحميل PDF
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowView(false)}
                    size="lg"
                  >
                    إغلاق
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
