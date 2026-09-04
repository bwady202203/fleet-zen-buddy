import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Maximize2,
  Minus,
  MoveHorizontal,
  Plus,
  Printer,
  RotateCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PayrollColumnKey, PayrollRow, PayrollSettings, PayrollTotals, formatMonthLabel } from "./types";
import { PayrollPreviewHeader } from "./PayrollPreviewHeader";
import { PayrollPreviewTable } from "./PayrollPreviewTable";
import { PayrollPreviewFooter } from "./PayrollPreviewFooter";
import { PayrollSummary } from "./PayrollSummary";

interface Props {
  open: boolean;
  onClose: () => void;
  rows: PayrollRow[];
  totals: PayrollTotals;
  settings: PayrollSettings;
  month: string;
  onOrientationChange: (o: "portrait" | "landscape") => void;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5];

/** حساب حجم الخط وعدد الصفوف بحسب الاتجاه وعدد الأعمدة */
const computeLayout = (columnCount: number, orientation: string, fontScale: number) => {
  let base = orientation === "landscape" ? 9 : 9.5;
  if (columnCount > 8) base -= 0.8;
  if (columnCount > 10) base -= 0.8;
  const fontPt = Math.max(6, Math.min(12, base * fontScale));
  const rowMm = fontPt * 0.62 + 2.2;
  const usableMm = orientation === "landscape" ? 210 - 24 : 297 - 24;
  const headerMm = 34;
  const footerMm = 12;
  const firstPageRows = Math.max(4, Math.floor((usableMm - headerMm - footerMm - 10) / rowMm));
  const otherPageRows = Math.max(4, Math.floor((usableMm - footerMm - 14) / rowMm));
  return { fontPt, firstPageRows, otherPageRows };
};

export const PayrollPreview = ({
  open,
  onClose,
  rows,
  totals,
  settings,
  month,
  onOrientationChange,
}: Props) => {
  const [zoom, setZoom] = useState(1);
  const [exporting, setExporting] = useState(false);
  const pagesRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const columns = useMemo(
    () => settings.order.filter((k) => k !== "actions" && settings.visible[k]),
    [settings.order, settings.visible]
  );

  const { fontPt, firstPageRows, otherPageRows } = useMemo(
    () => computeLayout(columns.length, settings.orientation, settings.fontScale),
    [columns.length, settings.orientation, settings.fontScale]
  );

  const pages = useMemo(() => {
    const result: PayrollRow[][] = [];
    let i = 0;
    while (i < rows.length) {
      const size = result.length === 0 ? firstPageRows : otherPageRows;
      result.push(rows.slice(i, i + size));
      i += size;
    }
    return result.length ? result : [[]];
  }, [rows, firstPageRows, otherPageRows]);

  const pageW = settings.orientation === "landscape" ? 297 : 210;
  const pageH = settings.orientation === "landscape" ? 210 : 297;

  const fitToWidth = useCallback(() => {
    const available = window.innerWidth - 80;
    setZoom(Math.max(0.3, Math.min(2, available / (pageW * 3.7795))));
  }, [pageW]);

  const fitToPage = useCallback(() => {
    const availableH = window.innerHeight - 180;
    const availableW = window.innerWidth - 80;
    setZoom(
      Math.max(0.3, Math.min(availableW / (pageW * 3.7795), availableH / (pageH * 3.7795)))
    );
  }, [pageW, pageH]);

  const stepZoom = (dir: 1 | -1) => {
    const nearest = ZOOM_STEPS.reduce(
      (best, z) => (Math.abs(z - zoom) < Math.abs(best - zoom) ? z : best),
      ZOOM_STEPS[0]
    );
    const idx = ZOOM_STEPS.indexOf(nearest);
    setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, idx + dir))]);
  };

  const handlePrint = () => window.print();

  const handleExportPdf = async () => {
    if (!pagesRef.current) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const pdf = new jsPDF({
        orientation: settings.orientation,
        unit: "mm",
        format: "a4",
      });
      const pageEls = Array.from(
        pagesRef.current.querySelectorAll<HTMLElement>(".payroll-page")
      );
      for (let i = 0; i < pageEls.length; i++) {
        const canvas = await html2canvas(pageEls[i], {
          scale: 3,
          backgroundColor: "#ffffff",
          useCORS: true,
        });
        const img = canvas.toDataURL("image/jpeg", 0.98);
        if (i > 0) pdf.addPage("a4", settings.orientation);
        pdf.addImage(img, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
      }
      pdf.save(`كشف-الرواتب-${month}.pdf`);
      toast({ title: "تم تصدير PDF", description: `عدد الصفحات: ${pageEls.length}` });
    } catch (e) {
      toast({
        title: "تعذر تصدير PDF",
        description: e instanceof Error ? e.message : "خطأ غير معروف",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="payroll-print-portal fixed inset-0 z-[60] flex flex-col bg-neutral-800/95">
      <style>{`
        @media print {
          @page { size: A4 ${settings.orientation}; margin: 0; }
          html, body { background: #fff !important; }
          body > *:not(.payroll-print-portal) { display: none !important; }
          .payroll-print-portal {
            position: static !important; inset: auto !important;
            background: #fff !important; display: block !important; z-index: auto !important;
          }
          .payroll-no-print { display: none !important; }
          .payroll-scroll { overflow: visible !important; height: auto !important; padding: 0 !important; }
          .payroll-zoom { transform: none !important; }
          .payroll-page {
            box-shadow: none !important; margin: 0 !important; border: 0 !important;
            break-after: page; page-break-after: always;
          }
          .payroll-page:last-child { break-after: auto; page-break-after: auto; }
          tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* شريط أدوات المعاينة */}
      <div className="payroll-no-print flex flex-wrap items-center justify-between gap-2 border-b border-neutral-700 bg-neutral-900 px-4 py-2 text-neutral-100">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق المعاينة" className="text-neutral-100 hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold">
            معاينة كشف رواتب {formatMonthLabel(month)} — {pages.length} صفحة
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="secondary" size="sm" className="gap-1" onClick={() => stepZoom(-1)}>
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-[52px] text-center text-sm tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="secondary" size="sm" onClick={() => stepZoom(1)}>
            <Plus className="h-4 w-4" />
          </Button>
          {ZOOM_STEPS.map((z) => (
            <Button
              key={z}
              variant={Math.abs(z - zoom) < 0.01 ? "default" : "outline"}
              size="sm"
              className="px-2 text-xs"
              onClick={() => setZoom(z)}
            >
              {z * 100}%
            </Button>
          ))}
          <Button variant="outline" size="sm" className="gap-1" onClick={fitToWidth}>
            <MoveHorizontal className="h-4 w-4" /> ملء العرض
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={fitToPage}>
            <Maximize2 className="h-4 w-4" /> ملء الصفحة
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              onOrientationChange(settings.orientation === "portrait" ? "landscape" : "portrait")
            }
          >
            <RotateCw className="h-4 w-4" />
            {settings.orientation === "portrait" ? "أفقي" : "طولي"}
          </Button>
          <Button size="sm" className="gap-1" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> طباعة
          </Button>
          <Button size="sm" variant="secondary" className="gap-1" onClick={handleExportPdf} disabled={exporting}>
            <Download className="h-4 w-4" /> {exporting ? "جارٍ التصدير…" : "تصدير PDF"}
          </Button>
        </div>
      </div>

      {/* منطقة الورق */}
      <div className="payroll-scroll flex-1 overflow-auto p-6">
        <div
          className="payroll-zoom mx-auto flex flex-col items-center gap-6"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center", width: `${pageW}mm` }}
          ref={pagesRef}
        >
          {pages.map((pageRows, idx) => {
            const startIndex = pages.slice(0, idx).reduce((s, p) => s + p.length, 0);
            const isLast = idx === pages.length - 1;
            return (
              <div
                key={idx}
                className="payroll-page flex flex-col bg-white text-neutral-900 shadow-2xl"
                style={{
                  width: `${pageW}mm`,
                  height: `${pageH}mm`,
                  padding: "12mm",
                  boxSizing: "border-box",
                  overflow: "hidden",
                  direction: "rtl",
                }}
              >
                {idx === 0 ? (
                  <PayrollPreviewHeader settings={settings} month={month} totals={totals} />
                ) : (
                  <div className="border-b border-neutral-500 pb-1 text-[9pt] font-bold">
                    {settings.companyName} — كشف رواتب {formatMonthLabel(month)} (تابع)
                  </div>
                )}

                <div className="mt-2 flex-1 overflow-hidden">
                  <PayrollPreviewTable
                    columns={columns}
                    rows={pageRows}
                    startIndex={startIndex}
                    fontPt={fontPt}
                    showTotalsRow={isLast && settings.showTotalsRow}
                    totals={totals}
                  />

                  {isLast && settings.showSummary && (
                    <PayrollSummary totals={totals} variant="print" />
                  )}

                  {isLast && settings.showSignatures && (
                    <div className="mt-6 grid grid-cols-3 gap-8 text-center text-[8pt]">
                      {["المدير المالي", "مدير الموارد البشرية", "المدير العام"].map((t) => (
                        <div key={t}>
                          <div className="font-bold">{t}</div>
                          <div className="mx-4 mt-8 border-t border-neutral-700 pt-1">التوقيع</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <PayrollPreviewFooter
                  settings={settings}
                  month={month}
                  pageNumber={idx + 1}
                  pageCount={pages.length}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
