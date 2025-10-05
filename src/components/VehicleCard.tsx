import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Calendar, Wrench, AlertTriangle } from "lucide-react";
import { MaintenanceRequestDialog } from "./MaintenanceRequestDialog";

interface VehicleCardProps {
  id: string;
  name: string;
  type: string;
  status: "active" | "maintenance" | "warning";
  lastService: string;
  nextService: string;
  mileage: number;
}

export const VehicleCard = ({ 
  name, 
  type, 
  status, 
  lastService, 
  nextService, 
  mileage 
}: VehicleCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const getStatusColor = () => {
    switch(status) {
      case "active": return "bg-accent";
      case "maintenance": return "bg-destructive";
      case "warning": return "bg-[hsl(var(--chart-3))]";
      default: return "bg-muted";
    }
  };

  const getStatusText = () => {
    switch(status) {
      case "active": return "نشطة";
      case "maintenance": return "قيد الصيانة";
      case "warning": return "تحتاج صيانة";
      default: return "غير معروف";
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{name}</CardTitle>
                <p className="text-sm text-muted-foreground">{type}</p>
              </div>
            </div>
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
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
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{mileage.toLocaleString()} كم</span>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              طلب صيانة
            </Button>
          </div>
        </CardContent>
      </Card>

      <MaintenanceRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicleName={name}
      />
    </>
  );
};
