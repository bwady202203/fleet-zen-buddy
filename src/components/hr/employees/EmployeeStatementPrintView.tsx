import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FileDown, Minus, Plus, Printer, Settings2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDateAr, formatMoneySar } from "@/lib/advances";
import { buildEmployeeLedger, TXN_TYPE_LABELS, type EmployeeLedgerRow } from "@/lib/employeeLedger";
import { EmployeeAccount } from "@/hooks/useEmployeeAccount";
import logoAsset from "@/assets/wizer-logo.png.asset.json";

const logo = logoAsset.url;
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5];

export interface StatementEmployee {
  id: string;
  name: string;
  employee_number?: string | null;
  department?: string | null;
  position?: string | null;
  hire_date?: string | null;
  status?: string | null;
  salary?: number | null;
  housing_allowance?: number | null;
  transport_allowance?: number | null;
  other_allowances?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: StatementEmployee | null;
  account: EmployeeAccount | null;
  period?: { from: string; to: string };
  companyName?: string;
}

interface ReportSettings {
  companyName: string;
  reportTitle: string;
  fontSize: number;
  margin: number;
  paper: "a4" | "letter";
  orientation: "portrait" | "landscape";
  showLogo: boolean;
  showOpening: boolean;
  showDisbursed: boolean;
  showSignatures: boolean;
  showDocumentNumber: boolean;
  showType: boolean;
}

const PAPER: Record<string, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  letter: { w: 216, h: 279 },
};

const chunkRows = (rows: EmployeeLedgerRow[], first: number, rest: number) => {
  if (rows.length === 0) return [[]] as EmployeeLedgerRow[][];
  const pages: EmployeeLedgerRow[][] = [];
  let i = 0;
  while (i < rows.length) {
    const size = pages.length === 0 ? first : rest;
    pages.push(rows.slice(i, i + size));
    i += size;
  }
  return pages;
};

export const EmployeeStatementPrintView = ({
  open,
  onOpenChange,
  employee,
  account,
  period,
  companyName = "شركة رمال",
}: Props) => {
  const [zoom, setZoom] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ReportSettings>({
    companyName,
    reportTitle: "كشف حساب موظف",
    fontSize: 11,
    margin: 12,
    paper: "a4",
    orientation: "portrait",
    showLogo: true,
    showOpening: true,
    showDisbursed: true,
    showSignatures: true,
    showDocumentNumber: true,
    showType: true,
  });
  const pagesRef = useRef<HTMLDivElement>(null);

  const ledger = useMemo(
    () => buildEmployeeLedger(account?.transactions ?? [], { from: period?.from, to: period?.to }),
    [account?.transactions, period?.from, period?.to]
  );

  const paper = PAPER[settings.paper];
  const pageW = settings.orientation === "portrait" ? paper.w : paper.h;
  const pageH = settings.orientation === "portrait" ? paper.h : paper.w;

  const rowsPerFirst = settings.orientation === "portrait" ? 18 : 10;
  const rowsPerRest = settings.orientation === "portrait" ? 26 : 15;
  const pages = useMemo(() => chunkRows(ledger.rows, rowsPerFirst, rowsPerRest), [ledger.rows, rowsPerFirst, rowsPerRest]);

  const setStep = (dir: 1 | -1) => {
    const idx = ZOOM_STEPS.findIndex((z) => z >= zoom - 0.001);
    setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, idx + dir))]);
  };

  const handleExportPdf = async () => {
    if (!pagesRef.current || !employee) return;
    try {
      toast({ title: "جارٍ تصدير PDF..." });
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const pdf = new jsPDF({ orientation: settings.orientation, unit: "mm", format: settings.paper });
      const nodes = Array.from(pagesRef.current.querySelectorAll<HTMLElement>("[data-a4-page]"));
      for (let i = 0; i < nodes.length; i++) {
        const canvas = await html2canvas(nodes[i], { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
        if (i > 0) pdf.addPage(settings.paper, settings.orientation);
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
      }
      pdf.save(`كشف-حساب-${employee.name}.pdf`);
      toast({ title: "تم تصدير PDF" });
    } catch {
      toast({ title: "فشل تصدير PDF", variant: "destructive" });
    }
  };

  if (!employee || !account) return null;

  const t = ledger.totals;
  const balanced = Math.abs(t.closingBalance - (t.openingBalance + t.debit - t.credit)) < 0.01;
  const cols = 4 + (settings.showDocumentNumber ? 1 : 0) + (settings.showType ? 1 : 0);

  const Header = () => (
    <div className="border-b-2 border-slate-800 pb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="text-right">
          <p className="text-[13px] font-extrabold">{settings.companyName}</p>
          <p className="text-[9px] text-slate-500">المملكة العربية السعودية</p>
        </div>
        <div className="text-center">
          <p className="text-[15px] font-extrabold">{settings.reportTitle}</p>
          <p className="text-[9px] text-slate-500">
            الفترة: {period?.from ? formatDateAr(period.from) : "من بداية الحركات"} — {period?.to ? formatDateAr(period.to) : "حتى آخر حركة"}
          </p>
        </div>
        {settings.showLogo ? <img src={logo} alt={settings.companyName} className="h-10 w-auto object-contain" /> : <span className="w-10" />}
      </div>
    </div>
  );

  const InfoGrid = () => (
    <div className="mt-2 grid grid-cols-4 gap-1 text-[10px]">
      {[
        ["اسم الموظف", employee.name],
        ["الرقم الوظيفي", employee.employee_number || "—"],
        ["القسم", employee.department || "—"],
        ["المسمى الوظيفي", employee.position || "—"],
      ].map(([label, value]) => (
        <div key={label as string} className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
          <span className="text-slate-500">{label}: </span>
          <b>{value as string}</b>
        </div>
      ))}
    </div>
  );

  const TableHead = () => (
    <thead>
      <tr className="bg-slate-800 text-white">
        <th className="border border-slate-300 px-1 py-1">التاريخ</th>
        {settings.showDocumentNumber && <th className="border border-slate-300 px-1 py-1">المستند</th>}
        {settings.showType && <th className="border border-slate-300 px-1 py-1">النوع</th>}
        <th className="border border-slate-300 px-1 py-1">البيان</th>
        <th className="border border-slate-300 px-1 py-1">مدين</th>
        <th className="border border-slate-300 px-1 py-1">دائن</th>
        <th className="border border-slate-300 px-1 py-1">الرصيد</th>
      </tr>
    </thead>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="employee-statement-dialog max-h-[96vh] w-[98vw] gap-0 overflow-hidden rounded-2xl border-0 p-0 sm:max-w-[1180px]"
        dir="rtl"
      >
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .employee-statement-dialog, .employee-statement-dialog * { visibility: visible !important; }
            .employee-statement-dialog { position: fixed !important; inset: 0 !important; max-height: none !important; width: 100% !important; max-width: none !important; box-shadow: none !important; transform: none !important; }
            .no-print { display: none !important; }
            .stmt-scroll { overflow: visible !important; max-height: none !important; padding: 0 !important; background: #fff !important; }
            .stmt-zoom { transform: none !important; }
            [data-a4-page] { box-shadow: none !important; margin: 0 !important; page-break-after: always; break-after: page; }
            [data-a4-page]:last-child { page-break-after: auto; break-after: auto; }
            @page { size: ${settings.paper} ${settings.orientation}; margin: 0; }
          }
        `}</style>

        {/* شريط الأدوات */}
        <div className="no-print flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => onOpenChange(false)} aria-label="إغلاق">
            <X className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold">معاينة كشف حساب الموظف</span>
          <div className="flex items-center gap-1 rounded-xl bg-card px-1 py-0.5 shadow-sm">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStep(-1)} aria-label="تصغير">
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-12 text-center font-mono text-xs">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStep(1)} aria-label="تكبير">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {pages.length} صفحة — {ledger.rows.length} حركة
          </span>
          <div className="mr-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => setShowSettings((s) => !s)}>
              <Settings2 className="h-3.5 w-3.5" /> إعدادات التقرير
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={handleExportPdf} disabled={!balanced}>
              <FileDown className="h-3.5 w-3.5" /> تصدير PDF
            </Button>
            <Button
              size="sm"
              className="gap-1.5 rounded-xl bg-hr text-hr-foreground hover:bg-hr/90"
              onClick={() => window.print()}
              disabled={!balanced}
            >
              <Printer className="h-3.5 w-3.5" /> طباعة
            </Button>
          </div>
        </div>

        {/* إعدادات التقرير */}
        {showSettings && (
          <div className="no-print grid gap-3 border-b bg-card px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">اسم الشركة</span>
              <input
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="h-8 w-full rounded-lg border bg-background px-2 text-right text-xs"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">عنوان التقرير</span>
              <input
                value={settings.reportTitle}
                onChange={(e) => setSettings({ ...settings, reportTitle: e.target.value })}
                className="h-8 w-full rounded-lg border bg-background px-2 text-right text-xs"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">حجم الخط ({settings.fontSize}px)</span>
              <input
                type="range"
                min={8}
                max={14}
                value={settings.fontSize}
                onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                className="w-full"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">الهوامش ({settings.margin}mm)</span>
              <input
                type="range"
                min={6}
                max={25}
                value={settings.margin}
                onChange={(e) => setSettings({ ...settings, margin: Number(e.target.value) })}
                className="w-full"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">حجم الورق</span>
              <select
                value={settings.paper}
                onChange={(e) => setSettings({ ...settings, paper: e.target.value as ReportSettings["paper"] })}
                className="h-8 w-full rounded-lg border bg-background px-2 text-right text-xs"
              >
                <option value="a4">A4 (210×297mm)</option>
                <option value="letter">Letter</option>
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">اتجاه الصفحة</span>
              <select
                value={settings.orientation}
                onChange={(e) => setSettings({ ...settings, orientation: e.target.value as ReportSettings["orientation"] })}
                className="h-8 w-full rounded-lg border bg-background px-2 text-right text-xs"
              >
                <option value="portrait">طولي</option>
                <option value="landscape">عرضي</option>
              </select>
            </label>
            {(
              [
                ["showLogo", "شعار الشركة"],
                ["showOpening", "الرصيد السابق"],
                ["showDisbursed", "إجمالي المنصرف"],
                ["showSignatures", "التوقيعات"],
                ["showDocumentNumber", "عمود المستند"],
                ["showType", "عمود نوع الحركة"],
              ] as [keyof ReportSettings, string][]
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-xs">
                <span>{label}</span>
                <Switch
                  checked={Boolean(settings[key])}
                  onCheckedChange={(v) => setSettings({ ...settings, [key]: v } as ReportSettings)}
                />
              </div>
            ))}
          </div>
        )}

        {!balanced && (
          <div className="no-print border-b bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">
            كشف غير متوازن — تم تعطيل الطباعة والتصدير حتى تصحيح الحركات.
          </div>
        )}

        <div className="stmt-scroll max-h-[76vh] overflow-auto bg-muted/30 p-4">
          <div
            ref={pagesRef}
            className="stmt-zoom mx-auto flex flex-col items-center gap-4"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center", width: `${pageW}mm` }}
          >
            {pages.map((pageRows, pageIndex) => (
              <div
                key={pageIndex}
                data-a4-page
                dir="rtl"
                className="relative bg-white text-slate-900 shadow-lg"
                style={{
                  width: `${pageW}mm`,
                  minHeight: `${pageH}mm`,
                  padding: `${settings.margin}mm`,
                  fontFamily: "Cairo, sans-serif",
                  fontSize: `${settings.fontSize}px`,
                  boxSizing: "border-box",
                }}
              >
                <Header />
                {pageIndex === 0 && <InfoGrid />}

                {pageIndex === 0 && settings.showOpening && (
                  <div className="mt-2 rounded border border-slate-300 bg-slate-100 px-3 py-1.5 text-[11px] font-bold">
                    الرصيد السابق: <span className="font-mono">{formatMoneySar(t.openingBalance)}</span>
                  </div>
                )}

                <table className="mt-2 w-full border-collapse text-center" style={{ fontSize: `${settings.fontSize - 1}px` }}>
                  <TableHead />
                  <tbody>
                    {pageRows.map((row) => (
                      <tr key={row.id} className="even:bg-slate-50">
                        <td className="border border-slate-300 px-1 py-[3px] font-mono">{formatDateAr(row.date)}</td>
                        {settings.showDocumentNumber && (
                          <td className="border border-slate-300 px-1 py-[3px] font-mono" dir="ltr">
                            {row.documentNumber}
                          </td>
                        )}
                        {settings.showType && (
                          <td className="border border-slate-300 px-1 py-[3px]">{TXN_TYPE_LABELS[row.type]}</td>
                        )}
                        <td className="border border-slate-300 px-1 py-[3px] text-right">{row.description}</td>
                        <td className="border border-slate-300 px-1 py-[3px] font-mono" dir="ltr">
                          {row.debit ? formatMoneySar(row.debit) : "—"}
                        </td>
                        <td className="border border-slate-300 px-1 py-[3px] font-mono" dir="ltr">
                          {row.credit ? formatMoneySar(row.credit) : "—"}
                        </td>
                        <td className="border border-slate-300 px-1 py-[3px] font-mono font-bold" dir="ltr">
                          {formatMoneySar(row.balance)}
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={cols} className="border border-slate-300 py-6 text-slate-500">
                          لا توجد حركات في الفترة المحددة
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {pageIndex === pages.length - 1 && (
                    <tfoot>
                      <tr className="bg-slate-200 font-extrabold">
                        <td className="border border-slate-300 px-1 py-1" colSpan={cols - 3}>
                          الإجماليات
                        </td>
                        <td className="border border-slate-300 px-1 py-1 font-mono" dir="ltr">
                          {formatMoneySar(t.debit)}
                        </td>
                        <td className="border border-slate-300 px-1 py-1 font-mono" dir="ltr">
                          {formatMoneySar(t.credit)}
                        </td>
                        <td className="border border-slate-300 px-1 py-1 font-mono" dir="ltr">
                          {formatMoneySar(t.closingBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {pageIndex === pages.length - 1 && (
                  <>
                    <div className="mt-3 grid grid-cols-5 gap-1 text-[10px]">
                      {[
                        ["الرصيد السابق", t.openingBalance],
                        ["إجمالي المدين", t.debit],
                        ["إجمالي الدائن", t.credit],
                        ...(settings.showDisbursed ? ([["إجمالي المنصرف", t.disbursed]] as [string, number][]) : []),
                        ["الرصيد الختامي", t.closingBalance],
                      ].map(([label, value]) => (
                        <div key={label as string} className="rounded border border-slate-300 px-2 py-1 text-center">
                          <p className="text-slate-500">{label as string}</p>
                          <p className="font-mono font-bold" dir="ltr">
                            {formatMoneySar(value as number)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {settings.showSignatures && (
                      <div className="mt-6 grid grid-cols-3 gap-4 text-center text-[10px]">
                        {["إعداد", "مراجعة", "اعتماد"].map((s) => (
                          <div key={s}>
                            <p className="font-bold">{s}</p>
                            <p className="mt-6 border-t border-slate-400 pt-1 text-slate-500">الاسم والتوقيع</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div
                  className={cn("absolute right-0 left-0 text-center text-[9px] text-slate-500")}
                  style={{ bottom: `${Math.max(4, settings.margin / 2)}mm` }}
                >
                  صفحة {pageIndex + 1} من {pages.length} — {settings.companyName}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeStatementPrintView;
