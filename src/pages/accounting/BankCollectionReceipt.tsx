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
import { ArrowRight, Plus, Star, Printer, Eye, EyeOff, Trash2, Building2, Landmark, Settings2, RotateCcw, GripVertical, X, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { numberToWords } from "@/lib/numberToWords";

type BankKey = "riyadh" | "rajhi";

const BANK_CONFIG: Record<BankKey, { code: string; name: string; theme: string; primary: string; accent: string; icon: any }> = {
  riyadh: { code: "111004", name: "بنك الرياض شركة الرمال", theme: "from-blue-700 to-sky-600", primary: "#0a4a8a", accent: "#0c7a5f", icon: Building2 },
  rajhi: { code: "111001", name: "بنك الراجحي شركة الرمال", theme: "from-emerald-700 to-green-600", primary: "#0c7a5f", accent: "#0a4a8a", icon: Landmark },
};

interface Account { id: string; code: string; name_ar: string; }
interface ReceiptLine { id: string; account: Account | null; amount: string; description: string; }
interface Receipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: number;
  description: string | null;
  received_from?: string | null;
  amount_in_words?: string | null;
  credit_account?: Account;
}
interface JELine { account_id: string; debit: number; credit: number; description: string | null; account?: Account; }

export default function BankCollectionReceipt() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bankKey = (searchParams.get("bank") as BankKey) || "riyadh";
  const bank = BANK_CONFIG[bankKey] || BANK_CONFIG.riyadh;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankAccount, setBankAccount] = useState<Account | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [receiptsSearch, setReceiptsSearch] = useState("");
  const [dialogSearch, setDialogSearch] = useState("");
  const [customizeMode, setCustomizeMode] = useState(false);
  const STORAGE_KEY = `bcr_accounts_${bankKey}`;
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}_hidden`) || "[]"); } catch { return []; }
  });
  const [orderIds, setOrderIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}_order`) || "[]"); } catch { return []; }
  });
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_hidden`, JSON.stringify(hiddenIds)); }, [hiddenIds, STORAGE_KEY]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_order`, JSON.stringify(orderIds)); }, [orderIds, STORAGE_KEY]);

  const newLine = (): ReceiptLine => ({ id: crypto.randomUUID(), account: null, amount: "", description: "" });

  const [receiptDate, setReceiptDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [receivedFrom, setReceivedFrom] = useState("");
  const [generalNote, setGeneralNote] = useState("");
  const [lines, setLines] = useState<ReceiptLine[]>([newLine()]);

  const [previewReceipt, setPreviewReceipt] = useState<Receipt | null>(null);
  const [previewLines, setPreviewLines] = useState<JELine[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchAccounts(); }, [bankKey]);
  useEffect(() => { if (bankAccount) fetchReceipts(); }, [bankAccount]);

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

  const fetchReceipts = async () => {
    if (!bankAccount) return;
    setLoading(true);
    const { data } = await supabase
      .from("collection_receipts")
      .select("*")
      .eq("debit_account_id", bankAccount.id)
      .order("created_at", { ascending: false })
      .limit(100);
    const enriched = await Promise.all(
      (data || []).map(async (v) => {
        const { data: acc } = await supabase
          .from("chart_of_accounts")
          .select("id, code, name_ar")
          .eq("id", v.credit_account_id)
          .maybeSingle();
        return { ...v, credit_account: acc || undefined } as Receipt;
      })
    );
    setReceipts(enriched);
    setLoading(false);
  };

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

  const filteredReceipts = useMemo(() => {
    const q = receiptsSearch.trim().toLowerCase();
    if (!q) return receipts;
    return receipts.filter((v) =>
      v.receipt_number?.toLowerCase().includes(q) ||
      (v.description || "").toLowerCase().includes(q) ||
      (v.credit_account?.name_ar || "").toLowerCase().includes(q) ||
      (v.credit_account?.code || "").includes(q) ||
      String(v.amount).includes(q) ||
      format(new Date(v.receipt_date), "dd/MM/yyyy").includes(q)
    );
  }, [receipts, receiptsSearch]);

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

  const totalAmount = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0),
    [lines]
  );

  const updateLine = (id: string, patch: Partial<ReceiptLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLine = (id: string) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.id !== id)));
  const addLine = () => setLines((prev) => [...prev, newLine()]);

  const openAccountPicker = (lineId: string) => {
    const line = lines.find((l) => l.id === lineId);
    const amt = parseFloat(line?.amount || "0");
    if (!amt || amt <= 0) { toast.error("أدخل المبلغ أولاً"); return; }
    setActiveLineId(lineId);
    setShowAccountDialog(true);
  };

  const generateReceiptNumber = async () => {
    const prefix = `RC-${bankKey.toUpperCase()}-`;
    const { data } = await supabase
      .from("collection_receipts")
      .select("receipt_number")
      .like("receipt_number", `${prefix}%`)
      .order("receipt_number", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      const n = parseInt(data[0].receipt_number.replace(prefix, ""));
      return `${prefix}${String(n + 1).padStart(6, "0")}`;
    }
    return `${prefix}000001`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccount) return toast.error("لم يتم تحديد حساب البنك");
    const validLines = lines.filter((l) => l.account && parseFloat(l.amount) > 0);
    if (validLines.length === 0) return toast.error("أضف بنداً واحداً على الأقل بحساب ومبلغ");

    try {
      const receiptNumber = await generateReceiptNumber();
      const total = validLines.reduce((s, l) => s + parseFloat(l.amount), 0);
      const summary = validLines
        .map((l) => `${l.account!.name_ar}: ${parseFloat(l.amount).toLocaleString("ar-SA")}${l.description ? ` (${l.description})` : ""}`)
        .join(" | ");
      const fullDescription = (generalNote ? `${generalNote} — ` : "") + (receivedFrom ? `استلمنا من: ${receivedFrom} — ` : "") + summary;

      const { data: receipt, error } = await supabase
        .from("collection_receipts")
        .insert([{
          receipt_number: receiptNumber,
          receipt_date: receiptDate,
          debit_account_id: bankAccount.id,
          credit_account_id: validLines[0].account!.id,
          amount: total,
          description: fullDescription,
          amount_in_words: numberToWords(total),
          received_from: receivedFrom,
          created_by: user?.id,
        }])
        .select().single();
      if (error) throw error;

      const year = new Date(receiptDate).getFullYear();
      const { data: lastJE } = await supabase
        .from("journal_entries").select("entry_number")
        .like("entry_number", `JE-${year}%`)
        .order("entry_number", { ascending: false }).limit(1);
      let entryNumber = `JE-${year}000001`;
      if (lastJE && lastJE.length > 0) {
        const n = parseInt(lastJE[0].entry_number.slice(-6));
        entryNumber = `JE-${year}${String(n + 1).padStart(6, "0")}`;
      }
      const { data: je } = await supabase
        .from("journal_entries").insert([{
          entry_number: entryNumber,
          date: receiptDate,
          description: `سند قبض ${receiptNumber} - ${bank.name}`,
          reference: `collection_receipt_${receipt.id}`,
          created_by: user?.id,
        }]).select().single();

      if (je) {
        const jeLines: any[] = [{
          journal_entry_id: je.id,
          account_id: bankAccount.id,
          debit: total,
          credit: 0,
          description: receivedFrom ? `قبض من ${receivedFrom}` : `سند قبض ${receiptNumber}`,
        }];
        validLines.forEach((l) => {
          jeLines.push({
            journal_entry_id: je.id,
            account_id: l.account!.id,
            debit: 0,
            credit: parseFloat(l.amount),
            description: l.description || `سند قبض ${receiptNumber}`,
          });
        });
        await supabase.from("journal_entry_lines").insert(jeLines);
      }

      toast.success("تم حفظ سند القبض والقيد بنجاح");
      resetForm();
      fetchReceipts();
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    }
  };

  const resetForm = () => {
    setReceiptDate(format(new Date(), "yyyy-MM-dd"));
    setReceivedFrom("");
    setGeneralNote("");
    setLines([newLine()]);
    setShowForm(false);
  };

  const handleDelete = async (v: Receipt) => {
    const code = prompt("أدخل رمز التأكيد للحذف:");
    if (code !== "363636") return toast.error("رمز خاطئ");
    await supabase.from("journal_entries").delete().eq("reference", `collection_receipt_${v.id}`);
    await supabase.from("collection_receipts").delete().eq("id", v.id);
    toast.success("تم الحذف");
    fetchReceipts();
  };

  const openPreview = async (v: Receipt) => {
    setPreviewReceipt(v);
    setPreviewLines([]);
    const { data: je } = await supabase
      .from("journal_entries").select("id")
      .eq("reference", `collection_receipt_${v.id}`).maybeSingle();
    if (!je) return;
    const { data: jls } = await supabase
      .from("journal_entry_lines")
      .select("account_id, debit, credit, description")
      .eq("journal_entry_id", je.id);
    if (!jls) return;
    const ids = Array.from(new Set(jls.map((l) => l.account_id)));
    const { data: accs } = await supabase
      .from("chart_of_accounts").select("id, code, name_ar").in("id", ids);
    const accMap = new Map((accs || []).map((a) => [a.id, a as Account]));
    setPreviewLines(jls.map((l) => ({ ...l, account: accMap.get(l.account_id) })));
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>سند قبض ${previewReceipt?.receipt_number || ""}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; }
        * { box-sizing: border-box; font-family: 'Cairo', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { direction: rtl; }
        .voucher-page { page-break-after: always; }
        .voucher-page:last-child { page-break-after: auto; }
      </style></head><body>${html}</body></html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  };

  const Icon = bank.icon;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className={cn("border-b bg-gradient-to-r shadow-lg", bank.theme)}>
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3 text-white">
            <Icon className="h-9 w-9" />
            <div>
              <h1 className="text-2xl font-bold">سند قبض - {bank.name}</h1>
              <p className="text-sm opacity-90">رمز الحساب: {bank.code}</p>
            </div>
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/20" onClick={() => navigate("/vouchers")}>
            <ArrowRight className="h-5 w-5 ml-2" /> رجوع
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-4 flex gap-2">
          <Button onClick={() => setShowForm(true)} size="lg" className={cn("bg-gradient-to-r", bank.theme)}>
            <Plus className="h-5 w-5 ml-2" /> سند قبض جديد
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle>سجل سندات القبض</CardTitle>
            <div className="relative w-72">
              <Input
                placeholder="بحث برقم السند، البيان، الحساب، المبلغ..."
                value={receiptsSearch}
                onChange={(e) => setReceiptsSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم السند</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحساب الدائن (الأول)</TableHead>
                  <TableHead className="text-right">البيان</TableHead>
                  <TableHead className="text-right">المبلغ الإجمالي</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
                ) : filteredReceipts.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{receiptsSearch ? "لا توجد نتائج مطابقة" : "لا توجد سندات"}</TableCell></TableRow>
                ) : (
                  filteredReceipts.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-bold">{v.receipt_number}</TableCell>
                      <TableCell>{format(new Date(v.receipt_date), "dd/MM/yyyy", { locale: ar })}</TableCell>
                      <TableCell>{v.credit_account?.name_ar || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{v.description}</TableCell>
                      <TableCell className="font-bold text-primary">{Number(v.amount).toLocaleString("ar-SA")} ر.س</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" variant="outline" onClick={() => openPreview(v)}>
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
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>سند قبض جديد - {bank.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>التاريخ</Label>
                <Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} required />
              </div>
              <div>
                <Label>استلمنا من</Label>
                <Input value={receivedFrom} onChange={(e) => setReceivedFrom(e.target.value)} placeholder="اسم الجهة الدافعة" />
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                <h3 className="font-semibold">بنود القبض</h3>
                <Button type="button" size="sm" variant="secondary" onClick={addLine}>
                  <Plus className="h-4 w-4 ml-1" /> إضافة بند
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-12">م</TableHead>
                    <TableHead className="text-right w-40">المبلغ</TableHead>
                    <TableHead className="text-right">الحساب الدائن</TableHead>
                    <TableHead className="text-right">وصف البند</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l, idx) => (
                    <TableRow key={l.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={l.amount}
                          onChange={(e) => updateLine(l.id, { amount: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              openAccountPicker(l.id);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Input
                            readOnly
                            placeholder="اضغط النجمة لاختيار الحساب"
                            value={l.account ? `${l.account.code} - ${l.account.name_ar}` : ""}
                            className="cursor-pointer"
                            onClick={() => openAccountPicker(l.id)}
                          />
                          <Button type="button" variant="secondary" size="icon" onClick={() => openAccountPicker(l.id)}>
                            <Star className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="وصف اختياري"
                          value={l.description}
                          onChange={(e) => updateLine(l.id, { description: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(l.id)} disabled={lines.length === 1}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-bold">
                    <TableCell colSpan={1}>الإجمالي</TableCell>
                    <TableCell className="text-primary text-lg">{totalAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell colSpan={3}>{numberToWords(totalAmount)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <Label>ملاحظات عامة</Label>
              <Textarea rows={2} value={generalNote} onChange={(e) => setGeneralNote(e.target.value)} />
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
              <span>اختر الحساب الدائن</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={customizeMode ? "default" : "outline"} onClick={() => setCustomizeMode((v) => !v)}>
                  <Settings2 className="h-4 w-4 ml-1" />
                  {customizeMode ? "إنهاء التخصيص" : "تخصيص"}
                </Button>
                {hiddenIds.length > 0 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setHiddenIds([]); setOrderIds([]); }} title="إظهار جميع الحسابات المخفية">
                    <RotateCcw className="h-4 w-4 ml-1" /> إظهار الكل ({hiddenIds.length})
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <Input placeholder="ابحث..." value={dialogSearch} onChange={(e) => setDialogSearch(e.target.value)} autoFocus />
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
                    if (activeLineId) updateLine(activeLineId, { account: acc });
                    setShowAccountDialog(false);
                    setDialogSearch("");
                    setActiveLineId(null);
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
      <Dialog open={!!previewReceipt} onOpenChange={(o) => { if (!o) { setPreviewReceipt(null); setPreviewLines([]); } }}>
        <DialogContent className="max-w-[230mm] max-h-[95vh] overflow-y-auto p-0" dir="rtl">
          <DialogHeader className="px-4 pt-4 pb-2 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="flex justify-between items-center">
              <span>معاينة سند القبض</span>
              <Button onClick={handlePrint} size="sm"><Printer className="h-4 w-4 ml-2" /> طباعة A4</Button>
            </DialogTitle>
          </DialogHeader>
          {previewReceipt && (
            <div className="bg-muted/40 p-4 flex justify-center">
              <div ref={printRef}>
                <PrintTemplate receipt={previewReceipt} bank={bank} lines={previewLines} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrintTemplate({ receipt, bank, lines }: { receipt: Receipt; bank: { name: string; code: string; primary: string; accent: string }; lines: JELine[] }) {
  const debitLines = lines.filter((l) => Number(l.debit) > 0);
  const creditLines = lines.filter((l) => Number(l.credit) > 0);
  const total = Number(receipt.amount);
  const P = bank.primary;
  const A = bank.accent;

  return (
    <div
      className="voucher-page"
      style={{
        width: "210mm",
        height: "297mm",
        padding: "4mm 14mm 14mm 14mm",
        margin: "0 auto",
        background: "#fff",
        color: "#0a0a0a",
        fontFamily: "'Cairo', sans-serif",
        position: "relative",
        boxShadow: "0 0 0 1px #e5e7eb",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Decorative top band */}
      <div style={{ height: "8px", background: `linear-gradient(90deg, ${P}, ${A})`, borderRadius: "2px", marginBottom: "8px" }} />

      {/* Centered Company Header */}
      <div style={{ textAlign: "center", borderBottom: `2px solid ${P}`, paddingBottom: "8px", marginBottom: "10px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
          <BadgeCheck color={A} size={28} />
          <h1 style={{ fontSize: "22pt", fontWeight: 800, margin: 0, color: P, letterSpacing: "-0.3px" }}>شركة الرمال الناعمة الصناعية</h1>
        </div>
        <div style={{ fontSize: "9pt", color: "#666", marginTop: "2px" }}>سجل تجاري رقم 2050147243 — المملكة العربية السعودية</div>
        <div style={{
          display: "inline-block",
          marginTop: "6px",
          fontSize: "16pt",
          fontWeight: 800,
          color: "#fff",
          background: `linear-gradient(90deg, ${P}, ${A})`,
          padding: "4px 28px",
          borderRadius: "20px",
          letterSpacing: "1px",
        }}>سند قبض</div>
      </div>

      {/* Receipt meta */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
        <MetaBox label="رقم السند" value={receipt.receipt_number} highlight color={P} />
        <MetaBox label="التاريخ" value={format(new Date(receipt.receipt_date), "dd / MM / yyyy")} color={P} />
        <MetaBox label="مورد التحصيل" value={`${bank.name} (${bank.code})`} color={P} />
      </div>

      {/* Received From */}
      {receipt.received_from && (
        <div style={{ border: `1.5px solid ${A}`, borderRadius: "6px", padding: "8px 14px", marginBottom: "10px", background: "#f7fdfa", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "10pt", color: A, fontWeight: 700 }}>استلمنا من السيد/ة:</span>
          <span style={{ fontSize: "13pt", fontWeight: 700, color: "#111" }}>{receipt.received_from}</span>
        </div>
      )}

      {/* Lines table */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ background: P, color: "#fff", padding: "6px 10px", fontSize: "12pt", fontWeight: 700, borderRadius: "4px 4px 0 0" }}>
          بنود القبض
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11pt" }}>
          <thead>
            <tr style={{ background: "#eef3fa", color: P }}>
              <th style={th}>م</th>
              <th style={{ ...th, textAlign: "right" }}>الحساب الدائن</th>
              <th style={{ ...th, textAlign: "right" }}>البيان</th>
              <th style={{ ...th, textAlign: "left", width: "30mm" }}>المبلغ (ر.س)</th>
            </tr>
          </thead>
          <tbody>
            {(creditLines.length > 0 ? creditLines : [{ account: undefined, debit: 0, credit: total, description: receipt.description } as JELine]).map((l, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fbfd" }}>
                <td style={{ ...td, textAlign: "center", width: "10mm" }}>{i + 1}</td>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{l.account?.name_ar || "-"}</div>
                  {l.account?.code && <div style={{ fontSize: "9pt", color: "#888", fontFamily: "monospace" }}>{l.account.code}</div>}
                </td>
                <td style={{ ...td, color: "#444" }}>{l.description || "-"}</td>
                <td style={{ ...td, textAlign: "left", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {Number(l.credit).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            <tr style={{ background: P, color: "#fff", fontWeight: 700 }}>
              <td colSpan={3} style={{ ...td, borderColor: P, textAlign: "left", fontSize: "12pt" }}>الإجمالي</td>
              <td style={{ ...td, borderColor: P, textAlign: "left", fontSize: "13pt", fontVariantNumeric: "tabular-nums" }}>
                {total.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in words */}
      <div style={{ border: `1.5px dashed ${P}`, padding: "8px 12px", borderRadius: "4px", marginBottom: "12px", background: "#fbfdff" }}>
        <span style={{ fontSize: "10pt", color: P, fontWeight: 700, marginLeft: "6px" }}>المبلغ بالحروف:</span>
        <span style={{ fontSize: "12pt", fontWeight: 600 }}>{receipt.amount_in_words || numberToWords(total)} ريال سعودي فقط لا غير</span>
      </div>

      {/* Description */}
      {receipt.description && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10pt", color: P, fontWeight: 700, marginBottom: "4px" }}>البيان التفصيلي</div>
          <div style={{ border: "1px solid #d1d5db", padding: "8px 10px", borderRadius: "4px", fontSize: "10.5pt", background: "#fafafa", minHeight: "16mm", lineHeight: 1.7 }}>
            {receipt.description}
          </div>
        </div>
      )}

      {/* Journal entry */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ background: A, color: "#fff", padding: "5px 10px", fontSize: "11pt", fontWeight: 700, borderRadius: "4px 4px 0 0" }}>
          القيد المحاسبي
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5pt" }}>
          <thead>
            <tr style={{ background: "#e8f5ee", color: A }}>
              <th style={{ ...th, textAlign: "right" }}>الحساب</th>
              <th style={{ ...th, textAlign: "left", width: "30mm" }}>مدين</th>
              <th style={{ ...th, textAlign: "left", width: "30mm" }}>دائن</th>
            </tr>
          </thead>
          <tbody>
            {debitLines.map((l, i) => (
              <tr key={`d${i}`}>
                <td style={td}>{l.account?.name_ar || bank.name}{l.account?.code ? ` (${l.account.code})` : ` (${bank.code})`}</td>
                <td style={{ ...td, textAlign: "left", fontVariantNumeric: "tabular-nums" }}>{Number(l.debit).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                <td style={{ ...td, textAlign: "center", color: "#bbb" }}>—</td>
              </tr>
            ))}
            {creditLines.map((l, i) => (
              <tr key={`c${i}`}>
                <td style={td}>{l.account?.name_ar || "-"}{l.account?.code ? ` (${l.account.code})` : ""}</td>
                <td style={{ ...td, textAlign: "center", color: "#bbb" }}>—</td>
                <td style={{ ...td, textAlign: "left", fontVariantNumeric: "tabular-nums" }}>{Number(l.credit).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
              <td style={td}>الإجمالي</td>
              <td style={{ ...td, textAlign: "left", fontVariantNumeric: "tabular-nums" }}>{total.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
              <td style={{ ...td, textAlign: "left", fontVariantNumeric: "tabular-nums" }}>{total.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ flex: 1, minHeight: "8mm" }} />

      {/* Signatures (3) + Stamp */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "8mm", textAlign: "center", fontSize: "10.5pt", alignItems: "end" }}>
        {[
          { label: "المحاسب", sub: "Accountant" },
          { label: "المدير المالي", sub: "Finance Manager" },
          { label: "المدير العام", sub: "General Manager" },
        ].map((s) => (
          <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "90%", height: "16mm", borderBottom: `1px dashed ${P}`, marginBottom: "4px" }} />
            <div style={{ fontWeight: 700, color: P, fontSize: "10.5pt" }}>{s.label}</div>
            <div style={{ marginTop: "2px", color: "#888", fontSize: "8pt", fontStyle: "italic" }}>{s.sub}</div>
          </div>
        ))}
        {/* Stamp */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
          <div style={{
            width: "36mm",
            height: "24mm",
            borderRadius: "3px",
            border: "2.5px solid #1e40af",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            boxShadow: "0 0 0 1.5px #1e40af, 0 0 0 4px #e0e7ff, 0 0 0 5.5px #1e40af",
            overflow: "hidden",
          }}>
            {/* Inner dashed accent */}
            <div style={{
              position: "absolute",
              inset: "2mm",
              borderRadius: "1.5px",
              border: "1px dashed #1e40af",
              opacity: 0.4,
            }} />
            <div style={{ textAlign: "center", color: "#1e40af", lineHeight: 1.2, padding: "1mm" }}>
              <div style={{ fontSize: "8pt", fontWeight: 800, letterSpacing: "0.3px" }}>شركة الرمال الناعمة الصناعية</div>
              <div style={{ fontSize: "7pt", fontWeight: 600, marginTop: "3px", paddingTop: "2px", borderTop: "1px solid #1e40af", opacity: 0.9 }}>سجل تجاري 2050147243</div>
            </div>
          </div>
          <div style={{ fontSize: "8.5pt", color: "#666", marginTop: "4px", fontWeight: 700 }}>الختم</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "8mm", left: "14mm", right: "14mm", borderTop: "1px solid #e5e7eb", paddingTop: "4px", display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#999" }}>
        <span>شركة الرمال الناعمة الصناعية — نظام المحاسبة</span>
        <span>سند رقم: {receipt.receipt_number}</span>
        <span>تم الإنشاء: {format(new Date(), "dd/MM/yyyy HH:mm")}</span>
      </div>
    </div>
  );
}

function MetaBox({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color: string }) {
  return (
    <div style={{ border: "1px solid " + (highlight ? color : "#d1d5db"), borderRadius: "4px", overflow: "hidden", background: highlight ? "#eef3fa" : "#fff" }}>
      <div style={{ background: highlight ? color : "#f3f4f6", color: highlight ? "#fff" : "#444", padding: "3px 8px", fontSize: "9pt", fontWeight: 700 }}>{label}</div>
      <div style={{ padding: "6px 8px", fontSize: "11pt", fontWeight: 700, color: highlight ? color : "#111" }}>{value}</div>
    </div>
  );
}

const th: React.CSSProperties = { border: "1px solid #cbd5e1", padding: "5px 6px", fontWeight: 700, textAlign: "center" };
const td: React.CSSProperties = { border: "1px solid #e2e8f0", padding: "5px 8px", textAlign: "right" };
