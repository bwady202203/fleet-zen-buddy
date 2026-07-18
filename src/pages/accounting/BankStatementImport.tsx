import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowRight, FileSpreadsheet, Languages, Loader2, Copy, Trash2, Save,
  RefreshCcw, Mic, MicOff, LayoutList, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, Sigma, CalendarDays, ChevronsUpDown,
  Search, ChevronLeft, ChevronRight, Eye, EyeOff, ClipboardPaste,
  Wallet, Building2, Landmark, Receipt, PiggyBank, Users
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

const TYPE_META: Record<string, { label: string; icon: any; tint: string }> = {
  asset:     { label: "الأصول",     icon: Wallet,    tint: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  liability: { label: "الخصوم",     icon: Landmark,  tint: "text-rose-600 bg-rose-50 border-rose-200" },
  equity:    { label: "حقوق الملكية", icon: Building2, tint: "text-violet-600 bg-violet-50 border-violet-200" },
  revenue:   { label: "الإيرادات",   icon: TrendingUp, tint: "text-sky-600 bg-sky-50 border-sky-200" },
  expense:   { label: "المصروفات",   icon: Receipt,   tint: "text-amber-600 bg-amber-50 border-amber-200" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const RIYADH_BANK_ACCOUNT_ID = "2edc3d0d-7582-4173-81f2-4b547ad32874";
const PAGE_SIZE = 25;

export default function BankStatementImport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankStatementData, setBankStatementData] = useState("");
  const [parsedBankStatements, setParsedBankStatements] = useState<BankStatementRow[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entryDescription, setEntryDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCategory, setDrawerCategory] = useState<string>("all");
  const [drawerSearch, setDrawerSearch] = useState("");
  const [expandedType, setExpandedType] = useState<string | null>("asset");

  // Table controls
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "debit" | "credit" | "description" | "">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [hiddenCols, setHiddenCols] = useState<Record<string, boolean>>({});

  const [dragOverRow, setDragOverRow] = useState<number | null>(null);
  const [openAccountPopover, setOpenAccountPopover] = useState<number | null>(null);

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
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
    } finally { setLoading(false); }
  };

  const startVoiceSearch = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("المتصفح لا يدعم البحث الصوتي. استخدم Chrome أو Edge."); return; }
    const rec = new SR();
    rec.lang = "ar-SA"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = (e: any) => { setIsListening(false); toast.error("خطأ صوتي: " + (e.error || "")); };
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript.trim();
      setDrawerSearch(t);
      toast.success(`تم: "${t}"`);
    };
    rec.start();
  };

  // ---------- Parsing (unchanged logic) ----------
  const parseLocalizedNumber = (value: string, useCommaDecimal?: boolean): number => {
    if (!value) return 0;
    let s = String(value).trim().replace(/[¤$\u20AC£¥\s]/g, "");
    const lastComma = s.lastIndexOf(","), lastDot = s.lastIndexOf(".");
    const isCD = useCommaDecimal ?? (lastComma > lastDot);
    s = isCD ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    const p = parseFloat(s); return isNaN(p) ? 0 : p;
  };
  const normalizeColumnName = (n: string) =>
    n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s]+/g, " ").trim();
  const findColumnIndex = (headers: string[], names: string[]) => {
    const nh = headers.map(h => h ? normalizeColumnName(String(h)) : "");
    const nn = names.map(normalizeColumnName);
    for (const n of nn) { const i = nh.indexOf(n); if (i !== -1) return i; }
    for (const n of nn) { const i = nh.findIndex(h => h.includes(n)); if (i !== -1) return i; }
    return -1;
  };
  const handleParseBankStatement = (text: string) => {
    setBankStatementData(text);
    if (!text.trim()) { setParsedBankStatements([]); return; }
    const lines = text.split("\n").filter(l => l.trim());
    if (!lines.length) { setParsedBankStatements([]); return; }
    const header = lines[0].split("\t");
    let dCol = findColumnIndex(header, ["مبلغ الخصم", "خصم", "debit", "withdrawal", "مدين"]);
    let cCol = findColumnIndex(header, ["مبلغ الايداع", "مبلغ الإيداع", "ايداع", "إيداع", "credit", "deposit", "دائن"]);
    let bCol = findColumnIndex(header, ["الرصيد", "رصيد", "balance"]);
    let descCol = findColumnIndex(header, ["البيان", "الوصف", "تفاصيل", "description", "details"]);
    let dateCol = findColumnIndex(header, ["التاريخ", "تاريخ", "date"]);
    const firstHasNums = header.some(c => parseLocalizedNumber(c) > 0);
    const start = firstHasNums ? 0 : 1;
    if (dCol === -1 && cCol === -1 && header.length >= 3) {
      dCol = header.length - 3; cCol = header.length - 2; bCol = header.length - 1;
    }
    const out: BankStatementRow[] = [];
    for (let i = start; i < lines.length; i++) {
      const parts = lines[i].split("\t");
      if (parts.length < 2) continue;
      let date = "";
      if (dateCol !== -1 && parts[dateCol]) date = parts[dateCol].trim();
      else { const m = lines[i].match(/(\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4})/); date = m ? m[1] : ""; }
      const debit = dCol !== -1 && parts[dCol] ? parseLocalizedNumber(parts[dCol]) : 0;
      const credit = cCol !== -1 && parts[cCol] ? parseLocalizedNumber(parts[cCol]) : 0;
      const balance = bCol !== -1 && parts[bCol] ? parseLocalizedNumber(parts[bCol]) : 0;
      let description = "";
      if (descCol !== -1 && parts[descCol]) description = parts[descCol].trim();
      else description = parts.filter((p, idx) =>
        idx !== dCol && idx !== cCol && idx !== bCol && idx !== dateCol && parseLocalizedNumber(p) === 0
      ).join(" ").trim();
      const refMatch = lines[i].match(/REF\s*([A-Z0-9]+)/i) || lines[i].match(/(\d{10,})/);
      const reference = refMatch ? refMatch[1] : "";
      if (date || debit > 0 || credit > 0) out.push({ date, debit, credit, balance, description, reference, selectedAccountId: null });
    }
    setParsedBankStatements(out);
    setPage(1);
  };

  const handleTranslateDescriptions = async () => {
    if (!parsedBankStatements.length) return;
    setIsTranslating(true);
    try {
      const descriptions = parsedBankStatements.map(r => r.description).filter(d => d.trim());
      const res = await supabase.functions.invoke("translate-text", { body: { texts: descriptions, targetLanguage: "ar" } });
      if (res.data?.translations) {
        let k = 0;
        setParsedBankStatements(prev => prev.map(r => {
          if (r.description.trim()) { const t = res.data.translations[k] || r.description; k++; return { ...r, description: t }; }
          return r;
        }));
        toast.success("تم ترجمة التفاصيل");
      }
    } catch (e: any) { toast.error("خطأ في الترجمة: " + e.message); }
    finally { setIsTranslating(false); }
  };

  const handleSelectAccount = (rowIndex: number, accountId: string) => {
    setParsedBankStatements(prev => prev.map((r, i) => i === rowIndex ? { ...r, selectedAccountId: accountId } : r));
    setOpenAccountPopover(null);
  };
  const handleDeleteRow = (i: number) => { setParsedBankStatements(p => p.filter((_, k) => k !== i)); toast.success("تم الحذف"); };
  const handleCopyAccountToNext = (i: number) => {
    const cur = parsedBankStatements[i];
    if (cur?.selectedAccountId && i < parsedBankStatements.length - 1) {
      setParsedBankStatements(p => p.map((r, k) => k === i + 1 ? { ...r, selectedAccountId: cur.selectedAccountId } : r));
      toast.success("تم نسخ الحساب");
    }
  };
  const handleUpdateRow = (i: number, field: "debit" | "credit" | "description", value: string) => {
    setParsedBankStatements(p => p.map((r, k) => {
      if (k !== i) return r;
      if (field === "description") return { ...r, description: value };
      return { ...r, [field]: parseFloat(value) || 0 };
    }));
  };
  const handleCreateMirrorRows = () => {
    if (!parsedBankStatements.length) { toast.error("لا توجد صفوف"); return; }
    const mirror: BankStatementRow[] = parsedBankStatements.map(r => ({
      date: r.date, debit: r.credit, credit: r.debit, balance: 0,
      description: r.description, reference: r.reference, selectedAccountId: RIYADH_BANK_ACCOUNT_ID,
    }));
    setParsedBankStatements(p => [...p, ...mirror]);
    toast.success(`تم إنشاء ${mirror.length} صف معكوس`);
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

  const handleSaveAsJournalEntry = async () => {
    const rowsWithAccounts = parsedBankStatements.filter(r => r.selectedAccountId);
    if (!rowsWithAccounts.length) { toast.error("لم يتم اختيار حساب لأي عملية"); return; }
    const groups = new Map<string, BankStatementRow[]>();
    for (const r of rowsWithAccounts) {
      const d = normalizeDate(r.date);
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(r);
    }
    const unbal: string[] = [];
    for (const [d, rows] of groups) {
      const td = rows.reduce((s, r) => s + r.debit, 0);
      const tc = rows.reduce((s, r) => s + r.credit, 0);
      if (Math.abs(td - tc) > 0.01) unbal.push(`${d}`);
    }
    if (unbal.length) { toast.error(`قيود غير متوازنة: ${unbal.join("، ")}`); return; }
    setIsSaving(true);
    try {
      const sortedDates = Array.from(groups.keys()).sort();
      const savedNumbers: string[] = [];
      for (const dateKey of sortedDates) {
        const rows = groups.get(dateKey)!;
        const y = new Date(dateKey).getFullYear();
        const { data: exist } = await supabase.from("journal_entries")
          .select("entry_number").like("entry_number", `JE-${y}%`)
          .order("entry_number", { ascending: false }).limit(1);
        let n = 1;
        if (exist && exist.length) n = (parseInt(exist[0].entry_number.slice(-6)) || 0) + 1;
        const entryNumber = `JE-${y}${n.toString().padStart(6, "0")}`;
        const { data: je, error: eErr } = await supabase.from("journal_entries").insert({
          entry_number: entryNumber, date: dateKey,
          description: entryDescription || `استيراد كشف حساب بنكي - ${dateKey}`,
          reference: "bank_statement_import",
        }).select().single();
        if (eErr) throw eErr;
        const lines = rows.map(r => ({
          journal_entry_id: je.id, account_id: r.selectedAccountId,
          debit: r.debit, credit: r.credit, description: r.description,
        }));
        const { error: lErr } = await supabase.from("journal_entry_lines").insert(lines);
        if (lErr) throw lErr;
        savedNumbers.push(entryNumber);
      }
      toast.success(`تم حفظ ${savedNumbers.length} قيد (${savedNumbers.join("، ")})`);
      setBankStatementData(""); setParsedBankStatements([]); setEntryDescription("");
    } catch (e: any) { toast.error("خطأ في الحفظ: " + e.message); }
    finally { setIsSaving(false); }
  };

  // ---------- Derived ----------
  const totalDebit = parsedBankStatements.reduce((s, r) => s + r.debit, 0);
  const totalCredit = parsedBankStatements.reduce((s, r) => s + r.credit, 0);
  const selectedCount = parsedBankStatements.filter(r => r.selectedAccountId).length;
  const balanceDifference = totalDebit - totalCredit;
  const isBalanced = Math.abs(balanceDifference) < 0.01;

  const dateGroups = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number; count: number; withAccount: number }>();
    for (const r of parsedBankStatements) {
      const d = normalizeDate(r.date);
      const cur = map.get(d) || { debit: 0, credit: 0, count: 0, withAccount: 0 };
      cur.debit += r.debit; cur.credit += r.credit; cur.count++;
      if (r.selectedAccountId) cur.withAccount++;
      map.set(d, cur);
    }
    return Array.from(map.entries()).map(([date, v]) => ({ date, ...v, balanced: Math.abs(v.debit - v.credit) < 0.01 }))
      .sort((a, b) => a.date.localeCompare(b.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedBankStatements, entryDate]);

  const accountsByType = useMemo(() => {
    const g: Record<string, Account[]> = {};
    for (const a of accounts) { (g[a.type] ||= []).push(a); }
    return g;
  }, [accounts]);

  // Filter + sort + paginate table
  const displayed = useMemo(() => {
    let list = parsedBankStatements.map((r, i) => ({ ...r, __i: i }));
    if (tableSearch.trim()) {
      const q = tableSearch.trim().toLowerCase();
      list = list.filter(r =>
        (r.description || "").toLowerCase().includes(q) ||
        (r.date || "").includes(q) ||
        (r.reference || "").toLowerCase().includes(q) ||
        String(r.debit).includes(q) || String(r.credit).includes(q)
      );
    }
    if (sortKey) {
      list = [...list].sort((a: any, b: any) => {
        const av = a[sortKey], bv = b[sortKey];
        if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
        return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return list;
  }, [parsedBankStatements, tableSearch, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const pageRows = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };
  const toggleCol = (c: string) => setHiddenCols(h => ({ ...h, [c]: !h[c] }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Column definitions
  const columns = [
    { key: "num", label: "#" },
    { key: "date", label: "التاريخ" },
    { key: "debit", label: "مدين" },
    { key: "credit", label: "دائن" },
    { key: "description", label: "التفاصيل" },
    { key: "account", label: "الحساب" },
    { key: "actions", label: "" },
  ];

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800"
      dir="rtl"
      style={{ fontFamily: "Cairo, 'IBM Plex Arabic', system-ui, sans-serif", fontSize: 15 }}
    >
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/accounting")} className="gap-1.5 text-slate-600">
              <ArrowRight className="h-4 w-4" /> رجوع
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center shadow-sm">
                <FileSpreadsheet className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">مطابقة القيود المحاسبية</h1>
                <p className="text-[11px] text-slate-500 leading-tight">استيراد وتوزيع كشف الحساب البنكي</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <Input
                type="date" value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="h-7 border-0 p-0 focus-visible:ring-0 w-32 text-sm"
              />
            </div>

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 border-slate-300">
                  <LayoutList className="h-4 w-4" /> شجرة الحسابات
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[420px] sm:w-[520px] p-0 flex flex-col" dir="rtl">
                <SheetHeader className="px-5 py-4 border-b bg-gradient-to-l from-blue-50 to-white">
                  <SheetTitle className="flex items-center gap-2 text-right">
                    <LayoutList className="h-5 w-5 text-blue-600" />
                    شجرة الحسابات ({accounts.length})
                  </SheetTitle>
                  <p className="text-xs text-slate-500 text-right">اسحب أي حساب وأفلته على حقل "الحساب" في الجدول</p>
                </SheetHeader>
                <div className="p-4 border-b space-y-3 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="ابحث بالاسم أو الرقم..."
                        value={drawerSearch}
                        onChange={(e) => setDrawerSearch(e.target.value)}
                        className="pr-9 h-9"
                      />
                    </div>
                    <Button
                      type="button" variant={isListening ? "destructive" : "outline"} size="icon"
                      className="h-9 w-9 shrink-0" onClick={startVoiceSearch} title="بحث صوتي"
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { k: "all", label: "الكل", icon: Sigma },
                      { k: "asset", label: "الأصول", icon: Wallet },
                      { k: "liability", label: "الخصوم", icon: Landmark },
                      { k: "equity", label: "حقوق الملكية", icon: Building2 },
                      { k: "revenue", label: "الإيرادات", icon: TrendingUp },
                      { k: "expense", label: "المصروفات", icon: Receipt },
                    ].map(c => (
                      <button
                        key={c.k} onClick={() => setDrawerCategory(c.k)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs border flex items-center gap-1 transition",
                          drawerCategory === c.k
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <c.icon className="h-3 w-3" /> {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-3 space-y-2 bg-slate-50">
                  {Object.entries(accountsByType)
                    .filter(([type]) => drawerCategory === "all" || type === drawerCategory)
                    .map(([type, list]) => {
                      const meta = TYPE_META[type] || { label: type, icon: PiggyBank, tint: "" };
                      const q = drawerSearch.trim().toLowerCase();
                      const filtered = list.filter(a =>
                        !q || (a.name_ar || "").toLowerCase().includes(q) || (a.code || "").toLowerCase().includes(q)
                      );
                      if (!filtered.length) return null;
                      const expanded = drawerCategory !== "all" || expandedType === type || !!q;
                      return (
                        <div key={type} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                          <button
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50"
                            onClick={() => setExpandedType(expandedType === type ? null : type)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn("h-7 w-7 rounded-lg grid place-items-center", meta.tint)}>
                                <meta.icon className="h-4 w-4" />
                              </div>
                              <span className="font-semibold text-sm text-slate-800">{meta.label}</span>
                              <Badge variant="secondary" className="h-5 text-[10px]">{filtered.length}</Badge>
                            </div>
                            <ChevronsUpDown className="h-4 w-4 text-slate-400" />
                          </button>
                          {expanded && (
                            <div className="border-t border-slate-100 p-2 space-y-1 max-h-72 overflow-auto">
                              {filtered.map(a => (
                                <div
                                  key={a.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("text/account-id", a.id);
                                    e.dataTransfer.effectAllowed = "copy";
                                  }}
                                  className={cn(
                                    "px-2.5 py-1.5 rounded-lg text-xs cursor-grab active:cursor-grabbing",
                                    "flex items-center justify-between gap-2 border transition hover:shadow-sm",
                                    meta.tint
                                  )}
                                  title={`${a.code} — ${a.name_ar}`}
                                >
                                  <span className="truncate font-medium">{a.name_ar}</span>
                                  <span className="text-[10px] font-mono opacity-70 shrink-0">{a.code}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </SheetContent>
            </Sheet>

            <Button
              onClick={handleSaveAsJournalEntry}
              disabled={selectedCount === 0 || isSaving || !isBalanced}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm"
              size="sm"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ {dateGroups.length > 1 ? `${dateGroups.length} قيود` : "القيد"} ({selectedCount})
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-5 space-y-5">
        {/* ============ KPI DASHBOARD ============ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard tone="blue" icon={Sigma} label="إجمالي العمليات" value={parsedBankStatements.length.toString()} hint={`محدد ${selectedCount} من ${parsedBankStatements.length}`} />
          <KpiCard tone="rose" icon={TrendingDown} label="إجمالي المدين" value={fmt(totalDebit)} hint="ريال سعودي" />
          <KpiCard tone="emerald" icon={TrendingUp} label="إجمالي الدائن" value={fmt(totalCredit)} hint="ريال سعودي" />
          <KpiCard
            tone={isBalanced && parsedBankStatements.length > 0 ? "green" : parsedBankStatements.length === 0 ? "slate" : "orange"}
            icon={isBalanced ? CheckCircle2 : AlertTriangle}
            label="الحالة"
            value={parsedBankStatements.length === 0 ? "—" : isBalanced ? "متوازن" : fmt(Math.abs(balanceDifference))}
            hint={parsedBankStatements.length === 0 ? "بانتظار البيانات" : isBalanced ? "لا يوجد فرق" : "فرق يحتاج مراجعة"}
          />
        </div>

        {/* ============ BIG BALANCE CARD ============ */}
        {parsedBankStatements.length > 0 && (
          <Card className={cn(
            "p-5 border-2 rounded-2xl shadow-sm transition",
            isBalanced
              ? "bg-gradient-to-l from-emerald-50 via-white to-emerald-50 border-emerald-200"
              : "bg-gradient-to-l from-orange-50 via-white to-orange-50 border-orange-300"
          )}>
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-14 w-14 rounded-2xl grid place-items-center shadow-sm shrink-0",
                isBalanced ? "bg-emerald-500" : "bg-orange-500"
              )}>
                {isBalanced ? <CheckCircle2 className="h-8 w-8 text-white" /> : <AlertTriangle className="h-8 w-8 text-white" />}
              </div>
              <div className="flex-1">
                <h3 className={cn("text-xl font-bold", isBalanced ? "text-emerald-900" : "text-orange-900")}>
                  {isBalanced ? "القيود متوازنة" : "يوجد فرق يحتاج للمراجعة"}
                </h3>
                <p className={cn("text-sm mt-0.5", isBalanced ? "text-emerald-700" : "text-orange-700")}>
                  {isBalanced
                    ? "إجمالي المدين يساوي إجمالي الدائن — جاهز للحفظ"
                    : `الفرق: ${fmt(Math.abs(balanceDifference))} ريال ${balanceDifference > 0 ? "(المدين أكبر)" : "(الدائن أكبر)"}`}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ============ PASTE AREA ============ */}
        <Card className="p-5 rounded-2xl shadow-sm border-slate-200">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 grid place-items-center">
                <ClipboardPaste className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">لصق بيانات كشف الحساب</h3>
                <p className="text-[11px] text-slate-500">انسخ الجدول من البنك أو Excel — يتم التعرف التلقائي على الأعمدة</p>
              </div>
            </div>
            {parsedBankStatements.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCreateMirrorRows}
                  className="gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50">
                  <RefreshCcw className="h-4 w-4" /> صفوف معكوسة
                </Button>
                <Button variant="outline" size="sm" onClick={handleTranslateDescriptions} disabled={isTranslating}
                  className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50">
                  {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                  ترجمة عربية
                </Button>
              </div>
            )}
          </div>
          <textarea
            className="w-full h-28 p-3 border border-slate-200 rounded-xl text-sm font-mono resize-none bg-slate-50/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition"
            placeholder="الصق البيانات هنا (TSV) — التاريخ، البيان، المدين، الدائن، الرصيد..."
            value={bankStatementData}
            onChange={(e) => handleParseBankStatement(e.target.value)}
            dir="ltr"
          />
        </Card>

        {/* ============ ENTRY DESCRIPTION ============ */}
        {parsedBankStatements.length > 0 && (
          <Card className="p-4 rounded-2xl shadow-sm border-slate-200">
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">وصف القيد (اختياري)</label>
            <Input
              placeholder="اكتب وصفاً موحداً لجميع القيود المُنشأة..."
              value={entryDescription}
              onChange={(e) => setEntryDescription(e.target.value)}
              className="h-10"
            />
          </Card>
        )}

        {/* ============ TIMELINE ============ */}
        {dateGroups.length > 0 && (
          <Card className="p-5 rounded-2xl shadow-sm border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">ملخص القيود حسب التاريخ</h3>
                <Badge variant="secondary">{dateGroups.length}</Badge>
              </div>
              <p className="text-xs text-slate-500">قيد مستقل لكل تاريخ — يجب أن يتوازن</p>
            </div>
            <div className="relative">
              <div className="absolute right-3.5 top-2 bottom-2 w-px bg-slate-200" />
              <div className="space-y-3">
                {dateGroups.map(g => (
                  <div key={g.date} className="relative pr-10">
                    <div className={cn(
                      "absolute right-1 top-3 h-6 w-6 rounded-full grid place-items-center ring-4 ring-white",
                      g.balanced ? "bg-emerald-500" : "bg-orange-500"
                    )}>
                      {g.balanced
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        : <AlertTriangle className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className={cn(
                      "rounded-xl border p-3 flex items-center justify-between gap-3 flex-wrap",
                      g.balanced ? "border-emerald-200 bg-emerald-50/50" : "border-orange-200 bg-orange-50/50"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-bold text-slate-800">{g.date}</div>
                        <Badge className={g.balanced ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-orange-100 text-orange-800 hover:bg-orange-100"}>
                          {g.balanced ? "متوازن" : `فرق ${fmt(Math.abs(g.debit - g.credit))}`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-500">{g.count} عملية</span>
                        <span className="text-slate-500">محدد {g.withAccount}/{g.count}</span>
                        <span className="font-mono">مدين: <span className="text-rose-600 font-semibold">{fmt(g.debit)}</span></span>
                        <span className="font-mono">دائن: <span className="text-emerald-600 font-semibold">{fmt(g.credit)}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ============ TABLE ============ */}
        {parsedBankStatements.length > 0 && (
          <Card className="rounded-2xl shadow-sm border-slate-200 overflow-hidden">
            {/* Table toolbar */}
            <div className="p-4 border-b bg-slate-50/70 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="بحث في العمليات..."
                    value={tableSearch}
                    onChange={(e) => { setTableSearch(e.target.value); setPage(1); }}
                    className="pr-9 h-9 bg-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 border-slate-300">
                      <Eye className="h-4 w-4" /> الأعمدة
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-2" dir="rtl">
                    {columns.filter(c => c.key !== "num" && c.key !== "actions" && c.key !== "account").map(c => (
                      <button
                        key={c.key}
                        onClick={() => toggleCol(c.key)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-slate-100"
                      >
                        <span>{c.label}</span>
                        {hiddenCols[c.key]
                          ? <EyeOff className="h-4 w-4 text-slate-400" />
                          : <Eye className="h-4 w-4 text-blue-600" />}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
                <Badge variant="secondary" className="h-8 px-3 gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  {displayed.length} من {parsedBankStatements.length}
                </Badge>
              </div>
            </div>

            <div className="overflow-auto max-h-[62vh]">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-100">
                    <Th className="w-10 text-center">#</Th>
                    {!hiddenCols.date && <Th sortable onClick={() => toggleSort("date")} active={sortKey === "date"} dir={sortDir} className="w-28">التاريخ</Th>}
                    {!hiddenCols.debit && <Th sortable onClick={() => toggleSort("debit")} active={sortKey === "debit"} dir={sortDir} className="w-36 text-left">مدين (ريال)</Th>}
                    {!hiddenCols.credit && <Th sortable onClick={() => toggleSort("credit")} active={sortKey === "credit"} dir={sortDir} className="w-36 text-left">دائن (ريال)</Th>}
                    {!hiddenCols.description && <Th sortable onClick={() => toggleSort("description")} active={sortKey === "description"} dir={sortDir}>التفاصيل</Th>}
                    <Th className="w-72">الحساب</Th>
                    <Th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, idx) => {
                    const globalIndex = row.__i;
                    const selectedAccount = row.selectedAccountId ? accounts.find(a => a.id === row.selectedAccountId) : null;
                    const rowIsEven = idx % 2 === 0;
                    return (
                      <tr
                        key={globalIndex}
                        className={cn(
                          "group border-b border-slate-100 transition",
                          rowIsEven ? "bg-white" : "bg-slate-50/40",
                          "hover:bg-blue-50/40"
                        )}
                      >
                        <td className="px-2 py-2 text-center text-slate-400 text-xs font-mono border-b border-slate-100">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                        {!hiddenCols.date && (
                          <td className="px-2 py-2 text-xs whitespace-nowrap border-b border-slate-100">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                              {row.date || "—"}
                            </span>
                          </td>
                        )}
                        {!hiddenCols.debit && (
                          <td className="px-2 py-2 border-b border-slate-100">
                            <NumberInput
                              value={row.debit}
                              tone="rose"
                              onChange={(v) => handleUpdateRow(globalIndex, "debit", v)}
                            />
                          </td>
                        )}
                        {!hiddenCols.credit && (
                          <td className="px-2 py-2 border-b border-slate-100">
                            <NumberInput
                              value={row.credit}
                              tone="emerald"
                              onChange={(v) => handleUpdateRow(globalIndex, "credit", v)}
                            />
                          </td>
                        )}
                        {!hiddenCols.description && (
                          <td className="px-2 py-2 border-b border-slate-100">
                            <Input
                              value={row.description}
                              onChange={(e) => handleUpdateRow(globalIndex, "description", e.target.value)}
                              className="h-8 text-xs bg-transparent border-transparent hover:border-slate-200 focus:border-blue-400"
                              placeholder="..."
                            />
                          </td>
                        )}
                        <td
                          className={cn(
                            "px-2 py-2 border-b border-slate-100 relative",
                            dragOverRow === globalIndex && "bg-blue-100 ring-2 ring-blue-400 ring-inset"
                          )}
                          onDragOver={(e) => {
                            if (e.dataTransfer.types.includes("text/account-id")) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "copy";
                              if (dragOverRow !== globalIndex) setDragOverRow(globalIndex);
                            }
                          }}
                          onDragLeave={() => { if (dragOverRow === globalIndex) setDragOverRow(null); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const accId = e.dataTransfer.getData("text/account-id");
                            setDragOverRow(null);
                            if (accId) {
                              handleSelectAccount(globalIndex, accId);
                              const acc = accounts.find(a => a.id === accId);
                              if (acc) toast.success(`تم إدراج: ${acc.name_ar}`);
                            }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <Popover
                              open={openAccountPopover === globalIndex}
                              onOpenChange={(o) => setOpenAccountPopover(o ? globalIndex : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "h-8 flex-1 justify-between text-xs gap-1 font-normal",
                                    selectedAccount
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                      : "border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                                  )}
                                >
                                  {selectedAccount ? (
                                    <>
                                      <span className="truncate">{selectedAccount.name_ar}</span>
                                      <span className="text-[10px] font-mono opacity-70">{selectedAccount.code}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>اختر حساب...</span>
                                      <ChevronsUpDown className="h-3 w-3" />
                                    </>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-0" align="end" dir="rtl">
                                <Command>
                                  <CommandInput placeholder="بحث بالاسم أو الرقم..." />
                                  <CommandList>
                                    <CommandEmpty>لا توجد نتائج</CommandEmpty>
                                    <CommandGroup>
                                      {accounts.map(a => (
                                        <CommandItem
                                          key={a.id}
                                          value={`${a.code} ${a.name_ar} ${a.name_en}`}
                                          onSelect={() => handleSelectAccount(globalIndex, a.id)}
                                          className="flex items-center justify-between gap-2 text-xs"
                                        >
                                          <span className="truncate">{a.name_ar}</span>
                                          <span className="text-[10px] font-mono text-slate-400">{a.code}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            {selectedAccount && globalIndex < parsedBankStatements.length - 1 && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-violet-600 hover:bg-violet-50"
                                onClick={() => handleCopyAccountToNext(globalIndex)}
                                title="نسخ للتالي"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center border-b border-slate-100">
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-opacity"
                            onClick={() => handleDeleteRow(globalIndex)}
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

            {/* Pagination */}
            <div className="px-4 py-3 border-t bg-slate-50/70 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-slate-500">
                عرض {(page - 1) * PAGE_SIZE + 1} — {Math.min(page * PAGE_SIZE, displayed.length)} من {displayed.length}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 gap-1"
                  disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronRight className="h-4 w-4" /> السابق
                </Button>
                <div className="px-3 h-8 rounded-md border border-slate-200 bg-white grid place-items-center text-xs font-medium">
                  {page} / {totalPages}
                </div>
                <Button variant="outline" size="sm" className="h-8 gap-1"
                  disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  التالي <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ============ EMPTY STATE ============ */}
        {parsedBankStatements.length === 0 && !bankStatementData && (
          <Card className="p-16 text-center rounded-2xl border-dashed border-2 border-slate-200 bg-white">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 mx-auto mb-4 grid place-items-center">
              <FileSpreadsheet className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">جاهز لاستيراد كشف الحساب</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              الصق بيانات كشف الحساب البنكي في المربع أعلاه للبدء بمطابقة العمليات وإنشاء القيود المحاسبية تلقائياً.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* =================== helpers =================== */

function Th({
  children, className, sortable, onClick, active, dir,
}: {
  children?: React.ReactNode; className?: string;
  sortable?: boolean; onClick?: () => void; active?: boolean; dir?: "asc" | "desc";
}) {
  return (
    <th
      onClick={sortable ? onClick : undefined}
      className={cn(
        "text-right px-3 py-2.5 text-xs font-semibold text-slate-600 border-b border-slate-200 bg-slate-100 whitespace-nowrap",
        sortable && "cursor-pointer select-none hover:bg-slate-200/70",
        className
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortable && (
          <ChevronsUpDown className={cn("h-3 w-3", active ? "text-blue-600" : "text-slate-400")} />
        )}
      </span>
    </th>
  );
}

function KpiCard({
  tone, icon: Icon, label, value, hint,
}: {
  tone: "blue" | "emerald" | "rose" | "green" | "orange" | "slate";
  icon: any; label: string; value: string; hint?: string;
}) {
  const tones: Record<string, string> = {
    blue: "from-blue-500 to-blue-600 text-blue-600 bg-blue-50 border-blue-200",
    emerald: "from-emerald-500 to-emerald-600 text-emerald-600 bg-emerald-50 border-emerald-200",
    rose: "from-rose-500 to-rose-600 text-rose-600 bg-rose-50 border-rose-200",
    green: "from-emerald-500 to-green-600 text-emerald-600 bg-emerald-50 border-emerald-200",
    orange: "from-orange-500 to-amber-600 text-orange-600 bg-orange-50 border-orange-200",
    slate: "from-slate-400 to-slate-500 text-slate-600 bg-slate-50 border-slate-200",
  };
  const [grad, textCol, bgCol, borderCol] = tones[tone].split(" ");
  return (
    <Card className={cn("p-4 rounded-2xl border shadow-sm bg-white hover:shadow-md transition")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>
          <div className={cn("text-2xl font-bold font-mono truncate", textCol)}>{value}</div>
          {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
        </div>
        <div className={cn("h-11 w-11 rounded-xl grid place-items-center shrink-0 bg-gradient-to-br shadow-sm", grad)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </Card>
  );
}

function NumberInput({
  value, onChange, tone,
}: { value: number; onChange: (v: string) => void; tone: "rose" | "emerald" }) {
  const [focused, setFocused] = useState(false);
  const display = focused ? (value || "") : (value ? fmt(value) : "");
  const toneClass = value > 0
    ? tone === "rose"
      ? "bg-rose-50/60 border-rose-200 text-rose-700"
      : "bg-emerald-50/60 border-emerald-200 text-emerald-700"
    : "bg-white border-slate-200 text-slate-500";
  return (
    <div className="relative">
      <Input
        type={focused ? "number" : "text"}
        value={display}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-8 text-left text-xs font-mono pl-12 pr-2 transition", toneClass)}
        placeholder="0.00"
      />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 pointer-events-none">
        SAR
      </span>
    </div>
  );
}
