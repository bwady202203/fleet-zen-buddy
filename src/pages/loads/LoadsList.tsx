import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Printer, Edit, Trash2, Filter, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import * as XLSX from "xlsx";

const LoadsList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loads, setLoads] = useState<any[]>([]);
  const [filteredLoads, setFilteredLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedLoadType, setSelectedLoadType] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Report states
  const [reportStartDate, setReportStartDate] = useState<string>("");
  const [reportEndDate, setReportEndDate] = useState<string>("");
  const [reportCompany, setReportCompany] = useState<string>("all");
  const [driverReport, setDriverReport] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadFilterData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [loads, selectedCompany, selectedLoadType, selectedDriver, startDate, endDate]);

  const loadFilterData = async () => {
    try {
      const [companiesRes, loadTypesRes, driversRes] = await Promise.all([
        supabase.from('companies').select('id, name').eq('is_active', true).order('name'),
        supabase.from('load_types').select('id, name').eq('is_active', true).order('name'),
        supabase.from('drivers').select('id, name').eq('is_active', true).order('name')
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      if (loadTypesRes.data) setLoadTypes(loadTypesRes.data);
      if (driversRes.data) setDrivers(driversRes.data);
    } catch (error: any) {
      console.error('Error loading filter data:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loads')
        .select(`
          *,
          companies (name),
          load_types (name),
          drivers (name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setLoads(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل تحميل البيانات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...loads];

    if (selectedCompany !== "all") {
      filtered = filtered.filter(load => load.company_id === selectedCompany);
    }

    if (selectedLoadType !== "all") {
      filtered = filtered.filter(load => load.load_type_id === selectedLoadType);
    }

    if (selectedDriver !== "all") {
      filtered = filtered.filter(load => load.driver_id === selectedDriver);
    }

    if (startDate) {
      filtered = filtered.filter(load => load.date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(load => load.date <= endDate);
    }

    setFilteredLoads(filtered);
  };

  const resetFilters = () => {
    setSelectedCompany("all");
    setSelectedLoadType("all");
    setSelectedDriver("all");
    setStartDate("");
    setEndDate("");
  };

  const exportToExcel = () => {
    const exportData = filteredLoads.map(load => ({
      'التاريخ': format(new Date(load.date), 'yyyy-MM-dd'),
      'رقم الشحنة': load.load_number,
      'الشركة': load.companies?.name || '-',
      'نوع الشحنة': load.load_types?.name || '-',
      'السائق': load.drivers?.name || '-',
      'رقم الشاحنة': load.truck_number || '-',
      'الكمية': load.quantity,
      'السعر': parseFloat(load.unit_price).toFixed(2),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loads");
    XLSX.writeFile(wb, `loads_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: "تم التصدير",
      description: "تم تصدير البيانات إلى Excel بنجاح"
    });
  };

  const generateDriverReport = () => {
    let filtered = [...loads];

    if (reportCompany !== "all") {
      filtered = filtered.filter(load => load.company_id === reportCompany);
    }

    if (reportStartDate) {
      filtered = filtered.filter(load => load.date >= reportStartDate);
    }

    if (reportEndDate) {
      filtered = filtered.filter(load => load.date <= reportEndDate);
    }

    // Group by driver
    const driverData: Record<string, { name: string; quantity: number; totalAmount: number; count: number }> = {};

    filtered.forEach(load => {
      const driverId = load.driver_id || 'unknown';
      const driverName = load.drivers?.name || 'غير محدد / Unknown';
      
      if (!driverData[driverId]) {
        driverData[driverId] = {
          name: driverName,
          quantity: 0,
          totalAmount: 0,
          count: 0
        };
      }

      driverData[driverId].quantity += parseFloat(load.quantity) || 0;
      driverData[driverId].totalAmount += parseFloat(load.unit_price) || 0;
      driverData[driverId].count += 1;
    });

    const report = Object.values(driverData).sort((a, b) => b.totalAmount - a.totalAmount);
    setDriverReport(report);

    toast({
      title: "تم إنشاء التقرير",
      description: `تم إنشاء تقرير لـ ${report.length} سائق`
    });
  };

  const exportDriverReport = () => {
    const exportData = driverReport.map(driver => ({
      'السائق': driver.name,
      'عدد الشحنات': driver.count,
      'إجمالي الكمية': driver.quantity.toFixed(2),
      'إجمالي المبلغ': driver.totalAmount.toFixed(2),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Driver Report");
    XLSX.writeFile(wb, `driver_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: "تم التصدير",
      description: "تم تصدير تقرير السائقين إلى Excel بنجاح"
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الشحنة؟')) return;

    try {
      const { error } = await supabase
        .from('loads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الشحنة بنجاح"
      });
      
      loadData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card print:hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/loads" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold print:text-2xl">سجل الشحنات / Loads List</h1>
                <p className="text-muted-foreground mt-1 print:text-xs">عرض جميع الشحنات المسجلة / View All Registered Loads</p>
                <p className="text-xs text-muted-foreground mt-1 hidden print:block">
                  تاريخ الطباعة: {format(new Date(), 'yyyy-MM-dd HH:mm')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToExcel} variant="outline">
                <FileDown className="h-4 w-4 ml-2" />
                تصدير Excel / Export Excel
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة / Print
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="list" className="w-full" dir="rtl">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="list">قائمة الشحنات / Loads List</TabsTrigger>
            <TabsTrigger value="report">تقرير السائقين / Drivers Report</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <Card className="mb-6 print:hidden">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle>فلتر البحث / Search Filter</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">من تاريخ / From Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">إلى تاريخ / To Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">الشركة / Company</Label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="جميع الشركات / All companies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الشركات / All Companies</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">نوع الحمولة / Load Type</Label>
                    <Select value={selectedLoadType} onValueChange={setSelectedLoadType}>
                      <SelectTrigger>
                        <SelectValue placeholder="جميع الأنواع / All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأنواع / All Types</SelectItem>
                        {loadTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">السائق / Driver</Label>
                    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                      <SelectTrigger>
                        <SelectValue placeholder="جميع السائقين / All drivers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع السائقين / All Drivers</SelectItem>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="outline" 
                    onClick={resetFilters}
                  >
                    إعادة تعيين / Reset
                  </Button>
                </div>

                <div className="mt-6 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20 print:bg-gray-50 print:border-gray-300">
                  <h3 className="text-lg font-bold mb-4 print:text-base">الإجماليات / Totals Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:gap-3">
                    <div className="bg-background/80 backdrop-blur p-4 rounded-lg border border-border shadow-sm print:p-2 print:shadow-none">
                      <div className="text-sm text-muted-foreground mb-1 print:text-xs">عدد النتائج / Results</div>
                      <div className="text-3xl font-bold text-primary print:text-xl">{filteredLoads.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">من إجمالي / of {loads.length}</div>
                    </div>
                    
                    <div className="bg-background/80 backdrop-blur p-4 rounded-lg border border-border shadow-sm print:p-2 print:shadow-none">
                      <div className="text-sm text-muted-foreground mb-1 print:text-xs">إجمالي الكمية / Total Quantity</div>
                      <div className="text-3xl font-bold text-primary print:text-xl">
                        {filteredLoads.reduce((sum, load) => sum + (load.quantity || 0), 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">طن / Tons</div>
                    </div>
                    
                    <div className="bg-background/80 backdrop-blur p-4 rounded-lg border border-border shadow-sm print:p-2 print:shadow-none">
                      <div className="text-sm text-muted-foreground mb-1 print:text-xs">إجمالي المبلغ / Total Amount</div>
                      <div className="text-3xl font-bold text-primary print:text-xl">
                        {filteredLoads.reduce((sum, load) => sum + (parseFloat(load.unit_price) || 0), 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">ريال سعودي / SAR</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>جدول الشحنات / Loads Table</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">جاري التحميل / Loading...</div>
                ) : filteredLoads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد شحنات مطابقة للفلتر / No loads match the filter
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">التاريخ / Date</TableHead>
                          <TableHead className="text-right">رقم الشحنة / Load Number</TableHead>
                          <TableHead className="text-right">الشركة / Company</TableHead>
                          <TableHead className="text-right">نوع الشحنة / Load Type</TableHead>
                          <TableHead className="text-right">السائق / Driver</TableHead>
                          <TableHead className="text-right">رقم الشاحنة / Truck Number</TableHead>
                          <TableHead className="text-right">الكمية / Quantity</TableHead>
                          <TableHead className="text-right">السعر / Price</TableHead>
                          <TableHead className="text-right print:hidden">إجراءات / Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLoads.map((load) => (
                          <TableRow key={load.id} className="hover:bg-muted/50">
                            <TableCell className="text-right">
                              {format(new Date(load.date), 'yyyy-MM-dd')}
                            </TableCell>
                            <TableCell className="text-right font-medium">{load.load_number}</TableCell>
                            <TableCell className="text-right">{load.companies?.name || '-'}</TableCell>
                            <TableCell className="text-right">{load.load_types?.name || '-'}</TableCell>
                            <TableCell className="text-right">{load.drivers?.name || '-'}</TableCell>
                            <TableCell className="text-right">{load.truck_number || '-'}</TableCell>
                            <TableCell className="text-right">{load.quantity}</TableCell>
                            <TableCell className="text-right">{load.unit_price.toFixed(2)}</TableCell>
                            <TableCell className="text-right print:hidden">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/loads/edit/${load.id}`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(load.id)}
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    <CardTitle>فلاتر التقرير / Report Filters</CardTitle>
                  </div>
                  <Button onClick={exportDriverReport} variant="outline" disabled={driverReport.length === 0}>
                    <FileDown className="h-4 w-4 ml-2" />
                    تصدير التقرير / Export Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">من تاريخ / From Date</Label>
                    <Input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">إلى تاريخ / To Date</Label>
                    <Input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">الشركة / Company</Label>
                    <Select value={reportCompany} onValueChange={setReportCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="جميع الشركات / All companies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الشركات / All Companies</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={generateDriverReport} className="w-full">
                  إنشاء التقرير / Generate Report
                </Button>
              </CardContent>
            </Card>

            {driverReport.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>تقرير السائقين / Drivers Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-background/80 backdrop-blur p-4 rounded-lg border border-border shadow-sm">
                        <div className="text-sm text-muted-foreground mb-1">عدد السائقين / Total Drivers</div>
                        <div className="text-3xl font-bold text-primary">{driverReport.length}</div>
                      </div>
                      
                      <div className="bg-background/80 backdrop-blur p-4 rounded-lg border border-border shadow-sm">
                        <div className="text-sm text-muted-foreground mb-1">إجمالي الكمية / Total Quantity</div>
                        <div className="text-3xl font-bold text-primary">
                          {driverReport.reduce((sum, d) => sum + d.quantity, 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">طن / Tons</div>
                      </div>
                      
                      <div className="bg-background/80 backdrop-blur p-4 rounded-lg border border-border shadow-sm">
                        <div className="text-sm text-muted-foreground mb-1">إجمالي المبلغ / Total Amount</div>
                        <div className="text-3xl font-bold text-primary">
                          {driverReport.reduce((sum, d) => sum + d.totalAmount, 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">ريال سعودي / SAR</div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">السائق / Driver</TableHead>
                          <TableHead className="text-right">عدد الشحنات / Load Count</TableHead>
                          <TableHead className="text-right">إجمالي الكمية / Total Quantity</TableHead>
                          <TableHead className="text-right">إجمالي المبلغ / Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {driverReport.map((driver, index) => (
                          <TableRow key={index} className="hover:bg-muted/50">
                            <TableCell className="text-right font-medium">{driver.name}</TableCell>
                            <TableCell className="text-right">{driver.count}</TableCell>
                            <TableCell className="text-right font-semibold text-primary">
                              {driver.quantity.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-primary">
                              {driver.totalAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          
          .container {
            max-width: 100% !important;
            padding: 0 !important;
          }
          
          table {
            font-size: 10px !important;
            page-break-inside: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          th, td {
            padding: 6px 8px !important;
            border: 1px solid #ddd !important;
          }
          
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold !important;
            color: #000 !important;
          }
          
          .text-3xl {
            font-size: 20px !important;
          }
          
          .text-sm {
            font-size: 9px !important;
          }
          
          h1 {
            font-size: 20px !important;
            margin-bottom: 10px !important;
          }
          
          .card {
            border: 1px solid #ddd !important;
            page-break-inside: avoid;
          }
          
          /* Print summary boxes */
          .bg-gradient-to-br {
            background: #f9fafb !important;
            border: 2px solid #e5e7eb !important;
            padding: 10px !important;
            margin-bottom: 15px !important;
          }
          
          /* Header styling for print */
          header.border-b {
            border-bottom: 2px solid #000 !important;
            padding-bottom: 10px !important;
            margin-bottom: 15px !important;
          }
          
          /* Tab content spacing */
          .overflow-x-auto {
            overflow: visible !important;
          }
        }
        
        /* RTL Print support */
        @media print {
          * {
            direction: rtl !important;
            text-align: right !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadsList;
