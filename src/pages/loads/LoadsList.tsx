import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Printer, Edit, Trash2, Filter, FileDown, Download } from "lucide-react";
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
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  
  // Filter states
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedLoadType, setSelectedLoadType] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [invoiceStartDate, setInvoiceStartDate] = useState<string>("");
  const [invoiceEndDate, setInvoiceEndDate] = useState<string>("");

  // Report states
  const [reportStartDate, setReportStartDate] = useState<string>("");
  const [reportEndDate, setReportEndDate] = useState<string>("");
  const [reportInvoiceStartDate, setReportInvoiceStartDate] = useState<string>("");
  const [reportInvoiceEndDate, setReportInvoiceEndDate] = useState<string>("");
  const [reportCompany, setReportCompany] = useState<string>("all");
  const [driverReport, setDriverReport] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortField, setSortField] = useState<'driver' | 'date' | 'invoice_date'>('driver');
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    loadData();
    loadFilterData();
  }, []);

  useEffect(() => {
    // عرض جميع الشحنات عند التحميل الأولي
    if (loads.length > 0 && filteredLoads.length === 0) {
      setFilteredLoads(loads);
    }
  }, [loads]);

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
      // Load all data without pagination limit
      let allLoads: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error, count } = await supabase
          .from('loads')
          .select(`
            *,
            companies (name),
            load_types (name),
            drivers (name)
          `, { count: 'exact' })
          .order('date', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allLoads = [...allLoads, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`✅ تم تحميل ${allLoads.length} شحنة من قاعدة البيانات`);
      setLoads(allLoads);
      setFilteredLoads(allLoads);
      
      toast({
        title: "تم التحميل بنجاح",
        description: `تم تحميل ${allLoads.length} شحنة من قاعدة البيانات`,
      });
    } catch (error: any) {
      console.error('Load data error:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل تحميل البيانات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...loads];
    
    console.log(`🔍 بدء الفلترة من ${loads.length} شحنة`);

    if (selectedCompany !== "all") {
      filtered = filtered.filter(load => load.company_id === selectedCompany);
      console.log(`📦 بعد فلتر الشركة: ${filtered.length} شحنة`);
    }

    if (selectedLoadType !== "all") {
      filtered = filtered.filter(load => load.load_type_id === selectedLoadType);
      console.log(`📋 بعد فلتر نوع الشحنة: ${filtered.length} شحنة`);
    }

    if (selectedDriver !== "all") {
      filtered = filtered.filter(load => load.driver_id === selectedDriver);
      console.log(`👤 بعد فلتر السائق: ${filtered.length} شحنة`);
    }

    if (startDate) {
      filtered = filtered.filter(load => load.date >= startDate);
      console.log(`📅 بعد فلتر تاريخ البدء: ${filtered.length} شحنة`);
    }

    if (endDate) {
      filtered = filtered.filter(load => load.date <= endDate);
      console.log(`📅 بعد فلتر تاريخ النهاية: ${filtered.length} شحنة`);
    }

    if (invoiceStartDate) {
      filtered = filtered.filter(load => load.invoice_date && load.invoice_date >= invoiceStartDate);
      console.log(`📄 بعد فلتر تاريخ فاتورة البدء: ${filtered.length} شحنة`);
    }

    if (invoiceEndDate) {
      filtered = filtered.filter(load => load.invoice_date && load.invoice_date <= invoiceEndDate);
      console.log(`📄 بعد فلتر تاريخ فاتورة النهاية: ${filtered.length} شحنة`);
    }

    // Filter by search text (load number or truck number)
    if (searchText.trim()) {
      const search = searchText.trim().toLowerCase();
      filtered = filtered.filter(load => 
        (load.load_number && load.load_number.toLowerCase().includes(search)) ||
        (load.truck_number && load.truck_number.toLowerCase().includes(search))
      );
      console.log(`🔎 بعد البحث النصي "${search}": ${filtered.length} شحنة`);
    }

    // Sort by selected field
    filtered.sort((a, b) => {
      if (sortField === 'driver') {
        const nameA = (a.drivers?.name || '').toLowerCase();
        const nameB = (b.drivers?.name || '').toLowerCase();
        return sortOrder === 'asc' 
          ? nameA.localeCompare(nameB, 'ar')
          : nameB.localeCompare(nameA, 'ar');
      } else if (sortField === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortField === 'invoice_date') {
        const dateA = a.invoice_date ? new Date(a.invoice_date).getTime() : 0;
        const dateB = b.invoice_date ? new Date(b.invoice_date).getTime() : 0;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });

    console.log(`✅ النتيجة النهائية: ${filtered.length} شحنة`);
    setFilteredLoads(filtered);
    
    toast({
      title: "تم تطبيق الفلتر",
      description: `عدد النتائج: ${filtered.length} من أصل ${loads.length}`,
    });
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleSortFieldChange = (field: 'driver' | 'date' | 'invoice_date') => {
    if (sortField === field) {
      toggleSortOrder();
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const resetFilters = () => {
    setSelectedCompany("all");
    setSelectedLoadType("all");
    setSelectedDriver("all");
    setStartDate("");
    setEndDate("");
    setInvoiceStartDate("");
    setInvoiceEndDate("");
    setSearchText("");
    setFilteredLoads(loads);
    
    toast({
      title: "تمت إعادة التعيين",
      description: `عرض جميع الشحنات (${loads.length})`,
    });
  };
  
  const quickSearchLoads = (loadNumbers: string[]) => {
    const filtered = loads.filter(load => 
      loadNumbers.includes(load.load_number)
    );
    
    setFilteredLoads(filtered);
    setSearchText(loadNumbers.join(', '));
    
    console.log(`🎯 بحث سريع عن الشحنات: ${loadNumbers.join(', ')}`);
    console.log(`✅ تم العثور على ${filtered.length} من ${loadNumbers.length} شحنة`);
    
    toast({
      title: "البحث السريع",
      description: `تم العثور على ${filtered.length} من ${loadNumbers.length} شحنة`,
    });
  };

  const exportToExcel = () => {
    const exportData = filteredLoads.map(load => ({
      'التاريخ': format(new Date(load.date), 'yyyy-MM-dd'),
      'رقم الشحنة': load.load_number,
      'تاريخ الفاتورة': load.invoice_date ? format(new Date(load.invoice_date), 'yyyy-MM-dd') : '-',
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

    if (reportInvoiceStartDate) {
      filtered = filtered.filter(load => load.invoice_date && load.invoice_date >= reportInvoiceStartDate);
    }

    if (reportInvoiceEndDate) {
      filtered = filtered.filter(load => load.invoice_date && load.invoice_date <= reportInvoiceEndDate);
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

  const handlePrintLoad = (load: any) => {
    setSelectedLoad(load);
    setPreviewDialogOpen(true);
  };

  const handlePrintFromDialog = () => {
    const printContent = document.getElementById('load-print-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>شحنة ${selectedLoad.load_number}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 1cm;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              direction: rtl;
              padding: 0;
              margin: 0;
              background: white;
              color: #000;
            }
            
            .container {
              max-width: 100%;
              margin: 0 auto;
              background: white;
              border: 3px solid #000;
              padding: 20px;
            }
            
            .header {
              text-align: center;
              border-bottom: 3px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            
            .company-name {
              font-size: 22px;
              font-weight: bold;
              margin-bottom: 3px;
            }
            
            .company-name-en {
              font-size: 16px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
            }
            
            .document-title {
              font-size: 18px;
              font-weight: bold;
              margin-top: 8px;
            }
            
            .document-title-en {
              font-size: 14px;
              color: #333;
              margin-top: 3px;
            }
            
            .content {
              margin-top: 20px;
            }
            
            .load-number-section {
              text-align: center;
              padding: 15px;
              border: 2px solid #000;
              margin-bottom: 20px;
            }
            
            .load-number-label {
              font-size: 14px;
              margin-bottom: 5px;
            }
            
            .load-number {
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 2px;
            }
            
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            
            .info-table td {
              padding: 10px;
              border: 2px solid #000;
              font-size: 13px;
            }
            
            .info-label {
              font-weight: bold;
              width: 30%;
              background: #f5f5f5;
            }
            
            .info-value {
              width: 70%;
            }
            
            .signatures {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #000;
            }
            
            .signature-box {
              text-align: center;
            }
            
            .signature-title {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 3px;
            }
            
            .signature-title-en {
              font-size: 12px;
              color: #333;
              margin-bottom: 15px;
            }
            
            .signature-line {
              border-top: 2px solid #000;
              margin-top: 50px;
              padding-top: 8px;
            }
            
            .signature-name {
              font-size: 12px;
              color: #666;
            }
            
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #000;
              font-size: 11px;
              color: #666;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
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
                <div className="mb-4">
                  <Label className="text-sm font-medium">بحث نصي / Text Search</Label>
                  <Input
                    type="text"
                    placeholder="ابحث برقم الشحنة أو رقم الشاحنة / Search by load or truck number"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applyFilters();
                      }
                    }}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">من تاريخ الشحنة / From Load Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">إلى تاريخ الشحنة / To Load Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">من تاريخ الفاتورة / From Invoice Date</Label>
                    <Input
                      type="date"
                      value={invoiceStartDate}
                      onChange={(e) => setInvoiceStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">إلى تاريخ الفاتورة / To Invoice Date</Label>
                    <Input
                      type="date"
                      value={invoiceEndDate}
                      onChange={(e) => setInvoiceEndDate(e.target.value)}
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

                <div className="mt-4 flex gap-2 justify-end flex-wrap">
                  <Button 
                    onClick={() => quickSearchLoads(['15050', '15089', '15106', '15035', '15071', '15036'])}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    🎯 الشحنات المطلوبة
                  </Button>
                  <Button 
                    onClick={applyFilters}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    تطبيق الفلتر / Apply Filter
                  </Button>
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
                <div className="flex items-center justify-between">
                  <CardTitle>جدول الشحنات / Loads Table</CardTitle>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-primary">
                      {filteredLoads.length}
                    </span>
                    <span className="text-muted-foreground">من</span>
                    <span className="font-medium">{loads.length}</span>
                    <span className="text-muted-foreground">شحنة</span>
                  </div>
                </div>
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
                           <TableHead className="text-right">
                             <button 
                               onClick={() => handleSortFieldChange('date')} 
                               className="flex items-center gap-2 hover:text-primary transition-colors print:pointer-events-none"
                             >
                               التاريخ / Date
                               <span className="text-xs print:hidden">
                                 {sortField === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                               </span>
                             </button>
                           </TableHead>
                           <TableHead className="text-right">رقم الشحنة / Load Number</TableHead>
                           <TableHead className="text-right">
                             <button 
                               onClick={() => handleSortFieldChange('invoice_date')} 
                               className="flex items-center gap-2 hover:text-primary transition-colors print:pointer-events-none"
                             >
                               تاريخ الفاتورة / Invoice Date
                               <span className="text-xs print:hidden">
                                 {sortField === 'invoice_date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                               </span>
                             </button>
                           </TableHead>
                           <TableHead className="text-right">الشركة / Company</TableHead>
                           <TableHead className="text-right">نوع الشحنة / Load Type</TableHead>
                           <TableHead className="text-right">
                             <button 
                               onClick={() => handleSortFieldChange('driver')} 
                               className="flex items-center gap-2 hover:text-primary transition-colors print:pointer-events-none"
                             >
                               السائق / Driver
                               <span className="text-xs print:hidden">
                                 {sortField === 'driver' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                               </span>
                             </button>
                           </TableHead>
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
                             <TableCell className="text-right">
                               {load.invoice_date ? format(new Date(load.invoice_date), 'yyyy-MM-dd') : '-'}
                             </TableCell>
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
                                    onClick={() => handlePrintLoad(load)}
                                    title="طباعة الشحنة"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">من تاريخ الشحنة / From Load Date</Label>
                    <Input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">إلى تاريخ الشحنة / To Load Date</Label>
                    <Input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">من تاريخ الفاتورة / From Invoice Date</Label>
                    <Input
                      type="date"
                      value={reportInvoiceStartDate}
                      onChange={(e) => setReportInvoiceStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">إلى تاريخ الفاتورة / To Invoice Date</Label>
                    <Input
                      type="date"
                      value={reportInvoiceEndDate}
                      onChange={(e) => setReportInvoiceEndDate(e.target.value)}
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

        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>معاينة سند الشحنة</span>
                <Button onClick={handlePrintFromDialog} size="sm">
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة / تحميل PDF
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            {selectedLoad && (
              <div id="load-print-content" className="p-6">
                <div className="container" style={{ maxWidth: '100%', margin: '0 auto', background: 'white', border: '3px solid #000', padding: '20px' }}>
                  <div className="header" style={{ textAlign: 'center', borderBottom: '3px solid #000', paddingBottom: '15px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '3px' }}>شركة الرمال الناعمة الصناعية</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>Industrial Soft Sands Company</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '8px' }}>سند شحنة</div>
                    <div style={{ fontSize: '14px', color: '#333', marginTop: '3px' }}>Load Document</div>
                  </div>
                  
                  <div className="content" style={{ marginTop: '20px' }}>
                    <div style={{ textAlign: 'center', padding: '15px', border: '2px solid #000', marginBottom: '20px' }}>
                      <div style={{ fontSize: '14px', marginBottom: '5px' }}>رقم الشحنة / Load Number</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px' }}>{selectedLoad.load_number}</div>
                    </div>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '10px', border: '2px solid #000', fontWeight: 'bold', width: '30%', background: '#f5f5f5', fontSize: '13px' }}>
                            تاريخ الشحنة<br/><small>Load Date</small>
                          </td>
                          <td style={{ padding: '10px', border: '2px solid #000', width: '70%', fontSize: '13px' }}>
                            {format(new Date(selectedLoad.date), 'yyyy-MM-dd')}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px', border: '2px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '13px' }}>
                            تاريخ الفاتورة<br/><small>Invoice Date</small>
                          </td>
                          <td style={{ padding: '10px', border: '2px solid #000', fontSize: '13px' }}>
                            {selectedLoad.invoice_date ? format(new Date(selectedLoad.invoice_date), 'yyyy-MM-dd') : 'لم يحدد / Not Set'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px', border: '2px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '13px' }}>
                            الشركة<br/><small>Company</small>
                          </td>
                          <td style={{ padding: '10px', border: '2px solid #000', fontSize: '13px' }}>
                            {selectedLoad.companies?.name || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px', border: '2px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '13px' }}>
                            نوع الشحنة<br/><small>Load Type</small>
                          </td>
                          <td style={{ padding: '10px', border: '2px solid #000', fontSize: '13px' }}>
                            {selectedLoad.load_types?.name || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px', border: '2px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '13px' }}>
                            السائق<br/><small>Driver</small>
                          </td>
                          <td style={{ padding: '10px', border: '2px solid #000', fontSize: '13px' }}>
                            {selectedLoad.drivers?.name || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px', border: '2px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '13px' }}>
                            رقم الشاحنة<br/><small>Truck Number</small>
                          </td>
                          <td style={{ padding: '10px', border: '2px solid #000', fontSize: '13px' }}>
                            {selectedLoad.truck_number || 'غير محدد / Not Set'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px', border: '2px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '13px' }}>
                            الكمية (طن)<br/><small>Quantity (Ton)</small>
                          </td>
                          <td style={{ padding: '10px', border: '2px solid #000', fontSize: '13px' }}>
                            {selectedLoad.quantity}
                          </td>
                        </tr>
                        {selectedLoad.notes && (
                          <tr>
                            <td style={{ padding: '10px', border: '2px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '13px' }}>
                              ملاحظات<br/><small>Notes</small>
                            </td>
                            <td style={{ padding: '10px', border: '2px solid #000', fontSize: '13px' }}>
                              {selectedLoad.notes}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #000' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '3px' }}>توقيع المسؤول</div>
                        <div style={{ fontSize: '12px', color: '#333', marginBottom: '15px' }}>Manager Signature</div>
                        <div style={{ borderTop: '2px solid #000', marginTop: '50px', paddingTop: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#666' }}>الاسم / Name: __________________</div>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '3px' }}>توقيع السائق</div>
                        <div style={{ fontSize: '12px', color: '#333', marginBottom: '15px' }}>Driver Signature</div>
                        <div style={{ borderTop: '2px solid #000', marginTop: '50px', paddingTop: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#666' }}>الاسم / Name: __________________</div>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '3px' }}>توقيع الاستلام</div>
                        <div style={{ fontSize: '12px', color: '#333', marginBottom: '15px' }}>Receiver Signature</div>
                        <div style={{ borderTop: '2px solid #000', marginTop: '50px', paddingTop: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#666' }}>الاسم / Name: __________________</div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '2px solid #000', fontSize: '11px', color: '#666' }}>
                      <div>تاريخ الطباعة / Print Date: {format(new Date(), 'yyyy-MM-dd HH:mm')}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
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
