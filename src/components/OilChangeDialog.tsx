import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicleMileage } from "@/contexts/VehicleMileageContext";
import { toast } from "@/hooks/use-toast";

interface OilChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  currentMileage: number;
}

export const OilChangeDialog = ({ open, onOpenChange, vehicleId, vehicleName, vehicleType, currentMileage }: OilChangeDialogProps) => {
  const { addOilChangeRecord } = useVehicleMileage();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVehicleType, setSelectedVehicleType] = useState(vehicleType);
  const [mileageAtChange, setMileageAtChange] = useState(currentMileage.toString());
  const [nextOilChange, setNextOilChange] = useState((currentMileage + 5000).toString());
  const [oilType, setOilType] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [resetMileage, setResetMileage] = useState(false);

  // قائمة أنواع المركبات
  const vehicleTypes = [
    "شاحنة ثقيلة",
    "شاحنة متوسطة",
    "شاحنة خفيفة",
    "فان توصيل",
    "فان نقل",
    "سيارة صغيرة",
    "حافلة",
    "معدة ثقيلة",
  ];

  // Update values when dialog opens
  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedVehicleType(vehicleType);
      setMileageAtChange(currentMileage.toString());
      setNextOilChange((currentMileage + 5000).toString());
    }
  }, [open, currentMileage, vehicleType]);

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
    
    if (!oilType || !cost) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      addOilChangeRecord({
        vehicleId,
        vehicleName,
        vehicleType: selectedVehicleType,
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
          <DialogTitle>تسجيل تغيير الزيت - {vehicleName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
                <SelectTrigger id="vehicleType">
                  <SelectValue placeholder="اختر نوع المركبة" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
