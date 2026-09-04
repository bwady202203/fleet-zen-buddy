import { Building2 } from "lucide-react";
import { PayrollSettings, PayrollTotals, formatMoney, formatMonthLabel } from "./types";

interface Props {
  settings: PayrollSettings;
  month: string;
  totals: PayrollTotals;
}

export const PayrollPreviewHeader = ({ settings, month, totals }: Props) => {
  const issueDate = new Date().toLocaleDateString("ar-EG-u-nu-latn");

  return (
    <div className="border-b-2 border-neutral-800 pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {settings.showLogo && (
            <div className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-neutral-800">
              <Building2 className="h-6 w-6 text-neutral-800" />
            </div>
          )}
          {settings.showCompanyInfo && (
            <div className="text-right leading-tight">
              <div className="text-[13pt] font-bold text-neutral-900">{settings.companyName}</div>
              <div className="text-[8pt] text-neutral-600">إدارة الموارد البشرية — الرواتب</div>
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="text-[15pt] font-bold text-neutral-900">كشف الرواتب الشهري</div>
          {settings.showPeriod && (
            <div className="text-[10pt] text-neutral-700">{formatMonthLabel(month)}</div>
          )}
        </div>

        <div className="min-w-[110px] text-left text-[8pt] leading-relaxed text-neutral-700">
          {settings.showIssueDate && <div>تاريخ الإصدار: {issueDate}</div>}
          {settings.showEmployeeCount && <div>عدد الموظفين: {totals.count}</div>}
        </div>
      </div>

      {settings.showHeaderTotals && (
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[8pt]">
          {[
            { label: "إجمالي الرواتب", value: totals.basicSalary },
            { label: "إجمالي البدلات", value: totals.allowances + totals.additions },
            { label: "إجمالي الخصومات", value: totals.deductions + totals.advances },
            { label: "صافي الرواتب", value: totals.netSalary },
          ].map((item) => (
            <div key={item.label} className="rounded border border-neutral-400 px-2 py-1">
              <div className="text-neutral-600">{item.label}</div>
              <div className="text-[10pt] font-bold text-neutral-900">{formatMoney(item.value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
