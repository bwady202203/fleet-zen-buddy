import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Truck,
  Package,
  Wrench,
  ShoppingCart,
  Boxes,
  DollarSign,
  TrendingUp,
  Calendar,
  CalendarDays,
  CalendarRange,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVehicles } from "@/contexts/VehiclesContext";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Line,
  LineChart,
} from "recharts";
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";
import { ar } from "date-fns/locale";

interface Stats {
  todayPurchases: number;
  weekPurchases: number;
  monthPurchases: number;
  todayMaintenance: number;
  weekMaintenance: number;
  monthMaintenance: number;
  totalInventoryValue: number;
  totalMaintenanceCost: number;
  totalSparePartsCount: number;
}

interface RecentPart {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_date: string;
  supplier: string | null;
}

interface ChartPoint {
  label: string;
  مشتريات: number;
  صيانة: number;
}

const formatSAR = (n: number) =>
  new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const Index = () => {
  const { vehicles } = useVehicles();
  const [stats, setStats] = useState<Stats>({
    todayPurchases: 0,
    weekPurchases: 0,
    monthPurchases: 0,
    todayMaintenance: 0,
    weekMaintenance: 0,
    monthMaintenance: 0,
    totalInventoryValue: 0,
    totalMaintenanceCost: 0,
    totalSparePartsCount: 0,
  });
  const [recentParts, setRecentParts] = useState<RecentPart[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const today = startOfDay(new Date()).toISOString();
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 6 }).toISOString();
      const monthStart = startOfMonth(new Date()).toISOString();
      const last30Start = startOfDay(subDays(new Date(), 29)).toISOString();

      // مشتريات قطع الغيار (آخر 30 يوم)
      const { data: purchases } = await supabase
        .from("spare_parts_purchases")
        .select("total_price, purchase_date, created_at")
        .gte("purchase_date", format(subDays(new Date(), 29), "yyyy-MM-dd"));

      // تكاليف الصيانة (maintenance_cost_items مع تاريخ الإنشاء)
      const { data: costItems } = await supabase
        .from("maintenance_cost_items")
        .select("total_price, created_at")
        .gte("created_at", last30Start);

      // قطع الغيار - قيمة المخزون والعدد
      const { data: parts } = await supabase
        .from("spare_parts")
        .select("quantity, unit_price");

      // إجمالي تكاليف الصيانة (كل الفترات)
      const { data: allMaintenance } = await supabase
        .from("maintenance_requests")
        .select("cost");

      // آخر 8 قطع مشتراة
      const { data: recent } = await supabase
        .from("spare_parts_purchases")
        .select(
          "id, quantity, unit_price, total_price, purchase_date, supplier, spare_parts(name)"
        )
        .order("purchase_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(8);

      // حسابات الإحصائيات
      const todayDate = format(new Date(), "yyyy-MM-dd");
      const weekDate = format(startOfWeek(new Date(), { weekStartsOn: 6 }), "yyyy-MM-dd");
      const monthDate = format(startOfMonth(new Date()), "yyyy-MM-dd");

      const todayPurchases = (purchases || [])
        .filter((p: any) => p.purchase_date >= todayDate)
        .reduce((s: number, p: any) => s + Number(p.total_price || 0), 0);
      const weekPurchases = (purchases || [])
        .filter((p: any) => p.purchase_date >= weekDate)
        .reduce((s: number, p: any) => s + Number(p.total_price || 0), 0);
      const monthPurchases = (purchases || [])
        .filter((p: any) => p.purchase_date >= monthDate)
        .reduce((s: number, p: any) => s + Number(p.total_price || 0), 0);

      const todayMaintenance = (costItems || [])
        .filter((c: any) => c.created_at >= today)
        .reduce((s: number, c: any) => s + Number(c.total_price || 0), 0);
      const weekMaintenance = (costItems || [])
        .filter((c: any) => c.created_at >= weekStart)
        .reduce((s: number, c: any) => s + Number(c.total_price || 0), 0);
      const monthMaintenance = (costItems || [])
        .filter((c: any) => c.created_at >= monthStart)
        .reduce((s: number, c: any) => s + Number(c.total_price || 0), 0);

      const totalInventoryValue = (parts || []).reduce(
        (s: number, p: any) => s + Number(p.quantity || 0) * Number(p.unit_price || 0),
        0
      );
      const totalSparePartsCount = (parts || []).length;
      const totalMaintenanceCost = (allMaintenance || []).reduce(
        (s: number, m: any) => s + Number(m.cost || 0),
        0
      );

      // بناء الرسم البياني آخر 14 يوم
      const days: ChartPoint[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dStr = format(d, "yyyy-MM-dd");
        const dayPurchases = (purchases || [])
          .filter((p: any) => p.purchase_date === dStr)
          .reduce((s: number, p: any) => s + Number(p.total_price || 0), 0);
        const dayStartIso = startOfDay(d).toISOString();
        const dayEndIso = startOfDay(subDays(d, -1)).toISOString();
        const dayMaint = (costItems || [])
          .filter((c: any) => c.created_at >= dayStartIso && c.created_at < dayEndIso)
          .reduce((s: number, c: any) => s + Number(c.total_price || 0), 0);
        days.push({
          label: format(d, "dd/MM", { locale: ar }),
          مشتريات: Math.round(dayPurchases),
          صيانة: Math.round(dayMaint),
        });
      }

      const recentMapped: RecentPart[] = (recent || []).map((r: any) => ({
        id: r.id,
        name: r.spare_parts?.name || "—",
        quantity: r.quantity,
        unit_price: r.unit_price,
        total_price: r.total_price,
        purchase_date: r.purchase_date,
        supplier: r.supplier,
      }));

      setStats({
        todayPurchases,
        weekPurchases,
        monthPurchases,
        todayMaintenance,
        weekMaintenance,
        monthMaintenance,
        totalInventoryValue,
        totalMaintenanceCost,
        totalSparePartsCount,
      });
      setRecentParts(recentMapped);
      setChartData(days);
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/60 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 shadow-lg">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
                لوحة تحكم الأسطول
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                نظرة شاملة على المشتريات والصيانة والمخزون
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* بطاقات اليوم/الأسبوع/الشهر - مشتريات */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            مشتريات قطع الغيار
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PeriodCard
              title="اليوم"
              value={formatSAR(stats.todayPurchases)}
              icon={Calendar}
              gradient="from-emerald-500 to-emerald-600"
            />
            <PeriodCard
              title="هذا الأسبوع"
              value={formatSAR(stats.weekPurchases)}
              icon={CalendarDays}
              gradient="from-emerald-500 to-teal-600"
            />
            <PeriodCard
              title="هذا الشهر"
              value={formatSAR(stats.monthPurchases)}
              icon={CalendarRange}
              gradient="from-emerald-600 to-cyan-600"
            />
          </div>
        </section>

        {/* بطاقات الصيانة */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-rose-600" />
            تكاليف الصيانة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PeriodCard
              title="اليوم"
              value={formatSAR(stats.todayMaintenance)}
              icon={Calendar}
              gradient="from-rose-500 to-rose-600"
            />
            <PeriodCard
              title="هذا الأسبوع"
              value={formatSAR(stats.weekMaintenance)}
              icon={CalendarDays}
              gradient="from-rose-500 to-pink-600"
            />
            <PeriodCard
              title="هذا الشهر"
              value={formatSAR(stats.monthMaintenance)}
              icon={CalendarRange}
              gradient="from-rose-600 to-fuchsia-600"
            />
          </div>
        </section>

        {/* رسم بياني */}
        <section>
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                الحركة المالية - آخر 14 يوم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  مشتريات: { label: "مشتريات", color: "hsl(160 84% 39%)" },
                  صيانة: { label: "صيانة", color: "hsl(346 77% 49%)" },
                }}
                className="h-[300px] w-full"
              >
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="مشتريات" fill="hsl(160 84% 39%)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="صيانة" fill="hsl(346 77% 49%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        {/* بطاقات الإجماليات */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="قيمة المخزون"
            value={formatSAR(stats.totalInventoryValue)}
            icon={DollarSign}
            tone="emerald"
          />
          <SummaryCard
            title="إجمالي تكاليف الصيانة"
            value={formatSAR(stats.totalMaintenanceCost)}
            icon={Wrench}
            tone="rose"
          />
          <SummaryCard
            title="عدد الأصناف"
            value={stats.totalSparePartsCount.toLocaleString("ar-SA")}
            icon={Boxes}
            tone="blue"
          />
          <SummaryCard
            title="عدد السيارات"
            value={vehicles.length.toLocaleString("ar-SA")}
            icon={Truck}
            tone="violet"
          />
        </section>

        {/* آخر القطع المشتراة */}
        <section>
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                آخر قطع غيار تم شراؤها
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentParts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  لا توجد مشتريات حديثة
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-right py-2 px-2 font-medium">القطعة</th>
                        <th className="text-right py-2 px-2 font-medium">المورد</th>
                        <th className="text-center py-2 px-2 font-medium">الكمية</th>
                        <th className="text-center py-2 px-2 font-medium">سعر الوحدة</th>
                        <th className="text-center py-2 px-2 font-medium">الإجمالي</th>
                        <th className="text-center py-2 px-2 font-medium">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentParts.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b hover:bg-muted/40 transition-colors"
                        >
                          <td className="py-3 px-2 font-medium">{p.name}</td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {p.supplier || "—"}
                          </td>
                          <td className="text-center py-3 px-2">{p.quantity}</td>
                          <td className="text-center py-3 px-2">
                            {formatSAR(Number(p.unit_price))}
                          </td>
                          <td className="text-center py-3 px-2 font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatSAR(Number(p.total_price))}
                          </td>
                          <td className="text-center py-3 px-2 text-muted-foreground">
                            {p.purchase_date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {loading && (
          <p className="text-center text-sm text-muted-foreground">جاري التحميل...</p>
        )}
      </main>
    </div>
  );
};

const PeriodCard = ({
  title,
  value,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string;
  icon: any;
  gradient: string;
}) => (
  <Card className="overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
    <CardContent className="p-0">
      <div className={`bg-gradient-to-br ${gradient} p-5 text-white`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium opacity-90">{title}</span>
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold">{value}</div>
      </div>
    </CardContent>
  </Card>
);

const SummaryCard = ({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: any;
  tone: "emerald" | "rose" | "blue" | "violet";
}) => {
  const tones: Record<string, string> = {
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-700 dark:text-rose-400 border-rose-500/20",
    blue: "from-blue-500/10 to-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-500/20",
    violet: "from-violet-500/10 to-violet-500/5 text-violet-700 dark:text-violet-400 border-violet-500/20",
  };
  return (
    <Card className={`border-2 bg-gradient-to-br ${tones[tone]} hover:shadow-lg transition-all`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</span>
          <Icon className="h-5 w-5 opacity-70" />
        </div>
        <div className="text-xl sm:text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
};

export default Index;
