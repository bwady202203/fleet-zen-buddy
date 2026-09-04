import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Eye,
  Minus,
  Printer,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDateAr, formatMoneySar } from "@/lib/advances";
import { buildEmployeeLedger, TXN_TYPE_LABELS, MEMO_TYPES } from "@/lib/employeeLedger";
import type { EmployeeAccount } from "@/hooks/useEmployeeAccount";

export interface StatementPeriod {
  from: string;
  to: string;
}

interface Props {
  account: EmployeeAccount | null;
  period: StatementPeriod;
  onPeriodChange: (p: StatementPeriod) => void;
  onPreview: () => void;
  onNavigate?: (path: string) => void;
}

const Card = ({
  label,
  value,
  icon: Icon,
  tone = "hr",
  emphasis,
}: {
  label: string;
  value: string;
  icon: any;
  tone?: "hr" | "emerald" | "rose" | "amber" | "sky" | "slate";
  emphasis?: boolean;
}) => {
  const tones: Record<string, string> = {
    hr: "bg-hr/10 text-hr",
    emerald: "bg-emerald-500/10 text-emerald-600",
    rose: "bg-rose-500/10 text-rose-600",
    amber: "bg-amber-500/10 text-amber-600",
    sky: "bg-sky-500/10 text-sky-600",
    slate: "bg-slate-500/10 text-slate-600",
  };
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border/60",
        emphasis && "ring-2 ring-hr/40"
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-base font-bold" dir="ltr">
          {value}
        </p>
      </div>
    </div>
  );
};

export const EmployeeFinancialStatement = ({
  account,
  period,
  onPeriodChange,
  onPreview,
  onNavigate,
}: Props) => {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const ledger = useMemo(
    () => buildEmployeeLedger(account?.transactions ?? [], { from: period.from, to: period.to }),
    [account?.transactions, period.from, period.to]
  );

  const rows = useMemo(
    () => (typeFilter === "all" ? ledger.rows : ledger.rows.filter((r) => r.type === typeFilter)),
    [ledger.rows, typeFilter]
  );

  const t = ledger.totals;
  const check = Math.abs(t.closingBalance - (t.openingBalance + t.debit - t.credit)) < 0.01;

  return (
    <div dir="rtl" className="space-y-4 text-right">
      {/* الفترة */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-muted/40 p-3">
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">من تاريخ</label>
          <Input
            type="date"
            value={period.from}
            onChange={(e) => onPeriodChange({ ...period, from: e.target.value })}
            className="h-9 w-[150px] rounded-xl text-right font-mono text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">إلى تاريخ</label>
          <Input
            type="date"
            value={period.to}
            onChange={(e) => onPeriodChange({ ...period, to: e.target.value })}
            className="h-9 w-[150px] rounded-xl text-right font-mono text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">نوع الحركة</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-xl border bg-background px-3 text-right text-xs"
          >
            <option value="all">كل الحركات</option>
            {Object.entries(TXN_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 gap-1.5 rounded-xl text-xs"
          onClick={() => {
            onPeriodChange({ from: "", to: "" });
            setTypeFilter("all");
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" /> إعادة تعيين
        </Button>
        <div className="mr-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl border-hr/40 text-hr" onClick={onPreview}>
            <Eye className="h-3.5 w-3.5" /> معاينة الطباعة
          </Button>
          <Button size="sm" className="gap-1.5 rounded-xl bg-hr text-hr-foreground hover:bg-hr/90" onClick={onPreview}>
            <Printer className="h-3.5 w-3.5" /> طباعة / PDF
          </Button>
        </div>
      </div>

      {/* البطاقات المالية */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Card label="الرصيد السابق" value={formatMoneySar(t.openingBalance)} icon={Banknote} tone="slate" />
        <Card label="إجمالي المدين" value={formatMoneySar(t.debit)} icon={ArrowUpRight} tone="rose" />
        <Card label="إجمالي الدائن" value={formatMoneySar(t.credit)} icon={ArrowDownLeft} tone="emerald" />
        <Card label="إجمالي السلف" value={formatMoneySar(t.advancesTotal)} icon={Wallet} tone="sky" />
        <Card label="إجمالي الخصومات" value={formatMoneySar(t.deductionsTotal)} icon={Minus} tone="amber" />
        <Card label="الرصيد الختامي" value={formatMoneySar(t.closingBalance)} icon={Banknote} tone="hr" emphasis />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="إجمالي المنصرف فعليًا" value={formatMoneySar(t.disbursed)} icon={Banknote} tone="hr" emphasis />
        <Card label="سلف مخصومة من الرواتب" value={formatMoneySar(t.advancesDeducted)} icon={Minus} tone="sky" />
        <Card label="سلف مسددة نقدًا" value={formatMoneySar(t.advancesPaid)} icon={Wallet} tone="emerald" />
        <Card label="رصيد السلف المتبقي" value={formatMoneySar(t.advancesRemaining)} icon={AlertTriangle} tone="rose" />
      </div>

      {!check && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4" />
          كشف غير متوازن: الرصيد الختامي لا يطابق (الرصيد السابق + المدين − الدائن). تم إيقاف عرض الإجماليات.
        </div>
      )}

      {/* الجدول */}
      {check && (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[720px] text-right text-sm" dir="rtl">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">التاريخ</th>
                <th className="px-3 py-2 font-semibold">رقم المستند</th>
                <th className="px-3 py-2 font-semibold">نوع الحركة</th>
                <th className="px-3 py-2 font-semibold">البيان</th>
                <th className="px-3 py-2 font-semibold">مدين</th>
                <th className="px-3 py-2 font-semibold">دائن</th>
                <th className="px-3 py-2 font-semibold">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t bg-muted/20 font-semibold">
                <td className="px-3 py-2" colSpan={4}>
                  الرصيد السابق
                </td>
                <td className="px-3 py-2">—</td>
                <td className="px-3 py-2">—</td>
                <td className="px-3 py-2 font-mono" dir="ltr">
                  {formatMoneySar(t.openingBalance)}
                </td>
              </tr>
              {rows.map((row) => (
                <tr key={row.id} className="border-t transition-colors hover:bg-hr/5">
                  <td className="px-3 py-2 font-mono text-xs">{formatDateAr(row.date)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="font-mono text-xs font-semibold text-hr underline-offset-2 hover:underline"
                      dir="ltr"
                      onClick={() => row.link && onNavigate?.(row.link)}
                    >
                      {row.documentNumber}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="rounded-lg text-[11px]">
                      {TXN_TYPE_LABELS[row.type]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">{row.description}</td>
                  <td className="px-3 py-2 font-mono text-xs text-rose-600" dir="ltr">
                    {row.debit ? formatMoneySar(row.debit) : MEMO_TYPES.includes(row.type) ? (
                      <span className="text-muted-foreground">{formatMoneySar(row.amount)} (بيان)</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-emerald-600" dir="ltr">
                    {row.credit ? formatMoneySar(row.credit) : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-bold" dir="ltr">
                    {formatMoneySar(row.balance)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr className="border-t">
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    لا توجد حركات مالية في الفترة المحددة
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-hr/10 text-xs font-bold">
              <tr>
                <td className="px-3 py-2" colSpan={4}>
                  الإجماليات
                </td>
                <td className="px-3 py-2 font-mono" dir="ltr">
                  {formatMoneySar(t.debit)}
                </td>
                <td className="px-3 py-2 font-mono" dir="ltr">
                  {formatMoneySar(t.credit)}
                </td>
                <td className="px-3 py-2 font-mono text-hr" dir="ltr">
                  {formatMoneySar(t.closingBalance)}
                </td>
              </tr>
              <tr className="border-t border-hr/20">
                <td className="px-3 py-2" colSpan={7}>
                  إجمالي المنصرف: <span className="font-mono">{formatMoneySar(t.disbursed)}</span> — الرصيد الختامي:{" "}
                  <span className="font-mono text-hr">{formatMoneySar(t.closingBalance)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmployeeFinancialStatement;
