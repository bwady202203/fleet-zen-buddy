import { VehicleCard } from "@/components/VehicleCard";
import { StatsCard } from "@/components/StatsCard";
import { AddVehicleDialog } from "@/components/AddVehicleDialog";
import { Input } from "@/components/ui/input";
import { Truck, Calendar, Wrench, AlertCircle, Search } from "lucide-react";
import * as XLSX from 'xlsx';
import { useVehicles } from "@/contexts/VehiclesContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FleetSidebar } from "@/components/FleetSidebar";

const Index = () => {
  const { vehicles } = useVehicles();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 text-right">
            {/* العنوان محاذٍ لليمين */}
            <div className="flex items-center justify-start gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                <Truck className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
                نظام تتبع صيانة الأسطول
              </h1>
            </div>

            {/* الأيقونات: نفس الشبكة في الشاشات الصغيرة، وفي الكبيرة صفّ مرن يحاذي اليمين (justify-start مع dir=rtl) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:flex lg:flex-wrap lg:justify-start gap-2">
              {[
                { to: "/spare-parts", icon: Package, label: "قطع الغيار", color: "from-blue-500/10 to-blue-500/5 hover:from-blue-500/20 hover:to-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
                { to: "/purchases", icon: ShoppingCart, label: "المشتريات", color: "from-emerald-500/10 to-emerald-500/5 hover:from-emerald-500/20 hover:to-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
                { to: "/maintenance-purchase-invoices", icon: Receipt, label: "فواتير المشتريات", color: "from-amber-500/10 to-amber-500/5 hover:from-amber-500/20 hover:to-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
                { to: "/reports", icon: FileText, label: "تقرير الصيانة", color: "from-indigo-500/10 to-indigo-500/5 hover:from-indigo-500/20 hover:to-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" },
                { to: "/vehicle-cost-report", icon: Receipt, label: "تقرير التكاليف", color: "from-rose-500/10 to-rose-500/5 hover:from-rose-500/20 hover:to-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30" },
                { to: "/vehicle-mileage", icon: Gauge, label: "تقرير الكيلومترات", color: "from-cyan-500/10 to-cyan-500/5 hover:from-cyan-500/20 hover:to-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
                { to: "/bulk-vehicles", icon: List, label: "تسجيل عدة مركبات", color: "from-violet-500/10 to-violet-500/5 hover:from-violet-500/20 hover:to-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30" },
                { to: "/edit-vehicles", icon: Edit, label: "تعديل الأسماء", color: "from-orange-500/10 to-orange-500/5 hover:from-orange-500/20 hover:to-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30" },
              ].map(({ to, icon: Icon, label, color }) => (
                <Link key={to} to={to}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full h-9 text-xs sm:text-sm bg-gradient-to-br ${color} border transition-all hover:shadow-md hover:-translate-y-0.5`}
                  >
                    <Icon className="h-4 w-4 ml-1.5 shrink-0" />
                    <span className="truncate font-medium">{label}</span>
                  </Button>
                </Link>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                title="تصدير إلى Excel"
                className="h-9 text-xs sm:text-sm bg-gradient-to-br from-green-500/10 to-green-500/5 hover:from-green-500/20 hover:to-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <FileSpreadsheet className="h-4 w-4 ml-1.5 shrink-0" />
                <span className="truncate font-medium">تصدير Excel</span>
              </Button>
              <AddVehicleDialog />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-8">
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-3xl font-bold mb-2">نظرة عامة على الأسطول</h2>
          <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">راقب وأدر جدول صيانة أسطولك</p>
          
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

