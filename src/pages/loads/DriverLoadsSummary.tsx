import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Loader2, Printer, Truck } from "lucide-react";
import { format } from "date-fns";
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

interface DriverRow {
  driverId: string;
  driverName: string;
  loadsCount: number;
  totalQuantity: number;
}

const DriverLoadsSummary = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DriverRow[]>([]);

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
      // batch fetch (bypass 1000 limit)
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("loads")
          .select("driver_id, quantity, drivers(name)")
          .gte("date", startDate)
          .lte("date", endDate)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      const map = new Map<string, DriverRow>();
      for (const r of all) {
        const id = r.driver_id || "unknown";
        const name = (r as any).drivers?.name || "بدون سائق";
        const qty = Number(r.quantity || 0);
        const existing = map.get(id);
        if (existing) {
          existing.loadsCount += 1;
          existing.totalQuantity += qty;
        } else {
          map.set(id, {
            driverId: id,
            driverName: name,
            loadsCount: 1,
            totalQuantity: qty,
          });
        }
      }
      const result = Array.from(map.values()).sort(
        (a, b) => b.totalQuantity - a.totalQuantity,
      );
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
    }),
    [rows],
  );

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card print:hidden">
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
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="print:hidden">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.driverId}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.driverName}</TableCell>
                      <TableCell className="text-center">{r.loadsCount}</TableCell>
                      <TableCell className="text-center">
                        {r.totalQuantity.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          !loading && (
            <Card className="p-12 text-center print:hidden">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                اختر الفترة واضغط "عرض التقرير"
              </p>
            </Card>
          )
        )}
      </main>
    </div>
  );
};

export default DriverLoadsSummary;
