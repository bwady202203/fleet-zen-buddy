import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Maximize2,
  Minus,
  Plus,
  Printer,
  FileDown,
  Share2,
  StretchHorizontal,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  ADVANCE_STATUS_LABELS,
  ADVANCE_TYPE_LABELS,
  AdvanceRecord,
  FREQUENCY_LABELS,
  INSTALLMENT_STATUS_LABELS,
  InstallmentRecord,
  formatDateAr,
  formatMoneySar,
} from "@/lib/advances";
import logo from "@/assets/wizer-logo.png";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advance: AdvanceRecord | null;
  installments: InstallmentRecord[];
  companyName?: string;
}

export const AdvanceVoucherPreview = ({
  open,
  onOpenChange,
  advance,
  installments,
  companyName = "شركة رمال",
}: Props) => {
  const [zoom, setZoom] = useState(1);
  const pageRef = useRef<HTMLDivElement>(null);

  const totals = useMemo(() => {
    const paid = installments.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    return { paid, remaining: Math.max(0, (advance?.amount ?? 0) - paid) };
  }, [installments, advance]);

  const setStep = (dir: 1 | -1) => {
    const idx = ZOOM_STEPS.findIndex((z) => z >= zoom - 0.001);
    const next = Math.min(ZOOM_STEPS.length - 1, Math.max(0, idx + dir));
    setZoom(ZOOM_STEPS[next]);
  };

  const handlePrint = () => window.print();

  const handleExportPdf = async () => {
    if (!pageRef.current || !advance) return;
    try {
      toast({ title: "جارٍ تصدير PDF..." });
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const canvas = await html2canvas(pageRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(`سند-سلفة-${advance.advance_number}.pdf`);
      toast({ title: "تم تصدير PDF" });
    } catch {
      toast({ title: "فشل تصدير PDF", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!advance) return;
    const text = `سند سلفة ${advance.advance_number} — ${advance.employee_name} — ${formatMoneySar(
      advance.amount
    )} على ${advance.installments_count} أقساط`;
    try {
      if (navigator.share) await navigator.share({ title: "سند سلفة", text });
      else {
        await navigator.clipboard.writeText(text);
        toast({ title: "تم نسخ ملخص السند" });
      }
    } catch {
      /* المستخدم ألغى المشاركة */
    }
  };

  if (!advance) return null;

  const infoRow = (label: string, value: string) => (
    <div className="flex gap-1 border-b border-sky-100 py-[3px] text-[9pt]">
      <span className="min-w-[95px] font-semibold text-sky-800">{label}:</span>
      <span className="text-slate-700">{value || "-"}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] h-[95vh] p-0 gap-0 overflow-hidden advance-preview-dialog"
        dir="rtl"
      >
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .advance-print-portal, .advance-print-portal * { visibility: visible !important; }
            .advance-print-portal {
              position: fixed !important; inset: 0 !important; margin: 0 !important;
              transform: none !important; box-shadow: none !important;
            }
            .advance-no-print { display: none !important; }
            @page { size: A4 portrait; margin: 0; }
          }
        `}</style>

        <div className="advance-no-print flex items-center justify-between gap-2 border-b bg-sky-50/70 px-4 py-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1">
              <Printer className="h-4 w-4" /> طباعة
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportPdf} className="gap-1">
              <FileDown className="h-4 w-4" /> تصدير PDF
            </Button>
            <Button size="sm" variant="outline" onClick={handleShare} className="gap-1">
              <Share2 className="h-4 w-4" /> مشاركة
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
            <Button size="sm" variant="ghost" onClick={() => setZoom(1.25)} className="gap-1">
              <StretchHorizontal className="h-4 w-4" /> ملء العرض
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setZoom(0.75)} className="gap-1">
              <Maximize2 className="h-4 w-4" /> ملء الصفحة
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-6">
          <div
            className="mx-auto"
            style={{
              width: `${210 * zoom}mm`,
              transition: "width 120ms ease",
            }}
          >
            <div
              ref={pageRef}
              className="advance-print-portal origin-top bg-white shadow-lg ring-1 ring-slate-300"
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "14mm 12mm",
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                fontFamily: "Cairo, sans-serif",
              }}
            >
              {/* الترويسة */}
              <div className="flex items-start justify-between border-b-2 border-sky-500 pb-3">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="شعار الشركة" className="h-14 w-14 object-contain" />
                  <div>
                    <div className="text-[14pt] font-bold text-sky-900">{companyName}</div>
                    <div className="text-[9pt] text-slate-500">إدارة الموارد البشرية</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="rounded-md bg-sky-50 px-4 py-2 text-[13pt] font-bold text-sky-800">
                    سند سلفة موظف
                  </div>
                  <div className="mt-2 text-[9pt] text-slate-600">
                    رقم السند: <span className="font-bold text-sky-900">{advance.advance_number}</span>
                  </div>
                  <div className="text-[9pt] text-slate-600">
                    التاريخ: <span className="font-semibold">{formatDateAr(advance.advance_date)}</span>
                  </div>
                  <div className="text-[9pt] text-slate-600">
                    الحالة:{" "}
                    <span className="font-semibold">{ADVANCE_STATUS_LABELS[advance.status]}</span>
                  </div>
                </div>
              </div>

              {/* بيانات الموظف */}
              <div className="mt-4">
                <div className="mb-1 rounded bg-sky-100/70 px-3 py-1 text-[10pt] font-bold text-sky-900">
                  بيانات الموظف
                </div>
                <div className="grid grid-cols-2 gap-x-6">
                  {infoRow("اسم الموظف", advance.employee_name ?? "")}
                  {infoRow("رقم الموظف", advance.employee_number ?? "")}
                  {infoRow("القسم", advance.department ?? "")}
                  {infoRow("المسمى الوظيفي", advance.position ?? "")}
                  {infoRow("رقم الهوية / الإقامة", advance.residence_number ?? "")}
                  {infoRow("الراتب الأساسي", formatMoneySar(advance.basic_salary))}
                  {infoRow("البنك", advance.bank_name ?? "")}
                  {infoRow("رقم الحساب", advance.bank_account_number ?? "")}
                </div>
              </div>

              {/* بيانات السلفة */}
              <div className="mt-4">
                <div className="mb-1 rounded bg-sky-100/70 px-3 py-1 text-[10pt] font-bold text-sky-900">
                  بيانات السلفة
                </div>
                <div className="grid grid-cols-2 gap-x-6">
                  {infoRow("مبلغ السلفة", formatMoneySar(advance.amount))}
                  {infoRow("نوع السلفة", ADVANCE_TYPE_LABELS[advance.advance_type] ?? advance.advance_type)}
                  {infoRow("سبب السلفة", advance.reason ?? "")}
                  {infoRow("دورية السداد", FREQUENCY_LABELS[advance.frequency])}
                  {infoRow("عدد الأقساط", String(advance.installments_count))}
                  {infoRow("قيمة القسط", formatMoneySar(advance.installment_amount))}
                  {infoRow("تاريخ أول قسط", formatDateAr(advance.first_installment_date))}
                  {infoRow("تاريخ آخر قسط", formatDateAr(advance.last_installment_date))}
                  {infoRow("إجمالي المسدد", formatMoneySar(totals.paid))}
                  {infoRow("المبلغ المتبقي", formatMoneySar(totals.remaining))}
                </div>
              </div>

              {/* جدول الأقساط */}
              <div className="mt-4">
                <div className="mb-1 rounded bg-sky-100/70 px-3 py-1 text-[10pt] font-bold text-sky-900">
                  جدول الأقساط
                </div>
                <table className="w-full border-collapse text-[9pt]">
                  <thead>
                    <tr className="bg-sky-50 text-sky-900">
                      <th className="border border-sky-200 px-2 py-1">رقم القسط</th>
                      <th className="border border-sky-200 px-2 py-1">تاريخ الاستحقاق</th>
                      <th className="border border-sky-200 px-2 py-1">قيمة القسط</th>
                      <th className="border border-sky-200 px-2 py-1">المسدد</th>
                      <th className="border border-sky-200 px-2 py-1">المتبقي</th>
                      <th className="border border-sky-200 px-2 py-1">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((i) => (
                      <tr key={i.id} className="text-center" style={{ breakInside: "avoid" }}>
                        <td className="border border-sky-100 px-2 py-1">{i.installment_number}</td>
                        <td className="border border-sky-100 px-2 py-1">{formatDateAr(i.due_date)}</td>
                        <td className="border border-sky-100 px-2 py-1">
                          {Number(i.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border border-sky-100 px-2 py-1">
                          {Number(i.paid_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border border-sky-100 px-2 py-1">
                          {Number(i.remaining_after).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="border border-sky-100 px-2 py-1">
                          {INSTALLMENT_STATUS_LABELS[i.status]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {advance.notes ? (
                <div className="mt-3 text-[9pt] text-slate-600">
                  <span className="font-semibold text-sky-800">ملاحظات: </span>
                  {advance.notes}
                </div>
              ) : null}

              {/* التعهد */}
              <div className="mt-4 rounded-md border border-sky-200 bg-sky-50/60 p-3 text-[9.5pt] leading-6 text-slate-700">
                <span className="font-bold text-sky-900">التعهد: </span>
                أقر أنا الموظف الموضح بياناته أعلاه باستلام مبلغ السلفة، وأوافق على خصم الأقساط المحددة
                من رواتبي وفقًا لجدول السداد المعتمد.
              </div>

              {/* التوقيعات */}
              <div className="mt-8 grid grid-cols-4 gap-4 text-center text-[9pt] text-slate-700">
                {["توقيع الموظف", "توقيع المسؤول", "اعتماد الإدارة", "التاريخ"].map((s) => (
                  <div key={s}>
                    <div className="mb-6 font-semibold text-sky-900">{s}</div>
                    <div className="border-t border-slate-400 pt-1">&nbsp;</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-sky-100 pt-2 text-center text-[8pt] text-slate-400">
                {companyName} — سند سلفة رقم {advance.advance_number} — تم إنشاء السند بواسطة النظام
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvanceVoucherPreview;
