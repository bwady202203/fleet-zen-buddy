import { memo } from "react";
import { PayrollTotals, formatMoney } from "./types";

interface Props {
  totals: PayrollTotals;
  variant?: "screen" | "print";
}

const items = (t: PayrollTotals) => [
  { label: "إجمالي الراتب الأساسي", value: t.basicSalary },
  { label: "إجمالي البدلات", value: t.allowances },
  { label: "إجمالي الإضافي", value: t.additions },
  { label: "إجمالي الخصومات", value: t.deductions },
  { label: "إجمالي السلف", value: t.advances },
  { label: "إجمالي صافي الرواتب", value: t.netSalary },
];

export const PayrollSummary = memo(({ totals, variant = "screen" }: Props) => {
  if (variant === "print") {
    return (
      <div className="mt-3 grid grid-cols-3 gap-2 text-[8pt]">
        {items(totals).map((it) => (
          <div key={it.label} className="rounded border border-neutral-500 px-2 py-1">
            <div className="text-neutral-600">{it.label}</div>
            <div className="text-[10pt] font-bold text-neutral-900 tabular-nums">
              {formatMoney(it.value)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {items(totals).map((it, i) => (
        <div key={it.label} className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground">{it.label}</div>
          <div
            className={`mt-1 text-lg font-bold tabular-nums ${
              i === 5 ? "text-primary" : i === 3 || i === 4 ? "text-destructive" : "text-foreground"
            }`}
          >
            {formatMoney(it.value)}
          </div>
        </div>
      ))}
    </div>
  );
});
PayrollSummary.displayName = "PayrollSummary";
