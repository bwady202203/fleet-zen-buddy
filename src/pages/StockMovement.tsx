import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowRight, TrendingUp, TrendingDown, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface SparePart {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface StockTransaction {
  id: string;
  spare_part_id: string;
  type: string;
  quantity: number;
  transaction_date: string;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
}

const StockMovement = () => {
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [selectedPart, setSelectedPart] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPartDetails, setSelectedPartDetails] = useState<SparePart | null>(null);
  const [selectedPartTransactions, setSelectedPartTransactions] = useState<StockTransaction[]>([]);

  useEffect(() => {
    loadSpareParts();
    loadStockTransactions();
  }, []);

  const loadSpareParts = async () => {
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .order('name');

      if (error) throw error;
      setSpareParts(data || []);
    } catch (error) {
      console.error('Error loading spare parts:', error);
    }
  };

  const loadStockTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setStockTransactions(data || []);
    } catch (error) {
      console.error('Error loading stock transactions:', error);
    }
  };

  const handlePartClick = async (partId: string) => {
    const part = spareParts.find(p => p.id === partId);
    if (!part) return;

    const partTransactions = stockTransactions.filter(t => t.spare_part_id === partId);
    setSelectedPartDetails(part);
    setSelectedPartTransactions(partTransactions);
    setShowDetailsDialog(true);
  };

  // فلترة الحركات
  const filteredTransactions = stockTransactions.filter((transaction) => {
    const matchesPart = selectedPart === "all" || transaction.spare_part_id === selectedPart;
    const transactionDate = new Date(transaction.transaction_date);
    const matchesStartDate = !startDate || transactionDate >= new Date(startDate);
    const matchesEndDate = !endDate || transactionDate <= new Date(endDate);
    
    return matchesPart && matchesStartDate && matchesEndDate;
  }).sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

  // إحصائيات
  const totalIn = filteredTransactions.filter(t => t.type === "in").reduce((sum, t) => sum + t.quantity, 0);
  const totalOut = filteredTransactions.filter(t => t.type === "out").reduce((sum, t) => sum + Math.abs(t.quantity), 0);

  // إحصائيات للقطعة المحددة
  const partTotalIn = selectedPartTransactions.filter(t => t.type === "in").reduce((sum, t) => sum + t.quantity, 0);
  const partTotalOut = selectedPartTransactions.filter(t => t.type === "out").reduce((sum, t) => sum + Math.abs(t.quantity), 0);

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
                إجمالي الإضافة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{totalIn}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                إجمالي الخصم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{totalOut}</div>
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
                        {part.code} - {part.name}
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
                  <TableHead className="text-right">المرجع</TableHead>
                  <TableHead className="text-right">الملاحظات</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      لا توجد حركات مخزون مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const part = spareParts.find((p) => p.id === transaction.spare_part_id);
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.transaction_date).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {part?.code} - {part?.name || "غير معروف"}
                        </TableCell>
                        <TableCell>
                          {transaction.type === "in" ? (
                            <Badge variant="outline" className="border-green-500 text-green-500">
                              <TrendingUp className="h-3 w-3 ml-1" />
                              إضافة
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-500 text-red-500">
                              <TrendingDown className="h-3 w-3 ml-1" />
                              خصم
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={transaction.type === "in" ? "text-green-500" : "text-red-500"}>
                            {transaction.type === "in" ? "+" : "-"}{Math.abs(transaction.quantity)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {transaction.reference_type || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {transaction.notes || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePartClick(transaction.spare_part_id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Dialog لعرض تفاصيل حركة القطعة */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              تفاصيل حركة: {selectedPartDetails?.code} - {selectedPartDetails?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPartDetails && (
            <>
              {/* معلومات القطعة */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">الكود</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold">{selectedPartDetails.code}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">الكمية الحالية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-primary">{selectedPartDetails.quantity}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">السعر</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold">{selectedPartDetails.unit_price} ر.س</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">القيمة الإجمالية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-primary">
                      {(selectedPartDetails.quantity * selectedPartDetails.unit_price).toFixed(2)} ر.س
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* إحصائيات الحركة */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">إجمالي الحركات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{selectedPartTransactions.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      إجمالي الإضافة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-green-500">{partTotalIn}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      إجمالي الخصم
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-red-500">{partTotalOut}</div>
                  </CardContent>
                </Card>
              </div>

              {/* جدول الحركات التفصيلي */}
              <Card>
                <CardHeader>
                  <CardTitle>سجل الحركات التفصيلي</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">نوع الحركة</TableHead>
                        <TableHead className="text-right">الكمية</TableHead>
                        <TableHead className="text-right">المرجع</TableHead>
                        <TableHead className="text-right">الملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPartTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            لا توجد حركات لهذه القطعة
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedPartTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {new Date(transaction.transaction_date).toLocaleDateString('en-GB')}
                            </TableCell>
                            <TableCell>
                              {transaction.type === "in" ? (
                                <Badge variant="outline" className="border-green-500 text-green-500">
                                  <TrendingUp className="h-3 w-3 ml-1" />
                                  إضافة
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-red-500 text-red-500">
                                  <TrendingDown className="h-3 w-3 ml-1" />
                                  خصم
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={transaction.type === "in" ? "text-green-500" : "text-red-500"}>
                                {transaction.type === "in" ? "+" : "-"}{Math.abs(transaction.quantity)}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {transaction.reference_type || "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {transaction.notes || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockMovement;
