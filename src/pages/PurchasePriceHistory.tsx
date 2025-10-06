import { useState, useMemo } from "react";
import { useSpareParts } from "@/contexts/SparePartsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, TrendingDown, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

interface PriceHistoryRecord {
  date: string;
  supplier: string;
  quantity: number;
  price: number;
  totalCost: number;
  purchaseId: string;
}

const PurchasePriceHistory = () => {
  const { spareParts, purchases } = useSpareParts();
  const [selectedPart, setSelectedPart] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const priceHistory = useMemo(() => {
    const history: PriceHistoryRecord[] = [];

    purchases.forEach((purchase) => {
      purchase.spareParts.forEach((item) => {
        const part = spareParts.find((p) => p.id === item.sparePartId);
        if (part) {
          history.push({
            date: purchase.date,
            supplier: purchase.supplier,
            quantity: item.quantity,
            price: item.price,
            totalCost: item.quantity * item.price,
            purchaseId: purchase.id,
          });
        }
      });
    });

    return history;
  }, [purchases, spareParts]);

  const filteredHistory = useMemo(() => {
    return priceHistory
      .filter((record) => {
        const matchPart =
          selectedPart === "all" ||
          purchases
            .find((p) => p.id === record.purchaseId)
            ?.spareParts.some((sp) => sp.sparePartId === selectedPart);
        const matchStartDate = !startDate || record.date >= startDate;
        const matchEndDate = !endDate || record.date <= endDate;
        
        return matchPart && matchStartDate && matchEndDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [priceHistory, selectedPart, startDate, endDate, purchases]);

  const partPriceStats = useMemo(() => {
    if (selectedPart === "all") return null;

    const partHistory = filteredHistory.filter((record) =>
      purchases
        .find((p) => p.id === record.purchaseId)
        ?.spareParts.some((sp) => sp.sparePartId === selectedPart)
    );

    if (partHistory.length === 0) return null;

    const prices = partHistory.map((r) => r.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const lastPrice = partHistory[0]?.price || 0;

    return {
      minPrice,
      maxPrice,
      avgPrice,
      lastPrice,
      totalPurchases: partHistory.length,
    };
  }, [selectedPart, filteredHistory, purchases]);

  const selectedPartName = useMemo(() => {
    if (selectedPart === "all") return "جميع القطع";
    return spareParts.find((p) => p.id === selectedPart)?.name || "";
  }, [selectedPart, spareParts]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/purchases">
                <Button variant="ghost" size="icon">
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary">
                  <BarChart3 className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold">تقرير سجل أسعار المشتريات</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>الفلاتر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>قطعة الغيار</Label>
                <Select value={selectedPart} onValueChange={setSelectedPart}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر قطعة الغيار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع القطع</SelectItem>
                    {spareParts.map((part) => (
                      <SelectItem key={part.id} value={part.id}>
                        {part.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">من تاريخ</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">إلى تاريخ</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedPart !== "all" && partPriceStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">آخر سعر</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{partPriceStats.lastPrice.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">ر.س</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">أقل سعر</CardTitle>
                <TrendingDown className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{partPriceStats.minPrice.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">ر.س</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">أعلى سعر</CardTitle>
                <TrendingUp className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{partPriceStats.maxPrice.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">ر.س</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط السعر</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{partPriceStats.avgPrice.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">ر.س ({partPriceStats.totalPurchases} عملية)</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              سجل الأسعار - {selectedPartName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد سجلات مطابقة للفلاتر المحددة
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">قطعة الغيار</TableHead>
                      <TableHead className="text-right">المورد</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">سعر الوحدة</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((record, index) => {
                      const purchase = purchases.find((p) => p.id === record.purchaseId);
                      const sparePartIds = purchase?.spareParts.map((sp) => sp.sparePartId) || [];
                      
                      return purchase?.spareParts
                        .filter((sp) => selectedPart === "all" || sp.sparePartId === selectedPart)
                        .map((item) => {
                          const part = spareParts.find((p) => p.id === item.sparePartId);
                          return (
                            <TableRow key={`${record.purchaseId}-${item.sparePartId}`}>
                              <TableCell>{new Date(record.date).toLocaleDateString('ar-SA')}</TableCell>
                              <TableCell className="font-medium">{part?.name}</TableCell>
                              <TableCell>{record.supplier}</TableCell>
                              <TableCell>{item.quantity} {part?.unit}</TableCell>
                              <TableCell className="font-semibold">{item.price.toFixed(2)} ر.س</TableCell>
                              <TableCell className="font-bold">{(item.quantity * item.price).toFixed(2)} ر.س</TableCell>
                            </TableRow>
                          );
                        });
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PurchasePriceHistory;
