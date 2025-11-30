import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Calendar, Wrench, AlertTriangle, Gauge, Settings, RotateCcw } from "lucide-react";
import { MaintenanceRequestDialog } from "./MaintenanceRequestDialog";
import { AddMileageDialog } from "./AddMileageDialog";
import { ChangeVehicleStatusDialog } from "./ChangeVehicleStatusDialog";
import { VehicleStatus } from "@/contexts/VehiclesContext";
import { useVehicleMileage } from "@/contexts/VehicleMileageContext";
import { toast } from "@/hooks/use-toast";

interface VehicleCardProps {
  id: string;
  name: string;
  licensePlate: string;
  type: string;
  status: VehicleStatus;
  lastService: string;
  nextService: string;
  mileage: number;
}

export const VehicleCard = ({ 
  id,
  name,
  licensePlate,
  type, 
  status, 
  lastService, 
  nextService, 
  mileage 
}: VehicleCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mileageDialogOpen, setMileageDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const { getMileageByVehicle, addMileageRecord } = useVehicleMileage();

  // حساب الكيلومترات الفعلية من السجلات
  const actualMileage = useMemo(() => {
    const records = getMileageByVehicle(id);
    if (records.length === 0) return 0;
    
    // إيجاد آخر نقطة تصفير
    let lastResetIndex = -1;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].resetMileage) {
        lastResetIndex = i;
        break;
      }
    }
    
    // جمع الكيلومترات بعد آخر تصفير
    const relevantRecords = lastResetIndex >= 0 
      ? records.slice(lastResetIndex + 1) 
      : records;
    
    return relevantRecords.reduce((total, record) => total + record.mileage, 0);
  }, [getMileageByVehicle, id]);

  // تحديد لون الكارت حسب الكيلومترات
  const getCardColorClass = () => {
    if (actualMileage >= 10000) {
      return "border-[hsl(var(--danger-mileage))] bg-[hsl(var(--danger-mileage))]/5";
    } else if (actualMileage >= 5000) {
      return "border-[hsl(var(--warning-mileage))] bg-[hsl(var(--warning-mileage))]/5";
    }
    return "";
  };

  const handleResetMileage = () => {
    addMileageRecord({
      vehicleId: id,
      vehicleName: name,
      date: new Date().toISOString().split('T')[0],
      mileage: 0,
      driverName: "النظام",
      notes: "تصفير عداد الكيلومترات",
      resetMileage: true
    });
    
    toast({
      title: "تم تصفير الكيلومترات",
      description: `تم تصفير عداد الكيلومترات للمركبة ${name}`,
    });
  };

  const getStatusColor = () => {
    switch(status) {
      case "active": return "bg-accent";
      case "maintenance": return "bg-destructive";
      case "warning": return "bg-[hsl(var(--chart-3))]";
      case "out-of-service": return "bg-muted";
      default: return "bg-muted";
    }
  };

  const getStatusText = () => {
    switch(status) {
      case "active": return "سليمة";
      case "maintenance": return "قيد الصيانة";
      case "warning": return "تحتاج صيانة";
      case "out-of-service": return "خارج الخدمة";
      default: return "غير معروف";
    }
  };

  return (
    <>
      <Card className={`hover:shadow-lg transition-shadow ${getCardColorClass()}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{name}</CardTitle>
                <p className="text-sm text-muted-foreground">{licensePlate}</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Badge className={getStatusColor()}>
                {getStatusText()}
              </Badge>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8"
                onClick={() => setStatusDialogOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">آخر صيانة</p>
                <p className="font-medium">{lastService}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">الصيانة القادمة</p>
                <p className="font-medium">{nextService}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{actualMileage.toLocaleString()} كم</span>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 w-7 p-0"
                onClick={handleResetMileage}
                title="تصفير الكيلومترات"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setMileageDialogOpen(true)}>
                <Gauge className="h-4 w-4 ml-1" />
                إضافة كم
              </Button>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                طلب صيانة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <MaintenanceRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicleName={name}
        vehicleId={id}
      />

      <AddMileageDialog
        open={mileageDialogOpen}
        onOpenChange={setMileageDialogOpen}
        vehicleId={id}
        vehicleName={name}
      />

      <ChangeVehicleStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        vehicleId={id}
        vehicleName={name}
        currentStatus={status}
      />
    </>
  );
};
