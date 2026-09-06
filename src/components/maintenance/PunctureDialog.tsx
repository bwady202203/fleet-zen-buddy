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
import { Disc3 } from "lucide-react";
import { TIRE_POSITIONS, tireLabel } from "./TireChangeDialog";

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
      <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-primary" />
            أعمال بنشر
          </DialogTitle>
          <DialogDescription>حدد الكفرات التي تم إصلاحها في البنشر وسجّل التاريخ والبيان</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pn-date">التاريخ *</Label>
            <Input
              id="pn-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>الكفرات التي تم إصلاحها</Label>
            <div className="grid grid-cols-2 gap-2">
              {TIRE_POSITIONS.map((t) => {
                const selected = form.tires.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className={cn(
                      "rounded-lg border p-2 text-xs font-semibold transition-colors hover:bg-muted/50",
                      selected && "border-primary bg-primary/10 text-primary"
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            {form.tires.length > 0 && (
              <div className="text-xs text-muted-foreground">
                المحدد: {form.tires.map(tireLabel).join(" ، ")}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pn-statement">البيان</Label>
            <Textarea
              id="pn-statement"
              rows={4}
              value={form.statement}
              onChange={(e) => setForm({ ...form, statement: e.target.value })}
              placeholder="مثال: إصلاح بنشر كفر خلفي يمين وتركيب رقعة داخلية..."
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
      </DialogContent>
    </Dialog>
  );
};
