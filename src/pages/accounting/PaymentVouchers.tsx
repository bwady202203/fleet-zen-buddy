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
import { FileText, Plus, Printer, Eye, Pencil, Trash2, Check, ChevronsUpDown, Download, Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  const navigate = useNavigate();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchVouchers();
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      // Fetch all active accounts
      const { data: allAccounts, error } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name_ar, name_en, parent_id")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      
      // Filter to get only leaf accounts (accounts with no children)
      const accountIds = new Set(allAccounts?.map(acc => acc.id) || []);
      const parentIds = new Set(allAccounts?.map(acc => acc.parent_id).filter(Boolean) || []);
      
      const leafAccounts = allAccounts?.filter(acc => !parentIds.has(acc.id)) || [];
      
      setAccounts(leafAccounts);
    } catch (error: any) {
      toast.error("خطأ في تحميل الحسابات: " + error.message);
    }
  };

  const fetchVouchers = async (loadAll: boolean = false) => {
    try {
      setLoading(true);
      let query = supabase
        .from("payment_vouchers")
        .select("*")
        .order("created_at", { ascending: false });

      // Load only last 10 by default
      if (!loadAll) {
        query = query.limit(10);
      }

      const { data, error } = await query;

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchVouchers(showAll);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_vouchers")
        .select("*")
        .or(`voucher_number.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;

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
      toast.error("خطأ في البحث: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAll = () => {
    setShowAll(true);
    setSearchQuery("");
    fetchVouchers(true);
  };

  const generateVoucherNumber = async () => {
    const { data } = await supabase
      .from("payment_vouchers")
      .select("voucher_number")
      .order("voucher_number", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].voucher_number);
      return String(lastNumber + 1).padStart(6, "0");
    }
    return "000001";
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
      const amount = parseFloat(formData.amount);

      const voucherData = {
        voucher_number: voucherNumber,
        voucher_date: formData.voucher_date,
        debit_account_id: formData.debit_account_id,
        credit_account_id: formData.credit_account_id,
        amount: amount,
        description: formData.description,
        created_by: user?.id,
      };

      if (editingVoucher) {
        // Delete old journal entry
        await supabase
          .from("journal_entries")
          .delete()
          .eq("reference", `payment_voucher_${editingVoucher.id}`);

        const { error } = await supabase
          .from("payment_vouchers")
          .update(voucherData)
          .eq("id", editingVoucher.id);

        if (error) throw error;

        // Create new journal entry
        await createJournalEntry(editingVoucher.id, voucherNumber, formData.voucher_date, amount);
        
        toast.success("تم تحديث السند بنجاح");
      } else {
        const { data: newVoucher, error } = await supabase
          .from("payment_vouchers")
          .insert([voucherData])
          .select()
          .single();

        if (error) throw error;

        // Create journal entry
        await createJournalEntry(newVoucher.id, voucherNumber, formData.voucher_date, amount);

        toast.success("تم إضافة السند بنجاح");
      }

      fetchVouchers();
      resetForm();
    } catch (error: any) {
      toast.error("خطأ في حفظ السند: " + error.message);
    }
  };

  const createJournalEntry = async (voucherId: string, voucherNumber: string, date: string, amount: number) => {
    try {
      // Generate journal entry number
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

      // Create journal entry
      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert([{
          entry_number: entryNumber,
          date: date,
          description: `سند صرف رقم ${voucherNumber}`,
          reference: `payment_voucher_${voucherId}`,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal entry lines
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: formData.debit_account_id,
            debit: amount,
            credit: 0,
            description: formData.description || `سند صرف رقم ${voucherNumber}`,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: formData.credit_account_id,
            debit: 0,
            credit: amount,
            description: formData.description || `سند صرف رقم ${voucherNumber}`,
          },
        ]);

      if (linesError) throw linesError;

      // Update account balances
      await updateAccountBalance(formData.debit_account_id, amount, true);
      await updateAccountBalance(formData.credit_account_id, amount, false);
    } catch (error: any) {
      console.error("Error creating journal entry:", error);
      throw error;
    }
  };

  const updateAccountBalance = async (accountId: string, amount: number, isDebit: boolean) => {
    const { data: account } = await supabase
      .from("chart_of_accounts")
      .select("balance, type")
      .eq("id", accountId)
      .single();

    if (account) {
      let newBalance = account.balance || 0;
      
      // For debit accounts (assets, expenses): debit increases, credit decreases
      // For credit accounts (liabilities, equity, revenue): credit increases, debit decreases
      const isDebitAccount = ["asset", "expense"].includes(account.type.toLowerCase());
      
      if (isDebitAccount) {
        newBalance = isDebit ? newBalance + amount : newBalance - amount;
      } else {
        newBalance = isDebit ? newBalance - amount : newBalance + amount;
      }

      await supabase
        .from("chart_of_accounts")
        .update({ balance: newBalance })
        .eq("id", accountId);
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
      // Delete associated journal entry
      await supabase
        .from("journal_entries")
        .delete()
        .eq("reference", `payment_voucher_${id}`);

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

  const handleDownloadPDF = async (voucher: PaymentVoucher) => {
    const debitAccount = voucher.debit_account;
    const creditAccount = voucher.credit_account;

    // Create a temporary div for rendering
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.width = "800px";
    tempDiv.style.background = "white";
    tempDiv.innerHTML = `
      <div style="font-family: 'Arial', sans-serif; padding: 40px; direction: rtl; text-align: right; background: white;">
        <div style="max-width: 800px; margin: 0 auto; border: 2px solid #333; padding: 30px; background: white;">
          <div style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #333;">
            <div style="font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 5px;">شركة الرمال الناعمة</div>
            <div style="font-size: 16px; color: #7f8c8d;">Soft Sands Company</div>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px double #333; padding-bottom: 20px;">
            <h1 style="font-size: 28px; color: #333; margin-bottom: 10px;">سند صرف</h1>
            <div style="font-size: 14px; color: #666; margin-top: 5px;">Payment Voucher</div>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
            <div style="font-size: 16px;"><strong>رقم السند:</strong> ${voucher.voucher_number}</div>
            <div style="font-size: 16px;"><strong>التاريخ:</strong> ${format(new Date(voucher.voucher_date), "dd/MM/yyyy", { locale: ar })}</div>
          </div>

          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 16px; background: #f9f9f9; font-weight: bold; width: 30%; color: #555;">الحساب المدين</td>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 16px;">${debitAccount?.code} - ${debitAccount?.name_ar}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 16px; background: #f9f9f9; font-weight: bold; width: 30%; color: #555;">الحساب الدائن</td>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 16px;">${creditAccount?.code} - ${creditAccount?.name_ar}</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border: 2px solid #333; border-radius: 8px;">
            <div style="font-size: 18px; font-weight: bold; color: #555; margin-bottom: 10px;">المبلغ</div>
            <div style="font-size: 32px; font-weight: bold; color: #2c3e50;">${voucher.amount.toLocaleString('ar-SA')} ريال</div>
          </div>

          ${voucher.description ? `
            <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;">
              <div style="font-weight: bold; margin-bottom: 8px; color: #555;">البيان:</div>
              <div>${voucher.description}</div>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; border-top: 1px solid #ddd;">
            <div style="text-align: center; width: 30%;">
              <div style="border-top: 2px solid #333; margin-top: 60px; padding-top: 10px; font-weight: bold;">المحاسب</div>
            </div>
            <div style="text-align: center; width: 30%;">
              <div style="border-top: 2px solid #333; margin-top: 60px; padding-top: 10px; font-weight: bold;">المدير المالي</div>
            </div>
            <div style="text-align: center; width: 30%;">
              <div style="border-top: 2px solid #333; margin-top: 60px; padding-top: 10px; font-weight: bold;">المستلم</div>
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
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`payment-voucher-${voucher.voucher_number}.pdf`);

      toast.success("تم تحميل ملف PDF بنجاح");
    } catch (error) {
      toast.error("خطأ في تحميل ملف PDF");
      console.error(error);
    } finally {
      document.body.removeChild(tempDiv);
    }
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
            <div class="company-header">
              <div class="company-name">شركة الرمال الناعمة</div>
              <div class="company-name-en">Soft Sands Company</div>
            </div>
            
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
      {/* Back Button */}
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              سندات الصرف
            </CardTitle>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 ml-2" />
              سند صرف جديد
            </Button>
          </div>
          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="ابحث برقم السند أو البيان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              onClick={handleLoadAll} 
              variant="outline"
              disabled={showAll && !searchQuery}
            >
              عرض جميع السندات
            </Button>
          </div>
          {!showAll && !searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              عرض آخر 10 سندات - استخدم البحث أو اضغط "عرض جميع السندات" للمزيد
            </p>
          )}
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
                          title="عرض"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPDF(voucher)}
                          title="تحميل PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(voucher)}
                          title="طباعة"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(voucher)}
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(voucher.id)}
                          title="حذف"
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="border-b pb-4 mb-4">
            <div className="text-center">
              <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-3">
                <FileText className="h-7 w-7 text-primary" />
                سند صرف
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {editingVoucher ? "تعديل بيانات السند" : "إضافة سند صرف جديد"}
              </p>
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">التاريخ</Label>
                <Input
                  type="date"
                  value={formData.voucher_date}
                  onChange={(e) =>
                    setFormData({ ...formData, voucher_date: e.target.value })
                  }
                  className="h-10 bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">الحساب المدين</Label>
                <Popover open={debitOpen} onOpenChange={setDebitOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={debitOpen}
                      className="w-full justify-between h-10 text-sm bg-background hover:bg-background/80"
                    >
                      {formData.debit_account_id
                        ? accounts.find((acc) => acc.id === formData.debit_account_id)?.code +
                          " - " +
                          accounts.find((acc) => acc.id === formData.debit_account_id)?.name_ar
                        : "اختر الحساب المدين"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0 bg-background" dir="rtl">
                    <Command className="bg-background">
                      <CommandInput placeholder="ابحث عن الحساب..." className="h-10" />
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
                              className="cursor-pointer"
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

              <div className="space-y-2">
                <Label className="text-sm font-semibold">الحساب الدائن</Label>
                <Popover open={creditOpen} onOpenChange={setCreditOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={creditOpen}
                      className="w-full justify-between h-10 text-sm bg-background hover:bg-background/80"
                    >
                      {formData.credit_account_id
                        ? accounts.find((acc) => acc.id === formData.credit_account_id)?.code +
                          " - " +
                          accounts.find((acc) => acc.id === formData.credit_account_id)?.name_ar
                        : "اختر الحساب الدائن"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0 bg-background" dir="rtl">
                    <Command className="bg-background">
                      <CommandInput placeholder="ابحث عن الحساب..." className="h-10" />
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
                              className="cursor-pointer"
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">المبلغ</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="h-10 text-base font-semibold bg-background"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">البيان</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="text-sm bg-background resize-none"
                  placeholder="أدخل وصف السند..."
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={resetForm} className="h-10 px-6">
                إلغاء
              </Button>
              <Button type="submit" className="h-10 px-6 bg-primary hover:bg-primary/90">
                {editingVoucher ? "تحديث السند" : "حفظ السند"}
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
                <Button onClick={() => handleDownloadPDF(viewingVoucher)} variant="outline">
                  <Download className="h-4 w-4 ml-2" />
                  تحميل PDF
                </Button>
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
