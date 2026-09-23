import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Printer, Search, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const fmt = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

interface MaterialRow {
  name: string;
  tons: number;
  cost_price: number;
  sale_price: number;
}

const GeneralCostReport = () => {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [dieselCost, setDieselCost] = useState(0);
  const [dieselLiters, setDieselLiters] = useState(0);
  const [maintenanceCost, setMaintenanceCost] = useState(0);
  const [payrollCost, setPayrollCost] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("company_settings").select("company_name").limit(1).maybeSingle();
      setCompanyName(data?.company_name || "");
    })();
  }, []);

  const fetchAll = async (offsetBase = 0) => {
    const all: any[] = [];
    let offset = offsetBase;
    while (true) {
      const { data, error } = await supabase
        .from("loads")
        .select("load_type_id, quantity")
        .gte("date", from)
        .lte("date", to)
        .range(offset, offset + 999);
      if (error) throw error;
      const chunk = data || [];
      all.push(...chunk);
      if (chunk.length < 1000) break;
      offset += 1000;
    }
    return all;
  };

  const generate = async () => {
    if (!from || !to) return toast.error("حدد الفترة");
    setLoading(true);
    try {
      const [loadsRows, typesRes, pricesRes, customerPricesRes, dieselRes, costsRes] = await Promise.all([
        fetchAll(),
        supabase.from("load_types").select("id, name"),
        (supabase as any).from("global_material_prices").select("load_type_id, cost_price, sale_price"),
        (supabase as any).from("company_load_type_prices").select("load_type_id, sale_price, unit_price"),
        (supabase as any).from("diesel_records").select("liters, amount").gte("date", from).lte("date", to),
        (supabase as any)
          .from("period_cost_entries")
          .select("cost_type, amount, start_date, end_date")
          .lte("start_date", to)
          .gte("end_date", from),
      ]);

      const typeNames = new Map<string, string>((typesRes.data || []).map((t: any) => [t.id, t.name]));
      const customerSaleTotals = new Map<string, { sum: number; count: number }>();
      for (const row of (customerPricesRes.data as any[]) || []) {
        const sale = Number(row.sale_price || row.unit_price || 0);
        if (sale <= 0) continue;
        const current = customerSaleTotals.get(row.load_type_id) || { sum: 0, count: 0 };
        current.sum += sale;
        current.count += 1;
        customerSaleTotals.set(row.load_type_id, current);
      }

      const priceMap = new Map<string, { cost: number; sale: number }>();
      for (const p of (pricesRes.data as any[]) || []) {
        const current = priceMap.get(p.load_type_id) || { cost: 0, sale: 0 };
        const cost = Number(p.cost_price || 0);
        const sale = Number(p.sale_price || 0);
        priceMap.set(p.load_type_id, {
          cost: cost > 0 ? cost : current.cost,
          sale: sale > 0 ? sale : current.sale,
        });
      }
      for (const [loadTypeId, totals] of customerSaleTotals) {
        const current = priceMap.get(loadTypeId) || { cost: 0, sale: 0 };
        if (current.sale <= 0 && totals.count > 0) {
          priceMap.set(loadTypeId, {
            cost: current.cost,
            sale: Math.round((totals.sum / totals.count) * 100) / 100,
          });
        }
      }

      const tonsByType = new Map<string, number>();
      for (const l of loadsRows) {
        const key = l.load_type_id || "unknown";
        tonsByType.set(key, (tonsByType.get(key) || 0) + Number(l.quantity || 0));
      }

      const rows: MaterialRow[] = Array.from(tonsByType.entries())
        .map(([id, tons]) => {
          const p = priceMap.get(id) || { cost: 9, sale: 0 };
          return {
            name: typeNames.get(id) || "غير محدد",
            tons,
            cost_price: p.cost > 0 ? p.cost : 9,
            sale_price: p.sale,
          };
        })
        .sort((a, b) => b.tons - a.tons);
      setMaterials(rows);

      const pricePerLiter = Number(localStorage.getItem("diesel_price_per_liter") || "2.33") || 2.33;
      const diesel = ((dieselRes.data as any[]) || []).reduce(
        (acc, d) => {
          const liters = Number(d.liters || 0);
          const amount = Number(d.amount || 0) || liters * pricePerLiter;
          return { liters: acc.liters + liters, amount: acc.amount + amount };
        },
        { liters: 0, amount: 0 }
      );
      setDieselLiters(diesel.liters);
      setDieselCost(diesel.amount);

      const costs = (costsRes.data as any[]) || [];
      setMaintenanceCost(
        costs.filter((c) => c.cost_type === "maintenance").reduce((s, c) => s + Number(c.amount || 0), 0)
      );
      setPayrollCost(costs.filter((c) => c.cost_type === "payroll").reduce((s, c) => s + Number(c.amount || 0), 0));
      setGenerated(true);
    } catch (e: any) {
      toast.error("فشل إصدار التقرير: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const tons = materials.reduce((s, m) => s + m.tons, 0);
    const materialsCost = materials.reduce((s, m) => s + m.tons * m.cost_price, 0);
    const revenue = materials.reduce((s, m) => s + m.tons * m.sale_price, 0);
    const totalCosts = materialsCost + dieselCost + maintenanceCost + payrollCost;
    return { tons, materialsCost, revenue, totalCosts, net: revenue - totalCosts };
  }, [materials, dieselCost, maintenanceCost, payrollCost]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <style>{`
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>

      <header className="border-b bg-card no-print">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <PieChart className="h-6 w-6 text-primary" /> التقرير العام للتكاليف والأرباح
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                تكلفة المواد × الأطنان + الديزل + الصيانة + الأجور، مقابل إجمالي الإيراد خلال الفترة
              </p>
            </div>
            <div className="mr-auto flex gap-2">
              <Link to="/loads/cost-settings">
                <Button variant="outline">إعدادات التكاليف</Button>
              </Link>
              <Button variant="outline" onClick={() => window.print()} disabled={!generated} className="gap-2">
                <Printer className="h-4 w-4" /> طباعة
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="no-print">
          <CardHeader>
            <CardTitle>الفترة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <Button onClick={generate} disabled={loading} className="gap-2">
                <Search className="h-4 w-4" /> {loading ? "جاري الإصدار..." : "إصدار التقرير"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {generated && (
          <div className="print-area space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold">{companyName || "تقرير التكاليف والأرباح"}</h2>
              <p className="text-sm text-muted-foreground">
                التقرير العام للتكاليف والأرباح — من {from} إلى {to}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>تكلفة وإيراد المواد</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2">م</th>
                      <th className="border p-2">المادة</th>
                      <th className="border p-2">عدد الأطنان</th>
                      <th className="border p-2">تكلفة الطن</th>
                      <th className="border p-2">إجمالي التكلفة</th>
                      <th className="border p-2">سعر البيع للطن</th>
                      <th className="border p-2">إجمالي الإيراد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border p-6 text-center text-muted-foreground">
                          لا توجد حمولات في هذه الفترة
                        </td>
                      </tr>
                    ) : (
                      materials.map((m, i) => (
                        <tr key={m.name + i} className="hover:bg-muted/50">
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2 font-medium">{m.name}</td>
                          <td className="border p-2 text-center">{fmt(m.tons)}</td>
                          <td className="border p-2 text-center">{fmt(m.cost_price)}</td>
                          <td className="border p-2 text-center">{fmt(m.tons * m.cost_price)}</td>
                          <td className="border p-2 text-center">{fmt(m.sale_price)}</td>
                          <td className="border p-2 text-center">{fmt(m.tons * m.sale_price)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {materials.length > 0 && (
                    <tfoot>
                      <tr className="bg-muted font-bold">
                        <td className="border p-2 text-center" colSpan={2}>
                          الإجمالي
                        </td>
                        <td className="border p-2 text-center">{fmt(totals.tons)}</td>
                        <td className="border p-2"></td>
                        <td className="border p-2 text-center">{fmt(totals.materialsCost)}</td>
                        <td className="border p-2"></td>
                        <td className="border p-2 text-center">{fmt(totals.revenue)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ملخص التكاليف والنتيجة</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    <tr>
                      <td className="border p-2 font-medium">تكلفة المواد (الأطنان × تكلفة الطن)</td>
                      <td className="border p-2 text-center w-56">{fmt(totals.materialsCost)}</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-medium">
                        تكلفة الديزل المصروف {dieselLiters ? `(${fmt(dieselLiters)} لتر)` : ""}
                      </td>
                      <td className="border p-2 text-center">{fmt(dieselCost)}</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-medium">تكلفة الصيانة</td>
                      <td className="border p-2 text-center">{fmt(maintenanceCost)}</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-medium">تكلفة الأجور والرواتب</td>
                      <td className="border p-2 text-center">{fmt(payrollCost)}</td>
                    </tr>
                    <tr className="bg-muted font-bold">
                      <td className="border p-2">إجمالي التكاليف</td>
                      <td className="border p-2 text-center">{fmt(totals.totalCosts)}</td>
                    </tr>
                    <tr className="bg-muted font-bold">
                      <td className="border p-2">إجمالي الإيراد (الأطنان × سعر البيع)</td>
                      <td className="border p-2 text-center">{fmt(totals.revenue)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="border p-2">صافي الربح / الخسارة</td>
                      <td
                        className={`border p-2 text-center ${
                          totals.net < 0 ? "text-destructive" : "text-emerald-600"
                        }`}
                      >
                        {fmt(totals.net)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default GeneralCostReport;
