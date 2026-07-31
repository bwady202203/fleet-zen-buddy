import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowRight, Loader2, Save, Trash2, Search, Wand2, Landmark, CalendarDays, X, LayoutGrid, Plus, GripVertical, ArrowDownToLine, Star, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  level: number;
  type: string;
}

interface PaymentRow {
  payDate: string;
  status: string;
  amount: number;
  reference: string;
  payType: string;
  currency: string;
  fromName: string;
  toName: string;
  description: string;
  selectedAccountId: string | null;
}

type TileGroupKey = "custody" | "expenses" | "other";

const TILE_GROUPS: { key: TileGroupKey; label: string; color: string }[] = [
  { key: "custody", label: "العهد", color: "bg-amber-50 border-amber-200 hover:bg-amber-100" },
  { key: "expenses", label: "المصروفات", color: "bg-sky-50 border-sky-200 hover:bg-sky-100" },
  { key: "other", label: "حسابات أخرى", color: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
];

const TILES_STORAGE_KEY = "riyadh_bank_pay_tile_groups_v1";
const FAV_STORAGE_KEY = "riyadh_bank_pay_fav_accounts_v1";
const CREDIT_STORAGE_KEY = "riyadh_bank_pay_credit_account_v1";

// حساب بنك الرياض (الرمال)
const RIYADH_BANK_ACCOUNT_ID = "2edc3d0d-7582-4173-81f2-4b547ad32874";

const normalizeAr = (s: string) =>
  (s || "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const parseAmount = (value: string): number => {
  if (!value) return 0;
  let str = String(value).trim();
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  str = str.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
  str = str.replace(/٫/g, ".").replace(/٬/g, "");
  const negative = /^\(.*\)$/.test(str) || str.includes("-");
  str = str.replace(/[^\d.]/g, "");
  const n = parseFloat(str);
  if (isNaN(n)) return 0;
  return negative ? -n : n;
};

const normalizeDate = (raw: string): string => {
  const s = (raw || "").trim();
  let m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  return format(new Date(), "yyyy-MM-dd");
};

export default function RiyadhBankPaymentEntries() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState("");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // شاشة المربعات
  const [gridRowIndex, setGridRowIndex] = useState<number | null>(null);
  const [tileGroups, setTileGroups] = useState<Record<TileGroupKey, string[]>>({
    custody: [],
    expenses: [],
    other: [],
  });
  const [tilesReady, setTilesReady] = useState(false);
  const [addToGroup, setAddToGroup] = useState<TileGroupKey | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [dragInfo, setDragInfo] = useState<{ group: TileGroupKey; index: number } | null>(null);
  // الحسابات الأكثر استخداماً + الحساب الدائن الافتراضي
  const [favIds, setFavIds] = useState<string[]>([]);
  const [favPickerOpen, setFavPickerOpen] = useState(false);
  const [favSearch, setFavSearch] = useState("");
  const [creditAccountId, setCreditAccountId] = useState<string>(RIYADH_BANK_ACCOUNT_ID);
  const [creditPickerOpen, setCreditPickerOpen] = useState(false);
  const [creditSearch, setCreditSearch] = useState("");
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const copyClicksRef = useRef<Record<number, number>>({});

  useEffect(() => {
    copyClicksRef.current = {};
  }, [rows.length]);

  useEffect(() => {
    try {
      const f = localStorage.getItem(FAV_STORAGE_KEY);
      if (f) setFavIds(JSON.parse(f));
      const c = localStorage.getItem(CREDIT_STORAGE_KEY);
      if (c) setCreditAccountId(c);
    } catch {
      // تجاهل
    }
  }, []);

  const toggleFav = (id: string) =>
    setFavIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 16);
      localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(next));
      return next;
    });

  const chooseCreditAccount = (id: string) => {
    setCreditAccountId(id);
    localStorage.setItem(CREDIT_STORAGE_KEY, id);
    setCreditPickerOpen(false);
  };

  const setRowAccount = (index: number, id: string) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, selectedAccountId: id } : r)));

  const copyAccountDown = (index: number) => {
    const id = rows[index]?.selectedAccountId;
    if (!id) return;
    const nextCount = (copyClicksRef.current[index] || 0) + 1;
    const targetIndex = index + nextCount;
    if (targetIndex >= rows.length) {
      toast.error("لا يوجد صف تالي لنسخ الحساب إليه");
      return;
    }
    copyClicksRef.current = { ...copyClicksRef.current, [index]: nextCount };
    setRows((prev) => prev.map((r, i) => (i === targetIndex ? { ...r, selectedAccountId: id } : r)));
    toast.success(`تم نسخ الحساب إلى الصف ${targetIndex + 1}`);
  };

  // تحميل/حفظ ترتيب المربعات
  useEffect(() => {
    if (!accounts.length || tilesReady) return;
    const stored = localStorage.getItem(TILES_STORAGE_KEY);
    const valid = (ids: string[]) => ids.filter((id) => accounts.some((a) => a.id === id));
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTileGroups({
          custody: valid(parsed.custody || []),
          expenses: valid(parsed.expenses || []),
          other: valid(parsed.other || []),
        });
        setTilesReady(true);
        return;
      } catch {
        // تجاهل
      }
    }
    setTileGroups({
      custody: accounts.filter((a) => a.code.startsWith("1111")).map((a) => a.id),
      expenses: accounts.filter((a) => a.type === "expense").slice(0, 40).map((a) => a.id),
      other: [],
    });
    setTilesReady(true);
  }, [accounts, tilesReady]);

  useEffect(() => {
    if (tilesReady) localStorage.setItem(TILES_STORAGE_KEY, JSON.stringify(tileGroups));
  }, [tileGroups, tilesReady]);

  const moveTile = (group: TileGroupKey, from: number, to: number) => {
    setTileGroups((prev) => {
      const list = [...prev[group]];
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      return { ...prev, [group]: list };
    });
  };

  const removeTile = (group: TileGroupKey, id: string) =>
    setTileGroups((prev) => ({ ...prev, [group]: prev[group].filter((x) => x !== id) }));

  const addTile = (group: TileGroupKey, id: string) =>
    setTileGroups((prev) =>
      prev[group].includes(id) ? prev : { ...prev, [group]: [...prev[group], id] }
    );


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

  const findAccountByName = (name: string): string | null => {
    const n = normalizeAr(name);
    if (!n) return null;
    const exact = accounts.find((a) => normalizeAr(a.name_ar) === n);
    if (exact) return exact.id;
    const partial = accounts.find(
      (a) => normalizeAr(a.name_ar).includes(n) || n.includes(normalizeAr(a.name_ar))
    );
    return partial ? partial.id : null;
  };

  const handleParse = () => {
    const lines = rawData.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error("لا توجد بيانات للتحليل");
      return;
    }

    const parsed: PaymentRow[] = [];
    for (const line of lines) {
      const cells = line.split("\t").map((c) => c.trim());
      if (cells.length < 3) continue;
      // تخطي صف العناوين
      if (cells[0].includes("المبلغ") || cells[0].includes("مبلغ")) continue;

      // الترتيب: المبلغ · الحالة · التاريخ · رقم المرجع · من · نوع الخدمة · اسم المفوتر
      const [amount, status, payDate, reference, fromName, payType, toName] = [
        cells[0] || "",
        cells[1] || "",
        cells[2] || "",
        cells[3] || "",
        cells[4] || "",
        cells[5] || "",
        cells[6] || "",
      ];
      const currency = "SAR";

      const value = parseAmount(amount);
      if (!value) continue;

      parsed.push({
        payDate: normalizeDate(payDate),
        status,
        amount: value,
        reference,
        payType,
        currency: currency || "SAR",
        fromName,
        toName,
        description: toName,
        selectedAccountId: findAccountByName(toName),
      });
    }

    // نص ملتصق بدون Tab: استخراج العمليات عبر نمط (مبلغ · حالة · تاريخ · مرجع · رقم الحساب · نوع الخدمة · اسم المفوتر)
    if (parsed.length === 0) {
      const flat = rawData.replace(/\s+/g, " ");
      const re = /([\d,]+\.\d{2})\s*(تمت[^\d]*?)\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(TBC\d+?)(\d{13})\s*(.+?)(?=\s*[\d,]+\.\d{2}\s*تمت|$)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(flat)) !== null) {
        const value = parseAmount(m[1]);
        if (!value) continue;
        let rest = (m[6] || "").trim();
        let payType = "";
        for (const t of ["سداد المدفوعات الحكومية", "مدفوعات سداد", "سداد فواتير"]) {
          if (rest.startsWith(t)) {
            payType = t;
            rest = rest.slice(t.length).trim();
            break;
          }
        }
        const toName = rest;
        parsed.push({
          payDate: normalizeDate(m[3]),
          status: (m[2] || "").trim(),
          amount: value,
          reference: m[4],
          payType,
          currency: "SAR",
          fromName: m[5],
          toName,
          description: toName,
          selectedAccountId: findAccountByName(toName),
        });
      }
    }

    if (parsed.length === 0) {
      toast.error("تعذّر قراءة أي صف — الصق البيانات من إكسل أو من كشف البنك مباشرة");
      return;
    }

    setRows(parsed);
    const matched = parsed.filter((r) => r.selectedAccountId).length;
    toast.success(`تم تحليل ${parsed.length} عملية — تم مطابقة ${matched} حساب تلقائياً`);
  };

  const filteredAccounts = useMemo(() => {
    const q = normalizeAr(accountSearch);
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        normalizeAr(a.name_ar).includes(q) ||
        a.code.includes(accountSearch) ||
        a.name_en.toLowerCase().includes(accountSearch.toLowerCase())
    );
  }, [accounts, accountSearch]);

  const getAccount = (id: string | null) => accounts.find((a) => a.id === id);

  const dateGroups = useMemo(() => {
    const map = new Map<string, { total: number; count: number; withAccount: number }>();
    for (const r of rows) {
      const cur = map.get(r.payDate) || { total: 0, count: 0, withAccount: 0 };
      cur.total += r.amount;
      cur.count += 1;
      if (r.selectedAccountId) cur.withAccount += 1;
      map.set(r.payDate, cur);
    }
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const selectedCount = rows.filter((r) => r.selectedAccountId).length;

  const handleSave = async () => {
    const valid = rows.filter((r) => r.selectedAccountId && r.amount);
    if (valid.length === 0) {
      toast.error("يرجى اختيار حساب لكل عملية قبل الحفظ");
      return;
    }
    if (valid.length < rows.length) {
      toast.error(`${rows.length - valid.length} عملية بدون حساب — سيتم تجاهلها`);
    }

    const groups = new Map<string, PaymentRow[]>();
    for (const r of valid) {
      if (!groups.has(r.payDate)) groups.set(r.payDate, []);
      groups.get(r.payDate)!.push(r);
    }

    setIsSaving(true);
    try {
      const savedNumbers: string[] = [];
      for (const dateKey of Array.from(groups.keys()).sort()) {
        const groupRows = groups.get(dateKey)!;
        const yearOfEntry = new Date(dateKey).getFullYear();

        const { data: existingEntries } = await supabase
          .from("journal_entries")
          .select("entry_number")
          .like("entry_number", `JE-${yearOfEntry}%`)
          .order("entry_number", { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (existingEntries && existingEntries.length > 0) {
          nextNumber = (parseInt(existingEntries[0].entry_number.slice(-6)) || 0) + 1;
        }
        const entryNumber = `JE-${yearOfEntry}${nextNumber.toString().padStart(6, "0")}`;

        const { data: journalEntry, error: entryError } = await supabase
          .from("journal_entries")
          .insert({
            entry_number: entryNumber,
            date: dateKey,
            description: `سداد فواتير بنك الرياض - ${dateKey}`,
            reference: "riyadh_bank_payment",
          })
          .select()
          .single();
        if (entryError) throw entryError;

        const lines: any[] = [];
        let groupTotal = 0;
        for (const r of groupRows) {
          groupTotal += r.amount;
          lines.push({
            journal_entry_id: journalEntry.id,
            account_id: r.selectedAccountId,
            debit: r.amount,
            credit: 0,
            description: r.toName?.trim() || r.description?.trim() || "",
          });
        }
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: creditAccountId,
          debit: 0,
          credit: groupTotal,
          description: `تحويلات ${getAccount(creditAccountId)?.name_ar || "بنك الرياض"} - ${dateKey}`,
        });

        const { error: linesError } = await supabase.from("journal_entry_lines").insert(lines);
        if (linesError) throw linesError;
        savedNumbers.push(entryNumber);
      }

      toast.success(`تم حفظ ${savedNumbers.length} قيد بنجاح (${savedNumbers.join("، ")})`);
      setRows([]);
      setRawData("");
    } catch (e: any) {
      toast.error("خطأ في حفظ القيود: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/accounting")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Landmark className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">قيود بنك الرياض للسداد</h1>
              <p className="text-xs text-muted-foreground">
                لصق عمليات السداد من بنك الرياض وإنشاء قيد لكل تاريخ
              </p>
              <button
                type="button"
                onClick={() => { setCreditPickerOpen(true); setCreditSearch(""); }}
                className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-1 rounded border bg-primary/5 hover:bg-primary/10"
                title="تغيير الحساب الدائن الافتراضي"
              >
                <Settings2 className="h-3.5 w-3.5" />
                الطرف الدائن: {getAccount(creditAccountId)?.name_ar || "بنك الرياض"}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rows.length > 0 && (
              <Button variant="outline" onClick={() => setRows([])}>
                <Trash2 className="h-4 w-4 ml-1" /> مسح
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving || selectedCount === 0}>
              {isSaving ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}
              حفظ القيود ({dateGroups.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">الصق البيانات من إكسل</span>
            <span className="text-xs text-muted-foreground">
              (المبلغ · الحالة · التاريخ · رقم المرجع · من · نوع الخدمة · اسم المفوتر)
            </span>
          </div>
          <textarea
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            placeholder={"200.00\tتمت المعالجة\t30-07-2026\tTBC2607301714686\tحساب جاري 1234\tسداد فواتير\tشركة الكهرباء"}
            className="w-full h-36 p-3 border rounded-md text-sm font-mono bg-background"
            dir="rtl"
          />
          <div className="flex justify-end mt-2">
            <Button onClick={handleParse} disabled={!rawData.trim()}>
              <Wand2 className="h-4 w-4 ml-1" /> تحليل البيانات
            </Button>
          </div>
        </Card>

        {dateGroups.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">ملخص القيود حسب التاريخ</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {dateGroups.map((g) => (
                <div key={g.date} className="rounded-lg border bg-primary/5 p-3">
                  <div className="font-bold text-sm">{g.date}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {g.count} عملية · محددة {g.withAccount}
                  </div>
                  <div className="text-sm font-semibold mt-1">
                    {g.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm font-semibold">
              الإجمالي: {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} · عدد العمليات: {rows.length}
            </div>
          </Card>
        )}

        {rows.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-sm">الحسابات الأكثر اختياراً</span>
                <span className="text-xs text-muted-foreground">
                  {focusedRow !== null ? `الصف المحدد: ${focusedRow + 1}` : "اضغط على حقل الحساب في أي صف ثم اختر من هنا"}
                </span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setFavPickerOpen(true); setFavSearch(""); }}>
                <Settings2 className="h-3.5 w-3.5 ml-1" /> تحديد الحسابات
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 max-h-[9.5rem] overflow-y-auto">
              {favIds.map((id) => {
                const a = getAccount(id);
                if (!a) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (focusedRow === null) {
                        toast.error("اختر صفاً أولاً بالضغط على حقل الحساب");
                        return;
                      }
                      setRowAccount(focusedRow, id);
                    }}
                    className="rounded-md border bg-sky-50 hover:bg-sky-100 border-sky-200 px-2 py-2 text-right h-16 flex flex-col justify-center"
                  >
                    <div className="font-mono text-[10px] text-muted-foreground">{a.code}</div>
                    <div className="text-xs font-semibold leading-tight line-clamp-2">{a.name_ar}</div>
                  </button>
                );
              })}
              {favIds.length === 0 && (
                <div className="col-span-full text-xs text-muted-foreground py-2">
                  لم يتم تحديد حسابات — اضغط "تحديد الحسابات"
                </div>
              )}
            </div>
          </Card>
        )}

        {rows.length > 0 && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-right">المبلغ (مدين)</th>
                    <th className="p-2 text-right">الحالة</th>
                    <th className="p-2 text-right">التاريخ</th>
                    <th className="p-2 text-right">رقم المرجع</th>
                    <th className="p-2 text-right">رقم الحساب</th>
                    <th className="p-2 text-right">نوع الخدمة</th>
                    <th className="p-2 text-right">اسم المفوتر</th>
                    <th className="p-2 text-right">الوصف</th>
                    <th className="p-2 text-right">الحساب المدين</th>
                    <th className="p-2 text-right">الطرف الدائن</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const acc = getAccount(row.selectedAccountId);
                    return (
                      <tr key={index} className="border-t hover:bg-muted/40">
                        <td className="p-2 font-semibold whitespace-nowrap">
                          {row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-xs">{row.status}</td>
                        <td className="p-2 whitespace-nowrap">{row.payDate}</td>
                        <td className="p-2 text-xs font-mono">{row.reference}</td>
                        <td className="p-2 text-xs font-mono">{row.fromName}</td>
                        <td className="p-2 text-xs">{row.payType}</td>
                        <td className="p-2">{row.toName}</td>
                        <td className="p-2 relative min-w-[240px]">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setFocusedRow(index);
                                setActiveRowIndex(activeRowIndex === index ? null : index);
                                setAccountSearch("");
                              }}
                              className={cn(
                                "flex-1 text-right px-2 py-1.5 rounded border text-xs",
                                acc ? "bg-emerald-50 border-emerald-200" : "bg-background",
                                focusedRow === index && "ring-2 ring-primary"
                              )}
                            >
                              {acc ? `${acc.code} - ${acc.name_ar}` : "اختر الحساب..."}
                            </button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 shrink-0 relative"
                              title="كل ضغطة تنسخ الحساب إلى الصف التالي (ليس كل الصفوف)"
                              disabled={!acc}
                              onClick={() => copyAccountDown(index)}
                            >
                              <ArrowDownToLine className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              title="اختيار من شاشة المربعات"
                              onClick={() => setGridRowIndex(index)}
                            >
                              <LayoutGrid className="h-4 w-4" />
                            </Button>
                          </div>
                          {activeRowIndex === index && (
                            <div className="absolute z-50 mt-1 w-80 max-h-72 overflow-hidden bg-popover border rounded-md shadow-lg flex flex-col">
                              <div className="p-2 border-b flex items-center gap-2 shrink-0">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                  autoFocus
                                  value={accountSearch}
                                  onChange={(e) => setAccountSearch(e.target.value)}
                                  placeholder="بحث بالاسم أو الرقم..."
                                  className="h-8 text-xs"
                                />
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveRowIndex(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="overflow-y-auto min-h-0">
                                {filteredAccounts.map((a) => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => {
                                      setRows((prev) =>
                                        prev.map((r, i) => (i === index ? { ...r, selectedAccountId: a.id } : r))
                                      );
                                      setActiveRowIndex(null);
                                    }}
                                    className="w-full text-right px-3 py-2 text-xs hover:bg-accent border-b last:border-0"
                                  >
                                    <span className="font-mono text-muted-foreground">{a.code}</span> — {a.name_ar}
                                  </button>
                                ))}
                                {filteredAccounts.length === 0 && (
                                  <div className="p-3 text-xs text-muted-foreground">لا توجد نتائج</div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{getAccount(creditAccountId)?.name_ar || "بنك الرياض"}</td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* شاشة المربعات لاختيار الحساب */}
      <Dialog open={gridRowIndex !== null} onOpenChange={(o) => !o && setGridRowIndex(null)}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col" dir="rtl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-right">اختيار الحساب من المربعات</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pl-1">
            {TILE_GROUPS.map((g) => (
              <div key={g.key}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm">
                    {g.label}{" "}
                    <span className="text-xs text-muted-foreground">({tileGroups[g.key].length})</span>
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setAddToGroup(g.key);
                      setAddSearch("");
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 ml-1" /> إضافة حساب
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {tileGroups[g.key].map((id, idx) => {
                    const a = getAccount(id);
                    if (!a) return null;
                    return (
                      <div
                        key={id}
                        draggable
                        onDragStart={() => setDragInfo({ group: g.key, index: idx })}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragInfo && dragInfo.group === g.key) moveTile(g.key, dragInfo.index, idx);
                          setDragInfo(null);
                        }}
                        className={cn(
                          "relative group rounded-lg border p-2 text-right cursor-pointer transition-colors",
                          g.color
                        )}
                        onClick={() => {
                          if (gridRowIndex === null) return;
                          setRows((prev) =>
                            prev.map((r, i) => (i === gridRowIndex ? { ...r, selectedAccountId: id } : r))
                          );
                          setGridRowIndex(null);
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 cursor-grab" />
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTile(g.key, id);
                            }}
                          >
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">{a.code}</div>
                        <div className="text-xs font-semibold leading-tight line-clamp-2">{a.name_ar}</div>
                      </div>
                    );
                  })}
                  {tileGroups[g.key].length === 0 && (
                    <div className="col-span-full text-xs text-muted-foreground py-3">
                      لا توجد حسابات — أضف حساباً من زر "إضافة حساب"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* إضافة حساب إلى مجموعة */}
      <Dialog open={addToGroup !== null} onOpenChange={(o) => !o && setAddToGroup(null)}>
        <DialogContent className="max-w-lg h-[70vh] flex flex-col" dir="rtl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-right">
              إضافة حساب إلى {TILE_GROUPS.find((g) => g.key === addToGroup)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 shrink-0">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="بحث بالاسم أو الرقم..."
              className="h-9 text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 mt-2 border rounded-md">
            {accounts
              .filter((a) => {
                const q = normalizeAr(addSearch);
                if (!q) return true;
                return normalizeAr(a.name_ar).includes(q) || a.code.includes(addSearch);
              })
              .slice(0, 300)
              .map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    if (addToGroup) addTile(addToGroup, a.id);
                    setAddToGroup(null);
                  }}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-accent border-b last:border-0"
                >
                  <span className="font-mono text-muted-foreground">{a.code}</span> — {a.name_ar}
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* تحديد الحسابات الأكثر اختياراً */}
      <Dialog open={favPickerOpen} onOpenChange={setFavPickerOpen}>
        <DialogContent className="max-w-lg h-[70vh] flex flex-col" dir="rtl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-right">تحديد الحسابات الأكثر اختياراً ({favIds.length}/16)</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 shrink-0">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input autoFocus value={favSearch} onChange={(e) => setFavSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم..." className="h-9 text-sm" />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 mt-2 border rounded-md">
            {accounts
              .filter((a) => {
                const q = normalizeAr(favSearch);
                if (!q) return true;
                return normalizeAr(a.name_ar).includes(q) || a.code.includes(favSearch);
              })
              .slice(0, 300)
              .map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleFav(a.id)}
                  className={cn(
                    "w-full text-right px-3 py-2 text-xs hover:bg-accent border-b last:border-0 flex items-center justify-between",
                    favIds.includes(a.id) && "bg-amber-50"
                  )}
                >
                  <span>
                    <span className="font-mono text-muted-foreground">{a.code}</span> — {a.name_ar}
                  </span>
                  {favIds.includes(a.id) && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />}
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* تحديد الحساب الدائن الافتراضي */}
      <Dialog open={creditPickerOpen} onOpenChange={setCreditPickerOpen}>
        <DialogContent className="max-w-lg h-[70vh] flex flex-col" dir="rtl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-right">اختيار الحساب الدائن الافتراضي</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 shrink-0">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input autoFocus value={creditSearch} onChange={(e) => setCreditSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم..." className="h-9 text-sm" />
            <Button variant="outline" size="sm" className="h-9 text-xs shrink-0" onClick={() => chooseCreditAccount(RIYADH_BANK_ACCOUNT_ID)}>
              بنك الرياض
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 mt-2 border rounded-md">
            {accounts
              .filter((a) => {
                const q = normalizeAr(creditSearch);
                if (!q) return true;
                return normalizeAr(a.name_ar).includes(q) || a.code.includes(creditSearch);
              })
              .slice(0, 300)
              .map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => chooseCreditAccount(a.id)}
                  className={cn(
                    "w-full text-right px-3 py-2 text-xs hover:bg-accent border-b last:border-0",
                    creditAccountId === a.id && "bg-emerald-50 font-semibold"
                  )}
                >
                  <span className="font-mono text-muted-foreground">{a.code}</span> — {a.name_ar}
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
