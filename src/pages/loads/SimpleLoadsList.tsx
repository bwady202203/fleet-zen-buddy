import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, RefreshCw, FileDown, Calendar, Package, FileText, TrendingUp, FileType } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

// Import jspdf-autotable and extend jsPDF type
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const SimpleLoadsList = () => {
  const { toast } = useToast();
  const [loads, setLoads] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("loads");

  useEffect(() => {
    loadData();
    loadCompanies();
    loadReports();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      if (data) setCompanies(data);
    } catch (error: any) {
      console.error('خطأ في تحميل الشركات:', error);
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
      toast({
        title: "تم التحميل بنجاح",
        description: `تم تحميل ${data?.length || 0} شحنة`,
      });
    } catch (error: any) {
      console.error('خطأ في التحميل:', error);
      toast({
        title: "خطأ في التحميل",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLoads = useMemo(() => {
    let filtered = [...loads];

    // فلتر الشركة
    if (selectedCompany && selectedCompany !== "all") {
      filtered = filtered.filter(load => load.company_id === selectedCompany);
    }

    // فلتر التاريخ
    if (startDate) {
      filtered = filtered.filter(load => {
        const loadDate = load.date ? new Date(load.date).toISOString().split('T')[0] : '';
        return loadDate >= startDate;
      });
    }
    
    if (endDate) {
      filtered = filtered.filter(load => {
        const loadDate = load.date ? new Date(load.date).toISOString().split('T')[0] : '';
        return loadDate <= endDate;
      });
    }

    return filtered;
  }, [loads, selectedCompany, startDate, endDate]);

  const statistics = useMemo(() => {
    return {
      totalLoads: filteredLoads.length,
      totalQuantity: filteredLoads.reduce((sum, load) => sum + (load.quantity || 0), 0),
      totalAmount: filteredLoads.reduce((sum, load) => sum + (parseFloat(load.total_amount) || 0), 0),
    };
  }, [filteredLoads]);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('loads_reports')
        .select(`
          *,
          companies (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReports(data || []);
    } catch (error: any) {
      console.error('خطأ في تحميل التقارير:', error);
      toast({
        title: "خطأ في تحميل التقارير",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const generateReport = async () => {
    if (!selectedCompany || selectedCompany === "all") {
      toast({
        title: "خطأ",
        description: "يجب اختيار شركة محددة",
        variant: "destructive"
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: "خطأ",
        description: "يجب تحديد تاريخ البداية والنهاية",
        variant: "destructive"
      });
      return;
    }

    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .rpc('generate_loads_report', {
          p_company_id: selectedCompany,
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (error) throw error;

      toast({
        title: "تم إنشاء التقرير",
        description: "تم إنشاء التقرير بنجاح"
      });

      loadReports();
      setActiveTab("reports");
    } catch (error: any) {
      console.error('خطأ في إنشاء التقرير:', error);
      toast({
        title: "خطأ في إنشاء التقرير",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const resetFilters = () => {
    setSelectedCompany("all");
    setStartDate("");
    setEndDate("");
    toast({
      title: "تمت إعادة التعيين",
      description: "تم إلغاء جميع الفلاتر",
    });
  };

  const exportToExcel = () => {
    const exportData = filteredLoads.map(load => ({
      'التاريخ': load.date ? format(new Date(load.date), 'yyyy-MM-dd') : '-',
      'رقم الشحنة': load.load_number || '-',
      'الشركة': load.companies?.name || '-',
      'نوع الشحنة': load.load_types?.name || '-',
      'السائق': load.drivers?.name || '-',
      'رقم الشاحنة': load.truck_number || '-',
      'الكمية': load.quantity?.toFixed(2) || '0.00',
      'سعر الوحدة': parseFloat(load.unit_price || 0).toFixed(2),
      'المبلغ الإجمالي': parseFloat(load.total_amount || 0).toFixed(2),
      'الحالة': load.status || '-',
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

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
    
    // Add title
    doc.setFontSize(18);
    doc.text('تقرير الشحنات - Loads Report', 148, 15, { align: 'center' });
    
    // Add date range if filtered
    doc.setFontSize(10);
    let subtitle = `تاريخ الإنشاء: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`;
    if (startDate || endDate) {
      subtitle += ` | الفترة: ${startDate || '...'} إلى ${endDate || '...'}`;
    }
    if (selectedCompany && selectedCompany !== "all") {
      const company = companies.find(c => c.id === selectedCompany);
      if (company) {
        subtitle += ` | الشركة: ${company.name}`;
      }
    }
    doc.text(subtitle, 148, 22, { align: 'center' });

    // Add statistics
    doc.setFontSize(9);
    const statsText = `عدد الشحنات: ${statistics.totalLoads} | إجمالي الكمية: ${statistics.totalQuantity.toFixed(2)} | إجمالي المبلغ: ${statistics.totalAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}`;
    doc.text(statsText, 148, 28, { align: 'center' });

    // Prepare table data
    const tableData = filteredLoads.map(load => [
      load.date ? format(new Date(load.date), 'yyyy-MM-dd') : '-',
      load.load_number || '-',
      load.companies?.name || '-',
      load.load_types?.name || '-',
      load.drivers?.name || '-',
      load.truck_number || '-',
      load.quantity?.toFixed(2) || '0.00',
      parseFloat(load.unit_price || 0).toFixed(2),
      parseFloat(load.total_amount || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 }),
      load.status === 'pending' ? 'معلق' : load.status === 'completed' ? 'مكتمل' : load.status === 'cancelled' ? 'ملغي' : load.status || '-'
    ]);

    // Add table
    doc.autoTable({
      startY: 35,
      head: [[
        'التاريخ',
        'رقم الشحنة',
        'الشركة',
        'نوع الشحنة',
        'السائق',
        'رقم الشاحنة',
        'الكمية',
        'سعر الوحدة',
        'المبلغ الإجمالي',
        'الحالة'
      ]],
      body: tableData,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      margin: { top: 35, right: 10, bottom: 10, left: 10 },
      didDrawPage: (data: any) => {
        // Footer
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `صفحة ${data.pageNumber} من ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
    });

    // Save the PDF
    doc.save(`loads_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    toast({
      title: "تم التصدير",
      description: "تم تصدير البيانات إلى PDF بنجاح"
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'pending': { label: 'معلق', variant: 'secondary' },
      'completed': { label: 'مكتمل', variant: 'default' },
      'cancelled': { label: 'ملغي', variant: 'destructive' },
    };
    
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/loads" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
                  عرض الشحنات
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  عرض بسيط لجميع الشحنات مع فلترة بسيطة
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => loadData()} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
              <Button onClick={exportToExcel} variant="outline" size="sm">
                <FileDown className="h-4 w-4 ml-2" />
                Excel
              </Button>
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <FileType className="h-4 w-4 ml-2" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">عدد الشحنات</p>
                  <p className="text-3xl font-bold text-blue-600">{statistics.totalLoads}</p>
                </div>
                <Package className="h-10 w-10 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">إجمالي الكمية</p>
                  <p className="text-3xl font-bold text-green-600">{statistics.totalQuantity.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">طن</p>
                </div>
                <Package className="h-10 w-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">إجمالي المبلغ</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {statistics.totalAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">ريال</p>
                </div>
                <Package className="h-10 w-10 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              الفلاتر
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">من تاريخ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">الشركة</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الشركات" />
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

              <div className="flex items-end">
                <Button onClick={resetFilters} variant="outline" className="w-full">
                  إعادة تعيين
                </Button>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={generateReport} 
                  variant="default" 
                  className="w-full"
                  disabled={loadingReports || !selectedCompany || selectedCompany === "all" || !startDate || !endDate}
                >
                  <FileText className="h-4 w-4 ml-2" />
                  إنشاء تقرير
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Loads and Reports */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="loads">
              <Package className="h-4 w-4 ml-2" />
              الشحنات
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="h-4 w-4 ml-2" />
              التقارير
            </TabsTrigger>
          </TabsList>

          <TabsContent value="loads">
            <Card className="shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right font-bold">التاريخ</TableHead>
                    <TableHead className="text-right font-bold">رقم الشحنة</TableHead>
                    <TableHead className="text-right font-bold">الشركة</TableHead>
                    <TableHead className="text-right font-bold">نوع الشحنة</TableHead>
                    <TableHead className="text-right font-bold">السائق</TableHead>
                    <TableHead className="text-right font-bold">رقم الشاحنة</TableHead>
                    <TableHead className="text-right font-bold">الكمية</TableHead>
                    <TableHead className="text-right font-bold">سعر الوحدة</TableHead>
                    <TableHead className="text-right font-bold">المبلغ الإجمالي</TableHead>
                    <TableHead className="text-right font-bold">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-muted-foreground">جاري التحميل...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredLoads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">لا توجد شحنات</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLoads.map((load) => (
                      <TableRow key={load.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          {load.date ? format(new Date(load.date), 'yyyy-MM-dd') : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{load.load_number}</TableCell>
                        <TableCell>{load.companies?.name || '-'}</TableCell>
                        <TableCell>{load.load_types?.name || '-'}</TableCell>
                        <TableCell>{load.drivers?.name || '-'}</TableCell>
                        <TableCell>{load.truck_number || '-'}</TableCell>
                        <TableCell className="font-mono">
                          {load.quantity ? load.quantity.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {load.unit_price ? parseFloat(load.unit_price).toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-primary">
                          {load.total_amount ? parseFloat(load.total_amount).toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '0.00'}
                        </TableCell>
                        <TableCell>{getStatusBadge(load.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  تقارير الشحنات حسب الشركة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingReports ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-muted-foreground">جاري التحميل...</p>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">لا توجد تقارير</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      قم بتحديد شركة وفترة زمنية ثم اضغط على "إنشاء تقرير"
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-right font-bold">الشركة</TableHead>
                          <TableHead className="text-right font-bold">من تاريخ</TableHead>
                          <TableHead className="text-right font-bold">إلى تاريخ</TableHead>
                          <TableHead className="text-right font-bold">عدد الشحنات</TableHead>
                          <TableHead className="text-right font-bold">إجمالي الكمية</TableHead>
                          <TableHead className="text-right font-bold">إجمالي المبلغ</TableHead>
                          <TableHead className="text-right font-bold">متوسط الشحنة</TableHead>
                          <TableHead className="text-right font-bold">تاريخ الإنشاء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report) => (
                          <TableRow key={report.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium">
                              {report.companies?.name || '-'}
                            </TableCell>
                            <TableCell>
                              {report.start_date ? format(new Date(report.start_date), 'yyyy-MM-dd') : '-'}
                            </TableCell>
                            <TableCell>
                              {report.end_date ? format(new Date(report.end_date), 'yyyy-MM-dd') : '-'}
                            </TableCell>
                            <TableCell className="font-bold text-blue-600">
                              {report.total_loads}
                            </TableCell>
                            <TableCell className="font-mono">
                              {parseFloat(report.total_quantity || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-primary">
                              {parseFloat(report.total_amount || 0).toLocaleString('ar-SA', { 
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2 
                              })}
                            </TableCell>
                            <TableCell className="font-mono text-green-600">
                              {parseFloat(report.average_load_amount || 0).toLocaleString('ar-SA', { 
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2 
                              })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {report.created_at ? format(new Date(report.created_at), 'yyyy-MM-dd HH:mm') : '-'}
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
        </Tabs>
      </main>
    </div>
  );
};

export default SimpleLoadsList;
