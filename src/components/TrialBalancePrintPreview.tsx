import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X, FileDown, ZoomIn, ZoomOut } from "lucide-react";

export interface TrialBalanceRow {
  code: string;
  name: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceTotals {
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  rows: TrialBalanceRow[];
  totals: TrialBalanceTotals;
  companyName: string;
  startDate?: string;
  endDate?: string;
  userName?: string;
}

const ROWS_PER_PAGE = 22;

export const fmt = (value: number) =>
  value === 0
    ? "-"
    : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const TrialBalancePrintPreview = ({
  open,
  onClose,
  rows,
  totals,
  companyName,
  startDate,
  endDate,
  userName,
}: Props) => {
  const [zoom, setZoom] = useState(1);
  const sheetsRef = useRef<HTMLDivElement>(null);

  const pages = useMemo(() => {
    const chunks: TrialBalanceRow[][] = [];
    for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
      chunks.push(rows.slice(i, i + ROWS_PER_PAGE));
    }
    return chunks.length ? chunks : [[]];
  }, [rows]);

  const printDate = new Date().toLocaleDateString("en-GB");

  const exportPdf = async () => {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);
    const nodes = sheetsRef.current?.querySelectorAll<HTMLElement>(".tb-sheet");
    if (!nodes || !nodes.length) return;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    for (let i = 0; i < nodes.length; i++) {
      const canvas = await html2canvas(nodes[i], { scale: 2, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(img, "JPEG", 0, 0, 297, (canvas.height * 297) / canvas.width);
    }
    pdf.save(`trial-balance-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!open) return null;

  const colGroup = (
    <colgroup>
      <col style={{ width: "8%" }} />
      <col style={{ width: "24%" }} />
      <col style={{ width: "11.33%" }} />
      <col style={{ width: "11.33%" }} />
      <col style={{ width: "11.33%" }} />
      <col style={{ width: "11.33%" }} />
      <col style={{ width: "11.34%" }} />
      <col style={{ width: "11.34%" }} />
    </colgroup>
  );

  const tableHead = (
    <thead>
      <tr>
        <th rowSpan={2} className="tb-th">رمز الحساب</th>
        <th rowSpan={2} className="tb-th tb-th-name">اسم الحساب</th>
        <th colSpan={2} className="tb-th tb-group">الرصيد الافتتاحي</th>
        <th colSpan={2} className="tb-th tb-group">حركة الفترة</th>
        <th colSpan={2} className="tb-th tb-group">الرصيد الختامي</th>
      </tr>
      <tr>
        <th className="tb-th tb-sub">مدين</th>
        <th className="tb-th tb-sub">دائن</th>
        <th className="tb-th tb-sub">مدين</th>
        <th className="tb-th tb-sub">دائن</th>
        <th className="tb-th tb-sub">مدين</th>
        <th className="tb-th tb-sub">دائن</th>
      </tr>
    </thead>
  );

  return (
    <div className="fixed inset-0 z-50 tb-preview-root" dir="rtl">
      <style>{`
        .tb-preview-root { background: #6b7280; overflow: auto; }
        .tb-toolbar {
          position: sticky; top: 0; z-index: 10;
          display: flex; align-items: center; gap: .5rem;
          padding: .5rem .75rem;
          background: rgba(17,24,39,.92); color: #fff;
          backdrop-filter: blur(6px);
        }
        .tb-sheets { padding: 1.25rem; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
        .tb-sheet {
          width: 297mm; min-height: 210mm;
          background: #fff; color: #111827;
          padding: 12mm;
          box-shadow: 0 8px 28px rgba(0,0,0,.35);
          display: flex; flex-direction: column;
          font-family: 'Cairo','Tajawal',system-ui,sans-serif;
          box-sizing: border-box;
        }
        .tb-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .tb-company { font-size: 17pt; font-weight: 800; }
        .tb-report-title { font-size: 14pt; font-weight: 700; margin-top: 2px; }
        .tb-period { font-size: 9.5pt; color: #374151; margin-top: 6px; line-height: 1.7; }
        .tb-meta { font-size: 9pt; color: #374151; text-align: left; line-height: 1.8; }
        .tb-rule { height: 2px; background: linear-gradient(90deg,#1e3a8a,#93c5fd); margin: 8px 0 10px; border-radius: 2px; }
        .tb-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
        .tb-table thead { display: table-header-group; }
        .tb-table tr { break-inside: avoid; page-break-inside: avoid; }
        .tb-th {
          border: .5pt solid #cbd5e1; background: #f1f5f9;
          padding: 5px 4px; text-align: center; font-weight: 700; font-size: 9pt;
        }
        .tb-th-name { text-align: right; }
        .tb-group { background: #e2e8f0; }
        .tb-sub { font-weight: 600; font-size: 8.5pt; background: #f8fafc; }
        .tb-td { border: .5pt solid #e2e8f0; padding: 4.5px 5px; }
        .tb-code { text-align: center; font-family: ui-monospace,monospace; color: #1d4ed8; }
        .tb-name { text-align: right; font-size: 9.5pt; font-weight: 600; }
        .tb-num { text-align: left; font-variant-numeric: tabular-nums; direction: ltr; }
        .tb-zebra { background: #fafafa; }
        .tb-total td { border-top: 1.5pt solid #1e3a8a; background: #eef2ff; font-weight: 800; font-size: 9.5pt; }
        .tb-footer {
          margin-top: auto; padding-top: 8px; border-top: .5pt solid #d1d5db;
          display: flex; justify-content: space-between; font-size: 8pt; color: #6b7280;
        }
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .tb-preview-root, .tb-preview-root * { visibility: visible !important; }
          .tb-preview-root {
            position: absolute !important; inset: 0 !important;
            background: #fff !important; overflow: visible !important;
          }
          .tb-toolbar { display: none !important; }
          .tb-sheets { padding: 0 !important; gap: 0 !important; display: block !important; }
          .tb-sheet {
            width: auto !important; min-height: 0 !important; padding: 0 !important;
            box-shadow: none !important; transform: none !important;
            page-break-after: always; break-after: page;
          }
          .tb-sheet:last-child { page-break-after: auto; break-after: auto; }
        }
      `}</style>

      <div className="tb-toolbar">
        <Button size="sm" variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4 ml-1" /> طباعة
        </Button>
        <Button size="sm" variant="secondary" onClick={exportPdf}>
          <FileDown className="h-4 w-4 ml-1" /> تصدير PDF
        </Button>
        <div className="flex items-center gap-1 mr-2">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={() => setZoom(z => Math.min(1.6, +(z + 0.1).toFixed(2)))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs opacity-80">معاينة الطباعة — A4 أفقي — {pages.length} صفحة</span>
        <Button size="sm" variant="destructive" className="mr-auto" onClick={onClose}>
          <X className="h-4 w-4 ml-1" /> إغلاق
        </Button>
      </div>

      <div className="tb-sheets" ref={sheetsRef}>
        {pages.map((pageRows, pageIndex) => (
          <div
            key={pageIndex}
            className="tb-sheet"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
          >
            <div className="tb-head">
              <div>
                <div className="tb-company">{companyName}</div>
                <div className="tb-report-title">ميزان المراجعة</div>
                <div className="tb-period">
                  <div>من تاريخ: {fmtDate(startDate)}</div>
                  <div>إلى تاريخ: {fmtDate(endDate)}</div>
                </div>
              </div>
              <div className="tb-meta">
                <div>تاريخ الطباعة: {printDate}</div>
                <div>رقم الصفحة: {pageIndex + 1} من {pages.length}</div>
                <div>عدد الحسابات: {rows.length}</div>
              </div>
            </div>
            <div className="tb-rule" />

            <table className="tb-table">
              {colGroup}
              {tableHead}
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.code + i} className={i % 2 ? "tb-zebra" : undefined}>
                    <td className="tb-td tb-code">{r.code}</td>
                    <td className="tb-td tb-name">{r.name}</td>
                    <td className="tb-td tb-num">{fmt(r.openingDebit)}</td>
                    <td className="tb-td tb-num">{fmt(r.openingCredit)}</td>
                    <td className="tb-td tb-num">{fmt(r.periodDebit)}</td>
                    <td className="tb-td tb-num">{fmt(r.periodCredit)}</td>
                    <td className="tb-td tb-num">{fmt(r.closingDebit)}</td>
                    <td className="tb-td tb-num">{fmt(r.closingCredit)}</td>
                  </tr>
                ))}
                {pageIndex === pages.length - 1 && (
                  <tr className="tb-total">
                    <td className="tb-td" colSpan={2} style={{ textAlign: "right" }}>الإجمالي</td>
                    <td className="tb-td tb-num">{fmt(totals.openingDebit)}</td>
                    <td className="tb-td tb-num">{fmt(totals.openingCredit)}</td>
                    <td className="tb-td tb-num">{fmt(totals.periodDebit)}</td>
                    <td className="tb-td tb-num">{fmt(totals.periodCredit)}</td>
                    <td className="tb-td tb-num">{fmt(totals.closingDebit)}</td>
                    <td className="tb-td tb-num">{fmt(totals.closingCredit)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="tb-footer">
              <span>ميزان المراجعة - تقرير محاسبي</span>
              <span>{companyName} | {printDate}{userName ? ` | ${userName}` : ""}</span>
              <span>صفحة {pageIndex + 1} من {pages.length}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrialBalancePrintPreview;
