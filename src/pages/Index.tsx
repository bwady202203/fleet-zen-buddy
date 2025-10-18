import { VehicleCard } from "@/components/VehicleCard";
import { StatsCard } from "@/components/StatsCard";
import { AddVehicleDialog } from "@/components/AddVehicleDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Calendar, Wrench, AlertCircle, Search, FileText, Package, ShoppingCart, Gauge, List, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useVehicles } from "@/contexts/VehiclesContext";
import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const { vehicles } = useVehicles();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesSearch = vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           vehicle.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, statusFilter]);

  const exportToJSON = () => {
    const dataStr = JSON.stringify(vehicles, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vehicles-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ['الاسم', 'النوع', 'الحالة', 'الكيلومترات', 'تاريخ آخر صيانة', 'تاريخ الصيانة القادمة'];
    const csvData = vehicles.map(v => [
      v.name,
      v.type,
      v.status === 'active' ? 'نشطة' : v.status === 'maintenance' ? 'قيد الصيانة' : v.status === 'warning' ? 'تحتاج صيانة' : 'غير نشطة',
      v.mileage,
      v.lastService || '-',
      v.nextService || '-'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const BOM = '\uFEFF';
    const dataBlob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vehicles-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <Truck className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">نظام تتبع صيانة الأسطول</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={exportToJSON} title="تحميل JSON">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={exportToCSV} title="تحميل CSV">
                <FileText className="h-4 w-4" />
              </Button>
              <Link to="/spare-parts">
                <Button variant="outline">
                  <Package className="h-4 w-4 ml-2" />
                  قطع الغيار
                </Button>
              </Link>
              <Link to="/purchases">
                <Button variant="outline">
                  <ShoppingCart className="h-4 w-4 ml-2" />
                  المشتريات
                </Button>
              </Link>
              <Link to="/reports">
                <Button variant="outline">
                  <FileText className="h-4 w-4 ml-2" />
                  تقرير الصيانة
                </Button>
              </Link>
              <Link to="/vehicle-mileage">
                <Button variant="outline">
                  <Gauge className="h-4 w-4 ml-2" />
                  تقرير الكيلومترات
                </Button>
              </Link>
              <Link to="/bulk-vehicles">
                <Button variant="outline">
                  <List className="h-4 w-4 ml-2" />
                  تسجيل عدة مركبات
                </Button>
              </Link>
              <AddVehicleDialog />
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
                  placeholder="ابحث عن المركبات..." 
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

