import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X, FileDown, ZoomIn, ZoomOut } from "lucide-react";

export interface PremiumLoadPrintRow {
  id: string;
  date: string;
  load_number: string;
  invoice_number: string | null;
  company: string;
  load_type: string;
  driver: string;
  truck_number: string | null;
  quantity: number;
  unload_quantity: number;
  difference: number;
  commission: number;
  delivery_from: string | null;
  delivery_to: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  rows: PremiumLoadPrintRow[];
  companyName: string;
  fromDate: string;
  toDate: string;
}

const ROWS_PER_PAGE = 20;

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const dash = (v?: string | null) => (v && String(v).trim() ? v : "—");

const PremiumLoadsPrintPreview = ({ open, onClose, rows, companyName, fromDate, toDate }: Props) => {
  const [zoom, setZoom] = useState(1);
  const sheetsRef = useRef<HTMLDivElement>(null);

  const pages = useMemo(() => {
    const chunks: PremiumLoadPrintRow[][] = [];
    for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) chunks.push(rows.slice(i, i + ROWS_PER_PAGE));
    return chunks.length ? chunks : [[]];
  }, [rows]);

  const totals = useMemo(
    () => ({
      quantity: rows.reduce((s, r) => s + r.quantity, 0),
      unload: rows.reduce((s, r) => s + r.unload_quantity, 0),
      difference: rows.reduce((s, r) => s + r.difference, 0),
      commission: rows.reduce((s, r) => s + r.commission, 0),
    }),
    [rows]
  );

  const printDate = new Date().toLocaleDateString("en-GB");

  const exportPdf = async () => {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);
    const nodes = sheetsRef.current?.querySelectorAll<HTMLElement>(".pl-sheet");
    if (!nodes || !nodes.length) return;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    for (let i = 0; i < nodes.length; i++) {
      const canvas = await html2canvas(nodes[i], { scale: 2, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(img, "JPEG", 0, 0, 297, (canvas.height * 297) / canvas.width);
    }
    pdf.save(`premium-loads-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!open) return null;

  const tableHead = (
    <thead>
      <tr>
        <th className="pl-th">م</th>
        <th className="pl-th">التاريخ</th>
        <th className="pl-th">رقم الشحنة</th>
        <th className="pl-th">رقم الفاتورة</th>
        <th className="pl-th pl-th-right">العميل</th>
        <th className="pl-th pl-th-right">نوع الحمولة</th>
        <th className="pl-th pl-th-right">السائق</th>
        <th className="pl-th">الشاحنة</th>
        <th className="pl-th">التحميل</th>
        <th className="pl-th">التنزيل</th>
        <th className="pl-th">الفرق</th>
        <th className="pl-th">العمولة</th>
        <th className="pl-th pl-th-right">التوصيل من</th>
        <th className="pl-th pl-th-right">التوصيل الى</th>
      </tr>
    </thead>
  );

  return (
    <div className="fixed inset-0 z-50 pl-preview-root" dir="rtl">
      <style>{`
        .pl-preview-root { background: #64748b; overflow: auto; }
        .pl-toolbar {
          position: sticky; top: 0; z-index: 10;
          display: flex; align-items: center; gap: .5rem;
          padding: .5rem .75rem; background: rgba(15,23,42,.94); color: #fff;
          backdrop-filter: blur(6px);
        }
        .pl-sheets { padding: 1.25rem; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
        .pl-sheet {
          width: 297mm; min-height: 210mm; background: #fff; color: #0f172a;
          padding: 10mm; box-shadow: 0 8px 28px rgba(0,0,0,.35);
          display: flex; flex-direction: column; box-sizing: border-box;
          font-family: 'Cairo','Tajawal',system-ui,sans-serif;
        }
        .pl-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .pl-company { font-size: 17pt; font-weight: 800; }
        .pl-title { font-size: 13pt; font-weight: 700; margin-top: 2px; color: #1e3a8a; }
        .pl-period { font-size: 9pt; color: #334155; margin-top: 5px; line-height: 1.7; }
        .pl-meta { font-size: 8.5pt; color: #334155; text-align: left; line-height: 1.8; }
        .pl-rule { height: 2px; background: linear-gradient(90deg,#1e3a8a,#93c5fd); margin: 8px 0 8px; border-radius: 2px; }
        .pl-kpis { display: flex; gap: 6px; margin-bottom: 8px; }
        .pl-kpi { flex: 1; border: .5pt solid #cbd5e1; border-radius: 4px; padding: 4px 6px; background: #f8fafc; }
        .pl-kpi-label { font-size: 7.5pt; color: #475569; }
        .pl-kpi-value { font-size: 11pt; font-weight: 800; direction: ltr; text-align: right; }
        .pl-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8pt; }
        .pl-table thead { display: table-header-group; }
        .pl-table tr { break-inside: avoid; page-break-inside: avoid; }
        .pl-th { border: .5pt solid #cbd5e1; background: #eef2ff; padding: 4px 3px; text-align: center; font-weight: 700; font-size: 8pt; }
        .pl-th-right { text-align: right; }
        .pl-td { border: .5pt solid #e2e8f0; padding: 3.5px 4px; text-align: center; }
        .pl-td-right { text-align: right; }
        .pl-num { text-align: right; direction: ltr; font-variant-numeric: tabular-nums; }
        .pl-zebra { background: #fafafa; }
        .pl-total td { border-top: 1.5pt solid #1e3a8a; background: #eef2ff; font-weight: 800; font-size: 8.5pt; }
        .pl-footer {
          margin-top: auto; padding-top: 8px; border-top: .5pt solid #d1d5db;
          display: flex; justify-content: space-between; font-size: 7.5pt; color: #64748b;
        }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .pl-preview-root, .pl-preview-root * { visibility: visible !important; }
          .pl-preview-root { position: absolute !important; inset: 0 !important; background: #fff !important; overflow: visible !important; }
          .pl-toolbar { display: none !important; }
          .pl-sheets { padding: 0 !important; gap: 0 !important; display: block !important; }
          .pl-sheet {
            width: auto !important; min-height: 0 !important; padding: 0 !important;
            box-shadow: none !important; transform: none !important;
            page-break-after: always; break-after: page;
          }
          .pl-sheet:last-child { page-break-after: auto; break-after: auto; }
        }
      `}</style>

      <div className="pl-toolbar">
        <Button size="sm" variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4 ml-1" /> طباعة
        </Button>
        <Button size="sm" variant="secondary" onClick={exportPdf}>
          <FileDown className="h-4 w-4 ml-1" /> تصدير PDF
        </Button>
        <div className="flex items-center gap-1 mr-2">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs opacity-80">معاينة الطباعة — A4 أفقي — {pages.length} صفحة</span>
        <Button size="sm" variant="destructive" className="mr-auto" onClick={onClose}>
          <X className="h-4 w-4 ml-1" /> إغلاق
        </Button>
      </div>

      <div className="pl-sheets" ref={sheetsRef}>
        {pages.map((pageRows, pageIndex) => (
          <div key={pageIndex} className="pl-sheet" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
            <div className="pl-head">
              <div>
                <div className="pl-company">{companyName}</div>
                <div className="pl-title">تقرير الحمولات المميز المفصل</div>
                <div className="pl-period">
                  <div>من تاريخ: {fmtDate(fromDate)}</div>
                  <div>إلى تاريخ: {fmtDate(toDate)}</div>
                </div>
              </div>
              <div className="pl-meta">
                <div>تاريخ الطباعة: {printDate}</div>
                <div>رقم الصفحة: {pageIndex + 1} من {pages.length}</div>
                <div>عدد الحمولات: {rows.length}</div>
              </div>
            </div>
            <div className="pl-rule" />

            {pageIndex === 0 && (
              <div className="pl-kpis">
                <div className="pl-kpi">
                  <div className="pl-kpi-label">عدد الحمولات</div>
                  <div className="pl-kpi-value">{rows.length}</div>
                </div>
                <div className="pl-kpi">
                  <div className="pl-kpi-label">إجمالي كمية التحميل</div>
                  <div className="pl-kpi-value">{fmt(totals.quantity)}</div>
                </div>
                <div className="pl-kpi">
                  <div className="pl-kpi-label">إجمالي كمية التنزيل</div>
                  <div className="pl-kpi-value">{fmt(totals.unload)}</div>
                </div>
                <div className="pl-kpi">
                  <div className="pl-kpi-label">إجمالي الفرق</div>
                  <div className="pl-kpi-value">{fmt(totals.difference)}</div>
                </div>
                <div className="pl-kpi">
                  <div className="pl-kpi-label">إجمالي العمولات</div>
                  <div className="pl-kpi-value">{fmt(totals.commission)}</div>
                </div>
              </div>
            )}

            <table className="pl-table">
              <colgroup>
                <col style={{ width: "3.5%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "6.5%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "5.5%" }} />
                <col style={{ width: "6.5%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
              {tableHead}
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.id} className={i % 2 ? "pl-zebra" : undefined}>
                    <td className="pl-td">{pageIndex * ROWS_PER_PAGE + i + 1}</td>
                    <td className="pl-td">{fmtDate(r.date)}</td>
                    <td className="pl-td">{dash(r.load_number)}</td>
                    <td className="pl-td">{dash(r.invoice_number)}</td>
                    <td className="pl-td pl-td-right">{dash(r.company)}</td>
                    <td className="pl-td pl-td-right">{dash(r.load_type)}</td>
                    <td className="pl-td pl-td-right">{dash(r.driver)}</td>
                    <td className="pl-td">{dash(r.truck_number)}</td>
                    <td className="pl-td pl-num">{fmt(r.quantity)}</td>
                    <td className="pl-td pl-num">{fmt(r.unload_quantity)}</td>
                    <td className="pl-td pl-num">{fmt(r.difference)}</td>
                    <td className="pl-td pl-num">{fmt(r.commission)}</td>
                    <td className="pl-td pl-td-right">{dash(r.delivery_from)}</td>
                    <td className="pl-td pl-td-right">{dash(r.delivery_to)}</td>
                  </tr>
                ))}
                {pageIndex === pages.length - 1 && (
                  <tr className="pl-total">
                    <td className="pl-td pl-td-right" colSpan={8}>الإجمالي</td>
                    <td className="pl-td pl-num">{fmt(totals.quantity)}</td>
                    <td className="pl-td pl-num">{fmt(totals.unload)}</td>
                    <td className="pl-td pl-num">{fmt(totals.difference)}</td>
                    <td className="pl-td pl-num">{fmt(totals.commission)}</td>
                    <td className="pl-td" colSpan={2} />
                  </tr>
                )}
              </tbody>
            </table>

            <div className="pl-footer">
              <span>تقرير الحمولات المميز المفصل</span>
              <span>{companyName} | {printDate}</span>
              <span>صفحة {pageIndex + 1} من {pages.length}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PremiumLoadsPrintPreview;
