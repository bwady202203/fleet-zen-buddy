import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowRight, TrendingUp, TrendingDown, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useSpareParts } from "@/contexts/SparePartsContext";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface StockTransaction {
  id: string;
  spare_part_id: string;
  type: string;
  quantity: number;
  transaction_date: string;
  notes: string;
  reference_type: string;
  reference_id: string;
}

const StockMovement = () => {
  const { spareParts } = useSpareParts();
  const [selectedPart, setSelectedPart] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [selectedPartDetails, setSelectedPartDetails] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [partTransactions, setPartTransactions] = useState<StockTransaction[]>([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('خطأ في تحميل الحركات:', error);
    }
  };

  const handlePartClick = async (partId: string) => {
    const part = spareParts.find(p => p.id === partId);
    if (!part) return;

    setSelectedPartDetails(part);
    
    try {
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('*')
        .eq('spare_part_id', partId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setPartTransactions(data || []);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('خطأ في تحميل تفاصيل الحركات:', error);
    }
  };

  // فلترة الحركات
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesPart = selectedPart === "all" || transaction.spare_part_id === selectedPart;
    const transactionDate = new Date(transaction.transaction_date);
    const matchesStartDate = !startDate || transactionDate >= new Date(startDate);
    const matchesEndDate = !endDate || transactionDate <= new Date(endDate);
    
    return matchesPart && matchesStartDate && matchesEndDate;
  });

  // إحصائيات
  const totalIn = filteredTransactions.filter(t => t.type === "in").reduce((sum, t) => sum + t.quantity, 0);
  const totalOut = filteredTransactions.filter(t => t.type === "out").reduce((sum, t) => sum + Math.abs(t.quantity), 0);

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
                <Combobox
                  options={[
                    { value: "all", label: "جميع القطع", searchLabel: "جميع القطع" },
                    ...spareParts.map(part => ({
                      value: part.id,
                      label: `${part.code} - ${part.name}`,
                      searchLabel: `${part.code}${part.name}`,
                    }))
                  ]}
                  value={selectedPart}
                  onValueChange={setSelectedPart}
                  placeholder="ابحث عن قطعة غيار..."
                  searchPlaceholder="اكتب للبحث..."
                  emptyText="لا توجد قطع غيار"
                />
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
                  <TableHead className="text-right">نوع المرجع</TableHead>
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
                        <TableCell>{new Date(transaction.transaction_date).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell className="font-medium">{part?.name || "غير معروف"}</TableCell>
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
                        <TableCell>
                          <Badge variant="secondary">
                            {transaction.reference_type === "purchase_invoice" ? "فاتورة شراء" : 
                             transaction.reference_type === "maintenance_request" ? "طلب صيانة" : 
                             transaction.reference_type || "غير محدد"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{transaction.notes}</TableCell>
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

        {/* حوار تفاصيل حركات القطعة */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl">
                تفاصيل حركة: {selectedPartDetails?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* معلومات القطعة */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">معلومات القطعة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground">الكود</Label>
                      <p className="font-medium">{selectedPartDetails?.code}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">الكمية الحالية</Label>
                      <p className="font-medium text-lg">{selectedPartDetails?.quantity}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">السعر</Label>
                      <p className="font-medium">{selectedPartDetails?.price} ريال</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* إحصائيات الحركات */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      إجمالي الحركات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{partTransactions.length}</div>
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
                    <div className="text-2xl font-bold text-green-500">
                      {partTransactions.filter(t => t.type === "in").reduce((sum, t) => sum + t.quantity, 0)}
                    </div>
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
                    <div className="text-2xl font-bold text-red-500">
                      {Math.abs(partTransactions.filter(t => t.type === "out").reduce((sum, t) => sum + t.quantity, 0))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* جدول الحركات */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">سجل الحركات</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الكمية</TableHead>
                        <TableHead className="text-right">المرجع</TableHead>
                        <TableHead className="text-right">الملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            لا توجد حركات
                          </TableCell>
                        </TableRow>
                      ) : (
                        partTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {new Date(transaction.transaction_date).toLocaleDateString('ar-SA')}
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
                              <span className={transaction.type === "in" ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                                {transaction.type === "in" ? "+" : "-"}{Math.abs(transaction.quantity)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {transaction.reference_type === "purchase_invoice" ? "فاتورة شراء" : 
                                 transaction.reference_type === "maintenance_request" ? "طلب صيانة" : 
                                 transaction.reference_type || "غير محدد"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {transaction.notes}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default StockMovement;
