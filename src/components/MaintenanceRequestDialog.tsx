import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MaintenanceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleName: string;
}

const spareParts = [
  { id: "oil", name: "زيت المحرك", price: 150 },
  { id: "filter", name: "فلتر الهواء", price: 80 },
  { id: "brake", name: "فحمات الفرامل", price: 300 },
  { id: "tires", name: "إطارات", price: 800 },
  { id: "battery", name: "بطارية", price: 500 },
  { id: "lights", name: "مصابيح", price: 120 },
  { id: "wipers", name: "مساحات الزجاج", price: 60 },
  { id: "coolant", name: "سائل التبريد", price: 100 },
];

export const MaintenanceRequestDialog = ({
  open,
  onOpenChange,
  vehicleName,
}: MaintenanceRequestDialogProps) => {
  const [date, setDate] = useState<Date>();
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const handlePartToggle = (partId: string) => {
    setSelectedParts((prev) =>
      prev.includes(partId)
        ? prev.filter((id) => id !== partId)
        : [...prev, partId]
    );
  };

  const calculateTotal = () => {
    return spareParts
      .filter((part) => selectedParts.includes(part.id))
      .reduce((sum, part) => sum + part.price, 0);
  };

  const handleSubmit = () => {
    if (!date) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار تاريخ الصيانة",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم إنشاء طلب الصيانة",
      description: `تم إنشاء طلب صيانة للمركبة ${vehicleName} بتاريخ ${format(date, "PPP", { locale: ar })}`,
    });

    // Reset form
    setDate(undefined);
    setSelectedParts([]);
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl">طلب صيانة جديد</DialogTitle>
          <DialogDescription>
            إنشاء طلب صيانة للمركبة: {vehicleName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>تاريخ الصيانة المقترح</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-right font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ar }) : <span>اختر التاريخ</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={ar}
                  className={cn("p-3 pointer-events-auto")}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Spare Parts Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">قطع الغيار المطلوبة</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-lg p-4">
              {spareParts.map((part) => (
                <div key={part.id} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={part.id}
                    checked={selectedParts.includes(part.id)}
                    onCheckedChange={() => handlePartToggle(part.id)}
                  />
                  <label
                    htmlFor={part.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <span>{part.name}</span>
                      <span className="text-muted-foreground">{part.price} ر.س</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            {selectedParts.length > 0 && (
              <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                <span className="font-semibold">الإجمالي المتوقع:</span>
                <span className="text-xl font-bold text-primary">
                  {calculateTotal()} ر.س
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">وصف المشكلة أو ملاحظات</Label>
            <Textarea
              id="description"
              placeholder="اكتب وصفاً تفصيلياً للمشكلة أو أي ملاحظات إضافية..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} className="flex-1">
              إنشاء طلب الصيانة
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
