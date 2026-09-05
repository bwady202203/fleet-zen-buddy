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
import { Zap, BatteryCharging } from "lucide-react";

export interface ElectricalWorkData {
  date: string;
  batteriesCount: string;
  statement: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ElectricalWorkData | null;
  onSave: (data: ElectricalWorkData | null) => void;
}

const emptyData = (): ElectricalWorkData => ({
  date: new Date().toISOString().split("T")[0],
  batteriesCount: "",
  statement: "",
});

export const ElectricalWorkDialog = ({ open, onOpenChange, value, onSave }: Props) => {
  const [form, setForm] = useState<ElectricalWorkData>(value || emptyData());

  useEffect(() => {
    if (open) setForm(value || emptyData());
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            أعمال كهرباء
          </DialogTitle>
          <DialogDescription>بيان وتاريخ أعمال الكهرباء وتركيب البطاريات للسيارة</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ew-date">التاريخ *</Label>
            <Input
              id="ew-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ew-count" className="flex items-center gap-2">
              <BatteryCharging className="h-4 w-4 text-primary" />
              عدد البطاريات التي تم تركيبها
            </Label>
            <Input
              id="ew-count"
              type="text"
              inputMode="decimal"
              value={form.batteriesCount}
              onChange={(e) => setForm({ ...form, batteriesCount: e.target.value })}
              placeholder="مثال: 2"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ew-statement">البيان *</Label>
            <Textarea
              id="ew-statement"
              rows={4}
              value={form.statement}
              onChange={(e) => setForm({ ...form, statement: e.target.value })}
              placeholder="مثال: تركيب بطاريتين 200 أمبير وفحص الدينمو والأسلاك..."
              className="resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              onClick={() => {
                onSave(form.statement.trim() || form.batteriesCount.trim() ? form : null);
                onOpenChange(false);
              }}
            >
              حفظ البيان
            </Button>
            {value && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onSave(null);
                  onOpenChange(false);
                }}
              >
                حذف البيان
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
