import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarIcon, ChevronsUpDown, Home, PackagePlus, Save, Truck, X, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useVehicles } from "@/contexts/VehiclesContext";
import { useSpareParts } from "@/contexts/SparePartsContext";
import { supabase } from "@/integrations/supabase/client";

export default function NewMaintenanceOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { vehicles } = useVehicles();
  const { spareParts, deductQuantity, addSparePart } = useSpareParts();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [partsSearchOpen, setPartsSearchOpen] = useState(false);
  const [selectedParts, setSelectedParts] = useState<Record<string, number>>({});
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add new part dialog
  const [addPartDialogOpen, setAddPartDialogOpen] = useState(false);
  const [newPartForm, setNewPartForm] = useState({ name: "", price: "", minQuantity: "" });

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const filteredVehicles = vehicles.filter((v) =>
    `${v.name} ${v.licensePlate}`.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  const handleQuantityChange = (partId: string, quantity: number) => {
    if (quantity > 0) {
      setSelectedParts((prev) => ({ ...prev, [partId]: quantity }));
    } else {
      const newParts = { ...selectedParts };
      delete newParts[partId];
      setSelectedParts(newParts);
    }
  };

  const calculateTotal = () =>
    Object.entries(selectedParts).reduce((sum, [partId, qty]) => {
      const part = spareParts.find((p) => p.id === partId);
      return sum + (part?.price || 0) * qty;
    }, 0);

  const handleAddNewPart = () => {
    if (!newPartForm.name || !newPartForm.price) {
      toast({ title: "خطأ", description: "الرجاء ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    addSparePart({
      id: `part-${Date.now()}`,
      code: `SP-${Date.now()}`,
      name: newPartForm.name,
      price: parseFloat(newPartForm.price),
      quantity: 0,
      unit: "قطعة",
      minQuantity: parseInt(newPartForm.minQuantity) || 0,
    });
    toast({ title: "تم إضافة القطعة", description: `تم إضافة ${newPartForm.name} بنجاح` });
    setNewPartForm({ name: "", price: "", minQuantity: "" });
    setAddPartDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!selectedVehicle) {
      toast({ title: "خطأ", description: "الرجاء اختيار المركبة", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "خطأ", description: "الرجاء اختيار تاريخ الصيانة", variant: "destructive" });
      return;
    }
    if (Object.keys(selectedParts).length === 0) {
      toast({ title: "خطأ", description: "الرجاء اختيار قطعة غيار واحدة على الأقل", variant: "destructive" });
      return;
    }

    // التحقق من توفر الكميات
    const insufficient: string[] = [];
    for (const [partId, qty] of Object.entries(selectedParts)) {
      const part = spareParts.find((p) => p.id === partId);
      if (part && part.quantity < qty) {
        insufficient.push(`${part.name} (متوفر: ${part.quantity} ${part.unit})`);
      }
    }
    if (insufficient.length > 0) {
      toast({
        title: "كمية غير كافية",
        description: `الأصناف التالية غير متوفرة بالكمية المطلوبة: ${insufficient.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const totalCost = calculateTotal();

      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("maintenance_requests")
        .insert({
          vehicle_id: selectedVehicle.id,
          description: description || `صيانة ${selectedVehicle.name}`,
          cost: totalCost,
          status: "pending",
          priority: "medium",
        })
        .select()
        .single();

      if (maintenanceError) throw maintenanceError;

      const costItems = Object.entries(selectedParts).map(([partId, qty]) => {
        const part = spareParts.find((p) => p.id === partId);
        return {
          maintenance_request_id: maintenanceData.id,
          item_name: part?.name || "قطعة غيار",
          item_type: "spare_part",
          quantity: qty,
          unit_price: part?.price || 0,
          total_price: (part?.price || 0) * qty,
          spare_part_id: partId,
        };
      });

      if (costItems.length > 0) {
        const { error: costError } = await supabase.from("maintenance_cost_items").insert(costItems);
        if (costError) throw costError;
      }

      // خصم من المخزون
      for (const [partId, qty] of Object.entries(selectedParts)) {
        const part = spareParts.find((p) => p.id === partId);
        await deductQuantity(partId, qty, maintenanceData.id, `صيانة ${selectedVehicle.name} - ${part?.name}`);
      }

      toast({
        title: "تم إنشاء أمر الصيانة",
        description: `تم تسجيل أمر صيانة للمركبة ${selectedVehicle.name} بتكلفة ${totalCost} ر.س`,
      });

      // إعادة تعيين النموذج
      setSelectedVehicleId("");
      setSelectedParts({});
      setDescription("");
      setDate(new Date());

      // الانتقال لتقرير تكاليف المركبة
      navigate("/vehicle-cost-report");
    } catch (error) {
      console.error("Error creating maintenance order:", error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء حفظ أمر الصيانة", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/fleet" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Home className="h-5 w-5 text-primary" />
          </Link>
          <div className="flex items-center gap-2">
            <Wrench className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">أمر صيانة جديد</h1>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بيانات أمر الصيانة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* اختيار المركبة */}
          <div className="space-y-2">
            <Label>المركبة *</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between h-12"
              onClick={() => setVehicleDialogOpen(true)}
            >
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                {selectedVehicle ? (
                  <span className="font-medium">
                    {selectedVehicle.name} - {selectedVehicle.licensePlate}
                  </span>
                ) : (
                  <span className="text-muted-foreground">اختر المركبة...</span>
                )}
              </div>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </div>

          {/* التاريخ */}
          <div className="space-y-2">
            <Label>تاريخ الصيانة *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-right font-normal h-12",
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
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* قطع الغيار */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">قطع الغيار المستخدمة *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddPartDialogOpen(true)}
                className="gap-2"
              >
                <PackagePlus className="h-4 w-4" />
                إضافة قطعة جديدة
              </Button>
            </div>

            <Popover open={partsSearchOpen} onOpenChange={setPartsSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between h-12">
                  <span>ابحث عن قطعة غيار...</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={true}>
                  <CommandInput placeholder="ابحث عن قطعة..." />
                  <CommandList>
                    <CommandEmpty>لا توجد قطع غيار.</CommandEmpty>
                    <CommandGroup>
                      {spareParts.map((part) => (
                        <CommandItem
                          key={part.id}
                          value={part.name}
                          keywords={[part.name, part.code || ""]}
                          onSelect={() => {
                            handleQuantityChange(part.id, (selectedParts[part.id] || 0) + 1);
                            setPartsSearchOpen(false);
                          }}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{part.name}</div>
                            <div className="text-xs text-muted-foreground">
                              السعر: {part.price} ر.س | المتوفر: {part.quantity} {part.unit}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* القطع المختارة */}
            {Object.keys(selectedParts).length > 0 && (
              <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                <div className="text-sm font-medium mb-2">القطع المختارة:</div>
                {Object.entries(selectedParts).map(([partId, qty]) => {
                  const part = spareParts.find((p) => p.id === partId);
                  if (!part) return null;
                  return (
                    <div
                      key={partId}
                      className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-background"
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
                          value={qty}
                          onChange={(e) => handleQuantityChange(partId, parseInt(e.target.value) || 0)}
                          className="w-20 text-right"
                        />
                        <span className="text-sm text-muted-foreground w-12">{part.unit}</span>
                        <span className="text-sm font-semibold w-24 text-left">
                          {(part.price * qty).toFixed(2)} ر.س
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantityChange(partId, 0)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg mt-3">
                  <span className="font-semibold text-lg">التكلفة الإجمالية:</span>
                  <span className="text-2xl font-bold text-primary">{calculateTotal().toFixed(2)} ر.س</span>
                </div>
              </div>
            )}
          </div>

          {/* الوصف */}
          <div className="space-y-2">
            <Label htmlFor="description">وصف العطل / ملاحظات</Label>
            <Textarea
              id="description"
              placeholder="اكتب وصفاً تفصيلياً للعطل أو أي ملاحظات إضافية..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* أزرار الإجراء */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 h-12 text-base gap-2">
              <Save className="h-5 w-5" />
              {isSubmitting ? "جاري الحفظ..." : "حفظ أمر الصيانة"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/fleet")} className="flex-1 h-12 text-base">
              إلغاء
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog اختيار المركبة */}
      <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>اختر المركبة</DialogTitle>
            <DialogDescription>ابحث واختر المركبة المراد صيانتها</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="ابحث برقم اللوحة أو الاسم..."
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              className="h-11"
              autoFocus
            />
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا توجد مركبات مطابقة</div>
              ) : (
                filteredVehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVehicleId(v.id);
                      setVehicleDialogOpen(false);
                      setVehicleSearch("");
                    }}
                    className={cn(
                      "w-full text-right p-4 border rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-3",
                      selectedVehicleId === v.id && "bg-primary/10 border-primary"
                    )}
                  >
                    <Truck className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold">{v.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {v.licensePlate} • {v.type}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog إضافة قطعة جديدة */}
      <Dialog open={addPartDialogOpen} onOpenChange={setAddPartDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة قطعة جديدة</DialogTitle>
            <DialogDescription>أدخل بيانات قطعة الغيار الجديدة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="partName">اسم القطعة *</Label>
              <Input
                id="partName"
                value={newPartForm.name}
                onChange={(e) => setNewPartForm({ ...newPartForm, name: e.target.value })}
                placeholder="أدخل اسم القطعة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partPrice">السعر (ر.س) *</Label>
              <Input
                id="partPrice"
                type="number"
                min="0"
                step="0.01"
                value={newPartForm.price}
                onChange={(e) => setNewPartForm({ ...newPartForm, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partMinQty">الحد الأدنى للكمية</Label>
              <Input
                id="partMinQty"
                type="number"
                min="0"
                value={newPartForm.minQuantity}
                onChange={(e) => setNewPartForm({ ...newPartForm, minQuantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleAddNewPart} className="flex-1">إضافة</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAddPartDialogOpen(false);
                  setNewPartForm({ name: "", price: "", minQuantity: "" });
                }}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
