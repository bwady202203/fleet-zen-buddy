import { VehicleCard } from "@/components/VehicleCard";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Calendar, Wrench, AlertCircle, Plus, Search, FileText, Package, ShoppingCart, Gauge } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const vehicles = [
    {
      id: "1",
      name: "شاحنة A-101",
      type: "شاحنة ثقيلة",
      status: "active" as const,
      lastService: "2024-09-15",
      nextService: "2024-12-15",
      mileage: 45230
    },
    {
      id: "2",
      name: "فان B-205",
      type: "فان توصيل",
      status: "warning" as const,
      lastService: "2024-08-20",
      nextService: "2024-11-20",
      mileage: 32100
    },
    {
      id: "3",
      name: "شاحنة C-340",
      type: "شاحنة متوسطة",
      status: "maintenance" as const,
      lastService: "2024-10-01",
      nextService: "2024-10-15",
      mileage: 58920
    },
    {
      id: "4",
      name: "فان D-412",
      type: "فان نقل",
      status: "active" as const,
      lastService: "2024-09-10",
      nextService: "2024-12-10",
      mileage: 28450
    }
  ];

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
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إضافة مركبة
              </Button>
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">أسطولك</h2>
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث عن المركبات..." 
                className="pr-9 text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} {...vehicle} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;

