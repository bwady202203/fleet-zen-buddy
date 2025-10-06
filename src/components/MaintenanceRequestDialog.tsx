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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSpareParts } from "@/contexts/SparePartsContext";

interface MaintenanceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleName: string;
}

export const MaintenanceRequestDialog = ({
  open,
  onOpenChange,
  vehicleName,
}: MaintenanceRequestDialogProps) => {
  const { spareParts, deductQuantity } = useSpareParts();
  const [date, setDate] = useState<Date>();
  const [selectedParts, setSelectedParts] = useState<Record<string, number>>({});
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const handleQuantityChange = (partId: string, quantity: number) => {
    if (quantity > 0) {
      setSelectedParts((prev) => ({
        ...prev,
        [partId]: quantity,
      }));
    } else {
      const newParts = { ...selectedParts };
      delete newParts[partId];
      setSelectedParts(newParts);
    }
  };

  const calculateTotal = () => {
    return Object.entries(selectedParts).reduce((sum, [partId, quantity]) => {
      const part = spareParts.find((p) => p.id === partId);
      return sum + (part?.price || 0) * quantity;
    }, 0);
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

    // التحقق من الكميات المتاحة
    const insufficientParts: string[] = [];
    for (const [partId, quantity] of Object.entries(selectedParts)) {
      const part = spareParts.find((p) => p.id === partId);
      if (part && part.quantity < quantity) {
        insufficientParts.push(`${part.name} (متوفر: ${part.quantity} ${part.unit})`);
      }
    }

    if (insufficientParts.length > 0) {
      toast({
        title: "كمية غير كافية",
        description: `الأصناف التالية غير متوفرة بالكمية المطلوبة: ${insufficientParts.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // خصم الكميات من المخزون
    for (const [partId, quantity] of Object.entries(selectedParts)) {
      deductQuantity(partId, quantity);
    }

    toast({
      title: "تم إنشاء طلب الصيانة",
      description: `تم إنشاء طلب صيانة للمركبة ${vehicleName} بتاريخ ${format(date, "PPP", { locale: ar })} وخصم قطع الغيار من المخزون`,
    });

    // Reset form
    setDate(undefined);
    setSelectedParts({});
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
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
              {spareParts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{part.name}</div>
                    <div className="text-xs text-muted-foreground">
                      متوفر: {part.quantity} {part.unit} | {part.price} ر.س / {part.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max={part.quantity}
                      value={selectedParts[part.id] || 0}
                      onChange={(e) =>
                        handleQuantityChange(part.id, parseInt(e.target.value) || 0)
                      }
                      className="w-20 text-right"
                      placeholder="0"
                    />
                    <span className="text-sm text-muted-foreground w-12">{part.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            {Object.keys(selectedParts).length > 0 && (
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
