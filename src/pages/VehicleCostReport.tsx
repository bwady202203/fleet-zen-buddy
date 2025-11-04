import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Calendar, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VehicleCost {
  vehicle_id: string;
  vehicle_name: string;
  license_plate: string;
  total_cost: number;
  maintenance_count: number;
}

const VehicleCostReport = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [vehicleCosts, setVehicleCosts] = useState<VehicleCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    // تعيين التواريخ الافتراضية (أول وآخر يوم في الشهر الحالي)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadVehicleCosts();
    }
  }, [startDate, endDate]);

  const loadVehicleCosts = async () => {
    try {
      setLoading(true);

      // جلب طلبات الصيانة مع بيانات المركبات
      const { data: maintenanceData, error } = await supabase
        .from('maintenance_requests')
        .select(`
          id,
          vehicle_id,
          cost,
          created_at,
          vehicles (
            id,
            model,
            license_plate
          )
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')
        .not('cost', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // تجميع التكاليف حسب المركبة
      const costsByVehicle = new Map<string, VehicleCost>();

      maintenanceData?.forEach((item: any) => {
        if (!item.vehicles) return;

        const vehicleId = item.vehicle_id;
        const cost = parseFloat(item.cost || 0);

        if (costsByVehicle.has(vehicleId)) {
          const existing = costsByVehicle.get(vehicleId)!;
          existing.total_cost += cost;
          existing.maintenance_count += 1;
        } else {
          costsByVehicle.set(vehicleId, {
            vehicle_id: vehicleId,
            vehicle_name: item.vehicles.model,
            license_plate: item.vehicles.license_plate,
            total_cost: cost,
            maintenance_count: 1,
          });
        }
      });

      const costsArray = Array.from(costsByVehicle.values())
        .sort((a, b) => b.total_cost - a.total_cost);

      setVehicleCosts(costsArray);
      
      // حساب الإجمالي
      const total = costsArray.reduce((sum, item) => sum + item.total_cost, 0);
      setTotalCost(total);

    } catch (error) {
      console.error('Error loading vehicle costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/fleet">
                <Button variant="ghost" size="icon">
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <div className="p-2 rounded-lg bg-primary">
                <DollarSign className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">تقرير تكاليف المركبات</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* فلاتر التاريخ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              اختر الفترة الزمنية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">من تاريخ</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">إلى تاريخ</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadVehicleCosts} className="w-full" disabled={loading}>
                  {loading ? "جاري التحميل..." : "عرض التقرير"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ملخص الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي التكاليف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(totalCost)} ر.س
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                عدد المركبات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vehicleCosts.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                متوسط التكلفة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vehicleCosts.length > 0 
                  ? formatCurrency(totalCost / vehicleCosts.length)
                  : '0.00'
                } ر.س
              </div>
            </CardContent>
          </Card>
        </div>

        {/* جدول التكاليف */}
        <Card>
          <CardHeader>
            <CardTitle>تكاليف المركبات</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                جاري تحميل البيانات...
              </div>
            ) : vehicleCosts.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">رقم اللوحة</TableHead>
                      <TableHead className="text-right">الموديل</TableHead>
                      <TableHead className="text-right">عدد الصيانات</TableHead>
                      <TableHead className="text-right">إجمالي التكلفة</TableHead>
                      <TableHead className="text-right">متوسط التكلفة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicleCosts.map((vehicle, index) => (
                      <TableRow key={vehicle.vehicle_id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{vehicle.license_plate}</TableCell>
                        <TableCell>{vehicle.vehicle_name}</TableCell>
                        <TableCell>{vehicle.maintenance_count}</TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatCurrency(vehicle.total_cost)} ر.س
                        </TableCell>
                        <TableCell>
                          {formatCurrency(vehicle.total_cost / vehicle.maintenance_count)} ر.س
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3} className="text-left">
                        الإجمالي
                      </TableCell>
                      <TableCell>
                        {vehicleCosts.reduce((sum, v) => sum + v.maintenance_count, 0)}
                      </TableCell>
                      <TableCell className="text-primary">
                        {formatCurrency(totalCost)} ر.س
                      </TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد بيانات للفترة المحددة
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VehicleCostReport;
