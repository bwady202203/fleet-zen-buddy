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
  const [pdfWidth, setPdfWidth] = useState(600);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadWidth, setDownloadWidth] = useState(600);
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    fetchReceipts();
    fetchAccounts();
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const { data } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();
      setCompanySettings(data);
    } catch (error) {
      console.error("Error fetching company settings:", error);
    }
  };

  const generateReceiptHTML = (receipt: any) => {
    const debitAccount = accounts.find(acc => acc.id === receipt.debit_account_id);
    const creditAccount = accounts.find(acc => acc.id === receipt.credit_account_id);
    
    return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Arial', sans-serif;
            background: white;
            padding: 40px;
            direction: rtl;
          }
          .receipt-container {
            max-width: ${pdfWidth}px;
            margin: 0 auto;
            background: white;
            border: 3px solid #000;
            border-radius: 8px;
            overflow: hidden;
          }
          .header {
            background: #000;
            color: white;
            padding: 30px;
            text-align: center;
            border-bottom: none;
          }
          .header h1 {
            font-size: 32px;
            margin-bottom: 8px;
            font-weight: bold;
          }
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          .receipt-title {
            background: #f5f5f5;
            padding: 20px;
            text-align: center;
            border-bottom: 2px solid #000;
          }
          .receipt-title h2 {
            font-size: 28px;
            color: #000;
            font-weight: bold;
          }
          .receipt-info {
            display: flex;
            justify-content: space-between;
            padding: 20px 40px;
            background: #f5f5f5;
            border-bottom: 2px solid #ddd;
          }
          .info-item {
            text-align: center;
          }
          .info-label {
            font-size: 13px;
            color: #666;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 18px;
            font-weight: bold;
            color: #000;
          }
          .accounts-section {
            padding: 30px 40px;
            background: white;
          }
          .account-row {
            display: flex;
            align-items: center;
            padding: 20px;
            margin-bottom: 15px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 8px;
          }
          .account-label {
            min-width: 140px;
            font-weight: bold;
            color: #000;
            font-size: 16px;
          }
          .account-info {
            flex: 1;
            text-align: right;
          }
          .account-code {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }
          .account-name {
            font-size: 16px;
            color: #000;
            font-weight: 600;
          }
          .amount-section {
            padding: 30px 40px;
            text-align: center;
            background: white;
          }
          .amount-box {
            background: white;
            border: 3px solid #000;
            padding: 35px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .amount-label {
            font-size: 16px;
            margin-bottom: 15px;
            color: #000;
            font-weight: bold;
          }
          .amount-value {
            font-size: 36px;
            font-weight: bold;
            color: #000;
          }
          .amount-words-box {
            background: #f5f5f5;
            padding: 25px;
            border-radius: 8px;
            border: 2px solid #ddd;
          }
          .amount-words-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            font-weight: bold;
          }
          .amount-words-value {
            font-size: 18px;
            color: #000;
            font-weight: 600;
            line-height: 1.8;
          }
          .description-section {
            padding: 0 40px 25px;
            background: white;
          }
          .description-box {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            border: 2px solid #ddd;
          }
          .description-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            font-weight: bold;
          }
          .description-value {
            font-size: 16px;
            color: #000;
            line-height: 1.8;
          }
          .signature-section {
            padding: 40px;
            border-top: 3px solid #000;
            text-align: center;
            background: white;
          }
          .signature-label {
            font-size: 18px;
            color: #000;
            margin-bottom: 60px;
            font-weight: bold;
          }
          .signature-line {
            border-top: 3px solid #000;
            width: 250px;
            margin: 0 auto;
            padding-top: 15px;
          }
          .signature-name {
            font-size: 16px;
            color: #000;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1>${companySettings?.company_name || 'اسم الشركة'}</h1>
            <p>${companySettings?.address || 'عنوان الشركة'}</p>
          </div>
          
          <div class="receipt-title">
            <h2>📋 سند قبض</h2>
          </div>
          
          <div class="receipt-info">
            <div class="info-item">
              <div class="info-label">التاريخ</div>
              <div class="info-value">${new Date(receipt.receipt_date).toLocaleDateString('ar-SA')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">رقم السند</div>
              <div class="info-value">${receipt.receipt_number}</div>
            </div>
          </div>
          
          <div class="accounts-section">
            <div class="account-row">
              <div class="account-label">💰 الحساب المدين</div>
              <div class="account-info">
                <div class="account-code">${debitAccount?.code || ''}</div>
                <div class="account-name">${debitAccount?.name_ar || ''}</div>
              </div>
            </div>
            
            <div class="account-row">
              <div class="account-label">💰 الحساب الدائن</div>
              <div class="account-info">
                <div class="account-code">${creditAccount?.code || ''}</div>
                <div class="account-name">${creditAccount?.name_ar || ''}</div>
              </div>
            </div>
          </div>
          
          <div class="amount-section">
            <div class="amount-box">
              <div class="amount-label">💵 المبلغ المستحق</div>
              <div class="amount-value">${receipt.amount.toLocaleString('ar-SA')} ريال</div>
            </div>
            
            <div class="amount-words-box">
              <div class="amount-words-label">📝 المبلغ بالحروف:</div>
              <div class="amount-words-value">${receipt.amount_in_words || ''}</div>
            </div>
          </div>
          
          ${receipt.description ? `
          <div class="description-section">
            <div class="description-box">
              <div class="description-label">الوصف:</div>
              <div class="description-value">${receipt.description}</div>
            </div>
          </div>
          ` : ''}
          
          <div class="signature-section">
            <div class="signature-label">توقيع المستلم</div>
            <div class="signature-line">
              ${receipt.recipient_name ? `<div class="signature-name">${receipt.recipient_name}</div>` : ''}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

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
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.width = `${downloadWidth}px`;
    tempDiv.style.background = "white";
    tempDiv.innerHTML = generateReceiptHTML(receipt);

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
      const pWidth = pdf.internal.pageSize.getWidth();
      const pHeight = (canvas.height * pWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pWidth, pHeight);
      pdf.save(`سند_قبض_${receipt.receipt_number}.pdf`);

      toast.success("تم تحميل السند بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء ملف PDF");
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const handleDownloadFromPreview = async (receipt: CollectionReceipt) => {
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.width = `${pdfWidth}px`;
    tempDiv.style.background = "white";
    tempDiv.innerHTML = generateReceiptHTML(receipt);

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
      const pWidth = pdf.internal.pageSize.getWidth();
      const pHeight = (canvas.height * pWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pWidth, pHeight);
      pdf.save(`سند_قبض_${receipt.receipt_number}.pdf`);

      toast.success("تم تحميل السند بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء ملف PDF");
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const handlePrint = (receipt: CollectionReceipt) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generateReceiptHTML(receipt));
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
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
                            onClick={() => {
                              setViewingReceipt(receipt);
                              setShowDownloadDialog(true);
                            }}
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
            <div className="space-y-4 mb-4">
              <div className="flex items-center gap-4">
                <Label className="text-right min-w-[100px]">عرض السند</Label>
                <div className="flex items-center gap-4 flex-1">
                  <input
                    type="range"
                    min="400"
                    max="800"
                    step="50"
                    value={pdfWidth}
                    onChange={(e) => setPdfWidth(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium min-w-[80px]">{pdfWidth}px</span>
                </div>
              </div>
              {viewingReceipt && (
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={() => handleDownloadFromPreview(viewingReceipt)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Download className="h-4 w-4 ml-2" />
                    تحميل PDF
                  </Button>
                  <Button
                    onClick={() => handlePrint(viewingReceipt)}
                    variant="outline"
                    className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                  >
                    <Printer className="h-4 w-4 ml-2" />
                    طباعة
                  </Button>
                </div>
              )}
            </div>
            {viewingReceipt && (
              <div 
                dangerouslySetInnerHTML={{ __html: generateReceiptHTML(viewingReceipt) }}
                className="border rounded-lg overflow-hidden bg-white"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Download Settings Dialog */}
        <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Download className="h-5 w-5 text-green-600" />
                إعدادات تحميل PDF
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold">عرض السند (بكسل)</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="400"
                    max="800"
                    step="50"
                    value={downloadWidth}
                    onChange={(e) => setDownloadWidth(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold w-20 text-center bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
                    {downloadWidth}px
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  اختر العرض المناسب لسند القبض في ملف PDF
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDownloadDialog(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (viewingReceipt) {
                    handleDownloadPDF(viewingReceipt);
                    setShowDownloadDialog(false);
                  }
                }}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Download className="h-4 w-4 ml-2" />
                تحميل PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
