import { memo, useMemo } from "react";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { COLUMN_LABELS, PayrollColumnKey, PayrollRow, PayrollSettings, PayrollTotals, formatMoney } from "./types";

interface Props {
  rows: PayrollRow[];
  totals: PayrollTotals;
  settings: PayrollSettings;
  loading: boolean;
  onEdit: (row: PayrollRow) => void;
}

const NUMERIC = new Set<PayrollColumnKey>([
  "basicSalary",
  "allowances",
  "additions",
  "deductions",
  "advances",
  "netSalary",
]);

const cellText = (row: PayrollRow, key: PayrollColumnKey) => {
  switch (key) {
    case "employeeName":
      return row.employeeName;
    case "employeeNumber":
      return row.employeeNumber || "-";
    case "residenceNumber":
      return row.residenceNumber || "-";
    case "bankAccountNumber":
      return row.bankAccountNumber || "-";
    case "bankName":
      return row.bankName || "-";
    default:
      return formatMoney(row[key as keyof PayrollRow] as number);
  }
};

const PayrollTableRow = memo(
  ({
    row,
    columns,
    index,
    onEdit,
  }: {
    row: PayrollRow;
    columns: PayrollColumnKey[];
    index: number;
    onEdit: (row: PayrollRow) => void;
  }) => (
    <TableRow>
      <TableCell className="w-10 text-center text-muted-foreground">{index}</TableCell>
      {columns.map((key) =>
        key === "actions" ? (
          <TableCell key={key} className="text-center">
            <Button size="sm" variant="outline" onClick={() => onEdit(row)} aria-label="تعديل">
              <Edit className="h-4 w-4" />
            </Button>
          </TableCell>
        ) : (
          <TableCell
            key={key}
            className={`${NUMERIC.has(key) ? "text-center tabular-nums" : "text-right"} ${
              key === "netSalary" ? "font-bold text-primary" : ""
            } ${key === "deductions" || key === "advances" ? "text-destructive" : ""} ${
              key === "bankAccountNumber" ? "font-mono text-xs" : ""
            }`}
          >
            {cellText(row, key)}
          </TableCell>
        )
      )}
    </TableRow>
  )
);
PayrollTableRow.displayName = "PayrollTableRow";

export const PayrollTable = memo(({ rows, totals, settings, loading, onEdit }: Props) => {
  const columns = useMemo(
    () => settings.order.filter((k) => settings.visible[k]),
    [settings.order, settings.visible]
  );

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-lg font-semibold">لا توجد رواتب مطابقة</p>
        <p className="text-sm text-muted-foreground">
          لا توجد بيانات رواتب للشهر المحدد أو للفلاتر الحالية — جرّب تغيير الشهر أو مسح الفلاتر.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead className="w-10 text-center">#</TableHead>
            {columns.map((key) => (
              <TableHead
                key={key}
                className={NUMERIC.has(key) || key === "actions" ? "text-center" : "text-right"}
              >
                {COLUMN_LABELS[key]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <PayrollTableRow key={row.id} row={row} columns={columns} index={i + 1} onEdit={onEdit} />
          ))}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell className="text-center">—</TableCell>
            {columns.map((key, idx) => (
              <TableCell
                key={key}
                className={NUMERIC.has(key) ? "text-center tabular-nums" : "text-right"}
              >
                {NUMERIC.has(key)
                  ? formatMoney(totals[key as keyof PayrollTotals] as number)
                  : idx === 0
                  ? "الإجمالي"
                  : ""}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
});
PayrollTable.displayName = "PayrollTable";
