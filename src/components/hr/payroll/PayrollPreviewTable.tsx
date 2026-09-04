import { PayrollColumnKey, PayrollRow, PayrollTotals, formatMoney, COLUMN_LABELS } from "./types";

interface Props {
  columns: PayrollColumnKey[];
  rows: PayrollRow[];
  startIndex: number;
  fontPt: number;
  showTotalsRow: boolean;
  totals: PayrollTotals;
}

const isNumeric = (key: PayrollColumnKey) =>
  ["basicSalary", "allowances", "additions", "deductions", "advances", "netSalary"].includes(key);

const cellValue = (row: PayrollRow, key: PayrollColumnKey) => {
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

const totalValue = (totals: PayrollTotals, key: PayrollColumnKey) =>
  isNumeric(key) ? formatMoney(totals[key as keyof PayrollTotals] as number) : "";

export const PayrollPreviewTable = ({
  columns,
  rows,
  startIndex,
  fontPt,
  showTotalsRow,
  totals,
}: Props) => {
  const pad = fontPt <= 7 ? "2px 3px" : fontPt <= 8 ? "3px 4px" : "4px 5px";

  return (
    <table
      className="w-full table-fixed border-collapse"
      style={{ fontSize: `${fontPt}pt`, direction: "rtl" }}
    >
      <thead>
        <tr>
          <th
            className="border border-neutral-700 bg-neutral-100 text-center font-bold text-neutral-900"
            style={{ padding: pad, width: "26px" }}
          >
            #
          </th>
          {columns.map((key) => (
            <th
              key={key}
              className="border border-neutral-700 bg-neutral-100 text-center font-bold text-neutral-900"
              style={{ padding: pad }}
            >
              {COLUMN_LABELS[key]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
            <td
              className="border border-neutral-500 text-center text-neutral-700"
              style={{ padding: pad }}
            >
              {startIndex + i + 1}
            </td>
            {columns.map((key) => (
              <td
                key={key}
                className={`border border-neutral-500 text-neutral-900 ${
                  isNumeric(key) ? "text-center tabular-nums" : "text-right"
                } ${key === "netSalary" ? "font-bold" : ""} ${
                  key === "bankAccountNumber" ? "font-mono" : ""
                }`}
                style={{ padding: pad, wordBreak: "break-word" }}
              >
                {cellValue(row, key)}
              </td>
            ))}
          </tr>
        ))}
        {showTotalsRow && (
          <tr className="bg-neutral-100 font-bold">
            <td className="border-2 border-neutral-700 text-center" style={{ padding: pad }}>
              —
            </td>
            {columns.map((key, idx) => (
              <td
                key={key}
                className={`border-2 border-neutral-700 ${isNumeric(key) ? "text-center tabular-nums" : "text-right"}`}
                style={{ padding: pad }}
              >
                {idx === 0 && !isNumeric(key) ? "الإجمالي" : totalValue(totals, key)}
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  );
};
