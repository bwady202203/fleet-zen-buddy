import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Printer, Search, FileDown, Eye, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PremiumLoadsPrintPreview, { PremiumLoadPrintRow } from "@/components/loads/PremiumLoadsPrintPreview";

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
  load_date?: string | null;
  unload_date?: string | null;
  companies: { name: string } | null;
  drivers: { name: string } | null;
  load_types: { name: string } | null;
}

interface EditForm {
  id: string;
  date: string;
  load_number: string;
  invoice_number: string;
  truck_number: string;
  quantity: string;
  unload_quantity: string;
  driver_commission: string;
  delivery_from: string;
  delivery_to: string;
  load_date: string;
  unload_date: string;
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
  const [companyName, setCompanyName] = useState("شركة الحمولات");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [driversRes, companiesRes, settingsRes] = await Promise.all([
        supabase.from("drivers").select("id, name").eq("is_active", true).order("name"),
        supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
        supabase.from("company_settings").select("company_name").limit(1).maybeSingle(),
      ]);
      if (driversRes.data) setDrivers(driversRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
      if (settingsRes.data?.company_name) setCompanyName(settingsRes.data.company_name);
    })();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const all: LoadRow[] = [];
      const pageSize = 1000;
      for (let page = 0; page < 20; page++) {
        let query = (supabase as any)
          .from("loads")
          .select(
            "id, date, load_number, invoice_number, truck_number, quantity, unload_quantity, driver_commission, delivery_from, delivery_to, companies(name), drivers(name), load_types(name)"
          )
          .gte("date", fromDate)
          .lte("date", toDate)
          .order("date", { ascending: true })
          .order("load_number", { ascending: true })
          .range(page * pageSize, page * pageSize + pageSize - 1);

        if (driverId !== "all") query = query.eq("driver_id", driverId);
        if (companyId !== "all") query = query.eq("company_id", companyId);

        const { data, error } = await query;
        if (error) throw error;
        const batch = (data as LoadRow[]) || [];
        all.push(...batch);
        if (batch.length < pageSize) break;
      }
      setRows(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const printRows: PremiumLoadPrintRow[] = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        date: r.date,
        load_number: r.load_number,
        invoice_number: r.invoice_number,
        company: r.companies?.name || "",
        load_type: r.load_types?.name || "",
        driver: r.drivers?.name || "",
        truck_number: r.truck_number,
        quantity: Number(r.quantity) || 0,
        unload_quantity: Number(r.unload_quantity) || 0,
        difference: (Number(r.quantity) || 0) - (Number(r.unload_quantity) || 0),
        commission: Number(r.driver_commission) || 0,
        delivery_from: r.delivery_from,
        delivery_to: r.delivery_to,
      })),
    [rows]
  );

  const totals = useMemo(() => ({
    count: rows.length,
    quantity: printRows.reduce((s, r) => s + r.quantity, 0),
    unloadQuantity: printRows.reduce((s, r) => s + r.unload_quantity, 0),
    difference: printRows.reduce((s, r) => s + r.difference, 0),
    commissions: printRows.reduce((s, r) => s + r.commission, 0),
  }), [rows.length, printRows]);

  const hasDeliveryData = useMemo(
    () => printRows.some((r) => (r.delivery_from || "").trim() || (r.delivery_to || "").trim()),
    [printRows]
  );

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dash = (v?: string | null) => (v && String(v).trim() ? v : "—");

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const data = printRows.map((r, i) => ({
      "م": i + 1,
      "التاريخ": r.date,
      "رقم الشحنة": r.load_number,
      "رقم الفاتورة": r.invoice_number || "",
      "العميل": r.company,
      "نوع الحمولة": r.load_type,
      "السائق": r.driver,
      "رقم الشاحنة": r.truck_number || "",
      "كمية التحميل": r.quantity,
      "كمية التنزيل": r.unload_quantity,
      "الفرق": r.difference,
      "العمولة": r.commission,
      "التوصيل من": r.delivery_from || "",
      "التوصيل الى": r.delivery_to || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Premium Loads");
    XLSX.writeFile(wb, `premium-loads-${fromDate}_${toDate}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads/premium-register" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">تقرير الحمولات المميز المفصل</h1>
              <p className="text-muted-foreground mt-1 text-sm">Premium Loads Detailed Report</p>
            </div>
            <div className="mr-auto flex gap-2">
              <Button variant="outline" onClick={exportExcel} className="gap-2">
                <FileDown className="h-4 w-4" /> Excel
              </Button>
              <Button onClick={() => setPreviewOpen(true)} className="gap-2">
                <Eye className="h-4 w-4" /> معاينة الطباعة
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card>
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

        {rows.length > 0 && !hasDeliveryData && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            لا توجد بيانات "التوصيل من / التوصيل الى" محفوظة للحمولات في هذه الفترة — هذه الحقول تُسجَّل فقط من شاشة
            <Link to="/loads/premium-register" className="mx-1 font-semibold underline">تسجيل الحمولات المميز</Link>
            عند اختيار نقاط التحميل والتسليم.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الحمولات ({fromDate} - {toDate})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2">م</th>
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
                {printRows.length === 0 ? (
                  <tr><td colSpan={14} className="border p-6 text-center text-muted-foreground">لا توجد بيانات</td></tr>
                ) : printRows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td className="border p-2 text-center">{i + 1}</td>
                    <td className="border p-2 text-center">{r.date}</td>
                    <td className="border p-2 text-center">{dash(r.load_number)}</td>
                    <td className="border p-2 text-center">{dash(r.invoice_number)}</td>
                    <td className="border p-2">{dash(r.company)}</td>
                    <td className="border p-2">{dash(r.load_type)}</td>
                    <td className="border p-2">{dash(r.driver)}</td>
                    <td className="border p-2 text-center">{dash(r.truck_number)}</td>
                    <td className="border p-2 text-center">{fmt(r.quantity)}</td>
                    <td className="border p-2 text-center">{fmt(r.unload_quantity)}</td>
                    <td className="border p-2 text-center">{fmt(r.difference)}</td>
                    <td className="border p-2 text-center">{fmt(r.commission)}</td>
                    <td className="border p-2">{dash(r.delivery_from)}</td>
                    <td className="border p-2">{dash(r.delivery_to)}</td>
                  </tr>
                ))}
              </tbody>
              {printRows.length > 0 && (
                <tfoot>
                  <tr className="bg-muted font-bold">
                    <td className="border p-2 text-center" colSpan={8}>الإجمالي</td>
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

      <PremiumLoadsPrintPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        rows={printRows}
        companyName={companyName}
        fromDate={fromDate}
        toDate={toDate}
      />
    </div>
  );
};

export default PremiumLoadsReport;
