import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Printer, Factory, Loader2, RefreshCw, Scale, Truck, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { groupReportStyles } from "./GroupReportPrint";
import { CrusherReportDocument, CrusherReportPrintPortal } from "./CrusherReportPrint";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Shipment {
  id: string;
  shipment_number: string | null;
  entry_date: string;
  company_name: string | null;
  client_name: string | null;
  driver_name: string | null;
  supplier_name: string | null;
  net_weight: number | null;
  invoice_number: string | null;
  invoice_value: number | null;
  material_types: { name: string } | null;
}

const tons = (kg: number) => (kg / 1000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

const CrusherReportTab = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today.slice(0, 8) + "01");
  const [toDate, setToDate] = useState(today);
  const [rows, setRows] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("crusher-report", { body: { from: fromDate, to: toDate } });
    if (error || data?.error) setError("تعذر جلب بيانات الكسارة");
    else setRows(data.shipments ?? []);
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const totalKg = rows.reduce((s, r) => s + Number(r.net_weight || 0), 0);
  const group = (key: (r: Shipment) => string) => {
    const m = new Map<string, { n: number; kg: number }>();
    rows.forEach((r) => {
      const k = key(r) || "غير محدد";
      const v = m.get(k) ?? { n: 0, kg: 0 };
      v.n++; v.kg += Number(r.net_weight || 0);
      m.set(k, v);
    });
    return [...m.entries()].sort((a, b) => b[1].kg - a[1].kg);
  };
  const byMaterial = useMemo(() => group((r) => r.material_types?.name ?? ""), [rows]);
  const byClient = useMemo(() => group((r) => r.client_name?.trim() ?? ""), [rows]);

  const Summary = ({ title, data }: { title: string; data: [string, { n: number; kg: number }][] }) => (
    <Card>
      <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-right">البيان</TableHead>
            <TableHead className="text-right">عدد الشحنات</TableHead>
            <TableHead className="text-left">الأطنان</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map(([k, v]) => (
              <TableRow key={k}><TableCell>{k}</TableCell><TableCell>{v.n}</TableCell>
                <TableCell className="text-left font-semibold">{tons(v.kg)}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <style>{groupReportStyles}</style>
      <CrusherReportPrintPortal fromDate={fromDate} toDate={toDate} rows={rows} byMaterial={byMaterial} byClient={byClient} />
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[230mm] max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <DialogTitle>معاينة تقرير الكسارة — A4</DialogTitle>
            <Button size="sm" className="gap-2 ml-8" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> طباعة / تحميل PDF
            </Button>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md">
            <div className="bg-background shadow-lg mx-auto" style={{ width: "210mm", minHeight: "297mm", padding: "14mm" }}>
              <CrusherReportDocument fromDate={fromDate} toDate={toDate} rows={rows} byMaterial={byMaterial} byClient={byClient} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1.5"><Label htmlFor="cr-from">من تاريخ</Label>
            <Input id="cr-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-44" /></div>
          <div className="space-y-1.5"><Label htmlFor="cr-to">إلى تاريخ</Label>
            <Input id="cr-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-44" /></div>
          <Button onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تحديث التقرير
          </Button>
          <Button variant="outline" className="gap-2" disabled={loading} onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" /> معاينة
          </Button>
          <Button variant="outline" className="gap-2" disabled={loading} onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> تحميل PDF
          </Button>
          <span className="flex items-center gap-2 text-sm text-muted-foreground"><Factory className="h-4 w-4" />البيانات تُستورد مباشرة من برنامج الكسارة</span>
        </CardContent>
      </Card>

      {error && <Card className="border-destructive"><CardContent className="pt-6 text-destructive font-medium">{error}</CardContent></Card>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { l: "عدد الشحنات", v: rows.length.toString(), I: Truck },
          { l: "إجمالي الأطنان", v: tons(totalKg), I: Scale },
          { l: "عدد العملاء", v: byClient.length.toString(), I: Building2 },
        ].map(({ l, v, I }) => (
          <Card key={l}><CardContent className="pt-6 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><I className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold">{v}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Summary title="الأطنان حسب المادة" data={byMaterial} />
        <Summary title="الأطنان حسب العميل" data={byClient} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">شحنات الكسارة خلال الفترة</CardTitle></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-right">رقم الشحنة</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">العميل</TableHead>
              <TableHead className="text-right">المادة</TableHead>
              <TableHead className="text-right">السائق</TableHead>
              <TableHead className="text-left">الصافي (طن)</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline-block ml-2" />جاري استيراد البيانات...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">لا توجد شحنات في هذه الفترة</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.shipment_number || "-"}</TableCell>
                  <TableCell>{dt(r.entry_date)}</TableCell>
                  <TableCell>{r.client_name || "-"}</TableCell>
                  <TableCell>{r.material_types?.name || "-"}</TableCell>
                  <TableCell>{r.driver_name || "-"}</TableCell>
                  <TableCell className="text-left font-semibold">{tons(Number(r.net_weight || 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div></CardContent>
      </Card>
    </div>
  );
};

export default CrusherReportTab;
