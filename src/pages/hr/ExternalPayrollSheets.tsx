import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, CloudDownload, FileSpreadsheet, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

const money = (v: number) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });

const useExternalSheets = () =>
  useQuery({
    queryKey: ["external-payroll-sheets"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("payroll-sync", { body: { view_sheets: true } });
      if (error || data?.error) throw new Error(data?.message ?? error?.message ?? "تعذر الجلب");
      const approved = (data.approved ?? []) as Sheet[];
      const disbursed = (data.disbursed ?? []) as Sheet[];
      const map = new Map<string, Sheet & { state: "disbursed" | "approved" }>();
      for (const s of approved) map.set(s.id, { ...s, state: "approved" });
      for (const s of disbursed) map.set(s.id, { ...s, state: "disbursed" });
      return [...map.values()].sort((a, b) => b.year - a.year || b.month - a.month || (a.department ?? "").localeCompare(b.department ?? ""));
    },
  });

const ExternalPayrollSheets = () => {
  const { toast } = useToast();
  const { data: sheets = [], isLoading, error, refetch, isFetching } = useExternalSheets();
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

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

  if (error) toast({ title: "تعذر جلب الكشوف", description: (error as Error).message, variant: "destructive" });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto flex flex-wrap items-center gap-4 px-4 py-5">
          <Link to="/hr" aria-label="رجوع"><ArrowRight className="h-6 w-6" /></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">كشوف الرواتب — البرنامج الخارجي</h1>
            <p className="text-sm text-muted-foreground">عرض مباشر لكشوف الرواتب المعتمدة والمصروفة من برنامج الرواتب</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />} تحديث
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
          <Badge variant="secondary" className="h-9 rounded-xl px-3 text-sm gap-1"><Users className="h-3.5 w-3.5" /> {totals.employees} موظف</Badge>
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
              const sheetTotals = (s.items ?? []).reduce(
                (t, i) => ({
                  total: t.total + Number(i.total_salary || 0),
                  bonuses: t.bonuses + Number(i.bonuses || 0),
                  advances: t.advances + Number(i.advances || 0),
                  deductions: t.deductions + Number(i.deductions || 0) + Number(i.penalties || 0) + Number(i.violations || 0) + Number(i.absent_deduction || 0),
                  net: t.net + Number(i.net_salary || 0),
                }),
                { total: 0, bonuses: 0, advances: 0, deductions: 0, net: 0 }
              );
              return (
                <Card key={s.id} className="overflow-hidden">
                  <button
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/50"
                    onClick={() => setOpenId(open ? null : s.id)}
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                    <span className="font-bold">{s.sheet_name || `كشف ${s.sheet_number ?? s.id.slice(0, 8)}`}</span>
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
                              <tr key={i.employee_id} className="border-t">
                                <td className="p-2">
                                  {i.employee_name}
                                  <div className="font-mono text-xs text-muted-foreground">{i.iqama_number}</div>
                                </td>
                                <td className="p-2">{i.job_title || "—"}</td>
                                <td className="p-2 text-center">{money(i.basic_salary)}</td>
                                <td className="p-2 text-center">{money(i.housing_allowance)}</td>
                                <td className="p-2 text-center">{money(i.food_allowance)}</td>
                                <td className="p-2 text-center font-semibold">{money(i.total_salary)}</td>
                                <td className="p-2 text-center text-emerald-600">{money(i.bonuses)}</td>
                                <td className="p-2 text-center text-amber-600">{money(i.advances)}</td>
                                <td className="p-2 text-center text-destructive">{money(i.deductions)}</td>
                                <td className="p-2 text-center text-destructive">{money(i.penalties)}</td>
                                <td className="p-2 text-center text-destructive">{money(i.violations)}</td>
                                <td className="p-2 text-center">{i.absent_days || 0}</td>
                                <td className="p-2 text-center text-destructive">{money(i.absent_deduction)}</td>
                                <td className="p-2 text-center font-bold">{money(i.net_salary)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 bg-muted/60 font-bold">
                            <tr>
                              <td className="p-2" colSpan={5}>الإجماليات</td>
                              <td className="p-2 text-center">{money(sheetTotals.total)}</td>
                              <td className="p-2 text-center">{money(sheetTotals.bonuses)}</td>
                              <td className="p-2 text-center">{money(sheetTotals.advances)}</td>
                              <td className="p-2 text-center" colSpan={4}>{money(sheetTotals.deductions)}</td>
                              <td className="p-2 text-center">{money(sheetTotals.net)}</td>
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
    </div>
  );
};

export default ExternalPayrollSheets;
