import { useState, useEffect } from "react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarIcon, Check, ChevronsUpDown, PackagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSpareParts } from "@/contexts/SparePartsContext";
import { supabase } from "@/integrations/supabase/client";

interface MaintenanceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleName?: string;
  vehicleId?: string;
  maintenanceRequest?: {
    id: string;
    vehicle_id: string;
    vehicle_name?: string;
    description: string;
    status: string;
    cost: number;
    created_at: string;
  };
  mode?: 'create' | 'edit' | 'view';
}

export const MaintenanceRequestDialog = ({
  open,
  onOpenChange,
  vehicleName,
  vehicleId,
  maintenanceRequest,
  mode = 'create'
}: MaintenanceRequestDialogProps) => {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  
  const { spareParts, deductQuantity, addSparePart } = useSpareParts();
  const [date, setDate] = useState<Date | undefined>(
    maintenanceRequest ? new Date(maintenanceRequest.created_at) : new Date()
  );
  const [selectedParts, setSelectedParts] = useState<Record<string, number>>({});
  const [description, setDescription] = useState(maintenanceRequest?.description || "");
  const [status, setStatus] = useState(maintenanceRequest?.status || "pending");
  const [searchOpen, setSearchOpen] = useState(false);
  const [addPartDialogOpen, setAddPartDialogOpen] = useState(false);
  const [newPartForm, setNewPartForm] = useState({
    name: "",
    price: "",
    minQuantity: "",
  });
  const { toast } = useToast();

  // Reset form when dialog opens/closes or data changes
  useEffect(() => {
    if (open && maintenanceRequest) {
      setDate(new Date(maintenanceRequest.created_at));
      setDescription(maintenanceRequest.description);
      setStatus(maintenanceRequest.status);
    } else if (!open) {
      setDate(new Date());
      setSelectedParts({});
      setDescription("");
      setStatus("pending");
    }
  }, [open, maintenanceRequest]);

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

  const handleAddNewPart = () => {
    if (!newPartForm.name || !newPartForm.price) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const newPart = {
      id: `part-${Date.now()}`,
      name: newPartForm.name,
      price: parseFloat(newPartForm.price),
      quantity: 0,
      unit: "قطعة",
      minQuantity: parseInt(newPartForm.minQuantity) || 0,
    };

    addSparePart(newPart);

    toast({
      title: "تم إضافة القطعة",
      description: `تم إضافة ${newPartForm.name} بنجاح`,
    });

    setNewPartForm({ name: "", price: "", minQuantity: "" });
    setAddPartDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!date) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار تاريخ الصيانة",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditMode && maintenanceRequest) {
        // Update existing maintenance request (keep cost unchanged)
        const { error: updateError } = await supabase
          .from('maintenance_requests')
          .update({
            description,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', maintenanceRequest.id);

        if (updateError) throw updateError;

        toast({
          title: "تم التحديث بنجاح",
          description: "تم تحديث طلب الصيانة بنجاح",
        });
      } else {
        // Create new maintenance request
        if (!vehicleId) {
          throw new Error("Vehicle ID is required");
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

        // حفظ طلب الصيانة في قاعدة البيانات
        const totalCost = calculateTotal();
        const { data: maintenanceData, error: maintenanceError } = await supabase
          .from('maintenance_requests')
          .insert({
            vehicle_id: vehicleId,
            description: description || `صيانة ${vehicleName}`,
            cost: totalCost,
            status: 'pending',
            priority: 'medium',
          })
          .select()
          .single();

        if (maintenanceError) throw maintenanceError;

        // حفظ تفاصيل تكاليف الصيانة
        const costItems = Object.entries(selectedParts).map(([partId, quantity]) => {
          const part = spareParts.find(p => p.id === partId);
          return {
            maintenance_request_id: maintenanceData.id,
            item_name: part?.name || 'قطعة غيار',
            item_type: 'spare_part',
            quantity,
            unit_price: part?.price || 0,
            total_price: (part?.price || 0) * quantity,
            spare_part_id: partId,
          };
        });

        if (costItems.length > 0) {
          const { error: costItemsError } = await supabase
            .from('maintenance_cost_items')
            .insert(costItems);

          if (costItemsError) throw costItemsError;
        }

        // خصم الكميات من المخزون
        for (const [partId, quantity] of Object.entries(selectedParts)) {
          const part = spareParts.find(p => p.id === partId);
          await deductQuantity(
            partId, 
            quantity, 
            maintenanceData.id,
            `صيانة ${vehicleName} - ${part?.name}`
          );
        }

        toast({
          title: "تم إنشاء طلب الصيانة",
          description: `تم إنشاء طلب صيانة للمركبة ${vehicleName} بتاريخ ${format(date, "PPP", { locale: ar })} وخصم قطع الغيار من المخزون`,
        });
      }

      // Reset form
      setDate(new Date());
      setSelectedParts({});
      setDescription("");
      setStatus("pending");
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ طلب الصيانة",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isViewMode ? 'عرض طلب الصيانة' : isEditMode ? 'تعديل طلب الصيانة' : `طلب صيانة جديد`}
          </DialogTitle>
          <DialogDescription>
            {isViewMode || isEditMode 
              ? `تفاصيل طلب الصيانة: ${maintenanceRequest?.vehicle_name || ''}`
              : `إنشاء طلب صيانة للمركبة: ${vehicleName}`
            }
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
                  disabled={isViewMode}
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
                  disabled={(date) => date < new Date() || isViewMode}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status Selection (only for edit/view modes) */}
          {(isEditMode || isViewMode) && (
            <div className="space-y-2">
              <Label>الحالة</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isViewMode}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="pending">قيد الانتظار</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>
          )}

          {/* Spare Parts Selection (only for create mode) */}
          {!isViewMode && !isEditMode && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">قطع الغيار المطلوبة</Label>
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

              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={searchOpen}
                    className="w-full justify-between"
                  >
                    <span>ابحث عن قطعة غيار...</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={true}>
                    <CommandInput placeholder="ابحث عن قطعة..." />
                    <CommandList>
                      <CommandEmpty>لا توجد قطع غيار.</CommandEmpty>
                      <CommandGroup>
                        {spareParts.map((part) => (
                          <CommandItem
                            key={part.id}
                            value={part.name}
                            keywords={[part.name]}
                            onSelect={() => {
                              handleQuantityChange(part.id, 1);
                              setSearchOpen(false);
                            }}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{part.name}</div>
                              <div className="text-xs text-muted-foreground">
                                السعر: {part.price} ر.س | الكمية: {part.quantity} {part.unit}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected Parts List */}
              {Object.keys(selectedParts).length > 0 && (
                <div className="space-y-2 border rounded-lg p-4">
                  <div className="text-sm font-medium mb-2">القطع المختارة:</div>
                  {Object.entries(selectedParts).map(([partId, quantity]) => {
                    const part = spareParts.find((p) => p.id === partId);
                    if (!part) return null;
                    return (
                      <div
                        key={partId}
                        className="flex items-center justify-between gap-3 p-3 border rounded-lg"
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
                            value={quantity}
                            onChange={(e) =>
                              handleQuantityChange(partId, parseInt(e.target.value) || 0)
                            }
                            className="w-20 text-right"
                          />
                          <span className="text-sm text-muted-foreground w-12">{part.unit}</span>
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
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg mt-3">
                    <span className="font-semibold">الإجمالي المتوقع:</span>
                    <span className="text-xl font-bold text-primary">
                      {calculateTotal()} ر.س
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

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
              disabled={isViewMode}
            />
          </div>

          {/* Action Buttons */}
          {!isViewMode && (
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSubmit} className="flex-1">
                {isEditMode ? 'حفظ التعديلات' : 'إنشاء طلب الصيانة'}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          )}

          {isViewMode && (
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إغلاق
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Add New Part Dialog */}
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
                onChange={(e) =>
                  setNewPartForm({ ...newPartForm, name: e.target.value })
                }
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
                onChange={(e) =>
                  setNewPartForm({ ...newPartForm, price: e.target.value })
                }
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
                onChange={(e) =>
                  setNewPartForm({ ...newPartForm, minQuantity: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleAddNewPart} className="flex-1">
                إضافة
              </Button>
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
    </Dialog>
  );
};
