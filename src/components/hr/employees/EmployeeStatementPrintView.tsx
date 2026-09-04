import { useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, Minus, Plus, Printer, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateAr, formatMoneySar } from "@/lib/advances";
import { EmployeeAccount, LEDGER_SOURCE_LABELS } from "@/hooks/useEmployeeAccount";
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
  companyName?: string;
}

export const EmployeeStatementPrintView = ({
  open,
  onOpenChange,
  employee,
  account,
  companyName = "شركة رمال",
}: Props) => {
  const [zoom, setZoom] = useState(1);
  const pageRef = useRef<HTMLDivElement>(null);

  const setStep = (dir: 1 | -1) => {
    const idx = ZOOM_STEPS.findIndex((z) => z >= zoom - 0.001);
    setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, idx + dir))]);
  };

  const handleExportPdf = async () => {
    if (!pageRef.current || !employee) return;
    try {
      toast({ title: "جارٍ تصدير PDF..." });
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const canvas = await html2canvas(pageRef.current, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(`كشف-حساب-${employee.name}.pdf`);
      toast({ title: "تم تصدير PDF" });
    } catch {
      toast({ title: "فشل تصدير PDF", variant: "destructive" });
    }
  };

  if (!employee || !account) return null;

  const t = account.totals;
  const allowances =
    Number(employee.housing_allowance ?? 0) +
    Number(employee.transport_allowance ?? 0) +
    Number(employee.other_allowances ?? 0);
  const basic = Number(employee.salary ?? 0);
  const netSalary = basic + allowances + t.extrasTotal - t.deductionsThisMonth;
  const docNumber = `EMP-STMT-${employee.id.slice(0, 6).toUpperCase()}`;

  let running = t.openingBalance;

  const infoCell = (label: string, value: string) => (
    <div className="flex gap-1 border-b border-sky-100 py-[3px] text-[9pt]">
      <span className="min-w-[80px] font-semibold text-sky-800">{label}:</span>
      <span className="text-slate-700">{value || "-"}</span>
    </div>
  );

  const summaryCell = (label: string, value: string, tone = "text-sky-900") => (
    <div className="rounded-md border border-sky-100 bg-sky-50/60 px-2 py-1.5 text-center">
      <div className="text-[7.5pt] text-slate-600">{label}</div>
      <div className={`text-[10pt] font-bold ${tone}`}>{value}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[95vh] max-w-[95vw] gap-0 overflow-hidden p-0" dir="rtl">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .emp-print-portal, .emp-print-portal * { visibility: visible !important; }
            .emp-print-portal {
              position: fixed !important; inset: 0 !important; margin: 0 !important;
              transform: none !important; box-shadow: none !important;
            }
            .emp-no-print { display: none !important; }
            @page { size: A4 portrait; margin: 0; }
          }
        `}</style>

        <div className="emp-no-print flex items-center justify-between gap-2 border-b bg-sky-50/70 px-4 py-2">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => window.print()} className="gap-1 bg-sky-600 hover:bg-sky-700">
              <Printer className="h-4 w-4" /> طباعة
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportPdf} className="gap-1">
              <FileDown className="h-4 w-4" /> تصدير PDF
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setStep(-1)} aria-label="تصغير">
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-14 text-center text-sm font-medium">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="ghost" onClick={() => setStep(1)} aria-label="تكبير">
              <Plus className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)} aria-label="إغلاق">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-6">
          <div className="mx-auto" style={{ width: `${210 * zoom}mm`, transition: "width 120ms ease" }}>
            <div
              ref={pageRef}
              className="emp-print-portal origin-top bg-white shadow-lg ring-1 ring-slate-300"
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "12mm 10mm",
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                fontFamily: "Cairo, sans-serif",
                direction: "rtl",
              }}
            >
              {/* الترويسة */}
              <div className="flex items-start justify-between border-b-2 border-sky-700 pb-2">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="شعار الشركة" className="h-14 w-14 object-contain" />
                  <div>
                    <div className="text-[14pt] font-bold text-sky-900">{companyName}</div>
                    <div className="text-[8.5pt] text-slate-500">إدارة الموارد البشرية والرواتب</div>
                  </div>
                </div>
                <div className="text-left text-[8.5pt] text-slate-600">
                  <div className="mb-1 rounded bg-sky-700 px-3 py-1 text-center text-[11pt] font-bold text-white">
                    كشف حساب الموظف
                  </div>
                  <div>رقم المستند: {docNumber}</div>
                  <div>تاريخ الطباعة: {formatDateAr(new Date().toISOString())}</div>
                </div>
              </div>

              {/* بيانات الموظف */}
              <div className="mt-3 grid grid-cols-2 gap-x-6">
                <div>
                  {infoCell("اسم الموظف", employee.name)}
                  {infoCell("الرقم الوظيفي", employee.employee_number || "-")}
                  {infoCell("القسم", employee.department || "-")}
                </div>
                <div>
                  {infoCell("المسمى الوظيفي", employee.position || "-")}
                  {infoCell("تاريخ التعيين", formatDateAr(employee.hire_date))}
                  {infoCell("الحالة", (employee.status ?? "active") === "active" ? "نشط" : "غير نشط")}
                </div>
              </div>

              {/* ملخص */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {summaryCell("رصيد أول المدة", formatMoneySar(t.openingBalance))}
                {summaryCell("إجمالي السلف", formatMoneySar(t.advancesTotal))}
                {summaryCell("السلف المخصومة", formatMoneySar(t.advancesPayrollDeducted), "text-emerald-700")}
                {summaryCell("المتبقي من السلف", formatMoneySar(t.advancesRemaining), "text-rose-700")}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {summaryCell("الراتب الأساسي", formatMoneySar(basic))}
                {summaryCell("البدلات", formatMoneySar(allowances))}
                {summaryCell("الإضافي والمكافآت", formatMoneySar(t.extrasTotal), "text-emerald-700")}
                {summaryCell("صافي الراتب المستحق", formatMoneySar(netSalary), "text-sky-900")}
              </div>

              {/* الحركات */}
              <div className="mt-4">
                <div className="mb-1 text-[10pt] font-bold text-sky-900">حركات الموظف المالية</div>
                <table className="w-full border-collapse text-[8.5pt]">
                  <thead>
                    <tr className="bg-sky-700 text-white">
                      <th className="border border-sky-800 px-1 py-1">م</th>
                      <th className="border border-sky-800 px-1 py-1">التاريخ</th>
                      <th className="border border-sky-800 px-1 py-1">رقم المستند</th>
                      <th className="border border-sky-800 px-1 py-1">المصدر</th>
                      <th className="border border-sky-800 px-1 py-1">البيان</th>
                      <th className="border border-sky-800 px-1 py-1">مدين</th>
                      <th className="border border-sky-800 px-1 py-1">دائن</th>
                      <th className="border border-sky-800 px-1 py-1">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-slate-50 font-semibold">
                      <td className="border border-slate-200 px-1 py-1 text-center">-</td>
                      <td className="border border-slate-200 px-1 py-1 text-center">-</td>
                      <td className="border border-slate-200 px-1 py-1 text-center">-</td>
                      <td className="border border-slate-200 px-1 py-1 text-center">-</td>
                      <td className="border border-slate-200 px-1 py-1">رصيد أول المدة</td>
                      <td className="border border-slate-200 px-1 py-1 text-center">-</td>
                      <td className="border border-slate-200 px-1 py-1 text-center">-</td>
                      <td className="border border-slate-200 px-1 py-1 text-center">
                        {formatMoneySar(t.openingBalance)}
                      </td>
                    </tr>
                    {account.ledger.map((row, i) => {
                      running += row.effect * (row.debit || row.credit);
                      return (
                        <tr key={row.id} className={i % 2 ? "bg-sky-50/40" : ""}>
                          <td className="border border-slate-200 px-1 py-1 text-center">{i + 1}</td>
                          <td className="border border-slate-200 px-1 py-1 text-center">{formatDateAr(row.date)}</td>
                          <td className="border border-slate-200 px-1 py-1 text-center">{row.documentNumber}</td>
                          <td className="border border-slate-200 px-1 py-1 text-center">
                            {LEDGER_SOURCE_LABELS[row.source]}
                          </td>
                          <td className="border border-slate-200 px-1 py-1">{row.description}</td>
                          <td className="border border-slate-200 px-1 py-1 text-center">
                            {row.debit ? formatMoneySar(row.debit) : "-"}
                          </td>
                          <td className="border border-slate-200 px-1 py-1 text-center">
                            {row.credit ? formatMoneySar(row.credit) : "-"}
                          </td>
                          <td className="border border-slate-200 px-1 py-1 text-center font-semibold">
                            {formatMoneySar(running)}
                          </td>
                        </tr>
                      );
                    })}
                    {account.ledger.length === 0 && (
                      <tr>
                        <td colSpan={8} className="border border-slate-200 px-2 py-6 text-center text-slate-500">
                          لا توجد حركات مالية مسجلة
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-sky-100 font-bold text-sky-900">
                      <td colSpan={5} className="border border-sky-200 px-2 py-1 text-center">
                        الإجماليات
                      </td>
                      <td className="border border-sky-200 px-1 py-1 text-center">{formatMoneySar(t.debit)}</td>
                      <td className="border border-sky-200 px-1 py-1 text-center">{formatMoneySar(t.credit)}</td>
                      <td className="border border-sky-200 px-1 py-1 text-center">{formatMoneySar(t.balance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* تفاصيل الخصومات والإضافي */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-[8.5pt]">
                <div className="rounded-md border border-rose-100 bg-rose-50/50 p-2">
                  <div className="font-bold text-rose-800">الخصومات</div>
                  <div className="mt-1 flex justify-between">
                    <span>خصومات الشهر</span>
                    <span className="font-semibold">{formatMoneySar(t.deductionsThisMonth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>خصومات سابقة</span>
                    <span className="font-semibold">{formatMoneySar(t.deductionsPrevious)}</span>
                  </div>
                  <div className="flex justify-between border-t border-rose-200 pt-1">
                    <span>الإجمالي التراكمي</span>
                    <span className="font-bold">{formatMoneySar(t.deductionsTotal)}</span>
                  </div>
                </div>
                <div className="rounded-md border border-emerald-100 bg-emerald-50/50 p-2">
                  <div className="font-bold text-emerald-800">الإضافي والبدلات</div>
                  <div className="mt-1 flex justify-between">
                    <span>الإضافي</span>
                    <span className="font-semibold">{formatMoneySar(t.overtimeTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>البدلات</span>
                    <span className="font-semibold">{formatMoneySar(t.allowancesTotal + allowances)}</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200 pt-1">
                    <span>المكافآت</span>
                    <span className="font-bold">{formatMoneySar(t.bonusTotal)}</span>
                  </div>
                </div>
                <div className="rounded-md border border-sky-100 bg-sky-50/50 p-2">
                  <div className="font-bold text-sky-900">الرصيد النهائي</div>
                  <div className="mt-1 flex justify-between">
                    <span>إجمالي المدين</span>
                    <span className="font-semibold">{formatMoneySar(t.debit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>إجمالي الدائن</span>
                    <span className="font-semibold">{formatMoneySar(t.credit)}</span>
                  </div>
                  <div className="flex justify-between border-t border-sky-200 pt-1">
                    <span>رصيد الموظف النهائي</span>
                    <span className="font-bold">{formatMoneySar(t.balance)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-6 text-center text-[8.5pt] text-slate-600">
                <div className="border-t border-slate-300 pt-1">إعداد الموارد البشرية</div>
                <div className="border-t border-slate-300 pt-1">المراجعة المالية</div>
                <div className="border-t border-slate-300 pt-1">الاعتماد</div>
              </div>
              <div className="mt-3 text-center text-[7.5pt] text-slate-400">
                {companyName} — كشف حساب الموظف {employee.name} — مستند مُصدر آليًا من النظام
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeStatementPrintView;
