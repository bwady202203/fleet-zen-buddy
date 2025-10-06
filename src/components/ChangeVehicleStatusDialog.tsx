import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicles, VehicleStatus } from "@/contexts/VehiclesContext";
import { toast } from "@/hooks/use-toast";

interface ChangeVehicleStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleName: string;
  currentStatus: VehicleStatus;
}

const statusOptions: { value: VehicleStatus; label: string; color: string }[] = [
  { value: "active", label: "سليمة", color: "text-green-600" },
  { value: "warning", label: "تحتاج صيانة", color: "text-yellow-600" },
  { value: "maintenance", label: "قيد الصيانة", color: "text-red-600" },
  { value: "out-of-service", label: "خارج الخدمة", color: "text-gray-600" },
];

export const ChangeVehicleStatusDialog = ({ 
  open, 
  onOpenChange, 
  vehicleId, 
  vehicleName,
  currentStatus 
}: ChangeVehicleStatusDialogProps) => {
  const { updateVehicleStatus } = useVehicles();
  const [selectedStatus, setSelectedStatus] = useState<VehicleStatus>(currentStatus);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateVehicleStatus(vehicleId, selectedStatus);

    const statusLabel = statusOptions.find(s => s.value === selectedStatus)?.label;
    toast({
      title: "تم التحديث",
      description: `تم تحديث حالة ${vehicleName} إلى ${statusLabel}`,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>تغيير حالة المركبة - {vehicleName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">الحالة الجديدة</Label>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as VehicleStatus)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={option.color}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              الحالة الحالية: <span className="font-medium">
                {statusOptions.find(s => s.value === currentStatus)?.label}
              </span>
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit">
              حفظ التغييرات
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
