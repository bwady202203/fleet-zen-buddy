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
import { cn } from "@/lib/utils";
import { CircleDot } from "lucide-react";

export interface TirePosition {
  id: string;
  label: string;
  group: "front" | "rear";
  side: "right" | "left";
  x: number;
  y: number;
}

export const TIRE_POSITIONS: TirePosition[] = [
  { id: "F1R", label: "محور أمامي 1 - يمين", group: "front", side: "right", x: 26, y: 52 },
  { id: "F1L", label: "محور أمامي 1 - يسار", group: "front", side: "left", x: 174, y: 52 },
  { id: "F2R", label: "محور أمامي 2 - يمين", group: "front", side: "right", x: 26, y: 108 },
  { id: "F2L", label: "محور أمامي 2 - يسار", group: "front", side: "left", x: 174, y: 108 },
  { id: "R1R", label: "محور خلفي 1 - يمين", group: "rear", side: "right", x: 26, y: 232 },
  { id: "R1L", label: "محور خلفي 1 - يسار", group: "rear", side: "left", x: 174, y: 232 },
  { id: "R2R", label: "محور خلفي 2 - يمين", group: "rear", side: "right", x: 26, y: 288 },
  { id: "R2L", label: "محور خلفي 2 - يسار", group: "rear", side: "left", x: 174, y: 288 },
];

export interface TireChangeData {
  date: string;
  tires: string[];
  statement: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: TireChangeData | null;
  onSave: (data: TireChangeData | null) => void;
}

const emptyData = (): TireChangeData => ({
  date: new Date().toISOString().split("T")[0],
  tires: [],
  statement: "",
});

export const tireLabel = (id: string) => TIRE_POSITIONS.find((t) => t.id === id)?.label || id;

export const TireChangeDialog = ({ open, onOpenChange, value, onSave }: Props) => {
  const [form, setForm] = useState<TireChangeData>(value || emptyData());

  useEffect(() => {
    if (open) setForm(value || emptyData());
  }, [open, value]);

  const toggle = (id: string) =>
    setForm((prev) => ({
      ...prev,
      tires: prev.tires.includes(id) ? prev.tires.filter((t) => t !== id) : [...prev.tires, id],
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleDot className="h-5 w-5 text-primary" />
            تغيير الكفرات
          </DialogTitle>
          <DialogDescription>اضغط على الكفر في مخطط الشاحنة لتحديد الكفرات التي تم تغييرها</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-2">
          {/* مخطط الشاحنة */}
          <div className="border rounded-xl p-4 bg-muted/30">
            <div className="text-sm font-semibold mb-2 text-center">مخطط الشاحنة (منظر علوي)</div>
            <svg viewBox="0 0 200 340" className="w-full max-h-[380px] mx-auto">
              {/* هيكل الشاحنة */}
              <rect x="55" y="20" width="90" height="70" rx="12" className="fill-primary/15 stroke-primary" strokeWidth="2" />
              <rect x="55" y="98" width="90" height="220" rx="10" className="fill-muted stroke-border" strokeWidth="2" />
              <text x="100" y="60" textAnchor="middle" className="fill-primary text-[10px] font-bold">الكابينة</text>
              <text x="100" y="215" textAnchor="middle" className="fill-muted-foreground text-[10px]">الصندوق</text>
              {/* المحاور */}
              {[52, 108, 232, 288].map((y) => (
                <line key={y} x1="30" y1={y} x2="170" y2={y} className="stroke-border" strokeWidth="3" />
              ))}
              {/* الكفرات */}
              {TIRE_POSITIONS.map((t) => {
                const selected = form.tires.includes(t.id);
                return (
                  <g key={t.id} onClick={() => toggle(t.id)} className="cursor-pointer">
                    <rect
                      x={t.x - 12}
                      y={t.y - 18}
                      width="24"
                      height="36"
                      rx="7"
                      className={cn(
                        "stroke-2 transition-colors",
                        selected ? "fill-primary stroke-primary" : "fill-foreground/70 stroke-border hover:fill-primary/40"
                      )}
                    />
                    <text
                      x={t.x}
                      y={t.y + 4}
                      textAnchor="middle"
                      className={cn("text-[9px] font-bold", selected ? "fill-primary-foreground" : "fill-background")}
                    >
                      {t.id}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="text-xs text-muted-foreground text-center mt-2">
              4 كفرات أمامية و 4 كفرات خلفية
            </div>
          </div>

          {/* البيانات */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tc-date">تاريخ التغيير *</Label>
              <Input
                id="tc-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>الكفرات المحددة</Label>
              {form.tires.length === 0 ? (
                <div className="text-sm text-muted-foreground border rounded-lg p-3">لم يتم تحديد أي كفر بعد</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {form.tires.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggle(id)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                    >
                      {tireLabel(id)} ✕
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tc-statement">البيان</Label>
              <Textarea
                id="tc-statement"
                rows={4}
                value={form.statement}
                onChange={(e) => setForm({ ...form, statement: e.target.value })}
                placeholder="مثال: تغيير كفرين خلفيين مقاس 315/80 مع الترصيص..."
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1"
                onClick={() => {
                  onSave(form.tires.length || form.statement.trim() ? form : null);
                  onOpenChange(false);
                }}
              >
                حفظ البيان
              </Button>
              {value && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onSave(null);
                    onOpenChange(false);
                  }}
                >
                  حذف
                </Button>
              )}
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
