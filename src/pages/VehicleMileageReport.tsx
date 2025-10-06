import { useState, useMemo } from "react";
import { useVehicleMileage } from "@/contexts/VehicleMileageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Gauge, TrendingUp, Calendar, Droplet, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { OilChangeDialog } from "@/components/OilChangeDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const VehicleMileageReport = () => {
  const { mileageRecords, oilChangeRecords } = useVehicleMileage();
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [oilChangeDialogOpen, setOilChangeDialogOpen] = useState(false);
  const [selectedVehicleForOil, setSelectedVehicleForOil] = useState<{id: string; name: string; mileage: number} | null>(null);

  const vehicles = useMemo(() => {
    const uniqueVehicles = new Map();
    mileageRecords.forEach(record => {
      if (!uniqueVehicles.has(record.vehicleId)) {
        uniqueVehicles.set(record.vehicleId, record.vehicleName);
      }
    });
    return Array.from(uniqueVehicles.entries()).map(([id, name]) => ({ id, name }));
  }, [mileageRecords]);

  const filteredRecords = useMemo(() => {
    return mileageRecords.filter(record => {
      const matchVehicle = selectedVehicle === "all" || record.vehicleId === selectedVehicle;
      const matchStartDate = !startDate || record.date >= startDate;
      const matchEndDate = !endDate || record.date <= endDate;
      return matchVehicle && matchStartDate && matchEndDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mileageRecords, selectedVehicle, startDate, endDate]);

  const stats = useMemo(() => {
    const totalRecords = filteredRecords.length;
    const totalMileage = filteredRecords.reduce((sum, record) => sum + record.mileage, 0);
    const avgMileage = totalRecords > 0 ? Math.round(totalMileage / totalRecords) : 0;
    
    const vehicleOilChanges = selectedVehicle !== "all" 
      ? oilChangeRecords.filter(r => r.vehicleId === selectedVehicle)
      : oilChangeRecords;
    const totalOilChanges = vehicleOilChanges.length;

    return { totalRecords, totalMileage, avgMileage, totalOilChanges };
  }, [filteredRecords, oilChangeRecords, selectedVehicle]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary">
                  <Gauge className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold">تقرير حركة المركبات</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>الفلاتر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>المركبة</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المركبة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المركبات</SelectItem>
                    {vehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">من تاريخ</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">إلى تاريخ</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي السجلات</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecords}</div>
              <p className="text-xs text-muted-foreground">عدد قراءات العداد</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الكيلومترات</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMileage.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">كم</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">متوسط القراءة</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgMileage.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">كم</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">تغييرات الزيت</CardTitle>
              <Droplet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOilChanges}</div>
              <p className="text-xs text-muted-foreground">عملية تغيير</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>سجل حركة المركبات</CardTitle>
              <Dialog open={oilChangeDialogOpen} onOpenChange={setOilChangeDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (selectedVehicle === "all") {
                        // Select first vehicle as default
                        const firstVehicle = vehicles[0];
                        if (firstVehicle) {
                          setSelectedVehicleForOil({
                            id: firstVehicle.id,
                            name: firstVehicle.name,
                            mileage: filteredRecords.find(r => r.vehicleId === firstVehicle.id)?.mileage || 0
                          });
                        }
                      } else {
                        const vehicle = vehicles.find(v => v.id === selectedVehicle);
                        if (vehicle) {
                          setSelectedVehicleForOil({
                            id: vehicle.id,
                            name: vehicle.name,
                            mileage: filteredRecords.find(r => r.vehicleId === vehicle.id)?.mileage || 0
                          });
                        }
                      }
                    }}
                  >
                    <Droplet className="h-4 w-4 ml-2" />
                    تسجيل تغيير زيت
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد سجلات مطابقة للفلاتر المحددة
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">المركبة</TableHead>
                      <TableHead className="text-right">السائق</TableHead>
                      <TableHead className="text-right">الكيلومترات</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{new Date(record.date).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell className="font-medium">{record.vehicleName}</TableCell>
                        <TableCell>{record.driverName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {record.mileage.toLocaleString()} كم
                            {record.type === 'oil-change' && (
                              <Badge variant="outline" className="mr-2">
                                <Droplet className="h-3 w-3 ml-1" />
                                تغيير زيت
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{record.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedVehicleForOil && (
          <OilChangeDialog
            open={oilChangeDialogOpen}
            onOpenChange={setOilChangeDialogOpen}
            vehicleId={selectedVehicleForOil.id}
            vehicleName={selectedVehicleForOil.name}
            currentMileage={selectedVehicleForOil.mileage}
          />
        )}
      </main>
    </div>
  );
};

export default VehicleMileageReport;
