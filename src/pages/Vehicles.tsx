import { VehicleCard } from "@/components/VehicleCard";
import { StatsCard } from "@/components/StatsCard";
import { AddVehicleDialog } from "@/components/AddVehicleDialog";
import { Input } from "@/components/ui/input";
import { Truck, Calendar, Wrench, AlertCircle, Search } from "lucide-react";
import * as XLSX from "xlsx";
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

const Vehicles = () => {
  const { vehicles } = useVehicles();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        vehicle.name.toLowerCase().includes(searchLower) ||
        vehicle.licensePlate.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                <Truck className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
                السيارات
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <AddVehicleDialog />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-8 flex-1">
        <section className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="إجمالي المركبات"
              value={vehicles.length}
              icon={Truck}
              description="حجم الأسطول النشط"
            />
            <StatsCard
              title="نشطة"
              value={vehicles.filter((v) => v.status === "active").length}
              icon={Calendar}
              description="مركبات قيد التشغيل"
            />
            <StatsCard
              title="قيد الصيانة"
              value={vehicles.filter((v) => v.status === "maintenance").length}
              icon={Wrench}
              description="يتم صيانتها حالياً"
            />
            <StatsCard
              title="تحتاج صيانة"
              value={vehicles.filter((v) => v.status === "warning").length}
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

export default Vehicles;
