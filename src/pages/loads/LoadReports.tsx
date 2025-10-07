import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, FileText, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

interface DriverPayment {
  id: string;
  amount: number;
  payment_date: string;
  notes: string;
}

interface DriverReport {
  driverId: string;
  driverName: string;
  loads: any[];
  totalCommission: number;
  totalPaid: number;
  remaining: number;
}

const LoadReports = () => {
  const [driverReports, setDriverReports] = useState<DriverReport[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedDriverForPayment, setSelectedDriverForPayment] = useState<DriverReport | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    loadDrivers();
    loadDriverReports();
  }, []);

  const loadDrivers = async () => {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setDrivers(data);
    }
  };

  const loadDriverReports = async () => {
    const { data: loads } = await supabase
      .from('loads')
      .select(`
        *,
        drivers(id, name),
        companies(name),
        load_types(name, commission_rate)
      `);

    const { data: payments } = await supabase
      .from('driver_payments')
      .select('*');

    if (loads) {
      const grouped = loads.reduce((acc: any, load: any) => {
        const driverId = load.drivers?.id || 'unknown';
        const driverName = load.drivers?.name || 'غير محدد';
        if (!acc[driverId]) {
          acc[driverId] = {
            driverId,
            driverName,
            loads: [],
          };
        }
        acc[driverId].loads.push(load);
        return acc;
      }, {});

      const reports: DriverReport[] = Object.values(grouped).map((group: any) => {
        const totalCommission = group.loads.reduce((sum: number, load: any) => sum + (load.commission_amount || 0), 0);
        const driverPayments = payments?.filter((p: any) => p.driver_id === group.driverId) || [];
        const totalPaid = driverPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        
        return {
          driverId: group.driverId,
          driverName: group.driverName,
          loads: group.loads,
          totalCommission,
          totalPaid,
          remaining: totalCommission - totalPaid
        };
      });

      setDriverReports(reports);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedDriverForPayment || !paymentAmount) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال المبلغ",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedDriverForPayment.remaining) {
      toast({
        title: "خطأ",
        description: "المبلغ غير صحيح",
        variant: "destructive",
      });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('driver_payments')
      .insert({
        driver_id: selectedDriverForPayment.driverId,
        amount,
        notes: paymentNotes,
        created_by: userData?.user?.id,
      });

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة سند التحويل",
        variant: "destructive",
      });
    } else {
      toast({
        title: "نجح",
        description: "تم إضافة سند التحويل بنجاح",
      });
      setPaymentDialog(false);
      setPaymentAmount("");
      setPaymentNotes("");
      setSelectedDriverForPayment(null);
      loadDriverReports();
    }
  };

  const filteredReports = selectedDriver === "all" 
    ? driverReports 
    : driverReports.filter(r => r.driverId === selectedDriver);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">التقارير</h1>
              <p className="text-muted-foreground mt-1">تقارير الحمولات والعمولات</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                تقرير السائقين والعمولات
              </CardTitle>
              <div className="w-64">
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر السائق" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع السائقين</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {filteredReports.map((report) => (
              <div key={report.driverId} className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{report.driverName}</h3>
                    <Dialog open={paymentDialog && selectedDriverForPayment?.driverId === report.driverId} 
                            onOpenChange={(open) => {
                              setPaymentDialog(open);
                              if (open) setSelectedDriverForPayment(report);
                              else setSelectedDriverForPayment(null);
                            }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={report.remaining <= 0}
                        >
                          <Send className="h-4 w-4 ml-2" />
                          سند تحويل
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>سند تحويل للسائق: {report.driverName}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>المبلغ المتبقي المستحق</Label>
                            <div className="text-2xl font-bold text-primary">
                              {report.remaining.toFixed(2)} ر.س
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="payment-amount">المبلغ المحول</Label>
                            <Input
                              id="payment-amount"
                              type="number"
                              placeholder="0.00"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              max={report.remaining}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="payment-notes">ملاحظات</Label>
                            <Textarea
                              id="payment-notes"
                              placeholder="أدخل ملاحظات إضافية..."
                              value={paymentNotes}
                              onChange={(e) => setPaymentNotes(e.target.value)}
                            />
                          </div>
                          <Button onClick={handleAddPayment} className="w-full">
                            تأكيد التحويل
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="text-right space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي العمولات</p>
                      <p className="text-xl font-bold text-primary">
                        {report.totalCommission.toFixed(2)} ر.س
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">المدفوع</p>
                      <p className="text-lg font-semibold text-green-600">
                        {report.totalPaid.toFixed(2)} ر.س
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">المتبقي</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {report.remaining.toFixed(2)} ر.س
                      </p>
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الشحنة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>نوع الحمولة</TableHead>
                      <TableHead>المبلغ الإجمالي</TableHead>
                      <TableHead>العمولة المستحقة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.loads.map((load: any) => (
                      <TableRow key={load.id}>
                        <TableCell className="font-medium">{load.load_number}</TableCell>
                        <TableCell>{new Date(load.date).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>{load.companies?.name || '-'}</TableCell>
                        <TableCell>{load.load_types?.name || '-'}</TableCell>
                        <TableCell>{load.total_amount.toFixed(2)} ر.س</TableCell>
                        <TableCell className="font-bold text-primary">
                          {load.commission_amount.toFixed(2)} ر.س
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LoadReports;
