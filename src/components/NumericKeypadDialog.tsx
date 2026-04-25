import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Delete, Check } from "lucide-react";

interface NumericKeypadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: number;
  title?: string;
  onConfirm: (value: number) => void;
}

export const NumericKeypadDialog = ({
  open,
  onOpenChange,
  initialValue = 0,
  title = "أدخل الكمية",
  onConfirm,
}: NumericKeypadDialogProps) => {
  const [value, setValue] = useState<string>(String(initialValue || ""));

  // Reset value when dialog opens
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setValue(initialValue ? String(initialValue) : "");
    }
    onOpenChange(next);
  };

  const append = useCallback((digit: string) => {
    setValue((prev) => {
      if (digit === "." && prev.includes(".")) return prev;
      return prev === "0" && digit !== "." ? digit : prev + digit;
    });
  }, []);

  const backspace = useCallback(() => setValue((prev) => prev.slice(0, -1)), []);
  const clearAll = useCallback(() => setValue(""), []);

  const confirm = useCallback(() => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    onConfirm(num);
    onOpenChange(false);
  }, [value, onConfirm, onOpenChange]);

  // ربط لوحة المفاتيح: أرقام، فاصلة، Backspace، Enter، Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9]$/.test(k)) {
        e.preventDefault();
        append(k);
      } else if (k === "." || k === ",") {
        e.preventDefault();
        append(".");
      } else if (k === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (k === "Delete") {
        e.preventDefault();
        clearAll();
      } else if (k === "Enter") {
        e.preventDefault();
        confirm();
      } else if (k === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, append, backspace, clearAll, confirm, onOpenChange]);

  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "back"];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xs" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border rounded-lg p-4 text-center bg-muted/30">
            <div className="text-3xl font-bold font-mono min-h-[2.5rem]">
              {value || "0"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {keys.map((k) => (
              <Button
                key={k}
                type="button"
                variant={k === "back" ? "secondary" : "outline"}
                className="h-14 text-xl font-bold"
                onClick={() => (k === "back" ? backspace() : append(k))}
              >
                {k === "back" ? <Delete className="h-5 w-5" /> : k}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={clearAll}>
              مسح
            </Button>
            <Button onClick={confirm} className="gap-2">
              <Check className="h-4 w-4" />
              تأكيد
            </Button>
          </div>
        </div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
};
