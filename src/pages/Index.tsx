import { VehicleCard } from "@/components/VehicleCard";
import { StatsCard } from "@/components/StatsCard";
import { AddVehicleDialog } from "@/components/AddVehicleDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Calendar, Wrench, AlertCircle, Search, FileText, Package, ShoppingCart, Gauge, List, Download, FileSpreadsheet, Receipt, Edit, Home, ArrowRight, LogOut } from "lucide-react";
import * as XLSX from 'xlsx';
import { Link, useNavigate } from "react-router-dom";
import { useVehicles } from "@/contexts/VehiclesContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const Index = () => {
  const { vehicles } = useVehicles();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const formatArabicDate = (date: Date) => {
    return format(date, "EEEE، d MMMM yyyy", { locale: ar });
  };

  const formatEnglishDate = (date: Date) => {
    return format(date, "EEEE, MMMM d, yyyy");
  };

  const formatTime = (date: Date) => {
    return format(date, "hh:mm:ss a");
  };
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = vehicle.name.toLowerCase().includes(searchLower) ||
                           vehicle.licensePlate.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, statusFilter]);

  const exportToExcel = async () => {
    try {
      // جلب البيانات الكاملة من قاعدة البيانات
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!vehiclesData) return;

      const excelData = vehiclesData.map(v => ({
        'رقم اللوحة': v.license_plate || '-',
        'الموديل': v.model || '-',
        'السنة': v.year || '-',
        'اللون': v.color || '-',
        'السائق': v.driver_name || '-',
        'الحالة': v.status === 'available' ? 'متاحة' : v.status === 'in_use' ? 'قيد الاستخدام' : v.status === 'maintenance' ? 'قيد الصيانة' : 'غير متاحة',
        'الكيلومترات الحالية': v.current_mileage || 0,
        'آخر تغيير زيت (كم)': v.last_oil_change_mileage || '-',
        'تاريخ آخر تغيير زيت': v.last_oil_change_date || '-',
        'ملاحظات': v.notes || '-'
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'المركبات');
      
      // تنسيق العرض
      const cols = [
        { wch: 15 }, // رقم اللوحة
        { wch: 20 }, // الموديل
        { wch: 10 }, // السنة
        { wch: 12 }, // اللون
        { wch: 20 }, // السائق
        { wch: 15 }, // الحالة
        { wch: 15 }, // الكيلومترات
        { wch: 18 }, // آخر تغيير زيت (كم)
        { wch: 18 }, // تاريخ آخر تغيير زيت
        { wch: 30 }  // ملاحظات
      ];
      worksheet['!cols'] = cols;
      
      XLSX.writeFile(workbook, `vehicles-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* شريط معلومات المستخدم */}
      <div className="bg-muted/50 border-b py-2">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="font-medium">👤 {user?.email || 'زائر'}</span>
              <span className="text-muted-foreground">|</span>
              <span className="font-medium">{formatTime(currentTime)}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-medium">{formatArabicDate(currentTime)}</div>
                <div className="text-muted-foreground text-xs">{formatEnglishDate(currentTime)}</div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 ml-2" />
                خروج
              </Button>
            </div>
          </div>
        </div>
      </div>

      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary">
                  <Truck className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold">نظام تتبع صيانة الأسطول</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* قسم الإدارة */}
              <div className="flex items-center gap-2 pl-2 border-l">
                <Link to="/spare-parts">
                  <Button variant="outline" size="sm">
                    <Package className="h-4 w-4 ml-2" />
                    قطع الغيار
                  </Button>
                </Link>
                <Link to="/purchases">
                  <Button variant="outline" size="sm">
                    <ShoppingCart className="h-4 w-4 ml-2" />
                    المشتريات
                  </Button>
                </Link>
                <Link to="/maintenance-purchase-invoices">
                  <Button variant="outline" size="sm">
                    <Receipt className="h-4 w-4 ml-2" />
                    فواتير المشتريات
                  </Button>
                </Link>
              </div>

              {/* قسم التقارير */}
              <div className="flex items-center gap-2 pl-2 border-l">
                <Link to="/reports">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 ml-2" />
                    تقرير الصيانة
                  </Button>
                </Link>
                <Link to="/vehicle-cost-report">
                  <Button variant="outline" size="sm">
                    <Receipt className="h-4 w-4 ml-2" />
                    تقرير التكاليف
                  </Button>
                </Link>
                <Link to="/vehicle-mileage">
                  <Button variant="outline" size="sm">
                    <Gauge className="h-4 w-4 ml-2" />
                    تقرير الكيلومترات
                  </Button>
                </Link>
              </div>

              {/* قسم العمليات */}
              <div className="flex items-center gap-2">
                <Link to="/bulk-vehicles">
                  <Button variant="outline" size="sm">
                    <List className="h-4 w-4 ml-2" />
                    تسجيل عدة مركبات
                  </Button>
                </Link>
                <Link to="/edit-vehicles">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 ml-2" />
                    تعديل الأسماء
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={exportToExcel} title="تصدير إلى Excel">
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  تصدير Excel
                </Button>
                <AddVehicleDialog />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <h2 className="text-3xl font-bold mb-2">نظرة عامة على الأسطول</h2>
          <p className="text-muted-foreground mb-6">راقب وأدر جدول صيانة أسطولك</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="إجمالي المركبات"
              value={vehicles.length}
              icon={Truck}
              description="حجم الأسطول النشط"
            />
            <StatsCard
              title="نشطة"
              value={vehicles.filter(v => v.status === "active").length}
              icon={Calendar}
              description="مركبات قيد التشغيل"
            />
            <StatsCard
              title="قيد الصيانة"
              value={vehicles.filter(v => v.status === "maintenance").length}
              icon={Wrench}
              description="يتم صيانتها حالياً"
            />
            <StatsCard
              title="تحتاج صيانة"
              value={vehicles.filter(v => v.status === "warning").length}
              icon={AlertCircle}
              description="تحتاج إلى اهتمام"
            />
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">أسطولك</h2>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="ابحث بالاسم أو رقم اللوحة..." 
                  className="pr-9 text-right"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="فلتر حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المركبات</SelectItem>
                  <SelectItem value="active">نشطة</SelectItem>
                  <SelectItem value="maintenance">قيد الصيانة</SelectItem>
                  <SelectItem value="warning">تحتاج صيانة</SelectItem>
                  <SelectItem value="inactive">غير نشطة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} {...vehicle} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                لا توجد مركبات تطابق البحث أو الفلتر
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;

