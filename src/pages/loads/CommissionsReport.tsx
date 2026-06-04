import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Printer, FileDown, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  date: string;
  load_number: string;
  invoice_number: string | null;
  driver_name: string;
  company_name: string;
  load_type_name: string;
  quantity: number;
  driver_commission: number;
  delivery_commission: number;
}

export default function CommissionsReport() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    driverId: "all",
    companyId: "all",
    loadTypeId: "all",
    invoiceNumber: "",
  });

  useEffect(() => {
    (async () => {
      const [d, c, t] = await Promise.all([
        supabase.from("drivers").select("id,name").eq("is_active", true).order("name"),
        supabase.from("companies").select("id,name").eq("is_active", true).order("name"),
        supabase.from("load_types").select("id,name").eq("is_active", true).order("name"),
      ]);
      if (d.data) setDrivers(d.data);
      if (c.data) setCompanies(c.data);
      if (t.data) setLoadTypes(t.data);
    })();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("loads")
        .select(
          "id,date,load_number,invoice_number,quantity,driver_commission,delivery_commission,drivers(name),companies(name),load_types(name)"
        )
        .order("date", { ascending: false })
        .limit(5000);

      if (filters.from) q = q.gte("date", filters.from);
      if (filters.to) q = q.lte("date", filters.to);
      if (filters.driverId !== "all") q = q.eq("driver_id", filters.driverId);
      if (filters.companyId !== "all") q = q.eq("company_id", filters.companyId);
      if (filters.loadTypeId !== "all") q = q.eq("load_type_id", filters.loadTypeId);
      if (filters.invoiceNumber.trim()) q = q.ilike("invoice_number", `%${filters.invoiceNumber.trim()}%`);

      const { data, error } = await q;
      if (error) throw error;

      const mapped: Row[] = (data || []).map((r: any) => ({
        id: r.id,
        date: r.date,
        load_number: r.load_number,
        invoice_number: r.invoice_number,
        driver_name: r.drivers?.name || "-",
        company_name: r.companies?.name || "-",
        load_type_name: r.load_types?.name || "-",
        quantity: Number(r.quantity || 0),
        driver_commission: Number(r.driver_commission || 0),
        delivery_commission: Number(r.delivery_commission || 0),
      }));
      setRows(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.qty += r.quantity;
        acc.driver += r.driver_commission;
        acc.delivery += r.delivery_commission;
        return acc;
      },
      { qty: 0, driver: 0, delivery: 0 }
    );
  }, [rows]);

  const exportCSV = () => {
    const headers = [
      "التاريخ",
      "رقم الشحنة",
      "رقم الفاتورة",
      "السائق",
      "الشركة",
      "نوع المواد",
      "الكمية",
      "عمولة السائق",
      "عمولة التوصيل",
    ];
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.date,
          r.load_number,
          r.invoice_number || "",
          r.driver_name,
          r.company_name,
          r.load_type_name,
          r.quantity,
          r.driver_commission,
          r.delivery_commission,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commissions_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card no-print">
        <div className="container mx-auto px-4 py-6 flex items-center gap-4">
          <Link to="/loads" className="hover:text-primary">
            <ArrowRight className="h-6 w-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">تقرير العمولات</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              عمولات السائق والتوصيل حسب السائق والشركة والفترة والفاتورة
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <FileDown className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> طباعة
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4 print-area">
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" /> الفلاتر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div>
                <Label>من تاريخ</Label>
                <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
              </div>
              <div>
                <Label>السائق</Label>
                <Select value={filters.driverId} onValueChange={(v) => setFilters({ ...filters, driverId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الشركة</Label>
                <Select value={filters.companyId} onValueChange={(v) => setFilters({ ...filters, companyId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>نوع المواد</Label>
                <Select value={filters.loadTypeId} onValueChange={(v) => setFilters({ ...filters, loadTypeId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {loadTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>رقم الفاتورة</Label>
                <Input value={filters.invoiceNumber} onChange={(e) => setFilters({ ...filters, invoiceNumber: e.target.value })} placeholder="بحث..." />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={fetchReport} disabled={loading}>{loading ? "جاري التحميل..." : "عرض التقرير"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">النتائج ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">رقم الشحنة</TableHead>
                    <TableHead className="text-right">رقم الفاتورة</TableHead>
                    <TableHead className="text-right">السائق</TableHead>
                    <TableHead className="text-right">الشركة</TableHead>
                    <TableHead className="text-right">نوع المواد</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">عمولة السائق</TableHead>
                    <TableHead className="text-right">عمولة التوصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا توجد بيانات</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell>{r.load_number}</TableCell>
                        <TableCell>{r.invoice_number || "-"}</TableCell>
                        <TableCell>{r.driver_name}</TableCell>
                        <TableCell>{r.company_name}</TableCell>
                        <TableCell>{r.load_type_name}</TableCell>
                        <TableCell>{r.quantity.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-blue-600">{r.driver_commission.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">{r.delivery_commission.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {rows.length > 0 && (
                  <tfoot>
                    <TableRow className="font-bold bg-muted/40">
                      <TableCell colSpan={6} className="text-right">الإجمالي</TableCell>
                      <TableCell>{totals.qty.toLocaleString()}</TableCell>
                      <TableCell className="text-blue-700">{totals.driver.toLocaleString()}</TableCell>
                      <TableCell className="text-emerald-700">{totals.delivery.toLocaleString()}</TableCell>
                    </TableRow>
                  </tfoot>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
