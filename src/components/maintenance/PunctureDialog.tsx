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
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Disc3, MousePointer2, Truck } from "lucide-react";
import {
  PUNCTURE_TIRE_POSITIONS,
  PunctureTruckScene,
  punctureTireLabel,
} from "./PunctureTruckScene";

export interface PunctureData {
  date: string;
  tires: string[];
  statement: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: PunctureData | null;
  onSave: (data: PunctureData | null) => void;
}

const emptyData = (): PunctureData => ({
  date: new Date().toISOString().split("T")[0],
  tires: [],
  statement: "",
});

export const PunctureDialog = ({ open, onOpenChange, value, onSave }: Props) => {
  const [form, setForm] = useState<PunctureData>(value || emptyData());

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
      <DialogContent dir="rtl" className="max-w-6xl max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Disc3 className="h-6 w-6 text-primary" />
            </span>
            شاشة أعمال البنشر
          </DialogTitle>
          <DialogDescription>حدد الكفرات التي تم إصلاحها مباشرة من الشاحنة ذات الـ 14 كفرًا</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold">
                <Truck className="h-5 w-5 text-primary" />
                منظور علوي ثلاثي الأبعاد
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">14 كفر</Badge>
                <Badge className="gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  المحدد {form.tires.length}
                </Badge>
              </div>
            </div>
            <div className="relative">
              <PunctureTruckScene selectedTires={form.tires} onToggle={toggle} />
              <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 rounded-md border bg-background/90 px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur-sm">
                <MousePointer2 className="h-4 w-4 text-primary" />
                اضغط على الكفر لتحديده
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {PUNCTURE_TIRE_POSITIONS.map((tire) => {
                const selected = form.tires.includes(tire.id);
                return (
                  <Button
                    key={tire.id}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    onClick={() => toggle(tire.id)}
                    className="h-9 px-2 text-xs"
                    aria-pressed={selected}
                    title={tire.label}
                  >
                    {tire.shortLabel}
                  </Button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4 lg:border-r lg:pr-5">
            <div className="space-y-2">
              <Label htmlFor="pn-date">تاريخ الإصلاح *</Label>
              <Input
                id="pn-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>الكفرات المحددة</Label>
              {form.tires.length === 0 ? (
                <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                  لم يتم تحديد أي كفر بعد
                </div>
              ) : (
                <div className="max-h-44 space-y-2 overflow-y-auto pl-1">
                  {form.tires.map((id, index) => (
                    <div key={id} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2.5">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs text-primary">
                          {index + 1}
                        </span>
                        {punctureTireLabel(id)}
                      </span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => toggle(id)} className="h-7 px-2">
                        إزالة
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pn-statement">بيان أعمال البنشر</Label>
              <Textarea
                id="pn-statement"
                rows={5}
                value={form.statement}
                onChange={(e) => setForm({ ...form, statement: e.target.value })}
                placeholder="مثال: إصلاح بنشر وتركيب رقعة داخلية مع فحص ضغط الهواء..."
                className="resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                className="min-w-36 flex-1"
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
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
