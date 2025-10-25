import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, FileText, Filter, Download, ArrowRight, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface VehicleMaintenanceCost {
  vehicle_id: string;
  vehicle_name: string;
  total_cost: number;
  maintenance_count: number;
  last_maintenance_date: string | null;
}

interface MaintenanceCostDetail {
  id: string;
  maintenance_request_id: string;
  item_name: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  maintenance_date: string;
  status: string;
}

const VehicleMaintenanceCosts = () => {
  const [vehicles, setVehicles] = useState<{ id: string; name: string }[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [vehicleCosts, setVehicleCosts] = useState<VehicleMaintenanceCost[]>([]);
  const [costDetails, setCostDetails] = useState<MaintenanceCostDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
    loadVehicleCosts();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      loadCostDetails(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, license_plate, model')
        .order('model');

      if (error) throw error;

      const vehiclesList = (data || []).map(v => ({
        id: v.id,
        name: `${v.model} - ${v.license_plate}`
      }));
      setVehicles(vehiclesList);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const loadVehicleCosts = async () => {
    try {
      setLoading(true);
      
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, license_plate, model');

      if (vehiclesError) throw vehiclesError;

      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .select('vehicle_id, cost, created_at');

      if (maintenanceError) throw maintenanceError;

      const vehicleCostsMap = new Map<string, VehicleMaintenanceCost>();

      (vehiclesData || []).forEach(vehicle => {
        vehicleCostsMap.set(vehicle.id, {
          vehicle_id: vehicle.id,
          vehicle_name: `${vehicle.model} - ${vehicle.license_plate}`,
          total_cost: 0,
          maintenance_count: 0,
          last_maintenance_date: null,
        });
      });

      (maintenanceData || []).forEach(maintenance => {
        const existing = vehicleCostsMap.get(maintenance.vehicle_id);
        if (existing) {
          existing.total_cost += maintenance.cost || 0;
          existing.maintenance_count += 1;
          if (!existing.last_maintenance_date || maintenance.created_at > existing.last_maintenance_date) {
            existing.last_maintenance_date = maintenance.created_at;
          }
        }
      });

      setVehicleCosts(Array.from(vehicleCostsMap.values()));
    } catch (error) {
      console.error('Error loading vehicle costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCostDetails = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase
        .from('maintenance_cost_items')
        .select(`
          id,
          maintenance_request_id,
          item_name,
          item_type,
          quantity,
          unit_price,
          total_price,
          created_at,
          maintenance_requests!inner(
            created_at,
            status,
            vehicle_id
          )
        `)
        .eq('maintenance_requests.vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const details = (data || []).map(item => ({
        id: item.id,
        maintenance_request_id: item.maintenance_request_id,
        item_name: item.item_name,
        item_type: item.item_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        created_at: item.created_at,
        maintenance_date: (item.maintenance_requests as any).created_at,
        status: (item.maintenance_requests as any).status,
      }));

      setCostDetails(details);
    } catch (error) {
      console.error('Error loading cost details:', error);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedVehicleCost = vehicleCosts.find(vc => vc.vehicle_id === selectedVehicleId);
  const totalCost = costDetails.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">تقرير تكاليف صيانة المركبات</h1>
            </div>
            <Link to="/">
              <Button variant="outline">
                العودة للرئيسية
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Vehicle Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              اختيار المركبة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">المركبة</label>
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={searchOpen}
                      className="w-full justify-between"
                    >
                      {selectedVehicle ? selectedVehicle.name : "اختر المركبة..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command shouldFilter={true}>
                      <CommandInput placeholder="ابحث عن مركبة..." />
                      <CommandList>
                        <CommandEmpty>لا توجد مركبات.</CommandEmpty>
                        <CommandGroup>
                          {vehicles.map((vehicle) => (
                            <CommandItem
                              key={vehicle.id}
                              value={vehicle.name}
                              keywords={[vehicle.name]}
                              onSelect={() => {
                                setSelectedVehicleId(vehicle.id);
                                setSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  selectedVehicleId === vehicle.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {vehicle.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 ml-2" />
                  تصدير PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {selectedVehicleId && selectedVehicleCost && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  إجمالي التكلفة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {selectedVehicleCost.total_cost.toLocaleString()} ر.س
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  عدد طلبات الصيانة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedVehicleCost.maintenance_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  آخر صيانة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {selectedVehicleCost.last_maintenance_date
                    ? new Date(selectedVehicleCost.last_maintenance_date).toLocaleDateString('ar-SA')
                    : 'لا توجد صيانة'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* All Vehicles Summary Table */}
        {!selectedVehicleId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>ملخص تكاليف صيانة جميع المركبات</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المركبة</TableHead>
                    <TableHead className="text-right">عدد طلبات الصيانة</TableHead>
                    <TableHead className="text-right">إجمالي التكلفة</TableHead>
                    <TableHead className="text-right">آخر صيانة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : vehicleCosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        لا توجد بيانات صيانة
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicleCosts
                      .filter(vc => vc.maintenance_count > 0)
                      .map((vc) => (
                        <TableRow
                          key={vc.vehicle_id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedVehicleId(vc.vehicle_id)}
                        >
                          <TableCell className="font-medium">{vc.vehicle_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{vc.maintenance_count}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            {vc.total_cost.toLocaleString()} ر.س
                          </TableCell>
                          <TableCell>
                            {vc.last_maintenance_date
                              ? new Date(vc.last_maintenance_date).toLocaleDateString('ar-SA')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Cost Details Table */}
        {selectedVehicleId && costDetails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل تكاليف الصيانة - {selectedVehicle?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الصنف</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">سعر الوحدة</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costDetails.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell>
                        {new Date(detail.maintenance_date).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell className="font-medium">{detail.item_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {detail.item_type === 'spare_part' ? 'قطعة غيار' : detail.item_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{detail.quantity}</TableCell>
                      <TableCell>{detail.unit_price.toLocaleString()} ر.س</TableCell>
                      <TableCell className="font-semibold">
                        {detail.total_price.toLocaleString()} ر.س
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            detail.status === 'completed'
                              ? 'bg-green-500/10 text-green-500'
                              : detail.status === 'in_progress'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-yellow-500/10 text-yellow-500'
                          }
                        >
                          {detail.status === 'completed'
                            ? 'مكتمل'
                            : detail.status === 'in_progress'
                            ? 'قيد التنفيذ'
                            : 'قيد الانتظار'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/5 font-bold">
                    <TableCell colSpan={5} className="text-left">
                      الإجمالي الكلي:
                    </TableCell>
                    <TableCell className="text-xl text-primary">
                      {totalCost.toLocaleString()} ر.س
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {selectedVehicleId && costDetails.length === 0 && (
          <Card>
            <CardContent className="text-center text-muted-foreground py-8">
              لا توجد تفاصيل تكاليف صيانة لهذه المركبة
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default VehicleMaintenanceCosts;
