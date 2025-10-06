import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useVehicleMileage } from "@/contexts/VehicleMileageContext";
import { toast } from "@/hooks/use-toast";

interface OilChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleName: string;
  currentMileage: number;
}

export const OilChangeDialog = ({ open, onOpenChange, vehicleId, vehicleName, currentMileage }: OilChangeDialogProps) => {
  const { addOilChangeRecord } = useVehicleMileage();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileageAtChange, setMileageAtChange] = useState(currentMileage.toString());
  const [nextOilChange, setNextOilChange] = useState((currentMileage + 5000).toString());
  const [oilType, setOilType] = useState("");
  const [mechanicName, setMechanicName] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [resetMileage, setResetMileage] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!oilType || !mechanicName || !cost) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    addOilChangeRecord({
      vehicleId,
      vehicleName,
      date,
      mileageAtChange: parseInt(mileageAtChange),
      nextOilChange: parseInt(nextOilChange),
      oilType,
      mechanicName,
      cost: parseFloat(cost),
      notes,
      resetMileage,
    });

    toast({
      title: "تم بنجاح",
      description: resetMileage 
        ? "تم تسجيل تغيير الزيت وتصفير عداد الكيلومترات" 
        : "تم تسجيل تغيير الزيت بنجاح",
    });

    // Reset form
    setOilType("");
    setMechanicName("");
    setCost("");
    setNotes("");
    setResetMileage(false);
    onOpenChange(false);
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
              <Label htmlFor="mileageAtChange">الكيلومترات الحالية</Label>
              <Input
                id="mileageAtChange"
                type="number"
                value={mileageAtChange}
                onChange={(e) => setMileageAtChange(e.target.value)}
                required
              />
            </div>
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
            <Label htmlFor="mechanicName">اسم الميكانيكي</Label>
            <Input
              id="mechanicName"
              type="text"
              placeholder="أدخل اسم الميكانيكي"
              value={mechanicName}
              onChange={(e) => setMechanicName(e.target.value)}
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
