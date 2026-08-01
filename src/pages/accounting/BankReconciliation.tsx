import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowRight, ChevronRight, ChevronLeft, Download, Landmark, CalendarDays, RefreshCw, CheckCircle2, AlertTriangle, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, getDaysInMonth } from "date-fns";
import * as XLSX from "xlsx";
import DayJournalEntriesDialog from "@/components/DayJournalEntriesDialog";

interface AccountRow {
  id: string;
  code: string;
  name_ar: string;
}

interface BankRow {
  date: string; // yyyy-MM-dd
  details: string;
  reference: string;
  cheque: string;
  opType: string;
  deposit: number; // إيداع => مدين للبنك
  withdraw: number; // خصم => دائن للبنك
  balance: number;
}

interface CompareRow {
  date: string;
  bankDebit: number;
  bankCredit: number;
  bookDebit: number;
  bookCredit: number;
  count: number;
}

const AR_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

const normalizeDigits = (s: string) =>
  String(s || "").replace(/[٠-٩۰-۹]/g, (d) => AR_DIGITS[d] || d);

const parseNum = (v: string) => {
  const cleaned = normalizeDigits(v)
    .replace(/[^\d.,\-()]/g, "")
    .replace(/,/g, "")
    .trim();
  if (!cleaned) return 0;
  const neg = /^\(.*\)$/.test(cleaned);
  const n = parseFloat(cleaned.replace(/[()]/g, ""));
  if (isNaN(n)) return 0;
  return neg ? -n : n;
};

// يدعم 7/1/2026 و 2026-01-07 و 07/01/26
const parseDate = (v: string): string => {
  const raw = normalizeDigits(v).trim();
  if (!raw) return "";
  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let [, a, b, y] = m;
    let year = y.length === 2 ? `20${y}` : y;
    // الصيغة المرفقة: شهر/يوم/سنة
    let month = a;
    let day = b;
    if (parseInt(a, 10) > 12) {
      month = b;
      day = a;
    }
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return "";
};

const fmt = (n: number) =>
  n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const BankReconciliation = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<AccountRow[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [bankRows, setBankRows] = useState<BankRow[]>([]);
  const [bookTotals, setBookTotals] = useState<Record<string, { debit: number; credit: number; count: number }>>({});
  const [loading, setLoading] = useState(false);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [dayDialogDate, setDayDialogDate] = useState("");

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const { data, error } = await supabase
      .from("chart_of_accounts")
      .select("id, code, name_ar")
      .order("code");
    if (error) {
      console.error(error);
      return;
    }
    const list = (data || []) as AccountRow[];
    setAccounts(list);
    setBankAccounts(list.filter((a) => a.code?.startsWith("111") && a.code.length >= 6));
  };

  const monthDays = useMemo(() => {
    const total = getDaysInMonth(new Date(year, month, 1));
    return Array.from({ length: total }, (_, i) =>
      `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    );
  }, [year, month]);

  const toggleDay = (d: string) =>
    setSelectedDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const parsePaste = () => {
    const lines = pasteText.split("\n").map((l) => l.replace(/\r/g, "")).filter((l) => l.trim());
    const rows: BankRow[] = [];
    for (const line of lines) {
      const cols = line.split("\t");
      if (cols.length < 3) continue;
      const dateStr = parseDate(cols[cols.length - 1] || "");
      if (!dateStr) continue; // يتخطى سطر العناوين
      rows.push({
        date: dateStr,
        balance: parseNum(cols[0] || ""),
        withdraw: parseNum(cols[1] || ""),
        deposit: parseNum(cols[2] || ""),
        opType: (cols[3] || "").trim(),
        cheque: (cols[4] || "").trim(),
        reference: (cols[5] || "").trim(),
        details: (cols[6] || "").trim(),
      });
    }
    if (!rows.length) {
      toast({ title: "لا توجد بيانات صالحة", description: "الصق الصفوف من الإكسل بالترتيب المطلوب", variant: "destructive" });
      return;
    }
    setBankRows(rows);
    const dates = Array.from(new Set(rows.map((r) => r.date))).sort();
    setSelectedDays((prev) => Array.from(new Set([...prev, ...dates])).sort());
    const first = dates[0];
    if (first) {
      const [y, m] = first.split("-");
      setYear(parseInt(y, 10));
      setMonth(parseInt(m, 10) - 1);
    }
    toast({ title: "تم التحليل", description: `عدد الصفوف: ${rows.length} — عدد التواريخ: ${dates.length}` });
  };

  const compareDates = useMemo(() => {
    const fromBank = bankRows.map((r) => r.date);
    return Array.from(new Set([...selectedDays, ...fromBank])).sort();
  }, [selectedDays, bankRows]);

  const loadBookTotals = async (silent = false) => {
    if (!selectedAccount) {
      if (!silent) toast({ title: "اختر حساب البنك أولاً", variant: "destructive" });
      return;
    }
    if (!compareDates.length) {
      if (!silent) toast({ title: "اختر التواريخ أو الصق البيانات أولاً", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const start = compareDates[0];
      const end = compareDates[compareDates.length - 1];
      const totals: Record<string, { debit: number; credit: number; count: number }> = {};
      let from = 0;
      const batch = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("journal_entry_lines")
          .select("debit, credit, journal_entries!inner(date)")
          .eq("account_id", selectedAccount)
          .gte("journal_entries.date", start)
          .lte("journal_entries.date", end)
          .range(from, from + batch - 1);
        if (error) throw error;
        (data || []).forEach((l: any) => {
          const d = l.journal_entries?.date;
          if (!d) return;
          if (!totals[d]) totals[d] = { debit: 0, credit: 0, count: 0 };
          totals[d].debit += Number(l.debit || 0);
          totals[d].credit += Number(l.credit || 0);
          totals[d].count += 1;
        });
        if (!data || data.length < batch) break;
        from += batch;
      }
      setBookTotals(totals);
      toast({ title: "تم تحميل قيود اليومية", description: `الفترة: ${start} → ${end}` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "خطأ في تحميل القيود", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const compareRows: CompareRow[] = useMemo(() => {
    return compareDates.map((date) => {
      const rows = bankRows.filter((r) => r.date === date);
      const bankDebit = rows.reduce((s, r) => s + r.deposit, 0);
      const bankCredit = rows.reduce((s, r) => s + r.withdraw, 0);
      const book = bookTotals[date] || { debit: 0, credit: 0, count: 0 };
      return {
        date,
        bankDebit,
        bankCredit,
        bookDebit: book.debit,
        bookCredit: book.credit,
        count: rows.length,
      };
    });
  }, [compareDates, bankRows, bookTotals]);

  const totals = useMemo(() => {
    const t = { bankDebit: 0, bankCredit: 0, bookDebit: 0, bookCredit: 0, matched: 0, diff: 0 };
    compareRows.forEach((r) => {
      t.bankDebit += r.bankDebit;
      t.bankCredit += r.bankCredit;
      t.bookDebit += r.bookDebit;
      t.bookCredit += r.bookCredit;
      const ok = Math.abs(r.bankDebit - r.bookDebit) < 0.01 && Math.abs(r.bankCredit - r.bookCredit) < 0.01;
      if (ok) t.matched += 1;
      else t.diff += 1;
    });
    return t;
  }, [compareRows]);

  const exportExcel = () => {
    if (!compareRows.length) return;
    const acc = accounts.find((a) => a.id === selectedAccount);
    const rows = compareRows.map((r) => ({
      "التاريخ": r.date,
      "عدد حركات البنك": r.count,
      "مدين البنك (إيداع)": Number(r.bankDebit.toFixed(2)),
      "دائن البنك (خصم)": Number(r.bankCredit.toFixed(2)),
      "مدين القيود": Number(r.bookDebit.toFixed(2)),
      "دائن القيود": Number(r.bookCredit.toFixed(2)),
      "فرق المدين": Number((r.bankDebit - r.bookDebit).toFixed(2)),
      "فرق الدائن": Number((r.bankCredit - r.bookCredit).toFixed(2)),
      "الحالة":
        Math.abs(r.bankDebit - r.bookDebit) < 0.01 && Math.abs(r.bankCredit - r.bookCredit) < 0.01
          ? "مطابق"
          : "يوجد اختلاف",
    }));
    rows.push({
      "التاريخ": "الإجمالي",
      "عدد حركات البنك": bankRows.length,
      "مدين البنك (إيداع)": Number(totals.bankDebit.toFixed(2)),
      "دائن البنك (خصم)": Number(totals.bankCredit.toFixed(2)),
      "مدين القيود": Number(totals.bookDebit.toFixed(2)),
      "دائن القيود": Number(totals.bookCredit.toFixed(2)),
      "فرق المدين": Number((totals.bankDebit - totals.bookDebit).toFixed(2)),
      "فرق الدائن": Number((totals.bankCredit - totals.bookCredit).toFixed(2)),
      "الحالة": totals.diff === 0 ? "مطابق" : `${totals.diff} يوم به اختلاف`,
    } as any);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "المطابقة");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        bankRows.map((r) => ({
          "التاريخ": r.date,
          "الرصيد": r.balance,
          "مبلغ الخصم": r.withdraw,
          "مبلغ الإيداع": r.deposit,
          "نوع العملية": r.opType,
          "رقم المرجع": r.reference,
          "التفاصيل": r.details,
        }))
      ),
      "كشف البنك"
    );
    XLSX.writeFile(wb, `مطابقة_البنوك_${acc?.code || ""}.xlsx`);
  };

  const printReport = () => window.print();

  const selectedAccountObj = accounts.find((a) => a.id === selectedAccount);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" dir="rtl">
      <div className="max-w-[1500px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/accounting">
                <ArrowRight className="h-4 w-4 ml-1" />
                رجوع
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">مطابقة البنوك</h1>
              <p className="text-sm text-muted-foreground">مقارنة كشف حساب البنك مع قيود اليومية لكل تاريخ</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={!compareRows.length}>
              <Download className="h-4 w-4 ml-1" /> تصدير Excel
            </Button>
            <Button variant="outline" size="sm" onClick={printReport} disabled={!compareRows.length}>
              طباعة
            </Button>
          </div>
        </div>

        {/* Banks */}
        <Card className="print:hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Landmark className="h-4 w-4 text-primary" /> حسابات البنوك
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {bankAccounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAccount(a.id)}
                    className={`shrink-0 px-3 py-2 rounded-lg border text-sm transition ${
                      selectedAccount === a.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-accent"
                    }`}
                  >
                    <span className="font-mono text-xs opacity-80">{a.code}</span>
                    <span className="mx-1">-</span>
                    <span className="font-semibold">{a.name_ar}</span>
                  </button>
                ))}
                {!bankAccounts.length && <span className="text-sm text-muted-foreground">لا توجد حسابات بنوك (111...)</span>}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Month + days */}
        <Card className="print:hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" /> أيام الشهر
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setYear((y) => y - 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="font-bold text-sm w-14 text-center">{year}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setYear((y) => y + 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDays([])}>
                  <Trash2 className="h-4 w-4 ml-1" /> مسح التحديد
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDays(monthDays)}>
                  تحديد كل الشهر
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setMonth(i)}
                  className={`px-2.5 py-1 rounded-md border text-xs ${
                    month === i ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {monthDays.map((d) => {
                const day = parseInt(d.split("-")[2], 10);
                const active = selectedDays.includes(d);
                const hasBank = bankRows.some((r) => r.date === d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`w-9 h-9 rounded-md border text-xs font-bold transition ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : hasBank
                        ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400"
                        : "bg-card hover:bg-accent"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Paste */}
        <Card className="print:hidden">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold">لصق كشف البنك من Excel</div>
            <p className="text-xs text-muted-foreground">
              الترتيب: الرصيد | مبلغ الخصم | مبلغ الإيداع | نوع العملية | رقم الشيك | رقم المرجع | التفاصيل | التاريخ
            </p>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="الصق الصفوف هنا..."
              className="min-h-[140px] font-mono text-xs"
              dir="ltr"
            />
            <div className="flex gap-2">
              <Button onClick={parsePaste}>تحليل البيانات</Button>
              <Button variant="secondary" onClick={loadBookTotals} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ml-1 ${loading ? "animate-spin" : ""}`} /> مقارنة مع قيود اليومية
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPasteText("");
                  setBankRows([]);
                  setBookTotals({});
                }}
              >
                تفريغ
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {compareRows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">مدين البنك (إيداع)</div>
              <div className="text-lg font-bold text-red-600">{fmt(totals.bankDebit)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">دائن البنك (خصم)</div>
              <div className="text-lg font-bold text-emerald-600">{fmt(totals.bankCredit)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">مدين القيود</div>
              <div className="text-lg font-bold text-red-600">{fmt(totals.bookDebit)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">دائن القيود</div>
              <div className="text-lg font-bold text-emerald-600">{fmt(totals.bookCredit)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">أيام مطابقة / مختلفة</div>
              <div className="text-lg font-bold">
                <span className="text-emerald-600">{totals.matched}</span>
                <span className="mx-1">/</span>
                <span className="text-amber-600">{totals.diff}</span>
              </div>
            </CardContent></Card>
          </div>
        )}

        {/* Comparison table */}
        {compareRows.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="p-3 border-b text-sm font-semibold">
                نتيجة المطابقة {selectedAccountObj ? `— ${selectedAccountObj.code} ${selectedAccountObj.name_ar}` : ""}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">حركات البنك</TableHead>
                    <TableHead className="text-right">مدين البنك</TableHead>
                    <TableHead className="text-right">دائن البنك</TableHead>
                    <TableHead className="text-right">مدين القيود</TableHead>
                    <TableHead className="text-right">دائن القيود</TableHead>
                    <TableHead className="text-right">فرق المدين</TableHead>
                    <TableHead className="text-right">فرق الدائن</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right print:hidden">القيود</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compareRows.map((r) => {
                    const dd = r.bankDebit - r.bookDebit;
                    const dc = r.bankCredit - r.bookCredit;
                    const ok = Math.abs(dd) < 0.01 && Math.abs(dc) < 0.01;
                    return (
                      <TableRow key={r.date} className={ok ? "" : "bg-amber-50 dark:bg-amber-950/20"}>
                        <TableCell className="font-semibold">{r.date}</TableCell>
                        <TableCell>{r.count}</TableCell>
                        <TableCell>{fmt(r.bankDebit)}</TableCell>
                        <TableCell>{fmt(r.bankCredit)}</TableCell>
                        <TableCell>{fmt(r.bookDebit)}</TableCell>
                        <TableCell>{fmt(r.bookCredit)}</TableCell>
                        <TableCell className={Math.abs(dd) < 0.01 ? "" : "text-amber-700 font-bold"}>{fmt(dd)}</TableCell>
                        <TableCell className={Math.abs(dc) < 0.01 ? "" : "text-amber-700 font-bold"}>{fmt(dc)}</TableCell>
                        <TableCell>
                          {ok ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                              <CheckCircle2 className="h-4 w-4" /> مطابق
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-bold">
                              <AlertTriangle className="h-4 w-4" /> اختلاف
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="print:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!selectedAccount}
                            onClick={() => {
                              setDayDialogDate(r.date);
                              setDayDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Bank rows detail */}
        {bankRows.length > 0 && (
          <Card className="print:hidden">
            <CardContent className="p-0">
              <div className="p-3 border-b text-sm font-semibold">تفاصيل كشف البنك ({bankRows.length} حركة)</div>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">مبلغ الخصم</TableHead>
                      <TableHead className="text-right">مبلغ الإيداع</TableHead>
                      <TableHead className="text-right">نوع العملية</TableHead>
                      <TableHead className="text-right">رقم المرجع</TableHead>
                      <TableHead className="text-right">الرصيد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell className="text-emerald-700">{r.withdraw ? fmt(r.withdraw) : "-"}</TableCell>
                        <TableCell className="text-red-700">{r.deposit ? fmt(r.deposit) : "-"}</TableCell>
                        <TableCell className="text-xs">{r.opType}</TableCell>
                        <TableCell className="text-xs font-mono">{r.reference}</TableCell>
                        <TableCell>{fmt(r.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedAccount && (
        <DayJournalEntriesDialog
          open={dayDialogOpen}
          onOpenChange={setDayDialogOpen}
          date={dayDialogDate}
          accountId={selectedAccount}
          accounts={accounts}
          onChanged={loadBookTotals}
        />
      )}
    </div>
  );
};

export default BankReconciliation;
