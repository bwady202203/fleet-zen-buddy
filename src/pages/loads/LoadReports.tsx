import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, FileText, Send, Printer, Eye, Trash2, Building2, Download, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HijriDate, { toHijri } from 'hijri-converter';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  
  // Company report states
  const [companyLoads, setCompanyLoads] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterLoadType, setFilterLoadType] = useState<string>("all");
  const [filterDriver, setFilterDriver] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    loadDrivers();
    loadDriverReports();
    loadCompanyLoads();
    loadCompanies();
    loadLoadTypes();
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
        const totalCommission = group.loads.reduce((sum: number, load: any) => sum + (load.total_amount || 0), 0);
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

  const handleDeleteLoad = async (loadId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحمولة؟')) return;

    const { error } = await supabase
      .from('loads')
      .delete()
      .eq('id', loadId);

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الحمولة",
        variant: "destructive",
      });
    } else {
      toast({
        title: "نجح",
        description: "تم حذف الحمولة بنجاح",
      });
      loadDriverReports();
    }
  };

  const loadCompanyLoads = async () => {
    const { data } = await supabase
      .from('loads')
      .select(`
        *,
        drivers(id, name),
        companies(id, name),
        load_types(id, name)
      `)
      .order('date', { ascending: false });
    
    if (data) {
      setCompanyLoads(data);
    }
  };

  const loadCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setCompanies(data);
    }
  };

  const loadLoadTypes = async () => {
    const { data } = await supabase
      .from('load_types')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setLoadTypes(data);
    }
  };

  const convertToHijri = (gregorianDate: string) => {
    const date = new Date(gregorianDate);
    const hijri = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${hijri.hy}-${String(hijri.hm).padStart(2, '0')}-${String(hijri.hd).padStart(2, '0')}`;
  };

  const handlePrintLoad = (load: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>طباعة الحمولة - ${load.load_number}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>تفاصيل الحمولة</h1>
            <table>
              <tr><th>رقم الشحنة</th><td>${load.load_number}</td></tr>
              <tr><th>التاريخ</th><td>${new Date(load.date).toLocaleDateString('ar-SA')}</td></tr>
              <tr><th>العميل</th><td>${load.companies?.name || '-'}</td></tr>
              <tr><th>نوع الحمولة</th><td>${load.load_types?.name || '-'}</td></tr>
              <tr><th>الكمية</th><td>${load.quantity}</td></tr>
              <tr><th>المبلغ المستحق</th><td>${load.total_amount.toFixed(2)} ر.س</td></tr>
            </table>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const filteredReports = driverReports
    .filter(r => selectedDriver === "all" || r.driverId === selectedDriver)
    .map(report => ({
      ...report,
      loads: report.loads.filter((load: any) => {
        const loadDate = new Date(load.date);
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (loadDate < fromDate) return false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (loadDate > toDate) return false;
        }
        return true;
      })
    }))
    .map(report => {
      const totalCommission = report.loads.reduce((sum: number, load: any) => sum + (load.total_amount || 0), 0);
      const driverPayments = report.loads.length > 0 ? 
        driverReports.find(r => r.driverId === report.driverId)?.totalPaid || 0 : 0;
      return {
        ...report,
        totalCommission,
        remaining: totalCommission - driverPayments
      };
    })
    .filter(report => report.loads.length > 0);

  const filteredCompanyLoads = companyLoads.filter(load => {
    if (filterCompany !== "all" && load.company_id !== filterCompany) return false;
    if (filterLoadType !== "all" && load.load_type_id !== filterLoadType) return false;
    if (filterDriver !== "all" && load.driver_id !== filterDriver) return false;
    
    // Date filter
    const loadDate = new Date(load.date);
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (loadDate < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (loadDate > toDate) return false;
    }
    
    return true;
  });

  const totalQuantity = filteredCompanyLoads.reduce((sum, load) => sum + (parseFloat(load.quantity) || 0), 0);

  // Calculate totals by load type
  const totalsByLoadType = filteredCompanyLoads.reduce((acc: any, load) => {
    const loadTypeName = load.load_types?.name || 'غير محدد';
    if (!acc[loadTypeName]) {
      acc[loadTypeName] = 0;
    }
    acc[loadTypeName] += parseFloat(load.quantity) || 0;
    return acc;
  }, {});

  const handlePrintCompanyReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const tableRows = filteredCompanyLoads.map(load => `
        <tr>
          <td>${load.load_number}</td>
          <td>${new Date(load.date).toLocaleDateString('ar-SA')}</td>
          <td>${load.invoice_date ? new Date(load.invoice_date).toLocaleDateString('ar-SA') : '-'}</td>
          <td>${load.companies?.name || '-'}</td>
          <td>${load.load_types?.name || '-'}</td>
          <td>${load.quantity}</td>
          <td>${load.drivers?.name || '-'}</td>
        </tr>
      `).join('');

      const totalRowsByType = Object.entries(totalsByLoadType).map(([typeName, total]: [string, any]) => `
        <tr class="subtotal-row">
          <td colspan="4" style="text-align: center;">إجمالي ${typeName}</td>
          <td style="font-weight: bold;">${typeName}</td>
          <td style="font-weight: bold;">${total.toFixed(2)}</td>
          <td></td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>تقرير الشركات والشحنات</title>
            <meta charset="UTF-8">
            <style>
              * { direction: rtl; }
              body { 
                font-family: 'Arial', 'Tahoma', sans-serif; 
                padding: 20px; 
                direction: rtl;
              }
              h1 { 
                text-align: center; 
                margin-bottom: 30px;
                color: #333;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 20px;
                direction: rtl;
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 10px; 
                text-align: right;
                direction: rtl;
              }
              th { 
                background-color: #4a5568; 
                color: white;
                font-weight: bold; 
              }
              .subtotal-row { 
                background-color: #e3f2fd; 
                font-weight: bold;
                color: #1976d2;
              }
              .total-row { 
                background-color: #c8e6c9; 
                font-weight: bold;
                font-size: 1.1em;
                color: #2e7d32;
              }
              .summary-section {
                margin-top: 30px;
                padding: 20px;
                background-color: #f5f5f5;
                border-radius: 8px;
              }
              .summary-title {
                font-size: 1.2em;
                font-weight: bold;
                margin-bottom: 15px;
                color: #333;
                text-align: center;
              }
              .summary-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #ddd;
              }
              .footer { 
                margin-top: 30px; 
                text-align: center; 
                color: #666;
                direction: rtl;
              }
            </style>
          </head>
          <body>
            <h1>تقرير الشركات والشحنات</h1>
            <table>
              <thead>
                 <tr>
                   <th>رقم الشحنة</th>
                   <th>التاريخ</th>
                   <th>تاريخ الفاتورة</th>
                   <th>اسم الشركة</th>
                   <th>نوع الحمولة</th>
                   <th>الكمية</th>
                   <th>اسم السائق</th>
                 </tr>
              </thead>
              <tbody>
                 ${tableRows}
                 ${totalRowsByType}
                 <tr class="total-row">
                   <td colspan="5" style="text-align: center;">الإجمالي الكلي</td>
                   <td>${totalQuantity.toFixed(2)}</td>
                   <td></td>
                 </tr>
              </tbody>
            </table>
            
            <div class="summary-section">
              <div class="summary-title">ملخص الكميات حسب نوع الحمولة</div>
              ${Object.entries(totalsByLoadType).map(([typeName, total]: [string, any]) => `
                <div class="summary-item">
                  <span>${typeName}</span>
                  <span style="font-weight: bold; color: #1976d2;">${total.toFixed(2)}</span>
                </div>
              `).join('')}
              <div class="summary-item" style="border-top: 2px solid #333; margin-top: 10px; padding-top: 10px;">
                <span style="font-weight: bold;">الإجمالي الكلي</span>
                <span style="font-weight: bold; color: #2e7d32; font-size: 1.2em;">${totalQuantity.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}</p>
            </div>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleExportToExcel = () => {
    const excelData = filteredCompanyLoads.map(load => ({
      'رقم الشحنة': load.load_number,
      'التاريخ': new Date(load.date).toLocaleDateString('ar-SA'),
      'تاريخ الفاتورة': load.invoice_date ? new Date(load.invoice_date).toLocaleDateString('ar-SA') : '-',
      'اسم الشركة': load.companies?.name || '-',
      'نوع الحمولة': load.load_types?.name || '-',
      'الكمية': load.quantity,
      'اسم السائق': load.drivers?.name || '-'
    }));

    // Add subtotal rows for each load type
    Object.entries(totalsByLoadType).forEach(([typeName, total]: [string, any]) => {
      excelData.push({
        'رقم الشحنة': '',
        'التاريخ': '',
        'تاريخ الفاتورة': '',
        'اسم الشركة': '',
        'نوع الحمولة': `إجمالي ${typeName}`,
        'الكمية': total.toFixed(2),
        'اسم السائق': ''
      });
    });

    // Add total row
    excelData.push({
      'رقم الشحنة': '',
      'التاريخ': '',
      'تاريخ الفاتورة': '',
      'اسم الشركة': '',
      'نوع الحمولة': 'الإجمالي الكلي',
      'الكمية': totalQuantity.toFixed(2),
      'اسم السائق': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير الشركات');
    
    const fileName = `تقرير_الشركات_${new Date().toLocaleDateString('ar-SA')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "نجح",
      description: "تم تصدير التقرير بنجاح",
    });
  };

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
        <Tabs defaultValue="drivers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              تقرير السائقين
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              تقرير الشركات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    تقرير السائقين والعمولات
                  </CardTitle>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>من تاريخ</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "yyyy-MM-dd") : <span>اختر التاريخ</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>إلى تاريخ</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "yyyy-MM-dd") : <span>اختر التاريخ</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>فلتر حسب السائق</Label>
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
              <CardContent className="space-y-6">
                {filteredReports.map((report) => (
              <div key={report.driverId} className="space-y-6 border rounded-lg p-6 bg-card/50">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="flex-1 w-full">
                    <h3 className="text-2xl font-bold mb-4">{report.driverName}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground mb-1">إجمالي المستحقات</p>
                        <p className="text-2xl font-bold text-primary">
                          {report.totalCommission.toFixed(2)} ر.س
                        </p>
                      </div>
                      <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                        <p className="text-sm text-muted-foreground mb-1">المدفوع</p>
                        <p className="text-2xl font-bold text-green-600">
                          {report.totalPaid.toFixed(2)} ر.س
                        </p>
                      </div>
                      <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
                        <p className="text-sm text-muted-foreground mb-1">المتبقي</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {report.remaining.toFixed(2)} ر.س
                        </p>
                      </div>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="default"
                        size="lg"
                        disabled={report.remaining <= 0}
                        onClick={() => {
                          setSelectedDriverForPayment(report);
                          setPaymentAmount("");
                          setPaymentNotes("");
                        }}
                        className="w-full lg:w-auto"
                      >
                        <Send className="h-5 w-5 ml-2" />
                        سند تحويل
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>سند تحويل للسائق: {report.driverName}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="bg-primary/10 p-4 rounded-lg">
                          <Label className="text-sm text-muted-foreground">المبلغ المتبقي المستحق</Label>
                          <div className="text-3xl font-bold text-primary mt-2">
                            {report.remaining.toFixed(2)} ر.س
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-amount">المبلغ المحول *</Label>
                          <Input
                            id="payment-amount"
                            type="number"
                            placeholder="0.00"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            max={report.remaining}
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-notes">ملاحظات</Label>
                          <Textarea
                            id="payment-notes"
                            placeholder="أدخل ملاحظات إضافية..."
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <Button onClick={handleAddPayment} className="w-full" size="lg">
                          <Send className="h-4 w-4 ml-2" />
                          تأكيد التحويل
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-lg border overflow-hidden bg-background">
                  <Table>
                    <TableHeader>
                       <TableRow className="bg-muted/50">
                         <TableHead className="font-bold">رقم الشحنة</TableHead>
                         <TableHead className="font-bold">التاريخ</TableHead>
                         <TableHead className="font-bold">العميل</TableHead>
                         <TableHead className="font-bold">نوع الحمولة</TableHead>
                         <TableHead className="font-bold">الكمية</TableHead>
                         <TableHead className="font-bold">المبلغ المستحق</TableHead>
                         <TableHead className="font-bold text-center">إجراءات</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {report.loads.map((load: any) => (
                         <TableRow key={load.id}>
                           <TableCell className="font-medium">{load.load_number}</TableCell>
                           <TableCell>{format(new Date(load.date), "yyyy-MM-dd")}</TableCell>
                           <TableCell>{load.companies?.name || '-'}</TableCell>
                           <TableCell>{load.load_types?.name || '-'}</TableCell>
                           <TableCell>{load.quantity}</TableCell>
                           <TableCell className="font-bold text-primary">
                             {load.total_amount.toFixed(2)} ر.س
                           </TableCell>
                           <TableCell>
                             <div className="flex gap-2 justify-center">
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handlePrintLoad(load)}
                                 title="طباعة"
                               >
                                 <Printer className="h-4 w-4" />
                               </Button>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleDeleteLoad(load.id)}
                                 title="حذف"
                               >
                                 <Trash2 className="h-4 w-4 text-destructive" />
                               </Button>
                             </div>
                           </TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-6 w-6" />
                    تقرير الشركات والشحنات
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrintCompanyReport}>
                      <Printer className="h-4 w-4 ml-2" />
                      طباعة
                    </Button>
                    <Button variant="outline" onClick={handleExportToExcel}>
                      <Download className="h-4 w-4 ml-2" />
                      تصدير إكسل
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label>من تاريخ</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "yyyy-MM-dd") : <span>اختر التاريخ</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>إلى تاريخ</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "yyyy-MM-dd") : <span>اختر التاريخ</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>فلتر حسب الشركة</Label>
                    <Select value={filterCompany} onValueChange={setFilterCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الشركة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الشركات</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>فلتر حسب نوع الحمولة</Label>
                    <Select value={filterLoadType} onValueChange={setFilterLoadType}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الحمولة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأنواع</SelectItem>
                        {loadTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>فلتر حسب السائق</Label>
                    <Select value={filterDriver} onValueChange={setFilterDriver}>
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
              <CardContent>
                <div className="rounded-lg border overflow-hidden bg-background">
                  <Table>
                    <TableHeader>
                       <TableRow className="bg-muted/50">
                         <TableHead className="font-bold">رقم الشحنة</TableHead>
                         <TableHead className="font-bold">التاريخ</TableHead>
                         <TableHead className="font-bold">تاريخ الفاتورة</TableHead>
                         <TableHead className="font-bold">اسم الشركة</TableHead>
                         <TableHead className="font-bold">نوع الحمولة</TableHead>
                         <TableHead className="font-bold">الكمية</TableHead>
                         <TableHead className="font-bold">اسم السائق</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {filteredCompanyLoads.length === 0 ? (
                         <TableRow>
                           <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                             لا توجد شحنات
                           </TableCell>
                         </TableRow>
                       ) : (
                         <>
                           {filteredCompanyLoads.map((load) => (
                             <TableRow key={load.id}>
                               <TableCell className="font-medium">{load.load_number}</TableCell>
                               <TableCell>{format(new Date(load.date), "yyyy-MM-dd")}</TableCell>
                               <TableCell>{load.invoice_date ? format(new Date(load.invoice_date), "yyyy-MM-dd") : '-'}</TableCell>
                               <TableCell>{load.companies?.name || '-'}</TableCell>
                               <TableCell>{load.load_types?.name || '-'}</TableCell>
                               <TableCell>{load.quantity}</TableCell>
                               <TableCell>{load.drivers?.name || '-'}</TableCell>
                             </TableRow>
                           ))}
                           {Object.entries(totalsByLoadType).map(([typeName, total]: [string, any]) => (
                             <TableRow key={typeName} className="bg-blue-50 dark:bg-blue-950/30">
                               <TableCell colSpan={4} className="text-center font-semibold">
                                 إجمالي {typeName}
                               </TableCell>
                               <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                                 {typeName}
                               </TableCell>
                               <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                                 {total.toFixed(2)}
                               </TableCell>
                               <TableCell></TableCell>
                             </TableRow>
                           ))}
                           <TableRow className="bg-primary/10 font-bold">
                             <TableCell colSpan={5} className="text-center text-lg">
                               الإجمالي الكلي
                             </TableCell>
                             <TableCell className="text-lg text-primary">
                               {totalQuantity.toFixed(2)}
                             </TableCell>
                             <TableCell></TableCell>
                           </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LoadReports;
