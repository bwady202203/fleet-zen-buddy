import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useSpareParts } from "@/contexts/SparePartsContext";

const StockMovement = () => {
  const { spareParts, stockTransactions } = useSpareParts();
  const [selectedPart, setSelectedPart] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // فلترة الحركات
  const filteredTransactions = stockTransactions.filter((transaction) => {
    const matchesPart = selectedPart === "all" || transaction.sparePartId === selectedPart;
    const transactionDate = new Date(transaction.date);
    const matchesStartDate = !startDate || transactionDate >= new Date(startDate);
    const matchesEndDate = !endDate || transactionDate <= new Date(endDate);
    
    return matchesPart && matchesStartDate && matchesEndDate;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // إحصائيات
  const totalPurchases = filteredTransactions.filter(t => t.type === "purchase").reduce((sum, t) => sum + t.quantity, 0);
  const totalMaintenances = filteredTransactions.filter(t => t.type === "maintenance").reduce((sum, t) => sum + Math.abs(t.quantity), 0);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">تقرير حركة المخزون</h1>
            </div>
            <Link to="/spare-parts">
              <Button variant="outline">
                العودة لقطع الغيار
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي الحركات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredTransactions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                إجمالي المشتريات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{totalPurchases}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                إجمالي الصيانة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{totalMaintenances}</div>
            </CardContent>
          </Card>
        </div>

        {/* الفلاتر */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>فلتر الحركات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>قطعة الغيار</Label>
                <Select value={selectedPart} onValueChange={setSelectedPart}>
                  <SelectTrigger className="text-right">
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
              <div>
                <Label htmlFor="startDate">من تاريخ</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-right"
                />
              </div>
              <div>
                <Label htmlFor="endDate">إلى تاريخ</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-right"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* جدول الحركات */}
        <Card>
          <CardHeader>
            <CardTitle>سجل الحركات</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">قطعة الغيار</TableHead>
                  <TableHead className="text-right">نوع الحركة</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">الرصيد بعد الحركة</TableHead>
                  <TableHead className="text-right">الملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      لا توجد حركات مخزون مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const part = spareParts.find((p) => p.id === transaction.sparePartId);
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>{new Date(transaction.date).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell className="font-medium">{part?.name || "غير معروف"}</TableCell>
                        <TableCell>
                          {transaction.type === "purchase" ? (
                            <Badge variant="outline" className="border-green-500 text-green-500">
                              <TrendingUp className="h-3 w-3 ml-1" />
                              مشتريات
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-500 text-red-500">
                              <TrendingDown className="h-3 w-3 ml-1" />
                              صيانة
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={transaction.quantity > 0 ? "text-green-500" : "text-red-500"}>
                            {transaction.quantity > 0 ? "+" : ""}{transaction.quantity} {part?.unit}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {transaction.balanceAfter} {part?.unit}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{transaction.notes}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StockMovement;
