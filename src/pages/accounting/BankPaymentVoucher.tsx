import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ArrowRight, Plus, Star, Printer, Eye, EyeOff, Trash2, Building2, Landmark, Settings2, RotateCcw, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { numberToWords } from "@/lib/numberToWords";

type BankKey = "riyadh" | "rajhi";

const BANK_CONFIG: Record<BankKey, { code: string; name: string; theme: string; icon: any }> = {
  riyadh: { code: "111004", name: "بنك الرياض شركة الرمال", theme: "from-blue-700 to-sky-600", icon: Building2 },
  rajhi: { code: "111001", name: "بنك الراجحي شركة الرمال", theme: "from-emerald-700 to-green-600", icon: Landmark },
};

interface Account {
  id: string;
  code: string;
  name_ar: string;
}

interface Voucher {
  id: string;
  voucher_number: string;
  voucher_date: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: number;
  description: string | null;
  debit_account?: Account;
}

export default function BankPaymentVoucher() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bankKey = (searchParams.get("bank") as BankKey) || "riyadh";
  const bank = BANK_CONFIG[bankKey] || BANK_CONFIG.riyadh;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankAccount, setBankAccount] = useState<Account | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [debitAccount, setDebitAccount] = useState<Account | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [vouchersSearch, setVouchersSearch] = useState("");
  const [dialogSearch, setDialogSearch] = useState("");
  const [customizeMode, setCustomizeMode] = useState(false);
  const STORAGE_KEY = `bpv_accounts_${bankKey}`;
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}_hidden`) || "[]"); } catch { return []; }
  });
  const [orderIds, setOrderIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}_order`) || "[]"); } catch { return []; }
  });
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_hidden`, JSON.stringify(hiddenIds));
  }, [hiddenIds, STORAGE_KEY]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_order`, JSON.stringify(orderIds));
  }, [orderIds, STORAGE_KEY]);

  const [formData, setFormData] = useState({
    voucher_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    description: "",
    beneficiary: "",
  });

  const [previewVoucher, setPreviewVoucher] = useState<Voucher | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAccounts();
  }, [bankKey]);

  useEffect(() => {
    if (bankAccount) fetchVouchers();
  }, [bankAccount]);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("id, code, name_ar, parent_id")
      .eq("is_active", true)
      .order("code");
    if (!data) return;
    const parentIds = new Set(data.map((a) => a.parent_id).filter(Boolean));
    const leaves = data.filter((a) => !parentIds.has(a.id));
    setAccounts(leaves);
    const ba = data.find((a) => a.code === bank.code);
    if (ba) setBankAccount(ba);
  };

  const fetchVouchers = async () => {
    if (!bankAccount) return;
    setLoading(true);
    const { data } = await supabase
      .from("payment_vouchers")
      .select("*")
      .eq("credit_account_id", bankAccount.id)
      .order("created_at", { ascending: false })
      .limit(100);
    const enriched = await Promise.all(
      (data || []).map(async (v) => {
        const { data: acc } = await supabase
          .from("chart_of_accounts")
          .select("id, code, name_ar")
          .eq("id", v.debit_account_id)
          .maybeSingle();
        return { ...v, debit_account: acc || undefined } as Voucher;
      })
    );
    setVouchers(enriched);
    setLoading(false);
  };

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return accounts
      .filter((a) => a.code.includes(searchQuery) || a.name_ar.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, accounts]);

  const orderedAccounts = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, a]));
    const ordered: Account[] = [];
    orderIds.forEach((id) => { const a = map.get(id); if (a) { ordered.push(a); map.delete(id); } });
    return [...ordered, ...Array.from(map.values())];
  }, [accounts, orderIds]);

  const filteredDialog = useMemo(() => {
    const q = dialogSearch.toLowerCase();
    const base = customizeMode ? orderedAccounts : orderedAccounts.filter((a) => !hiddenIds.includes(a.id));
    if (!q) return base;
    return base.filter((a) => a.code.includes(dialogSearch) || a.name_ar.toLowerCase().includes(q));
  }, [dialogSearch, orderedAccounts, hiddenIds, customizeMode]);

  const moveAccount = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = orderedAccounts.map((a) => a.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setOrderIds(next);
  };

  const generateVoucherNumber = async () => {
    const prefix = `PV-${bankKey.toUpperCase()}-`;
    const { data } = await supabase
      .from("payment_vouchers")
      .select("voucher_number")
      .like("voucher_number", `${prefix}%`)
      .order("voucher_number", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      const n = parseInt(data[0].voucher_number.replace(prefix, ""));
      return `${prefix}${String(n + 1).padStart(6, "0")}`;
    }
    return `${prefix}000001`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debitAccount || !bankAccount) return toast.error("اختر الحساب المدين");
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) return toast.error("أدخل مبلغاً صحيحاً");

    try {
      const voucherNumber = await generateVoucherNumber();
      const { data: voucher, error } = await supabase
        .from("payment_vouchers")
        .insert([
          {
            voucher_number: voucherNumber,
            voucher_date: formData.voucher_date,
            debit_account_id: debitAccount.id,
            credit_account_id: bankAccount.id,
            amount,
            description: formData.description || `سند صرف - ${formData.beneficiary}`,
            created_by: user?.id,
          },
        ])
        .select()
        .single();
      if (error) throw error;

      // Create journal entry
      const year = new Date(formData.voucher_date).getFullYear();
      const { data: lastJE } = await supabase
        .from("journal_entries")
        .select("entry_number")
        .like("entry_number", `JE-${year}%`)
        .order("entry_number", { ascending: false })
        .limit(1);
      let entryNumber = `JE-${year}000001`;
      if (lastJE && lastJE.length > 0) {
        const n = parseInt(lastJE[0].entry_number.slice(-6));
        entryNumber = `JE-${year}${String(n + 1).padStart(6, "0")}`;
      }
      const { data: je } = await supabase
        .from("journal_entries")
        .insert([
          {
            entry_number: entryNumber,
            date: formData.voucher_date,
            description: `سند صرف ${voucherNumber} - ${bank.name}`,
            reference: `payment_voucher_${voucher.id}`,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (je) {
        await supabase.from("journal_entry_lines").insert([
          {
            journal_entry_id: je.id,
            account_id: debitAccount.id,
            debit: amount,
            credit: 0,
            description: formData.description || `سند صرف ${voucherNumber}`,
          },
          {
            journal_entry_id: je.id,
            account_id: bankAccount.id,
            debit: 0,
            credit: amount,
            description: formData.description || `سند صرف ${voucherNumber}`,
          },
        ]);
      }

      toast.success("تم حفظ السند والقيد بنجاح");
      resetForm();
      fetchVouchers();
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    }
  };

  const resetForm = () => {
    setFormData({ voucher_date: format(new Date(), "yyyy-MM-dd"), amount: "", description: "", beneficiary: "" });
    setDebitAccount(null);
    setSearchQuery("");
    setShowForm(false);
  };

  const handleDelete = async (v: Voucher) => {
    const code = prompt("أدخل رمز التأكيد للحذف:");
    if (code !== "363636") return toast.error("رمز خاطئ");
    await supabase.from("journal_entries").delete().eq("reference", `payment_voucher_${v.id}`);
    await supabase.from("payment_vouchers").delete().eq("id", v.id);
    toast.success("تم الحذف");
    fetchVouchers();
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>سند صرف</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 15mm; }
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        body { margin: 0; direction: rtl; }
      </style></head><body>${html}</body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const Icon = bank.icon;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className={cn("border-b bg-gradient-to-r shadow-lg", bank.theme)}>
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3 text-white">
            <Icon className="h-9 w-9" />
            <div>
              <h1 className="text-2xl font-bold">سند صرف - {bank.name}</h1>
              <p className="text-sm opacity-90">رمز الحساب: {bank.code}</p>
            </div>
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/20" onClick={() => navigate("/accounting")}>
            <ArrowRight className="h-5 w-5 ml-2" /> رجوع
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-4 flex gap-2">
          <Button onClick={() => setShowForm(true)} size="lg" className={cn("bg-gradient-to-r", bank.theme)}>
            <Plus className="h-5 w-5 ml-2" /> سند صرف جديد
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>سجل سندات الصرف</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم السند</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحساب المدين</TableHead>
                  <TableHead className="text-right">البيان</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
                ) : vouchers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد سندات</TableCell></TableRow>
                ) : (
                  vouchers.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-bold">{v.voucher_number}</TableCell>
                      <TableCell>{format(new Date(v.voucher_date), "dd/MM/yyyy", { locale: ar })}</TableCell>
                      <TableCell>{v.debit_account?.name_ar || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{v.description}</TableCell>
                      <TableCell className="font-bold text-primary">{Number(v.amount).toLocaleString("ar-SA")} ر.س</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" variant="outline" onClick={() => setPreviewVoucher(v)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(v)}>
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) resetForm(); else setShowForm(true); }}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>سند صرف جديد - {bank.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>التاريخ</Label>
                <Input type="date" value={formData.voucher_date} onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })} required />
              </div>
              <div>
                <Label>المبلغ (اضغط Enter لاختيار الحساب)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const amt = parseFloat(formData.amount);
                      if (!amt || amt <= 0) { toast.error("أدخل مبلغاً صحيحاً أولاً"); return; }
                      setShowAccountDialog(true);
                    }
                  }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="relative">
              <Label>الحساب المدين *</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="ابحث بالكود أو الاسم..."
                    value={debitAccount ? `${debitAccount.code} - ${debitAccount.name_ar}` : searchQuery}
                    onChange={(e) => {
                      setDebitAccount(null);
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredSuggestions.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          className="w-full text-right px-3 py-2 hover:bg-accent flex justify-between"
                          onClick={() => { setDebitAccount(acc); setSearchQuery(""); setShowSuggestions(false); }}
                        >
                          <span className="font-mono text-xs text-muted-foreground">{acc.code}</span>
                          <span>{acc.name_ar}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="button" variant="secondary" size="icon" onClick={() => setShowAccountDialog(true)}>
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>المستفيد</Label>
              <Input value={formData.beneficiary} onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })} />
            </div>

            <div>
              <Label>البيان</Label>
              <Textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>إلغاء</Button>
              <Button type="submit" className={cn("bg-gradient-to-r", bank.theme)}>حفظ السند والقيد</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account Picker Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>اختر الحساب المدين</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={customizeMode ? "default" : "outline"}
                  onClick={() => setCustomizeMode((v) => !v)}
                >
                  <Settings2 className="h-4 w-4 ml-1" />
                  {customizeMode ? "إنهاء التخصيص" : "تخصيص"}
                </Button>
                {customizeMode && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setHiddenIds([]); setOrderIds([]); }}>
                    <RotateCcw className="h-4 w-4 ml-1" /> استعادة
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <Input placeholder="ابحث..." value={dialogSearch} onChange={(e) => setDialogSearch(e.target.value)} autoFocus />
          {customizeMode && (
            <p className="text-xs text-muted-foreground mt-1">
              اسحب المربع لتغيير ترتيبه — اضغط على أيقونة العين لإخفاء/إظهار الحساب
            </p>
          )}
          {/* Category Legend */}
          <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
            <span className="px-2 py-0.5 rounded border bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950 dark:text-blue-200">1 - الأصول</span>
            <span className="px-2 py-0.5 rounded border bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950 dark:text-rose-200">2 - الخصوم</span>
            <span className="px-2 py-0.5 rounded border bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-950 dark:text-violet-200">3 - حقوق الملكية</span>
            <span className="px-2 py-0.5 rounded border bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">4 - الإيرادات</span>
            <span className="px-2 py-0.5 rounded border bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:text-amber-200">5 - المصروفات</span>
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-1.5 mt-2 p-1">
            {filteredDialog.map((acc) => {
              const hidden = hiddenIds.includes(acc.id);
              const cat = acc.code.charAt(0);
              const catClass =
                cat === "1" ? "bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-400 dark:bg-blue-950/40 dark:border-blue-900 dark:hover:bg-blue-900/40" :
                cat === "2" ? "bg-rose-50 border-rose-200 hover:bg-rose-100 hover:border-rose-400 dark:bg-rose-950/40 dark:border-rose-900 dark:hover:bg-rose-900/40" :
                cat === "3" ? "bg-violet-50 border-violet-200 hover:bg-violet-100 hover:border-violet-400 dark:bg-violet-950/40 dark:border-violet-900 dark:hover:bg-violet-900/40" :
                cat === "4" ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900 dark:hover:bg-emerald-900/40" :
                cat === "5" ? "bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-400 dark:bg-amber-950/40 dark:border-amber-900 dark:hover:bg-amber-900/40" :
                "bg-card border-border hover:bg-accent";
              const codeColor =
                cat === "1" ? "text-blue-700 dark:text-blue-300" :
                cat === "2" ? "text-rose-700 dark:text-rose-300" :
                cat === "3" ? "text-violet-700 dark:text-violet-300" :
                cat === "4" ? "text-emerald-700 dark:text-emerald-300" :
                cat === "5" ? "text-amber-700 dark:text-amber-300" :
                "text-muted-foreground";
              return (
                <div
                  key={acc.id}
                  draggable={customizeMode}
                  onDragStart={() => setDragId(acc.id)}
                  onDragOver={(e) => { if (customizeMode) e.preventDefault(); }}
                  onDrop={() => { if (customizeMode && dragId) { moveAccount(dragId, acc.id); setDragId(null); } }}
                  onClick={() => {
                    if (customizeMode) return;
                    setDebitAccount(acc);
                    setShowAccountDialog(false);
                    setDialogSearch("");
                  }}
                  className={cn(
                    "relative p-2 rounded-md border text-right transition-all duration-300 ease-out cursor-pointer",
                    catClass,
                    "hover:scale-105 hover:shadow-md",
                    "animate-in fade-in zoom-in-95",
                    hidden && "opacity-40 border-dashed",
                    customizeMode && "cursor-move ring-1 ring-border"
                  )}
                >
                  {customizeMode && (
                    <>
                      <GripVertical className="absolute top-1 right-1 h-3 w-3 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHiddenIds((prev) => prev.includes(acc.id) ? prev.filter((i) => i !== acc.id) : [...prev, acc.id]);
                        }}
                        className="absolute top-1 left-1 p-0.5 rounded hover:bg-background"
                      >
                        {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </>
                  )}
                  <div className={cn("text-[10px] font-mono mt-2", codeColor)}>{acc.code}</div>
                  <div className="text-xs font-semibold truncate">{acc.name_ar}</div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Preview Dialog */}
      <Dialog open={!!previewVoucher} onOpenChange={(o) => !o && setPreviewVoucher(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>معاينة سند الصرف</span>
              <Button onClick={handlePrint} size="sm"><Printer className="h-4 w-4 ml-2" /> طباعة</Button>
            </DialogTitle>
          </DialogHeader>
          {previewVoucher && (
            <div ref={printRef}>
              <PrintTemplate voucher={previewVoucher} bank={bank} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrintTemplate({ voucher, bank }: { voucher: Voucher; bank: { name: string; code: string; theme: string } }) {
  return (
    <div style={{ width: "210mm", minHeight: "270mm", padding: "10mm", margin: "0 auto", background: "white", color: "#000", fontFamily: "Cairo, sans-serif" }}>
      <div style={{ borderBottom: "3px solid #000", paddingBottom: "12px", marginBottom: "20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>شركة الرمال</h1>
        <p style={{ fontSize: "13px", margin: "4px 0 0", color: "#444" }}>المملكة العربية السعودية</p>
      </div>

      <div style={{ background: "#000", color: "#fff", padding: "10px", textAlign: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "20px" }}>سند صرف - {bank.name}</h2>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "14px" }}>
        <tbody>
          <tr>
            <td style={cellLabel}>رقم السند</td>
            <td style={cellValue}>{voucher.voucher_number}</td>
            <td style={cellLabel}>التاريخ</td>
            <td style={cellValue}>{format(new Date(voucher.voucher_date), "dd/MM/yyyy")}</td>
          </tr>
          <tr>
            <td style={cellLabel}>صرف من</td>
            <td style={cellValue} colSpan={3}>{bank.name} ({bank.code})</td>
          </tr>
          <tr>
            <td style={cellLabel}>الحساب المدين</td>
            <td style={cellValue} colSpan={3}>
              {voucher.debit_account?.code} - {voucher.debit_account?.name_ar}
            </td>
          </tr>
          <tr>
            <td style={cellLabel}>المبلغ</td>
            <td style={{ ...cellValue, fontWeight: 700, fontSize: "18px" }} colSpan={3}>
              {Number(voucher.amount).toLocaleString("ar-SA")} ريال سعودي
            </td>
          </tr>
          <tr>
            <td style={cellLabel}>المبلغ بالحروف</td>
            <td style={cellValue} colSpan={3}>{numberToWords(Number(voucher.amount))}</td>
          </tr>
          <tr>
            <td style={cellLabel}>البيان</td>
            <td style={{ ...cellValue, minHeight: "60px" }} colSpan={3}>{voucher.description}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: "30px", padding: "12px", border: "2px solid #000", background: "#f5f5f5" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: "15px" }}>القيد المحاسبي</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#000", color: "#fff" }}>
              <th style={th}>الحساب</th>
              <th style={th}>مدين</th>
              <th style={th}>دائن</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={td}>{voucher.debit_account?.name_ar}</td>
              <td style={{ ...td, textAlign: "center" }}>{Number(voucher.amount).toLocaleString("ar-SA")}</td>
              <td style={{ ...td, textAlign: "center" }}>-</td>
            </tr>
            <tr>
              <td style={td}>{bank.name}</td>
              <td style={{ ...td, textAlign: "center" }}>-</td>
              <td style={{ ...td, textAlign: "center" }}>{Number(voucher.amount).toLocaleString("ar-SA")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginTop: "60px", textAlign: "center", fontSize: "13px" }}>
        <div><div style={{ borderTop: "2px solid #000", paddingTop: "8px" }}>المحاسب</div></div>
        <div><div style={{ borderTop: "2px solid #000", paddingTop: "8px" }}>المدير المالي</div></div>
        <div><div style={{ borderTop: "2px solid #000", paddingTop: "8px" }}>المستلم</div></div>
      </div>
    </div>
  );
}

const cellLabel: React.CSSProperties = { border: "1px solid #000", padding: "8px", background: "#f0f0f0", fontWeight: 700, width: "18%" };
const cellValue: React.CSSProperties = { border: "1px solid #000", padding: "8px" };
const th: React.CSSProperties = { border: "1px solid #000", padding: "6px" };
const td: React.CSSProperties = { border: "1px solid #000", padding: "6px" };
