import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, ArrowRight, Package, CheckCircle2 } from "lucide-react";
import { useSpareParts } from "@/contexts/SparePartsContext";

const LowStockAlerts = () => {
  const { spareParts } = useSpareParts();

  const lowStockParts = spareParts.filter(
    (part) => part.quantity <= part.minQuantity
  );

  const outOfStockParts = lowStockParts.filter((part) => part.quantity === 0);
  const warningParts = lowStockParts.filter((part) => part.quantity > 0);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/10">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">تنبيهات المخزون المنخفض</h1>
              <p className="text-sm text-muted-foreground">
                قطع الغيار التي تحتاج إلى إعادة طلب
              </p>
            </div>
          </div>
          <Link to="/spare-parts">
            <Button variant="outline" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              العودة لإدارة قطع الغيار
            </Button>
          </Link>
        </div>

        {/* بطاقات إحصائية */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي التنبيهات</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{lowStockParts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">نفد المخزون</CardTitle>
              <Package className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{outOfStockParts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">قارب على النفاد</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{warningParts.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* الجدول */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة قطع الغيار التي تحتاج إعادة طلب</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockParts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-semibold">لا توجد تنبيهات حالياً</p>
                <p className="text-sm text-muted-foreground mt-1">
                  جميع قطع الغيار في المخزون بمستويات آمنة
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم القطعة</TableHead>
                    <TableHead className="text-right">الكمية الحالية</TableHead>
                    <TableHead className="text-right">الحد الأدنى</TableHead>
                    <TableHead className="text-right">الوحدة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell className="font-medium">{part.name}</TableCell>
                      <TableCell>{part.quantity}</TableCell>
                      <TableCell>{part.minQuantity}</TableCell>
                      <TableCell>{part.unit}</TableCell>
                      <TableCell>
                        {part.quantity === 0 ? (
                          <Badge variant="destructive">نفد المخزون</Badge>
                        ) : (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                            مخزون منخفض
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LowStockAlerts;
