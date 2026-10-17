import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronDown,
  CloudDownload,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import LoadingCup from "@/components/LoadingCup";
import { cn } from "@/lib/utils";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

interface SheetItem {
  employee_id: string;
  employee_name: string;
  iqama_number: string;
  job_title: string | null;
  department: string | null;
  basic_salary: number;
  housing_allowance: number;
  food_allowance: number;
  total_salary: number;
  bonuses: number;
  advances: number;
  deductions: number;
  penalties: number;
  violations: number;
  absent_days: number;
  absent_deduction: number;
  net_salary: number;
}

interface Sheet {
  id: string;
  sheet_name: string | null;
  sheet_number: string | null;
  month: number;
  year: number;
  department: string | null;
  is_approved: boolean;
  approved_at: string | null;
  is_disbursed: boolean;
  disbursed_at: string | null;
  total_net: number;
  items: SheetItem[];
  state?: "approved" | "disbursed";
}

const money = (v: number) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });

const sheetTotals = (s: Sheet) =>
  (s.items ?? []).reduce(
    (t, i) => ({
      basic: t.basic + Number(i.basic_salary || 0),
      housing: t.housing + Number(i.housing_allowance || 0),
      food: t.food + Number(i.food_allowance || 0),
      total: t.total + Number(i.total_salary || 0),
      bonuses: t.bonuses + Number(i.bonuses || 0),
      advances: t.advances + Number(i.advances || 0),
      deductions: t.deductions + Number(i.deductions || 0),
      penalties: t.penalties + Number(i.penalties || 0),
      violations: t.violations + Number(i.violations || 0),
      absentDays: t.absentDays + Number(i.absent_days || 0),
      absentDed: t.absentDed + Number(i.absent_deduction || 0),
      net: t.net + Number(i.net_salary || 0),
    }),
    { basic: 0, housing: 0, food: 0, total: 0, bonuses: 0, advances: 0, deductions: 0, penalties: 0, violations: 0, absentDays: 0, absentDed: 0, net: 0 }
  );

const sheetTitle = (s: Sheet) => s.sheet_name || `كشف ${s.sheet_number ?? s.id.slice(0, 8)}`;

const useExternalSheets = () =>
  useQuery({
    queryKey: ["external-payroll-sheets"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("payroll-sync", { body: { view_sheets: true } });
      if (error || data?.error) throw new Error(data?.message ?? error?.message ?? "تعذر الجلب");
      const approved = (data.approved ?? []) as Sheet[];
      const disbursed = (data.disbursed ?? []) as Sheet[];
      const map = new Map<string, Sheet>();
      for (const s of approved) map.set(s.id, { ...s, state: "approved" });
      for (const s of disbursed) map.set(s.id, { ...s, state: "disbursed" });
      return [...map.values()].sort((a, b) => b.year - a.year || b.month - a.month || (a.department ?? "").localeCompare(b.department ?? ""));
    },
  });

/* ============ تصدير إكسل ============ */
const HEADERS = ["#", "الموظف", "رقم الإقامة", "المسمى الوظيفي", "الأساسي", "بدل سكن", "بدل طعام", "الإجمالي", "مكافآت", "سلف", "خصومات", "جزاءات", "مخالفات", "أيام غياب", "خصم غياب", "الصافي"];

const sheetToRows = (s: Sheet) => {
  const t = sheetTotals(s);
  const rows: (string | number)[][] = (s.items ?? []).map((i, idx) => [
    idx + 1,
    i.employee_name,
    i.iqama_number,
    i.job_title || "—",
    Number(i.basic_salary || 0),
    Number(i.housing_allowance || 0),
    Number(i.food_allowance || 0),
    Number(i.total_salary || 0),
    Number(i.bonuses || 0),
    Number(i.advances || 0),
    Number(i.deductions || 0),
    Number(i.penalties || 0),
    Number(i.violations || 0),
    Number(i.absent_days || 0),
    Number(i.absent_deduction || 0),
    Number(i.net_salary || 0),
  ]);
  rows.push(["", "الإجماليات", "", "", t.basic, t.housing, t.food, t.total, t.bonuses, t.advances, t.deductions, t.penalties, t.violations, t.absentDays, t.absentDed, t.net]);
  return rows;
};

const buildSheetWorksheet = (s: Sheet) => {
  const t = sheetTotals(s);
  const aoa: (string | number)[][] = [
    [sheetTitle(s)],
    [`كشف رواتب شهر ${MONTHS_AR[s.month - 1] ?? s.month} ${s.year}${s.department ? ` — ${s.department}` : ""} — الحالة: ${s.state === "disbursed" ? "مصروف" : "معتمد"}`],
    [`عدد الموظفين: ${s.items?.length ?? 0} — إجمالي الصافي: ${money(t.net)} ر.س`],
    [],
    HEADERS,
    ...sheetToRows(s),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 15 } },
  ];
  ws["!cols"] = [{ wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, ...Array(12).fill({ wch: 12 })];
  return ws;
};

const downloadExcel = (sheets: Sheet[], filename: string) => {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  sheets.slice(0, 20).forEach((s, idx) => {
    const name = `${MONTHS_AR[s.month - 1] ?? s.month} ${s.year}${sheets.length > 1 ? ` ${idx + 1}` : ""}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, buildSheetWorksheet(s), name);
  });
  XLSX.writeFile(wb, filename);
};

/* ============ مستند الطباعة (A4 عرضي) ============ */
const PrintDocument = ({ sheet }: { sheet: Sheet }) => {
  const t = sheetTotals(sheet);
  const chips = [
    { label: "عدد الموظفين", value: String(sheet.items?.length ?? 0) },
    { label: "إجمالي الرواتب", value: money(t.total) },
    { label: "إجمالي الاستقطاعات", value: money(t.advances + t.deductions + t.penalties + t.violations + t.absentDed) },
    { label: "صافي الرواتب", value: money(t.net) },
  ];
  return (
    <div className="extpayroll-print-document" dir="rtl">
      <header className="extp-head">
        <div className="extp-head-right">
          <div className="extp-doc-kind">كشف الرواتب الشهري</div>
          <div className="extp-sheet-name">{sheetTitle(sheet)}</div>
          <div className="extp-sheet-meta">
            {MONTHS_AR[sheet.month - 1] ?? sheet.month} {sheet.year}
            {sheet.department ? ` — ${sheet.department}` : ""}
          </div>
        </div>
        <div className="extp-head-left">
          <span className={cn("extp-state", sheet.state === "disbursed" ? "extp-state-disbursed" : "extp-state-approved")}>
            {sheet.state === "disbursed" ? "مصروف" : "معتمد"}
          </span>
          <div className="extp-date">تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG-u-nu-latn")}</div>
        </div>
      </header>

      <div className="extp-chips">
        {chips.map((c, i) => (
          <div key={c.label} className={cn("extp-chip", i === 3 && "extp-chip-net")}>
            <div className="extp-chip-label">{c.label}</div>
            <div className="extp-chip-value">{c.value}{i > 0 ? " ر.س" : ""}</div>
          </div>
        ))}
      </div>

      <table className="extp-table">
        <colgroup>
          <col style={{ width: "3.5%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "9.5%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "6.5%" }} />
          <col style={{ width: "6.5%" }} />
          <col style={{ width: "7.5%" }} />
          <col style={{ width: "6.5%" }} />
          <col style={{ width: "6.5%" }} />
          <col style={{ width: "6.5%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "4.5%" }} />
          <col style={{ width: "6.5%" }} />
          <col style={{ width: "8%" }} />
        </colgroup>
        <thead>
          <tr>
            {HEADERS.map((h) => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {(sheet.items ?? []).map((i, idx) => (
            <tr key={i.employee_id}>
              <td className="extp-c">{idx + 1}</td>
              <td className="extp-name">{i.employee_name}</td>
              <td className="extp-c extp-num">{i.iqama_number}</td>
              <td>{i.job_title || "—"}</td>
              <td className="extp-c extp-num">{money(i.basic_salary)}</td>
              <td className="extp-c extp-num">{money(i.housing_allowance)}</td>
              <td className="extp-c extp-num">{money(i.food_allowance)}</td>
              <td className="extp-c extp-num extp-strong">{money(i.total_salary)}</td>
              <td className="extp-c extp-num extp-pos">{money(i.bonuses)}</td>
              <td className="extp-c extp-num extp-warn">{money(i.advances)}</td>
              <td className="extp-c extp-num extp-neg">{money(i.deductions)}</td>
              <td className="extp-c extp-num extp-neg">{money(i.penalties)}</td>
              <td className="extp-c extp-num extp-neg">{money(i.violations)}</td>
              <td className="extp-c">{i.absent_days || 0}</td>
              <td className="extp-c extp-num extp-neg">{money(i.absent_deduction)}</td>
              <td className="extp-c extp-num extp-net">{money(i.net_salary)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>الإجماليات</td>
            <td className="extp-c extp-num">{money(t.basic)}</td>
            <td className="extp-c extp-num">{money(t.housing)}</td>
            <td className="extp-c extp-num">{money(t.food)}</td>
            <td className="extp-c extp-num">{money(t.total)}</td>
            <td className="extp-c extp-num">{money(t.bonuses)}</td>
            <td className="extp-c extp-num">{money(t.advances)}</td>
            <td className="extp-c extp-num">{money(t.deductions)}</td>
            <td className="extp-c extp-num">{money(t.penalties)}</td>
            <td className="extp-c extp-num">{money(t.violations)}</td>
            <td className="extp-c">{t.absentDays}</td>
            <td className="extp-c extp-num">{money(t.absentDed)}</td>
            <td className="extp-c extp-num">{money(t.net)}</td>
          </tr>
        </tfoot>
      </table>

      <footer className="extp-signatures">
        {["المدير المالي", "مدير الموارد البشرية", "المدير العام"].map((role) => (
          <div key={role} className="extp-sign">
            <div className="extp-sign-role">{role}</div>
            <div className="extp-sign-line">التوقيع</div>
          </div>
        ))}
      </footer>
    </div>
  );
};

/* ============ الشاشة ============ */
const ExternalPayrollSheets = () => {
  const { toast } = useToast();
  const { data: sheets = [], isLoading, error, refetch, isFetching } = useExternalSheets();
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [printSheet, setPrintSheet] = useState<Sheet | null>(null);

  const years = useMemo(() => [...new Set(sheets.map((s) => s.year))].sort((a, b) => b - a), [sheets]);

  const filtered = useMemo(
    () =>
      sheets.filter(
        (s) =>
          (monthFilter === "all" || s.month === Number(monthFilter)) &&
          (yearFilter === "all" || s.year === Number(yearFilter))
      ),
    [sheets, monthFilter, yearFilter]
  );

  const totals = useMemo(
    () => ({
      count: filtered.length,
      employees: filtered.reduce((n, s) => n + (s.items?.length ?? 0), 0),
      net: filtered.reduce((n, s) => n + Number(s.total_net || 0), 0),
    }),
    [filtered]
  );

  useEffect(() => {
    if (!printSheet) return;
    const timer = window.setTimeout(() => {
      window.print();
      setPrintSheet(null);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [printSheet]);

  if (error) toast({ title: "تعذر جلب الكشوف", description: (error as Error).message, variant: "destructive" });

  const exportAllExcel = () => {
    if (!filtered.length) return;
    downloadExcel(filtered, `كشوف-الرواتب-${monthFilter === "all" ? "كل-الشهور" : MONTHS_AR[Number(monthFilter) - 1]}.xlsx`);
    toast({ title: "تم تصدير إكسل", description: `${Math.min(filtered.length, 20)} كشف في الملف` });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto flex flex-wrap items-center gap-4 px-4 py-5">
          <Link to="/hr" aria-label="رجوع"><ArrowRight className="h-6 w-6" /></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">كشوف الرواتب — البرنامج الخارجي</h1>
            <p className="text-sm text-muted-foreground">عرض مباشر لكشوف الرواتب المعتمدة والمصروفة من برنامج الرواتب</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportAllExcel} disabled={!filtered.length}>
            <FileSpreadsheet className="h-4 w-4" /> تصدير إكسل
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />} استيراد كل الكشوفات
          </Button>
        </div>
      </header>

      <main className="container mx-auto space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-10 w-[150px]"><SelectValue placeholder="الشهر" /></SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">كل الشهور</SelectItem>
              {MONTHS_AR.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="h-10 w-[130px]"><SelectValue placeholder="السنة" /></SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">كل السنوات</SelectItem>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="h-9 rounded-xl px-3 text-sm">{totals.count} كشف</Badge>
          <Badge variant="secondary" className="h-9 gap-1 rounded-xl px-3 text-sm"><Users className="h-3.5 w-3.5" /> {totals.employees} موظف</Badge>
          <span className="text-sm font-semibold">إجمالي الصافي: {money(totals.net)} ر.س</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button size="sm" variant={monthFilter === "all" ? "default" : "outline"} className="shrink-0 rounded-full" onClick={() => setMonthFilter("all")}>
            الكل ({sheets.filter((s) => yearFilter === "all" || s.year === Number(yearFilter)).length})
          </Button>
          {MONTHS_AR.map((m, i) => {
            const n = sheets.filter((s) => s.month === i + 1 && (yearFilter === "all" || s.year === Number(yearFilter))).length;
            if (!n) return null;
            return (
              <Button key={i} size="sm" variant={monthFilter === String(i + 1) ? "default" : "outline"} className="shrink-0 rounded-full" onClick={() => setMonthFilter(String(i + 1))}>
                {m} ({n})
              </Button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24"><LoadingCup /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-card py-24 text-center shadow-sm">
            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-bold">لا توجد كشوف مطابقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const open = openId === s.id;
              const t = sheetTotals(s);
              return (
                <Card key={s.id} className="overflow-hidden">
                  <button
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/50"
                    onClick={() => setOpenId(open ? null : s.id)}
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                    <span className="font-bold">{sheetTitle(s)}</span>
                    <Badge variant="outline">{MONTHS_AR[s.month - 1] ?? s.month} {s.year}</Badge>
                    {s.department && <Badge variant="secondary">{s.department}</Badge>}
                    <Badge variant={s.state === "disbursed" ? "default" : "secondary"}>
                      {s.state === "disbursed" ? "مصروف" : "معتمد"}
                    </Badge>
                    <span className="mr-auto flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{s.items?.length ?? 0} موظف</span>
                      <span className="font-bold text-foreground">{money(s.total_net)} ر.س</span>
                    </span>
                  </button>
                  {open && (
                    <CardContent className="border-t p-0">
                      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { downloadExcel([s], `${sheetTitle(s)}.xlsx`); }}>
                          <FileSpreadsheet className="h-4 w-4" /> تحميل إكسل
                        </Button>
                        <Button size="sm" className="gap-1.5" onClick={() => setPrintSheet(s)}>
                          <Printer className="h-4 w-4" /> طباعة / PDF
                        </Button>
                        <span className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" /> تصميم الطباعة بمقاس A4 عرضي
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2 text-right">الموظف</th>
                              <th className="p-2 text-right">المسمى</th>
                              <th className="p-2">الأساسي</th>
                              <th className="p-2">بدل سكن</th>
                              <th className="p-2">بدل طعام</th>
                              <th className="p-2">الإجمالي</th>
                              <th className="p-2">مكافآت</th>
                              <th className="p-2">سلف</th>
                              <th className="p-2">خصومات</th>
                              <th className="p-2">جزاءات</th>
                              <th className="p-2">مخالفات</th>
                              <th className="p-2">غياب</th>
                              <th className="p-2">خصم غياب</th>
                              <th className="p-2">الصافي</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(s.items ?? []).map((i) => (
                              <tr key={i.employee_id} className="border-t transition-colors hover:bg-muted/30">
                                <td className="p-2">
                                  {i.employee_name}
                                  <div className="font-mono text-xs text-muted-foreground">{i.iqama_number}</div>
                                </td>
                                <td className="p-2">{i.job_title || "—"}</td>
                                <td className="p-2 text-center tabular-nums">{money(i.basic_salary)}</td>
                                <td className="p-2 text-center tabular-nums">{money(i.housing_allowance)}</td>
                                <td className="p-2 text-center tabular-nums">{money(i.food_allowance)}</td>
                                <td className="p-2 text-center font-semibold tabular-nums">{money(i.total_salary)}</td>
                                <td className="p-2 text-center text-emerald-600 tabular-nums">{money(i.bonuses)}</td>
                                <td className="p-2 text-center text-amber-600 tabular-nums">{money(i.advances)}</td>
                                <td className="p-2 text-center text-destructive tabular-nums">{money(i.deductions)}</td>
                                <td className="p-2 text-center text-destructive tabular-nums">{money(i.penalties)}</td>
                                <td className="p-2 text-center text-destructive tabular-nums">{money(i.violations)}</td>
                                <td className="p-2 text-center">{i.absent_days || 0}</td>
                                <td className="p-2 text-center text-destructive tabular-nums">{money(i.absent_deduction)}</td>
                                <td className="p-2 text-center font-bold tabular-nums">{money(i.net_salary)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 bg-muted/60 font-bold">
                            <tr>
                              <td className="p-2" colSpan={5}>الإجماليات</td>
                              <td className="p-2 text-center tabular-nums">{money(t.total)}</td>
                              <td className="p-2 text-center tabular-nums">{money(t.bonuses)}</td>
                              <td className="p-2 text-center tabular-nums">{money(t.advances)}</td>
                              <td className="p-2 text-center tabular-nums" colSpan={4}>{money(t.deductions + t.penalties + t.violations + t.absentDed)}</td>
                              <td className="p-2 text-center tabular-nums">{money(t.net)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {printSheet && createPortal(<PrintDocument sheet={printSheet} />, document.body)}
    </div>
  );
};

export default ExternalPayrollSheets;
