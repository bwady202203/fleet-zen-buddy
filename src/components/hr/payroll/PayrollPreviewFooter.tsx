import { PayrollSettings, formatMonthLabel } from "./types";

interface Props {
  settings: PayrollSettings;
  month: string;
  pageNumber: number;
  pageCount: number;
}

export const PayrollPreviewFooter = ({ settings, month, pageNumber, pageCount }: Props) => {
  if (!settings.showFooter) return null;
  return (
    <div className="mt-auto border-t border-neutral-700 pt-1.5 text-[7.5pt] text-neutral-700">
      <div className="flex items-center justify-between">
        <span>{settings.companyName}</span>
        <span>كشف رواتب شهر {formatMonthLabel(month)}</span>
        <span>
          صفحة {pageNumber} من {pageCount}
        </span>
      </div>
      {settings.footerNote && (
        <div className="mt-0.5 text-center text-[7pt] text-neutral-500">{settings.footerNote}</div>
      )}
    </div>
  );
};
