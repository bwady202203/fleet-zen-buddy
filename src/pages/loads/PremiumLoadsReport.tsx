import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Printer, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LoadRow {
  id: string;
  date: string;
  load_number: string;
  invoice_number: string | null;
  truck_number: string | null;
  quantity: number | null;
  unload_quantity: number | null;
  driver_commission: number | null;
  delivery_from: string | null;
  delivery_to: string | null;
  companies: { name: string } | null;
  drivers: { name: string } | null;
  load_types: { name: string } | null;
}

const PremiumLoadsReport = () => {
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [driverId, setDriverId] = useState("all");
  const [companyId, setCompanyId] = useState("all");
  const [rows, setRows] = useState<LoadRow[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [driversRes, companiesRes] = await Promise.all([
        supabase.from("drivers").select("id, name").eq("is_active", true).order("name"),
        supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
      ]);
      if (driversRes.data) setDrivers(driversRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
    })();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("loads")
      .select("id, date, load_number, invoice_number, truck_number, quantity, unload_quantity, driver_commission, delivery_from, delivery_to, companies(name), drivers(name), load_types(name)")
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true });

    if (driverId !== "all") query = query.eq("driver_id", driverId);
    if (companyId !== "all") query = query.eq("company_id", companyId);

    const { data } = await query;
    setRows((data as LoadRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => ({
    count: rows.length,
    quantity: rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
    unloadQuantity: rows.reduce((s, r) => s + (Number(r.unload_quantity) || 0), 0),
    difference: rows.reduce((s, r) => s + ((Number(r.quantity) || 0) - (Number(r.unload_quantity) || 0)), 0),
    commissions: rows.reduce((s, r) => s + (Number(r.driver_commission) || 0), 0),
  }), [rows]);

  const fmt = (n: number) => n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>

      <header className="border-b bg-card no-print">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads/premium-register" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">تقرير الحمولات المميز المفصل</h1>
              <p className="text-muted-foreground mt-1 text-sm">Premium Loads Detailed Report</p>
            </div>
            <Button variant="outline" size="icon" className="mr-auto" onClick={() => window.print()} title="طباعة">
              <Printer className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="no-print">
          <CardHeader>
            <CardTitle>الفلاتر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>السائق</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل السائقين</SelectItem>
                    {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الشركة</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الشركات</SelectItem>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchData} disabled={loading}>
                <Search className="h-4 w-4 ml-2" />
                {loading ? "جاري التحميل..." : "عرض التقرير"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <Card><CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">عدد الحمولات</p>
            <p className="text-3xl font-bold">{totals.count}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">إجمالي كمية التحميل</p>
            <p className="text-3xl font-bold">{fmt(totals.quantity)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">إجمالي كمية التنزيل</p>
            <p className="text-3xl font-bold">{fmt(totals.unloadQuantity)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">إجمالي الفرق</p>
            <p className="text-3xl font-bold">{fmt(totals.difference)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">إجمالي العمولات</p>
            <p className="text-3xl font-bold">{fmt(totals.commissions)}</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الحمولات ({fromDate} - {toDate})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2">التاريخ</th>
                  <th className="border p-2">رقم الشحنة</th>
                  <th className="border p-2">رقم الفاتورة</th>
                  <th className="border p-2">العميل</th>
                  <th className="border p-2">نوع الحمولة</th>
                  <th className="border p-2">السائق</th>
                  <th className="border p-2">رقم الشاحنة</th>
                  <th className="border p-2">كمية التحميل</th>
                  <th className="border p-2">كمية التنزيل</th>
                  <th className="border p-2">الفرق</th>
                  <th className="border p-2">عمولات</th>
                  <th className="border p-2">التوصيل من</th>
                  <th className="border p-2">التوصيل الى</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={14} className="border p-6 text-center text-muted-foreground">لا توجد بيانات</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td className="border p-2 text-center">{r.date}</td>
                    <td className="border p-2 text-center">{r.load_number}</td>
                    <td className="border p-2 text-center">{r.invoice_number || "-"}</td>
                    <td className="border p-2">{r.companies?.name || "-"}</td>
                    <td className="border p-2">{r.load_types?.name || "-"}</td>
                    <td className="border p-2">{r.drivers?.name || "-"}</td>
                    <td className="border p-2 text-center">{r.truck_number || "-"}</td>
                    <td className="border p-2 text-center">{fmt(Number(r.quantity) || 0)}</td>
                    <td className="border p-2 text-center">{fmt(Number(r.unload_quantity) || 0)}</td>
                    <td className="border p-2 text-center">{fmt((Number(r.quantity) || 0) - (Number(r.unload_quantity) || 0))}</td>
                    <td className="border p-2 text-center">{fmt(Number(r.driver_commission) || 0)}</td>
                    <td className="border p-2">{r.delivery_from || "-"}</td>
                    <td className="border p-2">{r.delivery_to || "-"}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-muted font-bold">
                    <td className="border p-2 text-center" colSpan={7}>الإجمالي</td>
                    <td className="border p-2 text-center">{fmt(totals.quantity)}</td>
                    <td className="border p-2 text-center">{fmt(totals.unloadQuantity)}</td>
                    <td className="border p-2 text-center">{fmt(totals.difference)}</td>
                    <td className="border p-2 text-center">{fmt(totals.commissions)}</td>
                    <td className="border p-2" colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PremiumLoadsReport;
