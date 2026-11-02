import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  options: string[];
  value?: string;
  onSelect: (v: string) => void;
  searchPlaceholder?: string;
  emptyHint?: string;
};

export default function OptionPickerDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  options,
  value,
  onSelect,
  searchPlaceholder = "ابحث...",
  emptyHint = "لا توجد نتائج مطابقة",
}: Props) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.toLowerCase().includes(t)) : options;
  }, [q, options]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="shipment-field h-10 w-full pr-9 pl-3 text-sm"
          />
        </div>

        <p className="shipment-subtitle">
          {filtered.length.toLocaleString("en-US")} من {options.length.toLocaleString("en-US")} — اضغط على البطاقة للاختيار
        </p>

        {filtered.length === 0 ? (
          <div className="shipment-body flex min-h-32 items-center justify-center text-sm text-foreground/60">
            {emptyHint}
          </div>
        ) : (
          <div className="grid max-h-[52vh] grid-cols-1 gap-3 overflow-y-auto pl-1 sm:grid-cols-2 md:grid-cols-3">
            {filtered.map((o) => {
              const active = o === value;
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => onSelect(o)}
                  className={cn(
                    "shipment-field flex min-h-16 items-center justify-between gap-2 px-3 py-2 text-right text-sm font-semibold leading-6 transition",
                    active
                      ? "!border-primary !bg-primary/10 ring-2 ring-primary/25"
                      : "hover:!border-primary/60",
                  )}
                >
                  <span className="line-clamp-2">{o}</span>
                  {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
