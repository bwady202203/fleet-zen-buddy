import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  Printer, 
  Edit, 
  Trash2, 
  Filter, 
  FileDown, 
  Search,
  Calendar,
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  RefreshCw,
  Download,
  FileText,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import DriverDailyDuesReport from "@/components/reports/DriverDailyDuesReport";

const AdvancedLoadsList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDriverDuesReport, setShowDriverDuesReport] = useState(false);
  
  // Filter states
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedLoadType, setSelectedLoadType] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [sortField, setSortField] = useState<'date' | 'load_number' | 'quantity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData();
    loadFilterData();
  }, []);

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
      
      toast({
        title: "تم التحميل بنجاح",
        description: `تم تحميل ${allLoads.length} شحنة من قاعدة البيانات`,
      });
    } catch (error: any) {
      console.error('Error loading loads:', error);
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
    // التحقق من صحة التاريخ (منع التواريخ الخاطئة مثل 12002)
    const isValidDate = (dateStr: string | null): boolean => {
      if (!dateStr) return false;
      const year = parseInt(dateStr.substring(0, 4), 10);
      return year >= 2000 && year <= 2100;
    };

    return loads.filter((load) => {
      // تجاهل السجلات ذات التواريخ غير الصالحة
      if (!isValidDate(load.date)) return false;

      // فلتر الشركة
      if (selectedCompany !== "all" && load.company_id !== selectedCompany)
        return false;

      // فلتر نوع الحمولة
      if (selectedLoadType !== "all" && load.load_type_id !== selectedLoadType)
        return false;

      // فلتر السائق
      if (selectedDriver !== "all" && load.driver_id !== selectedDriver)
        return false;

      // فلتر التاريخ (مهم جداً)
      if (startDate) {
        const loadDate = new Date(load.date + "T00:00:00");
        const from = new Date(startDate + "T00:00:00");
        if (loadDate < from) return false;
      }

      if (endDate) {
        const loadDate = new Date(load.date + "T00:00:00");
        const to = new Date(endDate + "T23:59:59");
        if (loadDate > to) return false;
      }

      // فلتر النص
      if (searchText) {
        const s = searchText.toLowerCase();
        const driverName = (load.drivers?.name || '').toLowerCase();
        const companyName = (load.companies?.name || '').toLowerCase();
        const loadTypeName = (load.load_types?.name || '').toLowerCase();
        const loadNumber = (load.load_number || '').toLowerCase();
        const truckNumber = (load.truck_number || '').toLowerCase();
        const invoiceNumber = (load.invoice_number || '').toLowerCase();
        
        if (!(
          driverName.includes(s) ||
          companyName.includes(s) ||
          loadTypeName.includes(s) ||
          loadNumber.includes(s) ||
          truckNumber.includes(s) ||
          invoiceNumber.includes(s)
        ))
          return false;
      }

      return true;
    }).sort((a, b) => {
      // الترتيب
      let comparison = 0;
      
      if (sortField === 'date') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortField === 'load_number') {
        const numA = parseInt((a.load_number || '0').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.load_number || '0').replace(/\D/g, ''), 10) || 0;
        comparison = numA - numB;
      } else if (sortField === 'quantity') {
        comparison = (parseFloat(a.quantity) || 0) - (parseFloat(b.quantity) || 0);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [loads, selectedCompany, selectedLoadType, selectedDriver, startDate, endDate, searchText, sortField, sortOrder]);

  const statistics = useMemo(() => {
    return {
      totalLoads: filteredLoads.length,
      totalQuantity: filteredLoads.reduce((sum, load) => sum + (load.quantity || 0), 0),
      totalAmount: filteredLoads.reduce((sum, load) => sum + (parseFloat(load.total_amount) || 0), 0),
      uniqueDrivers: new Set(filteredLoads.map(load => load.driver_id)).size,
      uniqueCompanies: new Set(filteredLoads.map(load => load.company_id)).size,
    };
  }, [filteredLoads]);

  const resetFilters = () => {
    setSelectedCompany("all");
    setSelectedLoadType("all");
    setSelectedDriver("all");
    setStartDate("");
    setEndDate("");
    setSearchText("");
    setSortField('date');
    setSortOrder('desc');
    
    toast({
      title: "تمت إعادة التعيين",
      description: `عرض جميع الشحنات (${loads.length})`,
    });
  };

  const exportToExcel = () => {
    const exportData = filteredLoads.map(load => ({
      'التاريخ': format(new Date(load.date), 'yyyy-MM-dd'),
      'تاريخ الفاتورة': load.invoice_date ? format(new Date(load.invoice_date), 'yyyy-MM-dd') : '-',
      'رقم الشحنة': load.load_number,
      'رقم الفاتورة': load.invoice_number || '-',
      'الشركة': load.companies?.name || '-',
      'نوع الشحنة': load.load_types?.name || '-',
      'السائق': load.drivers?.name || '-',
      'رقم الشاحنة': load.truck_number || '-',
      'الكمية': load.quantity?.toFixed(2) || '0.00',
      'سعر الوحدة': parseFloat(load.unit_price || 0).toFixed(2),
      'المبلغ الإجمالي': parseFloat(load.total_amount || 0).toFixed(2),
      'العمولة': parseFloat(load.commission_amount || 0).toFixed(2),
      'الحالة': load.status || '-',
      'ملاحظات': load.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loads");
    XLSX.writeFile(wb, `loads_advanced_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: "تم التصدير",
      description: "تم تصدير البيانات إلى Excel بنجاح"
    });
  };

  const exportToPDF = async () => {
    toast({
      title: "جاري التصدير...",
      description: "يرجى الانتظار"
    });

    // إنشاء عنصر HTML مؤقت للتقرير
    const reportContainer = document.createElement('div');
    reportContainer.style.cssText = `
      width: 794px;
      padding: 38px;
      background: white;
      font-family: 'Cairo', sans-serif;
      direction: rtl;
      position: absolute;
      left: -9999px;
      top: 0;
    `;

    // بناء محتوى التقرير
    const filterInfo = startDate || endDate 
      ? `<p style="font-size: 12px; color: #666; margin: 5px 0;">الفترة: ${startDate || 'البداية'} إلى ${endDate || 'النهاية'}</p>` 
      : '';

    const companyFilter = selectedCompany !== 'all' ? companies.find(c => c.id === selectedCompany)?.name || '' : '';
    const driverFilter = selectedDriver !== 'all' ? drivers.find(d => d.id === selectedDriver)?.name || '' : '';

    reportContainer.innerHTML = `
      <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; border-bottom: 3px solid #1976d2;">
        <h1 style="font-size: 22px; font-weight: 800; color: #0d47a1; text-align: center; margin: 0;">تقرير سجل الشحنات المطور</h1>
        <p style="font-size: 13px; color: #1565c0; text-align: center; margin: 8px 0 0 0;">تاريخ التقرير: ${format(new Date(), 'yyyy-MM-dd')}</p>
        ${filterInfo}
        ${companyFilter ? `<p style="font-size: 11px; color: #666; text-align: center; margin: 3px 0;">الشركة: ${companyFilter}</p>` : ''}
        ${driverFilter ? `<p style="font-size: 11px; color: #666; text-align: center; margin: 3px 0;">السائق: ${driverFilter}</p>` : ''}
      </div>

      <div style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #e3f2fd 0%, #fff 100%); border: 2px solid #1976d2; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #1976d2;">${statistics.totalLoads}</div>
          <div style="font-size: 10px; color: #666; font-weight: 600;">عدد الشحنات</div>
        </div>
        <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #e8f5e9 0%, #fff 100%); border: 2px solid #388e3c; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #388e3c;">${statistics.totalQuantity.toFixed(2)}</div>
          <div style="font-size: 10px; color: #666; font-weight: 600;">إجمالي الكمية (طن)</div>
        </div>
        <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #fff3e0 0%, #fff 100%); border: 2px solid #f57c00; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 18px; font-weight: 800; color: #f57c00;">${statistics.totalAmount.toLocaleString('ar-SA', { maximumFractionDigits: 0 })}</div>
          <div style="font-size: 10px; color: #666; font-weight: 600;">إجمالي المبلغ (ريال)</div>
        </div>
        <div style="flex: 1; min-width: 100px; background: linear-gradient(135deg, #f3e5f5 0%, #fff 100%); border: 2px solid #9c27b0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #9c27b0;">${statistics.uniqueDrivers}</div>
          <div style="font-size: 10px; color: #666; font-weight: 600;">السائقين</div>
        </div>
        <div style="flex: 1; min-width: 100px; background: linear-gradient(135deg, #fce4ec 0%, #fff 100%); border: 2px solid #e91e63; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #e91e63;">${statistics.uniqueCompanies}</div>
          <div style="font-size: 10px; color: #666; font-weight: 600;">الشركات</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; direction: rtl;">
        <thead>
          <tr style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);">
            <th style="border: 2px solid #0d47a1; padding: 8px 4px; color: white; font-weight: 700; font-size: 11px;">#</th>
            <th style="border: 2px solid #0d47a1; padding: 8px 4px; color: white; font-weight: 700; font-size: 11px;">التاريخ</th>
            <th style="border: 2px solid #0d47a1; padding: 8px 4px; color: white; font-weight: 700; font-size: 11px;">رقم الشحنة</th>
            <th style="border: 2px solid #0d47a1; padding: 8px 4px; color: white; font-weight: 700; font-size: 11px;">الشركة</th>
            <th style="border: 2px solid #0d47a1; padding: 8px 4px; color: white; font-weight: 700; font-size: 11px;">السائق</th>
            <th style="border: 2px solid #0d47a1; padding: 8px 4px; color: white; font-weight: 700; font-size: 11px;">نوع الحمولة</th>
            <th style="border: 2px solid #0d47a1; padding: 8px 4px; color: white; font-weight: 700; font-size: 11px;">الشاحنة</th>
            <th style="border: 2px solid #0d47a1; padding: 8px 4px; color: white; font-weight: 700; font-size: 11px;">الكمية</th>
            <th style="border: 2px solid #0d47a1; padding: 8px 4px; color: white; font-weight: 700; font-size: 11px;">السعر</th>
            <th style="border: 2px solid #0d47a1; padding: 8px 4px; color: white; font-weight: 700; font-size: 11px;">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${filteredLoads.map((load, index) => `
            <tr style="background: ${index % 2 === 0 ? '#fff' : '#f5f5f5'};">
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-weight: 600;">${index + 1}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${format(new Date(load.date), 'yyyy-MM-dd')}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-weight: 600;">${load.load_number || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${load.companies?.name || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${load.drivers?.name || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${load.load_types?.name || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${load.truck_number || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 13px; font-weight: 700; color: #388e3c;">${(load.quantity || 0).toFixed(2)}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${parseFloat(load.unit_price || 0).toFixed(2)}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 12px; font-weight: 700; color: #1976d2;">${parseFloat(load.total_amount || 0).toLocaleString('ar-SA', { maximumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 15px; border-radius: 8px; margin-top: 20px; border: 2px solid #1976d2;">
        <h3 style="font-size: 14px; font-weight: 700; color: #0d47a1; text-align: center; margin: 0 0 10px 0;">ملخص التقرير</h3>
        <div style="display: flex; justify-content: center; gap: 30px; font-size: 12px; color: #333;">
          <span><strong>إجمالي الشحنات:</strong> ${statistics.totalLoads}</span>
          <span><strong>إجمالي الكمية:</strong> ${statistics.totalQuantity.toFixed(2)} طن</span>
          <span><strong>إجمالي المبلغ:</strong> ${statistics.totalAmount.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ريال</span>
        </div>
      </div>

      <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #1976d2;">
        <p style="font-size: 9px; color: #999; margin: 0;">تم إنشاء هذا التقرير بواسطة نظام إدارة الشحنات المطور</p>
      </div>
    `;

    document.body.appendChild(reportContainer);

    try {
      // تحويل HTML إلى صورة
      const canvas = await html2canvas(reportContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // إنشاء PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 190; // A4 width - margins
      const pageHeight = 277; // A4 height - margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      const imgData = canvas.toDataURL('image/png');

      // إضافة الصفحة الأولى
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // إضافة صفحات إضافية إذا لزم الأمر
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // حفظ الملف
      pdf.save(`تقرير_الشحنات_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast({
        title: "تم التصدير بنجاح",
        description: "تم حفظ التقرير بصيغة PDF"
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء إنشاء ملف PDF",
        variant: "destructive"
      });
    } finally {
      // إزالة العنصر المؤقت
      document.body.removeChild(reportContainer);
    }
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

  const handleSort = (field: 'date' | 'load_number' | 'quantity') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/loads" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
                  سجل الشحنات المطور
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Advanced Loads Registry - نظام متقدم لإدارة وعرض الشحنات
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={() => setShowDriverDuesReport(!showDriverDuesReport)} 
                variant={showDriverDuesReport ? "default" : "outline"} 
                size="sm"
                className={showDriverDuesReport ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                <Users className="h-4 w-4 ml-2" />
                {showDriverDuesReport ? "إخفاء تقرير المستحقات" : "تقرير مستحقات السائقين"}
              </Button>
              <Button onClick={() => loadData()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
              <Button onClick={exportToExcel} variant="outline" size="sm">
                <FileDown className="h-4 w-4 ml-2" />
                تصدير Excel
              </Button>
              <Button onClick={exportToPDF} variant="default" size="sm" className="bg-red-600 hover:bg-red-700">
                <FileText className="h-4 w-4 ml-2" />
                تصدير PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Driver Dues Report - Shows when toggled */}
        {showDriverDuesReport && startDate && endDate ? (
          <DriverDailyDuesReport startDate={startDate} endDate={endDate} />
        ) : showDriverDuesReport && (!startDate || !endDate) ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 text-primary/50" />
              <h3 className="text-lg font-semibold mb-2">تقرير مستحقات السائقين</h3>
              <p>يرجى تحديد تاريخ البداية والنهاية في الفلاتر أدناه لعرض التقرير</p>
            </div>
          </Card>
        ) : null}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <TrendingUp className="h-10 w-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">إجمالي المبلغ</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {statistics.totalAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">ريال</p>
                </div>
                <DollarSign className="h-10 w-10 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">عدد السائقين</p>
                  <p className="text-3xl font-bold text-purple-600">{statistics.uniqueDrivers}</p>
                </div>
                <Truck className="h-10 w-10 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border-pink-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">عدد الشركات</p>
                  <p className="text-3xl font-bold text-pink-600">{statistics.uniqueCompanies}</p>
                </div>
                <Package className="h-10 w-10 text-pink-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle>فلاتر البحث المتقدم</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Search Bar */}
            <div className="mb-6">
              <Label className="text-sm font-medium mb-2 block">بحث سريع</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="ابحث برقم الشحنة، الشاحنة، الشركة، أو السائق..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  من تاريخ
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  إلى تاريخ
                </Label>
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

              <div className="space-y-2">
                <Label className="text-sm font-medium">نوع الحمولة</Label>
                <Select value={selectedLoadType} onValueChange={setSelectedLoadType}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الأنواع" />
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

              <div className="space-y-2">
                <Label className="text-sm font-medium">السائق</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع السائقين" />
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

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetFilters}>
                إعادة تعيين
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle>جدول الشحنات</CardTitle>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {filteredLoads.length} شحنة
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : filteredLoads.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">لا توجد شحنات مطابقة للفلتر</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">
                        <button 
                          onClick={() => handleSort('date')} 
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          التاريخ
                          {sortField === 'date' && (
                            <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">تاريخ الفاتورة</TableHead>
                      <TableHead className="text-right">
                        <button 
                          onClick={() => handleSort('load_number')} 
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          رقم الشحنة
                          {sortField === 'load_number' && (
                            <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">رقم الفاتورة</TableHead>
                      <TableHead className="text-right">الشركة</TableHead>
                      <TableHead className="text-right">نوع الشحنة</TableHead>
                      <TableHead className="text-right">السائق</TableHead>
                      <TableHead className="text-right">رقم الشاحنة</TableHead>
                      <TableHead className="text-right">
                        <button 
                          onClick={() => handleSort('quantity')} 
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          الكمية
                          {sortField === 'quantity' && (
                            <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">سعر الوحدة</TableHead>
                      <TableHead className="text-right">المبلغ الإجمالي</TableHead>
                      <TableHead className="text-right">العمولة</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoads.map((load, index) => (
                      <TableRow 
                        key={load.id} 
                        className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                      >
                        <TableCell className="text-right font-medium">
                          {format(new Date(load.date), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {load.invoice_date ? format(new Date(load.invoice_date), 'yyyy-MM-dd') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {load.load_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {load.invoice_number || '-'}
                        </TableCell>
                        <TableCell className="text-right">{load.companies?.name || '-'}</TableCell>
                        <TableCell className="text-right">{load.load_types?.name || '-'}</TableCell>
                        <TableCell className="text-right">{load.drivers?.name || '-'}</TableCell>
                        <TableCell className="text-right">{load.truck_number || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {(load.quantity || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {parseFloat(load.unit_price || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-600">
                          {parseFloat(load.total_amount || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-amber-600">
                          {parseFloat(load.commission_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={load.status === 'completed' ? 'default' : 'secondary'}>
                            {load.status === 'completed' ? 'مكتمل' : load.status === 'pending' ? 'معلق' : load.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/loads/edit/${load.id}`)}
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(load.id)}
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdvancedLoadsList;