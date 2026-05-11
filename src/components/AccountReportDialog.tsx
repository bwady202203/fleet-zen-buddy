import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, Banknote, Fuel, Disc, Users, Building2, Loader2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n || 0);

export const AccountReportDialog = ({ open, onOpenChange }: Props) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    custodyTotal: 0,
    custodyExpenses: 0,
    custodyRemaining: 0,
    monthSales: 0,
    monthExpenses: 0,
    diesel: 0,
    tires: 0,
    salaries: 0,
    bankRiyadh: 0,
    bankRajhi: 0,
  });

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  const load = async () => {
    setLoading(true);
    try {
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

      const [reps, custExp, sales, accounts] = await Promise.all([
        supabase.from("custody_representatives").select("total_custody, current_custody, remaining_custody"),
        supabase.from("custody_expenses").select("amount").gte("expense_date", monthStart).lte("expense_date", monthEnd),
        supabase.from("load_invoices").select("total_amount, date").gte("date", monthStart).lte("date", monthEnd),
        supabase.from("chart_of_accounts").select("code, balance").in("code", ["111001","111004","5111","5112","5113","5109","510901"]),
      ]);

      const repsData = reps.data || [];
      const custodyTotal = repsData.reduce((s, r: any) => s + Number(r.total_custody || 0), 0);
      const custodyRemaining = repsData.reduce((s, r: any) => s + Number(r.remaining_custody || 0), 0);
      const custodyExpenses = (custExp.data || []).reduce((s, e: any) => s + Number(e.amount || 0), 0);

      const monthSales = (sales.data || []).reduce((s, i: any) => s + Number(i.total_amount || 0), 0);

      const acc = (accounts.data || []) as any[];
      const get = (code: string) => Number(acc.find((a) => a.code === code)?.balance || 0);

      const diesel = get("5111") + get("5113");
      const tires = get("5112");
      const salaries = get("5109") + get("510901");
      const bankRiyadh = get("111004");
      const bankRajhi = get("111001");
      const monthExpenses = custodyExpenses;

      setData({
        custodyTotal, custodyExpenses, custodyRemaining,
        monthSales, monthExpenses,
        diesel, tires, salaries,
        bankRiyadh, bankRajhi,
      });
    } finally {
      setLoading(false);
    }
  };

  const custodyPie = [
    { name: "المصروفات", value: Math.max(0, data.custodyExpenses) },
    { name: "المتبقي", value: Math.max(0, data.custodyRemaining) },
  ];
  const expensesPie = [
    { name: "ديزل", value: data.diesel },
    { name: "كفرات", value: data.tires },
    { name: "رواتب", value: data.salaries },
  ];
  const banksBar = [
    { name: "بنك الرياض", balance: data.bankRiyadh },
    { name: "بنك الراجحي", balance: data.bankRajhi },
  ];

  const COLORS_A = ["hsl(346 77% 49%)", "hsl(160 84% 39%)"];
  const COLORS_B = ["hsl(25 95% 53%)", "hsl(217 91% 60%)", "hsl(280 70% 55%)"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">التقرير الشامل للحساب الحالي</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="border-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">حالة العهد</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={custodyPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {custodyPie.map((_, i) => <Cell key={i} fill={COLORS_A[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع المصروفات الرئيسية</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={expensesPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {expensesPie.map((_, i) => <Cell key={i} fill={COLORS_B[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">أرصدة البنوك</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
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
            </div>

            {/* Custody section */}
            <section>
              <h3 className="font-bold mb-2 flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> تقرير العهد</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatBox label="إجمالي المدين" value={fmt(data.custodyTotal)} tone="blue" />
                <StatBox label="المصروفات (الشهر)" value={fmt(data.custodyExpenses)} tone="rose" />
                <StatBox label="الرصيد النهائي" value={fmt(data.custodyRemaining)} tone="emerald" />
              </div>
            </section>

            {/* Sales */}
            <section>
              <h3 className="font-bold mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> مبيعات الشهر الحالي</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <StatBox label="إجمالي المبيعات" value={fmt(data.monthSales)} tone="emerald" />
                <StatBox label="إجمالي المصروفات (عهد)" value={fmt(data.monthExpenses)} tone="rose" />
              </div>
            </section>

            {/* Important expenses */}
            <section>
              <h3 className="font-bold mb-2 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-600" /> البنود المهمة</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatBox label="ديزل" value={fmt(data.diesel)} tone="orange" icon={Fuel} />
                <StatBox label="كفرات" value={fmt(data.tires)} tone="blue" icon={Disc} />
                <StatBox label="الرواتب التشغيلية" value={fmt(data.salaries)} tone="violet" icon={Users} />
              </div>
            </section>

            {/* Banks */}
            <section>
              <h3 className="font-bold mb-2 flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /> أرصدة البنوك</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <StatBox label="بنك الرياض" value={fmt(data.bankRiyadh)} tone="emerald" icon={Building2} />
                <StatBox label="بنك الراجحي" value={fmt(data.bankRajhi)} tone={data.bankRajhi < 0 ? "rose" : "emerald"} icon={Building2} />
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
    <div className={`rounded-xl border-2 bg-gradient-to-br ${tones[tone]} p-4 flex items-center justify-between`}>
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
      {Icon && <Icon className="h-6 w-6 opacity-60" />}
    </div>
  );
};
