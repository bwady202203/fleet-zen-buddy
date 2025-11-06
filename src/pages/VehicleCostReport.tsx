import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Calendar, DollarSign, Eye, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VehicleCost {
  vehicle_id: string;
  vehicle_name: string;
  license_plate: string;
  total_cost: number;
  maintenance_count: number;
  loads_count: number;
  maintenance_cost: number;
  loads_cost: number;
}

interface SparePartDetail {
  id: string;
  item_name: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  maintenance_date: string;
}

const VehicleCostReport = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [vehicleCosts, setVehicleCosts] = useState<VehicleCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCost | null>(null);
  const [sparePartDetails, setSparePartDetails] = useState<SparePartDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [maintenanceFilter, setMaintenanceFilter] = useState<'all' | 'with_maintenance' | 'without_maintenance'>('all');

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

      // جلب جميع المركبات
      const { data: allVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, model, license_plate')
        .order('license_plate', { ascending: true });

      if (vehiclesError) throw vehiclesError;

      // جلب طلبات الصيانة في الفترة المحددة
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .select('id, vehicle_id, cost, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')
        .not('cost', 'is', null);

      if (maintenanceError) throw maintenanceError;

      // جلب الأحمال في الفترة المحددة
      const { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('id, truck_number, total_amount, commission_amount, date')
        .gte('date', startDate)
        .lte('date', endDate);

      if (loadsError) throw loadsError;

      // تجميع التكاليف حسب المركبة
      const costsByVehicle = new Map<string, VehicleCost>();

      // إضافة جميع المركبات بتكلفة 0 أولاً
      allVehicles?.forEach((vehicle) => {
        costsByVehicle.set(vehicle.license_plate, {
          vehicle_id: vehicle.id,
          vehicle_name: vehicle.model,
          license_plate: vehicle.license_plate,
          total_cost: 0,
          maintenance_count: 0,
          loads_count: 0,
          maintenance_cost: 0,
          loads_cost: 0,
        });
      });

      // إنشاء خريطة للمركبات حسب vehicle_id
      const vehicleIdMap = new Map<string, string>();
      allVehicles?.forEach((vehicle) => {
        vehicleIdMap.set(vehicle.id, vehicle.license_plate);
      });

      // تحديث التكاليف من سجلات الصيانة
      maintenanceData?.forEach((item: any) => {
        const licensePlate = vehicleIdMap.get(item.vehicle_id);
        if (!licensePlate) return;

        const cost = parseFloat(item.cost || 0);

        if (costsByVehicle.has(licensePlate)) {
          const existing = costsByVehicle.get(licensePlate)!;
          existing.maintenance_cost += cost;
          existing.total_cost += cost;
          existing.maintenance_count += 1;
        }
      });

      // تحديث التكاليف من الأحمال
      loadsData?.forEach((load: any) => {
        const truckNumber = load.truck_number;
        
        // تخطي الأحمال بدون رقم شاحنة أو التي ليست موجودة في قائمة المركبات
        if (!truckNumber || !costsByVehicle.has(truckNumber)) {
          return;
        }

        const loadCost = parseFloat(load.total_amount || 0);
        const existing = costsByVehicle.get(truckNumber)!;
        existing.loads_cost += loadCost;
        existing.total_cost += loadCost;
        existing.loads_count += 1;
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

  const getFilteredVehicles = () => {
    if (maintenanceFilter === 'with_maintenance') {
      return vehicleCosts.filter(v => v.maintenance_count > 0);
    } else if (maintenanceFilter === 'without_maintenance') {
      return vehicleCosts.filter(v => v.maintenance_count === 0);
    }
    return vehicleCosts;
  };

  const filteredVehicles = getFilteredVehicles();

  const loadSparePartDetails = async (vehicleId: string) => {
    try {
      setLoadingDetails(true);
      
      // جلب تفاصيل القطع من maintenance_cost_items
      const { data: maintenanceRequests, error: mrError } = await supabase
        .from('maintenance_requests')
        .select('id, created_at')
        .eq('vehicle_id', vehicleId)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');

      if (mrError) throw mrError;

      if (!maintenanceRequests || maintenanceRequests.length === 0) {
        setSparePartDetails([]);
        return;
      }

      const maintenanceIds = maintenanceRequests.map(mr => mr.id);

      const { data: items, error: itemsError } = await supabase
        .from('maintenance_cost_items')
        .select(`
          id,
          item_name,
          item_type,
          quantity,
          unit_price,
          total_price,
          notes,
          maintenance_request_id
        `)
        .in('maintenance_request_id', maintenanceIds)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      // ربط البيانات مع تواريخ الصيانة
      const detailsWithDates = items?.map(item => {
        const maintenanceRequest = maintenanceRequests.find(
          mr => mr.id === item.maintenance_request_id
        );
        return {
          ...item,
          maintenance_date: maintenanceRequest?.created_at || '',
        };
      }) || [];

      setSparePartDetails(detailsWithDates);
    } catch (error) {
      console.error('Error loading spare part details:', error);
      setSparePartDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleVehicleClick = async (vehicle: VehicleCost) => {
    if (vehicle.maintenance_count === 0) {
      return; // لا توجد صيانات لهذه المركبة
    }
    setSelectedVehicle(vehicle);
    setShowDetailsDialog(true);
    await loadSparePartDetails(vehicle.vehicle_id);
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

        {/* فلتر حالة الصيانة */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <Label className="text-sm font-medium">فرز حسب حالة الصيانة:</Label>
              <div className="flex gap-2">
                <Button
                  variant={maintenanceFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMaintenanceFilter('all')}
                >
                  الكل ({vehicleCosts.length})
                </Button>
                <Button
                  variant={maintenanceFilter === 'with_maintenance' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMaintenanceFilter('with_maintenance')}
                >
                  مع صيانة ({vehicleCosts.filter(v => v.maintenance_count > 0).length})
                </Button>
                <Button
                  variant={maintenanceFilter === 'without_maintenance' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMaintenanceFilter('without_maintenance')}
                >
                  بدون صيانة ({vehicleCosts.filter(v => v.maintenance_count === 0).length})
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
            ) : filteredVehicles.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">رقم اللوحة</TableHead>
                      <TableHead className="text-right">الموديل</TableHead>
                      <TableHead className="text-right">تكاليف الصيانة</TableHead>
                      <TableHead className="text-right">تكاليف الأحمال</TableHead>
                      <TableHead className="text-right">عدد الصيانات</TableHead>
                      <TableHead className="text-right">عدد الأحمال</TableHead>
                      <TableHead className="text-right">إجمالي التكلفة</TableHead>
                      <TableHead className="text-right">التفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVehicles.map((vehicle, index) => (
                      <TableRow key={vehicle.vehicle_id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{vehicle.license_plate}</TableCell>
                        <TableCell>{vehicle.vehicle_name}</TableCell>
                        <TableCell>
                          {formatCurrency(vehicle.maintenance_cost)} ر.س
                        </TableCell>
                        <TableCell>
                          {formatCurrency(vehicle.loads_cost)} ر.س
                        </TableCell>
                        <TableCell>{vehicle.maintenance_count}</TableCell>
                        <TableCell>{vehicle.loads_count}</TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatCurrency(vehicle.total_cost)} ر.س
                        </TableCell>
                        <TableCell>
                          {vehicle.maintenance_count > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVehicleClick(vehicle)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3} className="text-left">
                        الإجمالي ({maintenanceFilter === 'all' ? 'الكل' : maintenanceFilter === 'with_maintenance' ? 'مع صيانة' : 'بدون صيانة'})
                      </TableCell>
                      <TableCell className="text-primary">
                        {formatCurrency(filteredVehicles.reduce((sum, v) => sum + v.maintenance_cost, 0))} ر.س
                      </TableCell>
                      <TableCell className="text-primary">
                        {formatCurrency(filteredVehicles.reduce((sum, v) => sum + v.loads_cost, 0))} ر.س
                      </TableCell>
                      <TableCell>
                        {filteredVehicles.reduce((sum, v) => sum + v.maintenance_count, 0)}
                      </TableCell>
                      <TableCell>
                        {filteredVehicles.reduce((sum, v) => sum + v.loads_count, 0)}
                      </TableCell>
                      <TableCell className="text-primary">
                        {formatCurrency(filteredVehicles.reduce((sum, v) => sum + v.total_cost, 0))} ر.س
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {vehicleCosts.length === 0 
                  ? 'لا توجد بيانات للفترة المحددة' 
                  : 'لا توجد مركبات تطابق الفلتر المحدد'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog لعرض تفاصيل القطع */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                تفاصيل القطع المستخدمة - {selectedVehicle?.license_plate} ({selectedVehicle?.vehicle_name})
              </DialogTitle>
            </DialogHeader>
            
            {loadingDetails ? (
              <div className="text-center py-8 text-muted-foreground">
                جاري تحميل التفاصيل...
              </div>
            ) : sparePartDetails.length > 0 ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">#</TableHead>
                          <TableHead className="text-right">اسم القطعة</TableHead>
                          <TableHead className="text-right">النوع</TableHead>
                          <TableHead className="text-right">الكمية</TableHead>
                          <TableHead className="text-right">سعر الوحدة</TableHead>
                          <TableHead className="text-right">الإجمالي</TableHead>
                          <TableHead className="text-right">تاريخ الصيانة</TableHead>
                          <TableHead className="text-right">ملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sparePartDetails.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>{item.item_name}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                item.item_type === 'spare_part' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {item.item_type === 'spare_part' ? 'قطعة غيار' : 'خدمة'}
                              </span>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unit_price)} ر.س</TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(item.total_price)} ر.س
                            </TableCell>
                            <TableCell>
                              {new Date(item.maintenance_date).toLocaleDateString('ar-SA')}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={5} className="text-left">
                            الإجمالي الكلي
                          </TableCell>
                          <TableCell className="text-primary">
                            {formatCurrency(sparePartDetails.reduce((sum, item) => sum + item.total_price, 0))} ر.س
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد تفاصيل قطع لهذه المركبة في الفترة المحددة
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default VehicleCostReport;
