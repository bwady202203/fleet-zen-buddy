import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicleMileage } from "@/contexts/VehicleMileageContext";
import { useVehicles } from "@/contexts/VehiclesContext";
import { toast } from "@/hooks/use-toast";

interface OilChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId?: string;
  vehicleName?: string;
  vehicleType?: string;
  currentMileage?: number;
}

export const OilChangeDialog = ({ open, onOpenChange, vehicleId, vehicleName, vehicleType, currentMileage }: OilChangeDialogProps) => {
  const { addOilChangeRecord } = useVehicleMileage();
  const { vehicles } = useVehicles();
  
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicleId || "");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileageAtChange, setMileageAtChange] = useState(currentMileage?.toString() || "0");
  const [nextOilChange, setNextOilChange] = useState(((currentMileage || 0) + 5000).toString());
  const [oilType, setOilType] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [resetMileage, setResetMileage] = useState(false);

  // الحصول على بيانات المركبة المختارة
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  // Update values when dialog opens
  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().split('T')[0]);
      if (vehicleId) {
        setSelectedVehicleId(vehicleId);
      }
      if (currentMileage !== undefined) {
        setMileageAtChange(currentMileage.toString());
        setNextOilChange((currentMileage + 5000).toString());
      }
    }
  }, [open, vehicleId, currentMileage]);

  // Update mileage when vehicle changes
  const handleVehicleChange = (newVehicleId: string) => {
    setSelectedVehicleId(newVehicleId);
    const vehicle = vehicles.find(v => v.id === newVehicleId);
    if (vehicle) {
      setMileageAtChange(vehicle.mileage.toString());
      setNextOilChange((vehicle.mileage + 5000).toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Oil Change Form Data:', {
      vehicleId,
      vehicleName,
      vehicleType,
      date,
      mileageAtChange,
      nextOilChange,
      oilType,
      cost,
      notes,
      resetMileage
    });
    
    if (!oilType || !cost || !selectedVehicleId) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة واختيار المركبة",
        variant: "destructive",
      });
      return;
    }

    if (!selectedVehicle) {
      toast({
        title: "خطأ",
        description: "المركبة المختارة غير موجودة",
        variant: "destructive",
      });
      return;
    }

    try {
      addOilChangeRecord({
        vehicleId: selectedVehicleId,
        vehicleName: selectedVehicle.name,
        vehicleType: selectedVehicle.type,
        date,
        mileageAtChange: parseInt(mileageAtChange),
        nextOilChange: parseInt(nextOilChange),
        oilType,
        cost: parseFloat(cost),
        notes,
        resetMileage,
      });

      console.log('Oil change record added successfully');

      toast({
        title: "تم بنجاح",
        description: resetMileage 
          ? "تم تسجيل تغيير الزيت وتصفير عداد الكيلومترات" 
          : "تم تسجيل تغيير الزيت بنجاح",
      });

      // Reset form
      setOilType("");
      setCost("");
      setNotes("");
      setResetMileage(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding oil change record:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ السجل",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>تسجيل تغيير الزيت</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">المركبة</Label>
            <Select value={selectedVehicleId} onValueChange={handleVehicleChange}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="اختر المركبة" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} - {vehicle.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">التاريخ</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vehicleType">نوع المركبة</Label>
              <Input
                id="vehicleType"
                type="text"
                value={selectedVehicle?.type || ""}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mileageAtChange">الكيلومترات الحالية</Label>
              <Input
                id="mileageAtChange"
                type="number"
                value={mileageAtChange}
                onChange={(e) => setMileageAtChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextOilChange">الكيلومترات للتغيير القادم</Label>
              <Input
                id="nextOilChange"
                type="number"
                placeholder="مثال: 50000"
                value={nextOilChange}
                onChange={(e) => setNextOilChange(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="oilType">نوع الزيت</Label>
            <Input
              id="oilType"
              type="text"
              placeholder="مثال: 5W-30"
              value={oilType}
              onChange={(e) => setOilType(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">التكلفة (ر.س)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              placeholder="مثال: 150.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Textarea
              id="notes"
              placeholder="أضف أي ملاحظات..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2 space-x-reverse bg-muted p-3 rounded-lg">
            <Checkbox
              id="resetMileage"
              checked={resetMileage}
              onCheckedChange={(checked) => setResetMileage(checked as boolean)}
            />
            <Label
              htmlFor="resetMileage"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              تصفير عداد الكيلومترات بعد تغيير الزيت
            </Label>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit">
              حفظ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
