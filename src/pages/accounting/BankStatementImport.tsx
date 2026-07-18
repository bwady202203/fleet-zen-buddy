import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowRight,
  FileSpreadsheet,
  Languages,
  Loader2,
  Copy,
  Trash2,
  Save,
  RefreshCcw,
  Mic,
  MicOff,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  level: number;
  type: string;
}

interface BankStatementRow {
  date: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  reference: string;
  selectedAccountId: string | null;
}

const RIYADH_BANK_ACCOUNT_ID = "2edc3d0d-7582-4173-81f2-4b547ad32874";

const typeTile: Record<string, string> = {
  asset: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900",
  liability: "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-900",
  equity: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900",
  revenue: "bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-900",
  expense: "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900",
};
const tileClass = (t: string) =>
  typeTile[t] || "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900";

export default function BankStatementImport() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankStatementData, setBankStatementData] = useState("");
  const [rows, setRows] = useState<BankStatementRow[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entryDescription, setEntryDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quickCategory, setQuickCategory] = useState<string>("all");
  const [sidebarSearch, setSidebarSearch] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [dragOverRow, setDragOverRow] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("chart_of_accounts")
          .select("id, code, name_ar, name_en, level, type")
          .eq("level", 4)
          .eq("is_active", true)
          .order("code");
        if (error) throw error;
        setAccounts(data || []);
      } catch (e: any) {
        toast.error("خطأ في تحميل الحسابات: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startVoiceSearch = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("المتصفح لا يدعم البحث الصوتي. استخدم Chrome أو Edge.");
      return;
    }
    const recognition = new SR();
    recognition.lang = "ar-SA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      setIsListening(false);
      toast.error("خطأ في الإدخال الصوتي: " + (e.error || ""));
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      setAccountSearch(transcript);
      toast.success(`تم: "${transcript}"`);
    };
    recognition.start();
  };

  // ---------- parsing helpers ----------
  const parseLocalizedNumber = (value: string, useCommaDecimal?: boolean): number => {
    if (!value) return 0;
    let str = String(value).trim().replace(/[¤$\u20AC£¥\s]/g, "");
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    const isCommaDecimal = useCommaDecimal ?? lastComma > lastDot;
    if (isCommaDecimal) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  };
  const normalizeColumnName = (name: string): string =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s]+/g, " ").trim();
  const findColumnIndex = (headers: string[], possibleNames: string[]): number => {
    const nh = headers.map((h) => (h ? normalizeColumnName(String(h)) : ""));
    const nn = possibleNames.map(normalizeColumnName);
    for (const n of nn) {
      const i = nh.indexOf(n);
      if (i !== -1) return i;
    }
    for (const n of nn) {
      const i = nh.findIndex((h) => h.includes(n));
      if (i !== -1) return i;
    }
    return -1;
  };

  const handleParseBankStatement = (text: string) => {
    setBankStatementData(text);
    if (!text.trim()) return setRows([]);
    const lines = text.split("\n").filter((l) => l.trim());
    if (!lines.length) return setRows([]);
    const header = lines[0].split("\t");
    let debitIdx = findColumnIndex(header, ["مبلغ الخصم", "خصم", "debit", "withdrawal", "مدين"]);
    let creditIdx = findColumnIndex(header, ["مبلغ الايداع", "مبلغ الإيداع", "ايداع", "إيداع", "credit", "deposit", "دائن"]);
    let balanceIdx = findColumnIndex(header, ["الرصيد", "رصيد", "balance"]);
    const descIdx = findColumnIndex(header, ["البيان", "الوصف", "تفاصيل", "description", "details"]);
    const dateIdx = findColumnIndex(header, ["التاريخ", "تاريخ", "date"]);
    const firstHasNumbers = header.some((c) => parseLocalizedNumber(c) > 0);
    const startIndex = firstHasNumbers ? 0 : 1;
    if (debitIdx === -1 && creditIdx === -1 && header.length >= 3) {
      debitIdx = header.length - 3;
      creditIdx = header.length - 2;
      balanceIdx = header.length - 1;
    }
    const parsed: BankStatementRow[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split("\t");
      if (parts.length < 2) continue;
      let date = "";
      if (dateIdx !== -1 && parts[dateIdx]) date = parts[dateIdx].trim();
      else {
        const m = line.match(/(\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4})/);
        date = m ? m[1] : "";
      }
      const debit = debitIdx !== -1 ? parseLocalizedNumber(parts[debitIdx] || "") : 0;
      const credit = creditIdx !== -1 ? parseLocalizedNumber(parts[creditIdx] || "") : 0;
      const balance = balanceIdx !== -1 ? parseLocalizedNumber(parts[balanceIdx] || "") : 0;
      let description = "";
      if (descIdx !== -1 && parts[descIdx]) description = parts[descIdx].trim();
      else {
        description = parts
          .filter((p, idx) => idx !== debitIdx && idx !== creditIdx && idx !== balanceIdx && idx !== dateIdx && parseLocalizedNumber(p) === 0)
          .join(" ")
          .trim();
      }
      const refMatch = line.match(/REF\s*([A-Z0-9]+)/i) || line.match(/(\d{10,})/);
      const reference = refMatch ? refMatch[1] : "";
      if (date || debit > 0 || credit > 0) {
        parsed.push({ date, debit, credit, balance, description, reference, selectedAccountId: null });
      }
    }
    setRows(parsed);
  };

  const handleTranslate = async () => {
    if (!rows.length) return;
    setIsTranslating(true);
    try {
      const descriptions = rows.map((r) => r.description).filter((d) => d.trim());
      const res = await supabase.functions.invoke("translate-text", {
        body: { texts: descriptions, targetLanguage: "ar" },
      });
      if (res.data?.translations) {
        let k = 0;
        setRows((prev) =>
          prev.map((r) => {
            if (r.description.trim()) {
              const t = res.data.translations[k] || r.description;
              k++;
              return { ...r, description: t };
            }
            return r;
          }),
        );
        toast.success("تم ترجمة التفاصيل بنجاح");
      }
    } catch (e: any) {
      toast.error("خطأ في الترجمة: " + e.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSelectAccount = (rowIndex: number, accountId: string) => {
    setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, selectedAccountId: accountId } : r)));
    setActiveRowIndex(null);
    setAccountSearch("");
  };
  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    if (activeRowIndex === index) setActiveRowIndex(null);
    toast.success("تم حذف السجل");
  };
  const handleCopyAccountToNext = (index: number) => {
    const cur = rows[index];
    if (cur?.selectedAccountId && index < rows.length - 1) {
      setRows((prev) => prev.map((r, i) => (i === index + 1 ? { ...r, selectedAccountId: cur.selectedAccountId } : r)));
      toast.success("تم نسخ الحساب للصف التالي");
    }
  };
  const handleUpdateRow = (index: number, field: "debit" | "credit" | "description", value: string) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        if (field === "description") return { ...r, description: value };
        return { ...r, [field]: parseFloat(value) || 0 };
      }),
    );
  };
  const handleCreateMirrorRows = () => {
    if (!rows.length) return toast.error("لا توجد صفوف");
    const mirror = rows.map((r) => ({
      ...r,
      debit: r.credit,
      credit: r.debit,
      balance: 0,
      selectedAccountId: RIYADH_BANK_ACCOUNT_ID,
    }));
    setRows((prev) => [...prev, ...mirror]);
    toast.success(`تم إنشاء ${mirror.length} صف معكوس`);
  };

  const insertIntoActiveRow = (accountId: string, accountName: string) => {
    let target = activeRowIndex;
    if (target === null) target = rows.findIndex((r) => !r.selectedAccountId);
    if (target === -1 || target === null) return toast.error("لا يوجد صف متاح للإدراج");
    handleSelectAccount(target, accountId);
    toast.success(`تم إدراج ${accountName}`);
  };

  const normalizeDate = (raw: string): string => {
    if (!raw) return entryDate;
    const s = raw.trim();
    let m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
    return entryDate;
  };

  const handleSave = async () => {
    const withAcc = rows.filter((r) => r.selectedAccountId);
    if (!withAcc.length) return toast.error("لا توجد عمليات محددة للحفظ");
    const groups = new Map<string, BankStatementRow[]>();
    for (const r of withAcc) {
      const d = normalizeDate(r.date);
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(r);
    }
    const unbalanced: string[] = [];
    for (const [d, rs] of groups) {
      const td = rs.reduce((s, r) => s + r.debit, 0);
      const tc = rs.reduce((s, r) => s + r.credit, 0);
      if (Math.abs(td - tc) > 0.01)
        unbalanced.push(`${d} (مدين: ${td.toLocaleString()} | دائن: ${tc.toLocaleString()})`);
    }
    if (unbalanced.length) return toast.error(`قيود غير متوازنة: ${unbalanced.join(" ، ")}`);
    setIsSaving(true);
    try {
      const saved: string[] = [];
      for (const dateKey of Array.from(groups.keys()).sort()) {
        const rs = groups.get(dateKey)!;
        const year = new Date(dateKey).getFullYear();
        const { data: existing } = await supabase
          .from("journal_entries")
          .select("entry_number")
          .like("entry_number", `JE-${year}%`)
          .order("entry_number", { ascending: false })
          .limit(1);
        let next = 1;
        if (existing && existing.length > 0) {
          next = (parseInt(existing[0].entry_number.slice(-6)) || 0) + 1;
        }
        const entryNumber = `JE-${year}${next.toString().padStart(6, "0")}`;
        const { data: je, error: e1 } = await supabase
          .from("journal_entries")
          .insert({
            entry_number: entryNumber,
            date: dateKey,
            description: entryDescription || `استيراد كشف حساب بنكي - ${dateKey}`,
            reference: "bank_statement_import",
          })
          .select()
          .single();
        if (e1) throw e1;
        const lines = rs.map((r) => ({
          journal_entry_id: je.id,
          account_id: r.selectedAccountId,
          debit: r.debit,
          credit: r.credit,
          description: r.description,
        }));
        const { error: e2 } = await supabase.from("journal_entry_lines").insert(lines);
        if (e2) throw e2;
        saved.push(entryNumber);
      }
      toast.success(`تم حفظ ${saved.length} قيد بنجاح (${saved.join("، ")})`);
      setBankStatementData("");
      setRows([]);
      setEntryDescription("");
    } catch (e: any) {
      toast.error("خطأ في حفظ القيد: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- derived ----------
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const selectedCount = rows.filter((r) => r.selectedAccountId).length;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const balanceDifference = totalDebit - totalCredit;

  const filteredAccounts = accountSearch
    ? accounts.filter(
        (a) =>
          a.name_ar.includes(accountSearch) ||
          a.code.includes(accountSearch) ||
          a.name_en.toLowerCase().includes(accountSearch.toLowerCase()),
      )
    : accounts;

  const sidebarAccounts = accounts
    .filter((a) => quickCategory === "all" || a.type === quickCategory)
    .filter((a) => {
      const q = sidebarSearch.trim().toLowerCase();
      if (!q) return true;
      return (a.name_ar || "").toLowerCase().includes(q) || (a.code || "").toLowerCase().includes(q);
    });

  const dateGroups = (() => {
    const map = new Map<string, { debit: number; credit: number; count: number; withAccount: number }>();
    for (const r of rows) {
      const d = normalizeDate(r.date);
      const cur = map.get(d) || { debit: 0, credit: 0, count: 0, withAccount: 0 };
      cur.debit += r.debit;
      cur.credit += r.credit;
      cur.count += 1;
      if (r.selectedAccountId) cur.withAccount += 1;
      map.set(d, cur);
    }
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, ...v, balanced: Math.abs(v.debit - v.credit) < 0.01 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/accounting")} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              رجوع
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <FileSpreadsheet className="h-5 w-5 text-teal-600" />
            <h1 className="text-lg font-semibold text-slate-900">استيراد كشف حساب بنكي</h1>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-40 h-9"
            />
            <Button
              onClick={handleSave}
              disabled={selectedCount === 0 || isSaving}
              className="bg-blue-600 hover:bg-blue-700 gap-2 h-9"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ {dateGroups.length > 1 ? `${dateGroups.length} قيود` : "كقيد"} ({selectedCount})
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-6 space-y-4">
        {/* Paste area */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm font-medium text-slate-800">الصق بيانات كشف الحساب البنكي</label>
              <p className="text-xs text-slate-500 mt-0.5">
                يدعم النظام التعرف التلقائي على أعمدة: التاريخ، المدين، الدائن، الوصف
              </p>
            </div>
            {rows.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCreateMirrorRows} className="gap-2 text-teal-700 border-teal-200 hover:bg-teal-50">
                  <RefreshCcw className="h-4 w-4" />
                  صفوف معكوسة (بنك الرياض)
                </Button>
                <Button variant="outline" size="sm" onClick={handleTranslate} disabled={isTranslating} className="gap-2 text-violet-700 border-violet-200 hover:bg-violet-50">
                  {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                  ترجمة التفاصيل
                </Button>
              </div>
            )}
          </div>
          <textarea
            className="w-full h-28 p-3 border rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
            placeholder="انسخ بيانات كشف الحساب من البنك والصقها هنا..."
            value={bankStatementData}
            onChange={(e) => handleParseBankStatement(e.target.value)}
            dir="ltr"
          />
        </Card>

        {/* Entry description + date summary */}
        {rows.length > 0 && (
          <Card className="p-4 space-y-3">
            <Input
              placeholder="وصف القيد (اختياري)..."
              value={entryDescription}
              onChange={(e) => setEntryDescription(e.target.value)}
              className="h-10"
            />
            {dateGroups.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    ملخص القيود حسب التاريخ ({dateGroups.length} {dateGroups.length > 1 ? "قيود" : "قيد"})
                  </span>
                  <span className="text-xs text-slate-500">قيد مستقل لكل تاريخ · يجب توازن كل تاريخ</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {dateGroups.map((g) => (
                    <div
                      key={g.date}
                      className={cn(
                        "border rounded-lg p-2 text-xs",
                        g.balanced ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50",
                      )}
                    >
                      <div className="flex items-center justify-between font-medium mb-1">
                        <span className="text-slate-800">{g.date}</span>
                        <span className={g.balanced ? "text-emerald-700" : "text-rose-700"}>
                          {g.balanced ? "✓" : `فرق ${(g.debit - g.credit).toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>مدين: <span className="font-mono text-rose-600">{g.debit.toLocaleString()}</span></span>
                        <span>دائن: <span className="font-mono text-emerald-600">{g.credit.toLocaleString()}</span></span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {g.count} عملية · محدد {g.withAccount}/{g.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Table + Sidebar */}
        {rows.length > 0 && (
          <div className="flex gap-4 items-start">
            {/* Table */}
            <Card className="flex-1 min-w-0 overflow-hidden">
              <div className="px-4 py-3 border-b bg-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                  العمليات المكتشفة ({rows.length})
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-rose-50 text-rose-700">
                    مدين: <span className="font-mono">{totalDebit.toLocaleString()}</span>
                  </span>
                  <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">
                    دائن: <span className="font-mono">{totalCredit.toLocaleString()}</span>
                  </span>
                  <span className={cn("px-2 py-1 rounded font-medium", isBalanced ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                    {isBalanced ? "✓ متوازن" : `فرق: ${balanceDifference.toLocaleString()}`}
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">
                    محدد: {selectedCount}/{rows.length}
                  </span>
                </div>
              </div>

              <div className="overflow-auto max-h-[70vh]" dir="rtl">
                <table className="w-full text-sm table-fixed" dir="rtl">
                  <colgroup>
                    <col className="w-10" />
                    <col className="w-24" />
                    <col className="w-28" />
                    <col className="w-28" />
                    <col />
                    <col className="w-56" />
                    <col className="w-12" />
                  </colgroup>
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-slate-600 text-xs">
                      <th className="p-2 text-right border-b font-medium">#</th>
                      <th className="p-2 text-right border-b font-medium">التاريخ</th>
                      <th className="p-2 text-left border-b font-medium">مدين</th>
                      <th className="p-2 text-left border-b font-medium">دائن</th>
                      <th className="p-2 text-right border-b font-medium">التفاصيل</th>
                      <th className="p-2 text-right border-b font-medium">الحساب</th>
                      <th className="p-2 border-b" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const selectedAccount = row.selectedAccountId
                        ? accounts.find((a) => a.id === row.selectedAccountId)
                        : null;
                      return (
                        <tr
                          key={index}
                          className={cn(
                            "border-b hover:bg-slate-50/70 group transition-colors",
                            activeRowIndex === index && "bg-blue-50/60",
                          )}
                        >
                          <td className="p-2 text-slate-400 text-center text-xs">{index + 1}</td>
                          <td className="p-2 text-xs text-slate-700 whitespace-nowrap">{row.date || "-"}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={row.debit || ""}
                              onChange={(e) => handleUpdateRow(index, "debit", e.target.value)}
                              className={cn(
                                "h-9 text-left text-sm font-mono px-2",
                                row.debit > 0 && "bg-rose-50 border-rose-200 text-rose-800",
                              )}
                              placeholder="0"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={row.credit || ""}
                              onChange={(e) => handleUpdateRow(index, "credit", e.target.value)}
                              className={cn(
                                "h-9 text-left text-sm font-mono px-2",
                                row.credit > 0 && "bg-emerald-50 border-emerald-200 text-emerald-800",
                              )}
                              placeholder="0"
                            />
                          </td>
                          <td className="p-2 overflow-hidden">
                            <Input
                              value={row.description}
                              onChange={(e) => handleUpdateRow(index, "description", e.target.value)}
                              className="h-9 text-sm px-2 w-full min-w-0 truncate"
                              placeholder="..."
                              dir="rtl"
                              title={row.description}
                            />
                          </td>
                          <td
                            className={cn(
                              "p-2 relative",
                              dragOverRow === index && "bg-blue-100 ring-2 ring-blue-400 ring-inset",
                            )}
                            onDragOver={(e) => {
                              if (e.dataTransfer.types.includes("text/account-id")) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "copy";
                                if (dragOverRow !== index) setDragOverRow(index);
                              }
                            }}
                            onDragLeave={() => dragOverRow === index && setDragOverRow(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              const accId = e.dataTransfer.getData("text/account-id");
                              setDragOverRow(null);
                              if (accId) {
                                handleSelectAccount(index, accId);
                                const acc = accounts.find((a) => a.id === accId);
                                if (acc) toast.success(`تم إدراج: ${acc.name_ar}`);
                              }
                            }}
                          >
                            {activeRowIndex === index ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  placeholder="ابحث عن حساب..."
                                  value={accountSearch}
                                  onChange={(e) => setAccountSearch(e.target.value)}
                                  className="h-9 text-sm flex-1"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                      setActiveRowIndex(null);
                                      setAccountSearch("");
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant={isListening ? "destructive" : "outline"}
                                  size="sm"
                                  className="h-9 w-9 p-0 shrink-0"
                                  onClick={startVoiceSearch}
                                  title="بحث صوتي"
                                >
                                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                </Button>
                                {filteredAccounts.length > 0 && (
                                  <div
                                    className={cn(
                                      "absolute z-[100] bg-white border rounded-lg shadow-xl max-h-60 overflow-auto w-72 right-2",
                                      index >= rows.length - 5 ? "bottom-full mb-1" : "top-full mt-1",
                                    )}
                                  >
                                    {filteredAccounts.slice(0, 30).map((a) => (
                                      <button
                                        key={a.id}
                                        className={cn(
                                          "w-full text-right px-3 py-2 text-sm flex items-center justify-between border-b last:border-b-0",
                                          tileClass(a.type),
                                        )}
                                        onClick={() => handleSelectAccount(index, a.id)}
                                      >
                                        <span className="truncate">{a.name_ar}</span>
                                        <span className="text-slate-500 text-xs shrink-0 ml-2">{a.code}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "h-9 text-sm flex-1 justify-between gap-2 px-2",
                                    selectedAccount
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                      : "border-dashed text-slate-500",
                                  )}
                                  onClick={() => {
                                    setActiveRowIndex(index);
                                    setAccountSearch("");
                                  }}
                                >
                                  {selectedAccount ? (
                                    <>
                                      <span className="truncate">{selectedAccount.name_ar}</span>
                                      <span className="text-slate-500 text-xs shrink-0">{selectedAccount.code}</span>
                                    </>
                                  ) : (
                                    <span>اختر حساب</span>
                                  )}
                                </Button>
                                {selectedAccount && index < rows.length - 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0 text-violet-600 hover:bg-violet-50 shrink-0"
                                    onClick={() => handleCopyAccountToNext(index)}
                                    title="نسخ للصف التالي"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => handleDeleteRow(index)}
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Sidebar */}
            <Card
              className={cn(
                "self-start sticky top-[76px] flex flex-col overflow-hidden transition-all duration-300 shadow-sm",
                sidebarOpen ? "w-[360px]" : "w-12",
                "max-h-[calc(100vh-100px)]",
              )}
            >
              <div
                className={cn(
                  "border-b bg-slate-50/80 flex items-center",
                  sidebarOpen ? "p-2 justify-between" : "p-1 justify-center h-12",
                )}
              >
                {sidebarOpen && (
                  <div className="text-xs font-semibold text-slate-700 px-1">
                    الحسابات · {accounts.length}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setSidebarOpen((v) => !v)}
                  title={sidebarOpen ? "إخفاء" : "إظهار"}
                >
                  {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
              </div>
              {sidebarOpen && (
                <>
                  <div className="p-2 border-b space-y-2 bg-white">
                    <Input
                      placeholder="ابحث في الحسابات..."
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="flex flex-wrap gap-1">
                      {[
                        { key: "all", label: "الكل" },
                        { key: "asset", label: "أصول" },
                        { key: "liability", label: "خصوم" },
                        { key: "equity", label: "حقوق" },
                        { key: "revenue", label: "إيرادات" },
                        { key: "expense", label: "مصروفات" },
                      ].map((c) => (
                        <button
                          key={c.key}
                          onClick={() => setQuickCategory(c.key)}
                          className={cn(
                            "px-2 py-0.5 text-[11px] rounded-full border transition",
                            quickCategory === c.key
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100",
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-500 text-center">
                      اسحب أو انقر لإدراج في الصف النشط
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {sidebarAccounts.map((a) => (
                        <div
                          key={a.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/account-id", a.id);
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          onClick={() => insertIntoActiveRow(a.id, a.name_ar || a.name_en)}
                          className={cn(
                            "min-h-[54px] p-1.5 rounded-md border cursor-pointer hover:shadow-sm transition flex flex-col items-center justify-center text-center gap-0.5",
                            tileClass(a.type),
                          )}
                          title={`${a.code} - ${a.name_ar}`}
                        >
                          <span className="leading-tight font-medium text-[11px] break-words line-clamp-2">
                            {a.name_ar || a.name_en || "بدون اسم"}
                          </span>
                          <span className="text-[9px] opacity-70 font-mono">{a.code}</span>
                        </div>
                      ))}
                    </div>
                    {sidebarAccounts.length === 0 && (
                      <div className="text-center text-xs text-slate-400 py-6">لا توجد نتائج</div>
                    )}
                  </div>
                </>
              )}
            </Card>
          </div>
        )}

        {/* Empty state */}
        {rows.length === 0 && !bankStatementData && (
          <Card className="p-16 text-center">
            <FileSpreadsheet className="h-14 w-14 mx-auto mb-4 text-slate-300" />
            <h3 className="text-base font-medium text-slate-700 mb-1">لا توجد بيانات</h3>
            <p className="text-sm text-slate-500">الصق بيانات كشف الحساب البنكي في المربع أعلاه للبدء</p>
          </Card>
        )}
      </div>
    </div>
  );
}
