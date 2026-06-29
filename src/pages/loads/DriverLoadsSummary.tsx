import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Loader2, Printer, Truck, FileDown, Package } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TypeBreakdown {
  typeName: string;
  loadsCount: number;
  totalQuantity: number;
  totalCommission: number;
  totalSales: number;
}

interface DriverRow {
  driverId: string;
  driverName: string;
  loadsCount: number;
  totalQuantity: number;
  totalCommission: number;
  totalSales: number;
  breakdown: TypeBreakdown[];
}

const DriverLoadsSummary = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [printedAt, setPrintedAt] = useState<Date | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverRow | null>(null);
  const [showTypeReport, setShowTypeReport] = useState(false);

  const handleGenerate = async () => {
    if (startDate > endDate) {
      toast({
        title: "خطأ في التواريخ",
        description: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("loads")
          .select("id, driver_id, quantity, commission_amount, driver_commission, delivery_commission, drivers(name), load_types(name)")
          .gte("date", startDate)
          .lte("date", endDate)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // جلب سعر البيع من بنود فواتير العملاء (load_invoice_items) لكل شحنة
      const loadIds = all.map((r) => r.id).filter(Boolean);
      const priceMap = new Map<string, number>();
      const chunkSize = 200;
      try {
        for (let i = 0; i < loadIds.length; i += chunkSize) {
          const chunk = loadIds.slice(i, i + chunkSize);
          const { data: items, error: itemsErr } = await supabase
            .from("load_invoice_items")
            .select("load_id, unit_price")
            .in("load_id", chunk);
          if (itemsErr) {
            console.warn("load_invoice_items fetch error:", itemsErr);
            break;
          }
          (items || []).forEach((it: any) => {
            if (it.load_id) priceMap.set(it.load_id, Number(it.unit_price || 0));
          });
        }
      } catch (priceErr) {
        console.warn("price fetch failed, continuing without sales", priceErr);
      }


      const map = new Map<string, DriverRow & { _types: Map<string, TypeBreakdown> }>();
      for (const r of all) {
        const id = r.driver_id || "unknown";
        const name = (r as any).drivers?.name || "بدون سائق";
        const typeName = (r as any).load_types?.name || "غير محدد";
        const qty = Number(r.quantity || 0);
        const com = Number(r.commission_amount || 0);
        const unitPrice = priceMap.get(r.id) || 0;
        // إجمالي البيع = الكمية × سعر البيع من فاتورة العميل
        const sale = qty * unitPrice;
        let existing = map.get(id);
        if (!existing) {
          existing = {
            driverId: id,
            driverName: name,
            loadsCount: 0,
            totalQuantity: 0,
            totalCommission: 0,
            totalSales: 0,
            breakdown: [],
            _types: new Map(),
          };
          map.set(id, existing);
        }
        existing.loadsCount += 1;
        existing.totalQuantity += qty;
        existing.totalCommission += com;
        existing.totalSales += sale;
        const t = existing._types.get(typeName);
        if (t) {
          t.loadsCount += 1;
          t.totalQuantity += qty;
          t.totalCommission += com;
          t.totalSales += sale;
        } else {
          existing._types.set(typeName, {
            typeName,
            loadsCount: 1,
            totalQuantity: qty,
            totalCommission: com,
            totalSales: sale,
          });
        }
      }
      const result: DriverRow[] = Array.from(map.values())
        .map((d) => ({
          driverId: d.driverId,
          driverName: d.driverName,
          loadsCount: d.loadsCount,
          totalQuantity: d.totalQuantity,
          totalCommission: d.totalCommission,
          totalSales: d.totalSales,
          breakdown: Array.from(d._types.values()).sort(
            (a, b) => b.totalQuantity - a.totalQuantity,
          ),
        }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity);
      setRows(result);
      toast({
        title: "تم إنشاء التقرير",
        description: `عدد السائقين: ${result.length}`,
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "خطأ",
        description: e.message || "تعذر جلب البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(
    () => ({
      loads: rows.reduce((s, r) => s + r.loadsCount, 0),
      qty: rows.reduce((s, r) => s + r.totalQuantity, 0),
      commission: rows.reduce((s, r) => s + r.totalCommission, 0),
      sales: rows.reduce((s, r) => s + r.totalSales, 0),
    }),
    [rows],
  );

  // تجميع عام حسب نوع الشحنة عبر كل السائقين
  const typeSummary = useMemo(() => {
    const map = new Map<string, TypeBreakdown>();
    rows.forEach((r) =>
      r.breakdown.forEach((b) => {
        const existing = map.get(b.typeName);
        if (existing) {
          existing.loadsCount += b.loadsCount;
          existing.totalQuantity += b.totalQuantity;
          existing.totalCommission += b.totalCommission;
          existing.totalSales += b.totalSales;
        } else {
          map.set(b.typeName, { ...b });
        }
      }),
    );
    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [rows]);


  const handlePrint = () => {
    const now = new Date();
    setPrintedAt(now);
    const dateStr = format(now, "PPP - p", { locale: ar });
    const fmtNum = (n: number) =>
      n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const rowsHtml = rows
      .map(
        (r, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td class="r b">${r.driverName}</td>
          <td class="c">${r.loadsCount}</td>
          <td class="c">${fmtNum(r.totalQuantity)}</td>
        </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<title>تقرير شحنات السائقين</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 10mm 12mm 14mm 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: 'Cairo', sans-serif; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { width: 186mm; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0a4a8a; padding-bottom: 4mm; margin-bottom: 5mm; }
  .brand { font-size: 20pt; font-weight: 800; color: #0a4a8a; margin: 0; }
  .subtitle { font-size: 11pt; color: #555; margin-top: 1mm; }
  .meta { text-align: left; font-size: 9.5pt; color: #444; line-height: 1.7; }
  .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm; margin-bottom: 5mm; }
  .stat { border: 1px solid #d6dde6; border-radius: 4px; padding: 4mm; text-align: center; background: #f3f6fb; }
  .stat .lbl { font-size: 9.5pt; color: #666; margin-bottom: 2mm; }
  .stat .num { font-size: 18pt; font-weight: 800; color: #0a4a8a; }
  .band { background: linear-gradient(135deg, #0a4a8a, #1366b8); color: #fff; padding: 3mm 5mm; border-radius: 4px; margin-bottom: 4mm; font-size: 12pt; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { page-break-inside: avoid; }
  th { background: #e8eef7; color: #0a4a8a; border: 1px solid #999; padding: 2mm; font-weight: 700; }
  td { border: 1px solid #bbb; padding: 2mm; }
  .c { text-align: center; }
  .r { text-align: right; }
  .b { font-weight: 600; }
  tfoot td { background: #f3f6fb; font-weight: 700; }
  .footer { margin-top: 6mm; padding-top: 2mm; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 9pt; color: #666; }
</style>
</head>
<body>
<div class="sheet">
  <div class="header">
    <div>
      <h1 class="brand">شركة الرمال الصناعية</h1>
      <div class="subtitle">تقرير شحنات السائقين</div>
    </div>
    <div class="meta">
      تاريخ الطباعة: ${dateStr}<br/>
      الفترة: من ${startDate} إلى ${endDate}<br/>
      عدد السائقين: ${rows.length}
    </div>
  </div>

  <div class="stats">
    <div class="stat"><div class="lbl">إجمالي السائقين</div><div class="num">${rows.length}</div></div>
    <div class="stat"><div class="lbl">إجمالي الشحنات</div><div class="num">${totals.loads}</div></div>
    <div class="stat"><div class="lbl">إجمالي الأطنان</div><div class="num">${fmtNum(totals.qty)}</div></div>
  </div>

  <div class="band">تفاصيل أداء السائقين</div>

  <table>
    <thead>
      <tr>
        <th style="width:12mm">#</th>
        <th>اسم السائق</th>
        <th style="width:30mm">عدد الشحنات</th>
        <th style="width:35mm">إجمالي الأطنان</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr>
        <td colspan="2" class="r">الإجمالي</td>
        <td class="c">${totals.loads}</td>
        <td class="c">${fmtNum(totals.qty)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <span>شركة الرمال الصناعية © ${new Date().getFullYear()}</span>
    <span>تم الطباعة في: ${dateStr}</span>
  </div>
</div>
<script>window.onload = () => { setTimeout(() => { window.print(); setTimeout(() => window.close(), 400); }, 250); };</script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      toast({ title: "تعذر فتح نافذة الطباعة", description: "يرجى السماح بالنوافذ المنبثقة", variant: "destructive" });
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const handlePrintDriver = (driver: DriverRow) => {
    const now = new Date();
    const dateStr = format(now, "PPP - p", { locale: ar });
    const fmtNum = (n: number) =>
      n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<title>تقرير السائق - ${driver.driverName}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 12mm 12mm 14mm 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: 'Cairo', sans-serif; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { width: 186mm; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0a4a8a; padding-bottom: 6mm; margin-bottom: 8mm; }
  .brand { font-size: 22pt; font-weight: 800; color: #0a4a8a; margin: 0; }
  .subtitle { font-size: 12pt; color: #555; margin-top: 2mm; }
  .meta { text-align: left; font-size: 10pt; color: #444; line-height: 1.7; }
  .title-band { background: linear-gradient(135deg, #0a4a8a, #1366b8); color: #fff; padding: 5mm 6mm; border-radius: 4px; margin-bottom: 6mm; }
  .title-band h2 { margin: 0; font-size: 16pt; font-weight: 700; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 8mm; }
  .info-card { border: 1px solid #d6dde6; border-radius: 4px; padding: 4mm 5mm; background: #f7f9fc; }
  .info-card .lbl { font-size: 9pt; color: #666; margin-bottom: 1mm; }
  .info-card .val { font-size: 13pt; font-weight: 700; color: #0a4a8a; }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 4mm; }
  .stat { border: 1px solid #d6dde6; border-radius: 6px; padding: 8mm 6mm; text-align: center; background: #fff; }
  .stat .num { font-size: 28pt; font-weight: 800; color: #0a4a8a; line-height: 1; }
  .stat .lbl { font-size: 11pt; color: #555; margin-top: 3mm; }
  .footer { position: fixed; bottom: 6mm; left: 12mm; right: 12mm; border-top: 1px solid #ccc; padding-top: 2mm; display: flex; justify-content: space-between; font-size: 9pt; color: #666; }
  .signature { margin-top: 25mm; display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; text-align: center; font-size: 11pt; }
  .signature div { border-top: 1px solid #333; padding-top: 3mm; font-weight: 700; }
</style>
</head>
<body>
<div class="sheet">
  <div class="header">
    <div>
      <h1 class="brand">شركة الرمال الصناعية</h1>
      <div class="subtitle">تقرير شحنات السائق</div>
    </div>
    <div class="meta">
      تاريخ الطباعة: ${dateStr}<br/>
      الفترة: من ${startDate} إلى ${endDate}
    </div>
  </div>

  <div class="title-band">
    <h2>كشف أداء السائق</h2>
  </div>

  <div class="info-grid">
    <div class="info-card">
      <div class="lbl">اسم السائق</div>
      <div class="val">${driver.driverName}</div>
    </div>
    <div class="info-card">
      <div class="lbl">رقم السائق</div>
      <div class="val">${driver.driverId.substring(0, 8)}</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="num">${driver.loadsCount}</div>
      <div class="lbl">عدد الشحنات المنفذة</div>
    </div>
    <div class="stat">
      <div class="num">${fmtNum(driver.totalQuantity)}</div>
      <div class="lbl">إجمالي الأطنان</div>
    </div>
  </div>

  <div class="signature">
    <div>المسؤول المباشر</div>
    <div>الإدارة</div>
  </div>
</div>

<div class="footer">
  <span>شركة الرمال الصناعية © ${new Date().getFullYear()}</span>
  <span>تم الطباعة في: ${dateStr}</span>
</div>

<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      toast({ title: "تعذر فتح نافذة الطباعة", variant: "destructive" });
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const printDate = printedAt
    ? format(printedAt, "PPP - p", { locale: ar })
    : "";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm 14mm 12mm; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; inset: 0; width: 100%; padding: 0 !important; margin: 0 !important; }
          .no-print, .no-print * { display: none !important; }
          .print-table { page-break-inside: auto; }
          .print-table tr { page-break-inside: avoid; page-break-after: auto; }
          .print-table thead { display: table-header-group; }
          .print-table tfoot { display: table-footer-group; }
        }
        .print-area { font-family: 'Cairo', sans-serif; }
        @media print {
          .print-header { border-bottom: 2px solid #0a4a8a !important; }
          .print-band { background: #0a4a8a !important; color: #fff !important; }
          .print-table th { background: #e8eef7 !important; color: #0a4a8a !important; border: 1px solid #999 !important; }
          .print-table td { border: 1px solid #bbb !important; }
          .print-total { background: #f3f6fb !important; font-weight: 700 !important; }
          .print-footer { border-top: 1px solid #999 !important; }
        }
      `}</style>

      <header className="border-b bg-card no-print">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/loads" className="hover:text-primary">
            <ArrowRight className="h-6 w-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" />
              تقرير شحنات السائقين
            </h1>
            <p className="text-sm text-muted-foreground">
              ملخص عدد الشحنات وإجمالي الأطنان لكل سائق
            </p>
          </div>
          {rows.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={() => setShowTypeReport(true)} variant="outline" title="تقرير عام حسب نوع الشحنة">
                <Package className="h-4 w-4 ml-2" />
                تقرير حسب الفئة
              </Button>
              <Button onClick={handlePrint} variant="outline">
                <Printer className="h-4 w-4 ml-2" />
                طباعة التقرير الكامل
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 no-print">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={handleGenerate} disabled={loading} size="lg">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري الجلب...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 ml-2" />
                    عرض التقرير
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {rows.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  النتائج: من {startDate} إلى {endDate}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {rows.length} سائق
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">#</TableHead>
                    <TableHead className="text-right">اسم السائق</TableHead>
                    <TableHead className="text-center">عدد الشحنات</TableHead>
                    <TableHead className="text-center">إجمالي الأطنان</TableHead>
                    <TableHead className="text-center">إجمالي العمولات</TableHead>
                    <TableHead className="text-center">إجمالي البيع للعملاء</TableHead>
                    <TableHead className="text-center w-24">طباعة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow
                      key={r.driverId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDriver(r)}
                    >
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium text-primary underline-offset-2 hover:underline">
                        {r.driverName}
                      </TableCell>
                      <TableCell className="text-center">{r.loadsCount}</TableCell>
                      <TableCell className="text-center">
                        {r.totalQuantity.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-emerald-600">
                        {r.totalCommission.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-blue-600">
                        {r.totalSales.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePrintDriver(r)}
                          title="طباعة تقرير هذا السائق"
                        >
                          <FileDown className="h-4 w-4 text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-bold">
                    <TableCell colSpan={2} className="text-right">
                      الإجمالي
                    </TableCell>
                    <TableCell className="text-center">{totals.loads}</TableCell>
                    <TableCell className="text-center">
                      {totals.qty.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-center text-emerald-700">
                      {totals.commission.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-center text-blue-700">
                      {totals.sales.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          !loading && (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                اختر الفترة واضغط "عرض التقرير"
              </p>
            </Card>
          )
        )}
      </main>

      {/* Print area - full report */}
      {rows.length > 0 && (
        <div className="print-area hidden print:block" dir="rtl">
          <div className="print-header flex justify-between items-start pb-3 mb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#0a4a8a] m-0">
                شركة الرمال الصناعية
              </h1>
              <div className="text-sm text-gray-600 mt-1">
                تقرير شحنات السائقين
              </div>
            </div>
            <div className="text-xs text-gray-700 text-left leading-relaxed">
              <div>تاريخ الطباعة: {printDate}</div>
              <div>الفترة: من {startDate} إلى {endDate}</div>
              <div>عدد السائقين: {rows.length}</div>
            </div>
          </div>

          {/* Summary stats at top */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="border border-gray-300 rounded p-3 text-center" style={{ background: "#f3f6fb" }}>
              <div className="text-[9pt] text-gray-600 mb-1">إجمالي السائقين</div>
              <div className="text-xl font-extrabold text-[#0a4a8a]">{rows.length}</div>
            </div>
            <div className="border border-gray-300 rounded p-3 text-center" style={{ background: "#f3f6fb" }}>
              <div className="text-[9pt] text-gray-600 mb-1">إجمالي الشحنات</div>
              <div className="text-xl font-extrabold text-[#0a4a8a]">{totals.loads}</div>
            </div>
            <div className="border border-gray-300 rounded p-3 text-center" style={{ background: "#f3f6fb" }}>
              <div className="text-[9pt] text-gray-600 mb-1">إجمالي الأطنان</div>
              <div className="text-xl font-extrabold text-[#0a4a8a]">
                {totals.qty.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="print-band rounded px-4 py-2 mb-3 text-white">
            <h2 className="text-base font-bold m-0">تفاصيل أداء السائقين</h2>
          </div>

          <table className="print-table w-full border-collapse text-[11pt]">
            <thead>
              <tr>
                <th className="text-center p-2 w-10">#</th>
                <th className="text-right p-2">اسم السائق</th>
                <th className="text-center p-2 w-32">عدد الشحنات</th>
                <th className="text-center p-2 w-36">إجمالي الأطنان</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.driverId}>
                  <td className="text-center p-2">{i + 1}</td>
                  <td className="text-right p-2 font-semibold">{r.driverName}</td>
                  <td className="text-center p-2">{r.loadsCount}</td>
                  <td className="text-center p-2">
                    {r.totalQuantity.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="print-total">
                <td colSpan={2} className="text-right p-2">الإجمالي</td>
                <td className="text-center p-2">{totals.loads}</td>
                <td className="text-center p-2">
                  {totals.qty.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="print-footer mt-6 pt-2 flex justify-between text-[9pt] text-gray-600">
            <span>شركة الرمال الصناعية © {new Date().getFullYear()}</span>
            <span>تم الطباعة في: {printDate}</span>
          </div>
        </div>
      )}

      <Dialog open={!!selectedDriver} onOpenChange={(o) => !o && setSelectedDriver(null)}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              تفاصيل أداء السائق: {selectedDriver?.driverName}
            </DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <div className="text-xs text-muted-foreground">إجمالي الشحنات</div>
                  <div className="text-xl font-extrabold text-primary">
                    {selectedDriver.loadsCount}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <div className="text-xs text-muted-foreground">إجمالي الأطنان</div>
                  <div className="text-xl font-extrabold text-primary">
                    {selectedDriver.totalQuantity.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="rounded-lg border bg-emerald-50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">إجمالي العمولات</div>
                  <div className="text-xl font-extrabold text-emerald-600">
                    {selectedDriver.totalCommission.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="rounded-lg border bg-blue-50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">إجمالي البيع للعملاء</div>
                  <div className="text-xl font-extrabold text-blue-600">
                    {selectedDriver.totalSales.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-right">نوع الشحنة</TableHead>
                      <TableHead className="text-center">عدد الشحنات</TableHead>
                      <TableHead className="text-center">إجمالي الأطنان</TableHead>
                      <TableHead className="text-center">سعر الطن</TableHead>
                      <TableHead className="text-center">إجمالي العمولات</TableHead>
                      <TableHead className="text-center">إجمالي البيع</TableHead>
                      <TableHead className="text-center">النسبة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDriver.breakdown.map((b) => {
                      const pct = selectedDriver.totalQuantity > 0
                        ? (b.totalQuantity / selectedDriver.totalQuantity) * 100
                        : 0;
                      const pricePerTon = b.totalQuantity > 0
                        ? b.totalSales / b.totalQuantity
                        : 0;
                      return (
                        <TableRow key={b.typeName}>
                          <TableCell className="font-semibold">{b.typeName}</TableCell>
                          <TableCell className="text-center">{b.loadsCount}</TableCell>
                          <TableCell className="text-center font-semibold text-primary">
                            {b.totalQuantity.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-amber-600">
                            {pricePerTon.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-emerald-600">
                            {b.totalCommission.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-blue-600">
                            {b.totalSales.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            {pct.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted font-bold">
                      <TableCell>الإجمالي</TableCell>
                      <TableCell className="text-center">{selectedDriver.loadsCount}</TableCell>
                      <TableCell className="text-center">
                        {selectedDriver.totalQuantity.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-center text-amber-700">
                        {(selectedDriver.totalQuantity > 0
                          ? selectedDriver.totalSales / selectedDriver.totalQuantity
                          : 0
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-center text-emerald-700">
                        {selectedDriver.totalCommission.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-center text-blue-700">
                        {selectedDriver.totalSales.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-center">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* تقرير عام حسب نوع الشحنة */}
      <Dialog open={showTypeReport} onOpenChange={setShowTypeReport}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              تقرير عام: المبيعات حسب فئة الشحنة
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="text-right">نوع الشحنة</TableHead>
                  <TableHead className="text-center">عدد الشحنات</TableHead>
                  <TableHead className="text-center">إجمالي الأطنان</TableHead>
                  <TableHead className="text-center">سعر الطن</TableHead>
                  <TableHead className="text-center">إجمالي العمولات</TableHead>
                  <TableHead className="text-center">إجمالي البيع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeSummary.map((t) => {
                  const ppt = t.totalQuantity > 0 ? t.totalSales / t.totalQuantity : 0;
                  return (
                    <TableRow key={t.typeName}>
                      <TableCell className="font-semibold">{t.typeName}</TableCell>
                      <TableCell className="text-center">{t.loadsCount}</TableCell>
                      <TableCell className="text-center font-semibold text-primary">
                        {t.totalQuantity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-amber-600">
                        {ppt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-emerald-600">
                        {t.totalCommission.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-blue-600">
                        {t.totalSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted font-bold">
                  <TableCell>الإجمالي</TableCell>
                  <TableCell className="text-center">{totals.loads}</TableCell>
                  <TableCell className="text-center">
                    {totals.qty.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center text-amber-700">
                    {(totals.qty > 0 ? totals.sales / totals.qty : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center text-emerald-700">
                    {totals.commission.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center text-blue-700">
                    {totals.sales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverLoadsSummary;
