import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, Banknote, Fuel, Disc, Users, Building2,
  Loader2, ArrowRight, Receipt, CalendarDays, CalendarRange, Infinity as InfinityIcon, Calendar,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";

type RangeKey = "today" | "month" | "all" | "custom";

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n || 0);

const CUSTODY_CODES = ["111102", "111103", "111104", "111105", "111106", "111107", "111108"];
const IMPORTANT_CODES = {
  diesel: ["5111", "5113"],
  tires: ["5112"],
  salaries: ["5109", "510901"],
  oils: ["5110"],
};
const BANK_CODES = { riyadh: "111004", rajhi: "111001" };

interface AcctData {
  id: string;
  code: string;
  name_ar: string;
  opening: number;
  movement: number;
  closing: number;
}

const AccountReport = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>("month");
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(true);
  const [acctMap, setAcctMap] = useState<Record<string, AcctData>>({});
  const [salesInvoices, setSalesInvoices] = useState<any[]>([]);
  const [custodyExpenses, setCustodyExpenses] = useState<any[]>([]);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (range === "today") return { start: format(startOfDay(now), "yyyy-MM-dd"), end: format(endOfDay(now), "yyyy-MM-dd") };
    if (range === "month") return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
    if (range === "custom") return { start: customFrom, end: customTo };
    return { start: "1900-01-01", end: "2999-12-31" };
  }, [range, customFrom, customTo]);

  useEffect(() => { load(); }, [range, customFrom, customTo]);

  const fetchAllLines = async (accountIds: string[], beforeDate?: string, fromDate?: string, toDate?: string) => {
    const all: any[] = [];
    let from = 0;
    const size = 1000;
    while (true) {
      let q: any = supabase
        .from("journal_entry_lines")
        .select("account_id, debit, credit, journal_entries!inner(date)")
        .in("account_id", accountIds);
      if (beforeDate) q = q.lt("journal_entries.date", beforeDate);
      if (fromDate) q = q.gte("journal_entries.date", fromDate);
      if (toDate) q = q.lte("journal_entries.date", toDate);
      const { data, error } = await q.range(from, from + size - 1);
      if (error || !data) break;
      all.push(...data);
      if (data.length < size) break;
      from += size;
    }
    return all;
  };

  const load = async () => {
    setLoading(true);
    try {
      const allCodes = [
        ...CUSTODY_CODES,
        ...IMPORTANT_CODES.diesel, ...IMPORTANT_CODES.tires, ...IMPORTANT_CODES.salaries, ...IMPORTANT_CODES.oils,
        BANK_CODES.riyadh, BANK_CODES.rajhi,
      ];

      const { data: accs } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name_ar, balance")
        .in("code", allCodes);

      const accounts = accs || [];
      const ids = accounts.map((a: any) => a.id);
      const isAllTime = range === "all";

      const [openingLines, periodLines, salesRes, expRes] = await Promise.all([
        isAllTime ? Promise.resolve([]) : fetchAllLines(ids, dateRange.start),
        fetchAllLines(ids, undefined, dateRange.start, dateRange.end),
        supabase.from("load_invoices").select("id, invoice_number, date, total_amount, status").gte("date", dateRange.start).lte("date", dateRange.end).order("date", { ascending: false }),
        supabase.from("custody_expenses").select("amount, expense_date").gte("expense_date", dateRange.start).lte("expense_date", dateRange.end),
      ]);

      const map: Record<string, AcctData> = {};
      for (const a of accounts as any[]) {
        const opening = isAllTime ? 0 : openingLines.filter((l: any) => l.account_id === a.id)
          .reduce((s, l: any) => s + Number(l.debit || 0) - Number(l.credit || 0), 0);
        const movement = periodLines.filter((l: any) => l.account_id === a.id)
          .reduce((s, l: any) => s + Number(l.debit || 0) - Number(l.credit || 0), 0);
        const closing = isAllTime ? Number(a.balance || 0) : opening + movement;
        map[a.code] = { id: a.id, code: a.code, name_ar: a.name_ar, opening, movement, closing };
      }
      setAcctMap(map);
      setSalesInvoices(salesRes.data || []);
      setCustodyExpenses(expRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const get = (code: string): AcctData =>
    acctMap[code] || { id: "", code, name_ar: code, opening: 0, movement: 0, closing: 0 };

  const sumGroup = (codes: string[], field: "opening" | "movement" | "closing") =>
    codes.reduce((s, c) => s + (get(c)[field] || 0), 0);

  const custodyRows = CUSTODY_CODES.map(get);
  const totalCustodyClosing = sumGroup(CUSTODY_CODES, "closing");
  const totalCustodyOpening = sumGroup(CUSTODY_CODES, "opening");
  const totalCustodyExp = custodyExpenses.reduce((s, e: any) => s + Number(e.amount || 0), 0);

  const dieselA = get(IMPORTANT_CODES.diesel[0]);
  const dieselB = get(IMPORTANT_CODES.diesel[1]);
  const tiresA = get(IMPORTANT_CODES.tires[0]);
  const salariesA = get(IMPORTANT_CODES.salaries[0]);
  const salariesB = get(IMPORTANT_CODES.salaries[1]);
  const oilsA = get(IMPORTANT_CODES.oils[0]);

  const diesel = { opening: dieselA.opening + dieselB.opening, movement: dieselA.movement + dieselB.movement, closing: dieselA.closing + dieselB.closing };
  const tires = { opening: tiresA.opening, movement: tiresA.movement, closing: tiresA.closing };
  const salaries = { opening: salariesA.opening + salariesB.opening, movement: salariesA.movement + salariesB.movement, closing: salariesA.closing + salariesB.closing };
  const oils = { opening: oilsA.opening, movement: oilsA.movement, closing: oilsA.closing };

  const bankRiyadh = get(BANK_CODES.riyadh);
  const bankRajhi = get(BANK_CODES.rajhi);

  const monthSales = salesInvoices.reduce((s, i: any) => s + Number(i.total_amount || 0), 0);

  const custodyPie = custodyRows.filter((r) => Math.abs(r.closing) > 0).map((r) => ({ name: r.name_ar.replace(" عهدة", ""), value: Math.abs(r.closing) }));
  const expensesPie = [
    { name: "ديزل", value: diesel.movement },
    { name: "كفرات", value: tires.movement },
    { name: "رواتب", value: salaries.movement },
    { name: "زيوت", value: oils.movement },
  ].filter((x) => x.value > 0);
  const banksBar = [
    { name: "بنك الرياض", balance: bankRiyadh.closing },
    { name: "بنك الراجحي", balance: bankRajhi.closing },
  ];

  const COLORS_A = ["hsl(346 77% 49%)", "hsl(160 84% 39%)", "hsl(217 91% 60%)", "hsl(280 70% 55%)", "hsl(25 95% 53%)", "hsl(45 95% 50%)", "hsl(190 80% 45%)"];
  const COLORS_B = ["hsl(25 95% 53%)", "hsl(217 91% 60%)", "hsl(280 70% 55%)", "hsl(160 84% 39%)"];

  const rangeLabel = range === "today" ? "اليوم" : range === "month" ? "الشهر الحالي" : range === "custom" ? `من ${customFrom} إلى ${customTo}` : "حتى الآن";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-[60px] z-30 print:hidden">
        <div className="container mx-auto px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
                التقرير الشامل للحساب
              </h1>
              <p className="text-xs text-muted-foreground">الفترة: {rangeLabel}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant={range === "today" ? "default" : "outline"} onClick={() => setRange("today")} className="gap-1">
                <CalendarDays className="h-4 w-4" /> اليوم
              </Button>
              <Button size="sm" variant={range === "month" ? "default" : "outline"} onClick={() => setRange("month")} className="gap-1">
                <CalendarRange className="h-4 w-4" /> الشهر الحالي
              </Button>
              <Button size="sm" variant={range === "all" ? "default" : "outline"} onClick={() => setRange("all")} className="gap-1">
                <InfinityIcon className="h-4 w-4" /> حتى الآن
              </Button>
              <Button size="sm" variant={range === "custom" ? "default" : "outline"} onClick={() => setRange("custom")} className="gap-1">
                <Calendar className="h-4 w-4" /> فترة مخصصة
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/")} className="gap-1">
                <ArrowRight className="h-4 w-4" /> الرئيسية
              </Button>
            </div>
          </div>
          {range === "custom" && (
            <div className="flex flex-wrap items-end gap-3 bg-primary/5 rounded-lg p-3 border border-primary/20">
              <div className="space-y-1">
                <Label className="text-xs">من تاريخ</Label>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 w-40" />
              </div>
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <main className="container mx-auto px-4 py-6 space-y-8">
          {/* Charts row */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-2 shadow-md">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> توزيع العهد على المندوبين</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={custodyPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                      {custodyPie.map((_, i) => <Cell key={i} fill={COLORS_A[i % COLORS_A.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-md">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-600" /> البنود المهمة ({rangeLabel})</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={expensesPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                      {expensesPie.map((_, i) => <Cell key={i} fill={COLORS_B[i % COLORS_B.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-md">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /> أرصدة البنوك (إغلاق)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={banksBar}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Bar dataKey="balance" fill="hsl(217 91% 60%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>

          {/* Custody breakdown */}
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> تفاصيل العهد (المدين) - {rangeLabel}</h2>
            <BalanceTable
              rows={custodyRows.map((r) => ({ name: r.name_ar, opening: r.opening, movement: r.movement, closing: r.closing }))}
              totals={{ opening: totalCustodyOpening, movement: sumGroup(CUSTODY_CODES, "movement"), closing: totalCustodyClosing }}
            />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatBox label="إجمالي العهد (إغلاق)" value={fmt(totalCustodyClosing)} tone="emerald" />
              <StatBox label={`مصروفات العهد المسجلة (${rangeLabel})`} value={fmt(totalCustodyExp)} tone="rose" />
            </div>
          </section>

          {/* Sales invoices report */}
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Receipt className="h-5 w-5 text-emerald-600" /> فواتير المبيعات ({rangeLabel})</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <StatBox label="إجمالي المبيعات" value={fmt(monthSales)} tone="emerald" icon={TrendingUp} />
              <StatBox label="عدد الفواتير" value={salesInvoices.length.toLocaleString("ar-SA")} tone="blue" icon={Receipt} />
              <StatBox label="متوسط الفاتورة" value={fmt(salesInvoices.length ? monthSales / salesInvoices.length : 0)} tone="violet" />
            </div>
            <Card className="border-2">
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="border-b">
                        <th className="text-right py-2 px-3 font-semibold">رقم الفاتورة</th>
                        <th className="text-right py-2 px-3 font-semibold">التاريخ</th>
                        <th className="text-center py-2 px-3 font-semibold">الحالة</th>
                        <th className="text-center py-2 px-3 font-semibold">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesInvoices.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">لا توجد فواتير</td></tr>
                      ) : salesInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium">{inv.invoice_number}</td>
                          <td className="py-2 px-3 text-muted-foreground">{inv.date}</td>
                          <td className="text-center py-2 px-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{inv.status}</span>
                          </td>
                          <td className="text-center py-2 px-3 font-semibold text-emerald-700">{fmt(Number(inv.total_amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Important expenses */}
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><TrendingDown className="h-5 w-5 text-rose-600" /> البنود المهمة - {rangeLabel}</h2>
            <BalanceTable
              rows={[
                { name: "ديزل (5111+5113)", opening: diesel.opening, movement: diesel.movement, closing: diesel.closing, icon: Fuel },
                { name: "كفرات (5112)", opening: tires.opening, movement: tires.movement, closing: tires.closing, icon: Disc },
                { name: "الرواتب التشغيلية (5109)", opening: salaries.opening, movement: salaries.movement, closing: salaries.closing, icon: Users },
                { name: "زيوت وشحوم (5110)", opening: oils.opening, movement: oils.movement, closing: oils.closing },
              ]}
              totals={{
                opening: diesel.opening + tires.opening + salaries.opening + oils.opening,
                movement: diesel.movement + tires.movement + salaries.movement + oils.movement,
                closing: diesel.closing + tires.closing + salaries.closing + oils.closing,
              }}
            />
          </section>

          {/* Banks */}
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" /> أرصدة البنوك - {rangeLabel}</h2>
            <BalanceTable
              rows={[
                { name: bankRiyadh.name_ar, opening: bankRiyadh.opening, movement: bankRiyadh.movement, closing: bankRiyadh.closing, icon: Building2 },
                { name: bankRajhi.name_ar, opening: bankRajhi.opening, movement: bankRajhi.movement, closing: bankRajhi.closing, icon: Building2 },
              ]}
              totals={{
                opening: bankRiyadh.opening + bankRajhi.opening,
                movement: bankRiyadh.movement + bankRajhi.movement,
                closing: bankRiyadh.closing + bankRajhi.closing,
              }}
            />
          </section>
        </main>
      )}
    </div>
  );
};

const BalanceTable = ({
  rows, totals,
}: {
  rows: { name: string; opening: number; movement: number; closing: number; icon?: any }[];
  totals: { opening: number; movement: number; closing: number };
}) => (
  <Card className="border-2">
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-right py-2 px-3 font-semibold">الحساب</th>
              <th className="text-center py-2 px-3 font-semibold text-blue-700">الرصيد الافتتاحي</th>
              <th className="text-center py-2 px-3 font-semibold text-orange-700">حركة الفترة</th>
              <th className="text-center py-2 px-3 font-semibold text-emerald-700">الرصيد النهائي</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="py-2 px-3 font-medium flex items-center gap-2">
                  {r.icon && <r.icon className="h-4 w-4 opacity-60" />}
                  {r.name}
                </td>
                <td className="text-center py-2 px-3 text-blue-700 dark:text-blue-400">{fmt(r.opening)}</td>
                <td className="text-center py-2 px-3 text-orange-700 dark:text-orange-400">{fmt(r.movement)}</td>
                <td className={`text-center py-2 px-3 font-bold ${r.closing < 0 ? "text-rose-700" : "text-emerald-700"}`}>{fmt(r.closing)}</td>
              </tr>
            ))}
            <tr className="bg-primary/5 font-bold border-t-2">
              <td className="py-2 px-3">الإجمالي</td>
              <td className="text-center py-2 px-3 text-blue-700">{fmt(totals.opening)}</td>
              <td className="text-center py-2 px-3 text-orange-700">{fmt(totals.movement)}</td>
              <td className={`text-center py-2 px-3 ${totals.closing < 0 ? "text-rose-700" : "text-emerald-700"}`}>{fmt(totals.closing)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

const StatBox = ({
  label, value, tone, icon: Icon,
}: { label: string; value: string; tone: "blue" | "rose" | "emerald" | "orange" | "violet"; icon?: any }) => {
  const tones: Record<string, string> = {
    blue: "from-blue-500/10 to-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-500/30",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-700 dark:text-rose-400 border-rose-500/30",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    orange: "from-orange-500/10 to-orange-500/5 text-orange-700 dark:text-orange-400 border-orange-500/30",
    violet: "from-violet-500/10 to-violet-500/5 text-violet-700 dark:text-violet-400 border-violet-500/30",
  };
  return (
    <div className={`rounded-xl border-2 bg-gradient-to-br ${tones[tone]} p-4 flex items-center justify-between hover:shadow-md transition-all`}>
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-1 truncate">{label}</div>
        <div className="text-base sm:text-lg font-bold">{value}</div>
      </div>
      {Icon && <Icon className="h-6 w-6 opacity-60 shrink-0" />}
    </div>
  );
};

export default AccountReport;
