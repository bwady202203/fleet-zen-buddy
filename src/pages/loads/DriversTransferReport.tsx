import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, FileText, Printer, Download, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toHijri } from 'hijri-converter';

interface DriverWithReceipts {
  id: string;
  name: string;
  phone: string | null;
  receipts: TransferReceipt[];
  totalAmount: number;
}

interface TransferReceipt {
  id: string;
  receipt_number: string;
  amount: number;
  transfer_date: string;
  description: string | null;
}

const DriversTransferReport = () => {
  const [driversData, setDriversData] = useState<DriverWithReceipts[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    loadDrivers();
    loadDriversReport();
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

  const loadDriversReport = async () => {
    const { data: allDrivers } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!allDrivers) return;

    const driversWithReceipts: DriverWithReceipts[] = await Promise.all(
      allDrivers.map(async (driver) => {
        const { data: receipts } = await supabase
          .from('driver_transfer_receipts')
          .select('*')
          .eq('driver_id', driver.id)
          .order('transfer_date', { ascending: false });

        const totalAmount = receipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

        return {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          receipts: receipts || [],
          totalAmount
        };
      })
    );

    setDriversData(driversWithReceipts);
  };

  const filteredData = driversData.filter(driver => {
    // Filter by selected driver
    if (selectedDriver !== "all" && driver.id !== selectedDriver) {
      return false;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      const hasReceiptsInRange = driver.receipts.some(receipt => {
        const receiptDate = new Date(receipt.transfer_date);
        if (dateFrom && receiptDate < dateFrom) return false;
        if (dateTo && receiptDate > dateTo) return false;
        return true;
      });
      return hasReceiptsInRange;
    }

    return true;
  });

  const exportToExcel = () => {
    const exportData = filteredData.flatMap(driver =>
      driver.receipts.map(receipt => ({
        'اسم السائق': driver.name,
        'رقم الجوال': driver.phone || '-',
        'رقم السند': receipt.receipt_number,
        'المبلغ': receipt.amount,
        'تاريخ التحويل': new Date(receipt.transfer_date).toLocaleDateString('ar-SA'),
        'الوصف': receipt.description || '-'
      }))
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "تقرير السائقين");
    XLSX.writeFile(wb, `driver_transfers_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: "تم التصدير",
      description: "تم تصدير التقرير إلى Excel بنجاح"
    });
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const today = new Date();
    const hijriDate = toHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const hijriString = `${hijriDate.hd}/${hijriDate.hm}/${hijriDate.hy}`;

    const tableRows = filteredData.flatMap(driver =>
      driver.receipts.map(receipt => {
        const receiptHijri = toHijri(
          new Date(receipt.transfer_date).getFullYear(),
          new Date(receipt.transfer_date).getMonth() + 1,
          new Date(receipt.transfer_date).getDate()
        );
        const receiptHijriStr = `${receiptHijri.hd}/${receiptHijri.hm}/${receiptHijri.hy}`;

        return `
          <tr>
            <td>${driver.name}</td>
            <td>${driver.phone || '-'}</td>
            <td>${receipt.receipt_number}</td>
            <td style="font-weight: bold; color: #2563eb;">${receipt.amount.toFixed(2)} ر.س</td>
            <td>${new Date(receipt.transfer_date).toLocaleDateString('ar-SA')}<br><span style="color: #666; font-size: 0.85em;">${receiptHijriStr} هـ</span></td>
            <td>${receipt.description || '-'}</td>
          </tr>
        `;
      })
    ).join('');

    const totalAmount = filteredData.reduce((sum, d) => sum + d.totalAmount, 0);

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>تقرير سندات التحويل للسائقين</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; direction: rtl; }
            body { 
              font-family: 'Arial', 'Tahoma', sans-serif; 
              padding: 40px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 30px;
              border-bottom: 3px solid #667eea;
            }
            .logo {
              font-size: 2.5em;
              font-weight: bold;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              margin-bottom: 10px;
            }
            .report-title {
              font-size: 1.8em;
              color: #1e293b;
              margin-bottom: 10px;
              font-weight: 600;
            }
            .date-info {
              display: flex;
              justify-content: space-between;
              padding: 20px;
              background: #f8fafc;
              border-radius: 10px;
              margin-bottom: 30px;
            }
            table { 
              width: 100%; 
              border-collapse: separate;
              border-spacing: 0;
              margin: 30px 0;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
              border-radius: 12px;
              overflow: hidden;
            }
            thead {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            th { 
              color: white;
              padding: 18px 15px;
              text-align: right;
              font-weight: 600;
              font-size: 0.95em;
            }
            td { 
              padding: 15px;
              text-align: right;
              border-bottom: 1px solid #e2e8f0;
              color: #334155;
            }
            tbody tr:hover { background-color: #f8fafc; }
            tbody tr:last-child td { border-bottom: none; }
            .summary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 15px;
              margin-top: 30px;
              text-align: center;
            }
            .summary-label {
              font-size: 1.2em;
              margin-bottom: 10px;
            }
            .summary-value {
              font-size: 2.5em;
              font-weight: bold;
            }
            @media print {
              body { background: white; padding: 0; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🚛 نظام إدارة الشحنات</div>
              <div class="report-title">تقرير سندات التحويل للسائقين</div>
            </div>

            <div class="date-info">
              <div>
                <strong>تاريخ الطباعة (ميلادي):</strong> ${today.toLocaleDateString('ar-SA')}
              </div>
              <div>
                <strong>تاريخ الطباعة (هجري):</strong> ${hijriString} هـ
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>اسم السائق</th>
                  <th>رقم الجوال</th>
                  <th>رقم السند</th>
                  <th>المبلغ</th>
                  <th>تاريخ التحويل</th>
                  <th>الوصف</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-label">💰 إجمالي المبالغ المحولة</div>
              <div class="summary-value">${totalAmount.toFixed(2)} ريال</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads/reports" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">تقرير سندات التحويل للسائقين</h1>
              <p className="text-muted-foreground mt-1">عرض سندات التحويل لكل سائق</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                تقرير سندات التحويل
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportToExcel}>
                  <Download className="h-4 w-4 ml-2" />
                  تصدير Excel
                </Button>
                <Button onClick={handlePrintReport}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">السائق</label>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">من تاريخ</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "اختر التاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">إلى تاريخ</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "اختر التاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">عدد السائقين</div>
                    <div className="text-3xl font-bold text-primary">{filteredData.length}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">إجمالي السندات</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {filteredData.reduce((sum, d) => sum + d.receipts.length, 0)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">إجمالي المبالغ</div>
                    <div className="text-3xl font-bold text-green-600">
                      {filteredData.reduce((sum, d) => sum + d.totalAmount, 0).toFixed(2)} ر.س
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Drivers Table */}
            <div className="space-y-6">
              {filteredData.map((driver) => (
                <Card key={driver.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{driver.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {driver.phone || 'لا يوجد رقم جوال'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-lg px-4 py-2">
                        {driver.totalAmount.toFixed(2)} ر.س
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {driver.receipts.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>رقم السند</TableHead>
                              <TableHead>تاريخ التحويل</TableHead>
                              <TableHead>المبلغ</TableHead>
                              <TableHead>الوصف</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {driver.receipts.map((receipt) => (
                              <TableRow key={receipt.id}>
                                <TableCell className="font-medium">
                                  {receipt.receipt_number}
                                </TableCell>
                                <TableCell>
                                  {new Date(receipt.transfer_date).toLocaleDateString('ar-SA')}
                                </TableCell>
                                <TableCell className="font-bold text-primary">
                                  {receipt.amount.toFixed(2)} ر.س
                                </TableCell>
                                <TableCell className="max-w-[300px] truncate">
                                  {receipt.description || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد سندات تحويل لهذا السائق
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {filteredData.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">لا توجد بيانات لعرضها</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DriversTransferReport;