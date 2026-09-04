import { memo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COLUMN_LABELS, PayrollColumnKey, PayrollSettings } from "./types";

interface RowProps {
  id: PayrollColumnKey;
  checked: boolean;
  onToggle: (key: PayrollColumnKey, value: boolean) => void;
}

const SortableColumnRow = memo(({ id, checked, onToggle }: RowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-md border bg-card px-3 py-2 ${
        isDragging ? "opacity-70 shadow-md" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="إعادة الترتيب"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox
        id={`col-${id}`}
        checked={checked}
        onCheckedChange={(v) => onToggle(id, Boolean(v))}
      />
      <Label htmlFor={`col-${id}`} className="flex-1 cursor-pointer text-sm">
        {COLUMN_LABELS[id]}
      </Label>
      <span className="text-xs text-muted-foreground">{checked ? "إظهار" : "إخفاء"}</span>
    </div>
  );
});
SortableColumnRow.displayName = "SortableColumnRow";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PayrollSettings;
  onToggleColumn: (key: PayrollColumnKey, value?: boolean) => void;
  onOrderChange: (order: PayrollColumnKey[]) => void;
  onUpdate: <K extends keyof PayrollSettings>(key: K, value: PayrollSettings[K]) => void;
  onReset: () => void;
}

const toggles: Array<{ key: keyof PayrollSettings; label: string }> = [
  { key: "showLogo", label: "إظهار الشعار" },
  { key: "showCompanyInfo", label: "إظهار بيانات المنشأة" },
  { key: "showPeriod", label: "إظهار الفترة" },
  { key: "showIssueDate", label: "إظهار تاريخ الإصدار" },
  { key: "showEmployeeCount", label: "إظهار عدد الموظفين" },
  { key: "showHeaderTotals", label: "إظهار الإجماليات بالترويسة" },
  { key: "showTotalsRow", label: "إظهار صف الإجماليات" },
  { key: "showSummary", label: "إظهار ملخص الإجماليات" },
  { key: "showFooter", label: "إظهار تذييل الصفحة" },
  { key: "showSignatures", label: "إظهار خانات التوقيع" },
];

export const PayrollColumnSettings = ({
  open,
  onOpenChange,
  settings,
  onToggleColumn,
  onOrderChange,
  onUpdate,
  onReset,
}: Props) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = settings.order.indexOf(active.id as PayrollColumnKey);
    const newIndex = settings.order.indexOf(over.id as PayrollColumnKey);
    onOrderChange(arrayMove(settings.order, oldIndex, newIndex));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>تخصيص كشف الرواتب</DialogTitle>
          <DialogDescription>
            حدّد الأعمدة الظاهرة وأعد ترتيبها بالسحب والإفلات — تُطبَّق التغييرات فورًا على الجدول والمعاينة والطباعة و PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold">أعمدة الكشف</h4>
            <ScrollArea className="h-[360px] pl-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={settings.order} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {settings.order.map((key) => (
                      <SortableColumnRow
                        key={key}
                        id={key}
                        checked={settings.visible[key]}
                        onToggle={(k, v) => onToggleColumn(k, v)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">إعدادات الورقة</h4>
            <ScrollArea className="h-[360px] pl-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">اسم المنشأة</Label>
                  <Input
                    value={settings.companyName}
                    onChange={(e) => onUpdate("companyName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">ملاحظة التذييل</Label>
                  <Input
                    value={settings.footerNote}
                    onChange={(e) => onUpdate("footerNote", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">حجم الخط ({Math.round(settings.fontScale * 100)}%)</Label>
                  <Slider
                    min={80}
                    max={130}
                    step={5}
                    value={[Math.round(settings.fontScale * 100)]}
                    onValueChange={([v]) => onUpdate("fontScale", v / 100)}
                  />
                </div>
                <Separator />
                {toggles.map((t) => (
                  <div key={String(t.key)} className="flex items-center justify-between gap-2">
                    <Label className="text-sm">{t.label}</Label>
                    <Switch
                      checked={Boolean(settings[t.key])}
                      onCheckedChange={(v) => onUpdate(t.key as never, v as never)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-between gap-2 pt-2">
          <Button variant="outline" className="gap-2" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            إعادة الإعدادات الافتراضية
          </Button>
          <Button onClick={() => onOpenChange(false)}>حفظ وإغلاق</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
