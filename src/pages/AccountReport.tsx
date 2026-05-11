import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, Banknote, Fuel, Disc, Users, Building2,
  Loader2, ArrowRight, Receipt, CalendarDays, CalendarRange, Infinity as InfinityIcon,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";

type RangeKey = "today" | "month" | "all";

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n || 0);

// Custody accounts (level 4 under 1111)
const CUSTODY_CODES = ["111102", "111103", "111104", "111105", "111106", "111107", "111108"];
// Important expense accounts
const IMPORTANT_CODES = {
  diesel: ["5111", "5113"],
  tires: ["5112"],
  salaries: ["5109", "510901"],
  oils: ["5110"],
};
const BANK_CODES = { riyadh: "111004", rajhi: "111001" };

const AccountReport = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>("month");
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<any[]>([]);
  const [custodyExpenses, setCustodyExpenses] = useState<any[]>([]);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (range === "today") return { start: format(startOfDay(now), "yyyy-MM-dd"), end: format(endOfDay(now), "yyyy-MM-dd") };
    if (range === "month") return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
    return { start: "1900-01-01", end: "2999-12-31" };
  }, [range]);

  useEffect(() => { load(); }, [range]);

  const load = async () => {
    setLoading(true);
    try {
      const allCodes = [
        ...CUSTODY_CODES,
        ...IMPORTANT_CODES.diesel, ...IMPORTANT_CODES.tires, ...IMPORTANT_CODES.salaries, ...IMPORTANT_CODES.oils,
        BANK_CODES.riyadh, BANK_CODES.rajhi,
      ];

      const [accRes, salesRes, expRes] = await Promise.all([
        supabase.from("chart_of_accounts").select("code, name_ar, balance").in("code", allCodes),
        supabase.from("load_invoices").select("id, invoice_number, date, total_amount, status").gte("date", dateRange.start).lte("date", dateRange.end).order("date", { ascending: false }),
        supabase.from("custody_expenses").select("amount, expense_date").gte("expense_date", dateRange.start).lte("expense_date", dateRange.end),
      ]);

      setAccounts(accRes.data || []);
      setSalesInvoices(salesRes.data || []);
      setCustodyExpenses(expRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const get = (code: string) => Number(accounts.find((a) => a.code === code)?.balance || 0);
  const getName = (code: string) => accounts.find((a) => a.code === code)?.name_ar || code;

  const custodyRows = CUSTODY_CODES.map((c) => ({ code: c, name: getName(c), balance: get(c) }));
  const totalCustody = custodyRows.reduce((s, r) => s + r.balance, 0);
  const totalCustodyExp = custodyExpenses.reduce((s, e: any) => s + Number(e.amount || 0), 0);

  const diesel = IMPORTANT_CODES.diesel.reduce((s, c) => s + get(c), 0);
  const tires = IMPORTANT_CODES.tires.reduce((s, c) => s + get(c), 0);
  const salaries = IMPORTANT_CODES.salaries.reduce((s, c) => s + get(c), 0);
  const oils = IMPORTANT_CODES.oils.reduce((s, c) => s + get(c), 0);

  const bankRiyadh = get(BANK_CODES.riyadh);
  const bankRajhi = get(BANK_CODES.rajhi);

  const monthSales = salesInvoices.reduce((s, i: any) => s + Number(i.total_amount || 0), 0);

  const custodyPie = custodyRows.filter((r) => Math.abs(r.balance) > 0).map((r) => ({ name: r.name.replace(" عهدة", ""), value: Math.abs(r.balance) }));
  const expensesPie = [
    { name: "ديزل", value: diesel },
    { name: "كفرات", value: tires },
    { name: "رواتب", value: salaries },
    { name: "زيوت", value: oils },
  ].filter((x) => x.value > 0);
  const banksBar = [
    { name: "بنك الرياض", balance: bankRiyadh },
    { name: "بنك الراجحي", balance: bankRajhi },
  ];

  const COLORS_A = ["hsl(346 77% 49%)", "hsl(160 84% 39%)", "hsl(217 91% 60%)", "hsl(280 70% 55%)", "hsl(25 95% 53%)", "hsl(45 95% 50%)", "hsl(190 80% 45%)"];
  const COLORS_B = ["hsl(25 95% 53%)", "hsl(217 91% 60%)", "hsl(280 70% 55%)", "hsl(160 84% 39%)"];

  const rangeLabel = range === "today" ? "اليوم" : range === "month" ? "الشهر الحالي" : "حتى الآن";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-[60px] z-30 print:hidden">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
              التقرير الشامل للحساب
            </h1>
            <p className="text-xs text-muted-foreground">الفترة: {rangeLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={range === "today" ? "default" : "outline"} onClick={() => setRange("today")} className="gap-1">
              <CalendarDays className="h-4 w-4" /> اليوم
            </Button>
            <Button size="sm" variant={range === "month" ? "default" : "outline"} onClick={() => setRange("month")} className="gap-1">
              <CalendarRange className="h-4 w-4" /> الشهر الحالي
            </Button>
            <Button size="sm" variant={range === "all" ? "default" : "outline"} onClick={() => setRange("all")} className="gap-1">
              <InfinityIcon className="h-4 w-4" /> حتى الآن
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/")} className="gap-1">
              <ArrowRight className="h-4 w-4" /> الرئيسية
            </Button>
          </div>
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
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-600" /> البنود المهمة</CardTitle></CardHeader>
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
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /> أرصدة البنوك</CardTitle></CardHeader>
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
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> تفاصيل العهد (المدين)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {custodyRows.map((r) => (
                <StatBox key={r.code} label={r.name} value={fmt(r.balance)} tone={r.balance >= 0 ? "blue" : "rose"} />
              ))}
              <StatBox label="إجمالي العهد" value={fmt(totalCustody)} tone="emerald" />
              <StatBox label={`مصروفات العهد (${rangeLabel})`} value={fmt(totalCustodyExp)} tone="rose" />
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
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><TrendingDown className="h-5 w-5 text-rose-600" /> البنود المهمة (إجمالي)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBox label="ديزل" value={fmt(diesel)} tone="orange" icon={Fuel} />
              <StatBox label="كفرات" value={fmt(tires)} tone="blue" icon={Disc} />
              <StatBox label="الرواتب التشغيلية" value={fmt(salaries)} tone="violet" icon={Users} />
              <StatBox label="زيوت وشحوم" value={fmt(oils)} tone="emerald" />
            </div>
          </section>

          {/* Banks */}
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" /> أرصدة البنوك</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatBox label={getName(BANK_CODES.riyadh)} value={fmt(bankRiyadh)} tone={bankRiyadh < 0 ? "rose" : "emerald"} icon={Building2} />
              <StatBox label={getName(BANK_CODES.rajhi)} value={fmt(bankRajhi)} tone={bankRajhi < 0 ? "rose" : "emerald"} icon={Building2} />
            </div>
          </section>
        </main>
      )}
    </div>
  );
};

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
