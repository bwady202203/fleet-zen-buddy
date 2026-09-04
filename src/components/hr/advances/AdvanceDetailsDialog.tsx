import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Pencil,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  ADVANCE_STATUS_CLASSES,
  ADVANCE_STATUS_LABELS,
  ADVANCE_TYPE_LABELS,
  AUDIT_ACTION_LABELS,
  AdvanceRecord,
  INSTALLMENT_STATUS_CLASSES,
  INSTALLMENT_STATUS_LABELS,
  InstallmentRecord,
  formatDateAr,
  formatMoneySar,
  round2,
} from "@/lib/advances";
import { useAdvanceDetails, useAdvanceMutations } from "@/hooks/useAdvances";

interface Props {
  advance: AdvanceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreview: (advance: AdvanceRecord, installments: InstallmentRecord[]) => void;
  permissions: {
    canApprove: boolean;
    canCancel: boolean;
    canPay: boolean;
    canEdit: boolean;
  };
}

export const AdvanceDetailsDialog = ({
  advance,
  open,
  onOpenChange,
  onPreview,
  permissions,
}: Props) => {
  const { data, isLoading } = useAdvanceDetails(advance?.id);
  const { setStatus, payInstallment, earlyPayoff, requestEdit } = useAdvanceMutations();
  const [reason, setReason] = useState("");
  const [payDialog, setPayDialog] = useState<InstallmentRecord | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payrollRef, setPayrollRef] = useState("");
  const [carryOver, setCarryOver] = useState(false);

  if (!advance) return null;
  const installments = data?.installments ?? [];
  const paidCount = installments.filter((i) => ["deducted", "paid"].includes(i.status)).length;

  const guardedAction = async (fn: () => Promise<unknown>, successTitle: string) => {
    try {
      await fn();
      toast({ title: successTitle });
    } catch (e) {
      toast({
        title: "تعذر تنفيذ العملية",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  const openPay = (inst: InstallmentRecord) => {
    const remaining = round2(inst.amount - inst.paid_amount);
    setPayDialog(inst);
    setPayAmount(String(remaining));
    setPayrollRef(`PAY-${inst.due_date.slice(0, 7)}`);
    setCarryOver(false);
  };

  const stat = (label: string, value: string) => (
    <div className="rounded-lg border border-sky-100 bg-sky-50/50 px-3 py-2">
      <div className="text-[11px] text-sky-700">{label}</div>
      <div className="text-sm font-bold text-slate-800">{value}</div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3 text-lg text-sky-900">
              <FileText className="h-5 w-5" />
              سند سلفة {advance.advance_number}
              <Badge variant="outline" className={ADVANCE_STATUS_CLASSES[advance.status]}>
                {ADVANCE_STATUS_LABELS[advance.status]}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stat("الموظف", advance.employee_name ?? "-")}
            {stat("المبلغ الأصلي", formatMoneySar(advance.amount))}
            {stat("المسدد", formatMoneySar(advance.paid_amount))}
            {stat("المتبقي", formatMoneySar(advance.remaining_amount))}
            {stat("الأقساط المسددة", `${paidCount} / ${advance.installments_count}`)}
            {stat("قيمة القسط", formatMoneySar(advance.installment_amount))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 border-sky-200"
              onClick={() => onPreview(advance, installments)}
            >
              <Eye className="h-4 w-4" /> معاينة السند
            </Button>
            {permissions.canApprove && ["draft", "pending"].includes(advance.status) && (
              <>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() =>
                    guardedAction(
                      () => setStatus.mutateAsync({ advance, status: "approved" }),
                      "تم اعتماد السلفة وتفعيل جدول الخصومات"
                    )
                  }
                >
                  <CheckCircle2 className="h-4 w-4" /> اعتماد السلفة
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-rose-200 text-rose-700"
                  onClick={() =>
                    guardedAction(
                      () =>
                        setStatus.mutateAsync({
                          advance,
                          status: "rejected",
                          reason: reason || "بدون سبب",
                        }),
                      "تم رفض السلفة"
                    )
                  }
                >
                  <XCircle className="h-4 w-4" /> رفض السلفة
                </Button>
              </>
            )}
            {permissions.canPay && advance.status === "approved" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-emerald-200 text-emerald-700"
                onClick={() =>
                  guardedAction(() => earlyPayoff.mutateAsync({ advance }), "تم تسجيل السداد المبكر")
                }
              >
                <Zap className="h-4 w-4" /> سداد مبكر
              </Button>
            )}
            {permissions.canCancel && !["cancelled", "completed"].includes(advance.status) && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-slate-300 text-slate-600"
                onClick={() =>
                  guardedAction(
                    () =>
                      setStatus.mutateAsync({
                        advance,
                        status: "cancelled",
                        reason: reason || "بدون سبب",
                      }),
                    "تم إلغاء السلفة مع الاحتفاظ بالسجل"
                  )
                }
              >
                <Ban className="h-4 w-4" /> إلغاء السلفة
              </Button>
            )}
            {permissions.canEdit && advance.status === "approved" && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1"
                onClick={() => {
                  if (
                    window.confirm("السلفة معتمدة بالفعل، هل تريد إنشاء طلب تعديل؟")
                  ) {
                    guardedAction(
                      () =>
                        requestEdit.mutateAsync({
                          advance,
                          reason: reason || "طلب تعديل على سلفة معتمدة",
                        }),
                      "تم تسجيل طلب التعديل في سجل التدقيق"
                    );
                  }
                }}
              >
                <Pencil className="h-4 w-4" /> طلب تعديل
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">سبب الرفض / الإلغاء / التعديل (اختياري)</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <Tabs defaultValue="installments" dir="rtl">
            <TabsList>
              <TabsTrigger value="installments">جدول الأقساط</TabsTrigger>
              <TabsTrigger value="info">بيانات السلفة</TabsTrigger>
              <TabsTrigger value="timeline">الجدول الزمني</TabsTrigger>
              <TabsTrigger value="audit">سجل العمليات</TabsTrigger>
            </TabsList>

            <TabsContent value="installments">
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-sky-100">
                  <table className="w-full text-sm">
                    <thead className="bg-sky-50/70 text-sky-900">
                      <tr>
                        <th className="px-3 py-2 text-right">رقم القسط</th>
                        <th className="px-3 py-2 text-right">تاريخ الاستحقاق</th>
                        <th className="px-3 py-2 text-right">قيمة القسط</th>
                        <th className="px-3 py-2 text-right">المسدد</th>
                        <th className="px-3 py-2 text-right">المتبقي</th>
                        <th className="px-3 py-2 text-right">الحالة</th>
                        <th className="px-3 py-2 text-right">كشف الراتب</th>
                        <th className="px-3 py-2 text-right">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((i) => (
                        <tr key={i.id} className="border-t border-sky-50">
                          <td className="px-3 py-2">{i.installment_number}</td>
                          <td className="px-3 py-2">{formatDateAr(i.due_date)}</td>
                          <td className="px-3 py-2">{formatMoneySar(i.amount)}</td>
                          <td className="px-3 py-2">{formatMoneySar(i.paid_amount)}</td>
                          <td className="px-3 py-2">{formatMoneySar(i.remaining_after)}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={INSTALLMENT_STATUS_CLASSES[i.status]}>
                              {INSTALLMENT_STATUS_LABELS[i.status]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {i.payroll_reference ?? "-"}
                          </td>
                          <td className="px-3 py-2">
                            {permissions.canPay &&
                            advance.status === "approved" &&
                            !["deducted", "paid", "cancelled"].includes(i.status) ? (
                              <Button size="sm" variant="outline" className="gap-1 border-sky-200" onClick={() => openPay(i)}>
                                <Wallet className="h-3.5 w-3.5" /> تسجيل سداد
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="info">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["رقم الموظف", advance.employee_number ?? "-"],
                  ["القسم", advance.department ?? "-"],
                  ["المسمى الوظيفي", advance.position ?? "-"],
                  ["رقم الهوية / الإقامة", advance.residence_number ?? "-"],
                  ["البنك", advance.bank_name ?? "-"],
                  ["رقم الحساب", advance.bank_account_number ?? "-"],
                  ["نوع السلفة", ADVANCE_TYPE_LABELS[advance.advance_type] ?? advance.advance_type],
                  ["سبب السلفة", advance.reason ?? "-"],
                  ["تاريخ أول قسط", formatDateAr(advance.first_installment_date)],
                  ["تاريخ آخر قسط", formatDateAr(advance.last_installment_date)],
                  ["الراتب الأساسي", formatMoneySar(advance.basic_salary)],
                  ["ملاحظات", advance.notes ?? "-"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-sky-100 px-3 py-2">
                    <div className="text-[11px] text-sky-700">{label}</div>
                    <div className="text-sm text-slate-800">{value}</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <ol className="relative space-y-4 border-r-2 border-sky-100 pr-4">
                {(data?.logs ?? []).map((log) => (
                  <li key={log.id} className="relative">
                    <span className="absolute -right-[22px] top-1 h-3 w-3 rounded-full bg-sky-400" />
                    <div className="text-sm font-semibold text-sky-900">
                      {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("ar-SA")} — {log.user_email ?? "النظام"}
                    </div>
                    {log.description ? (
                      <div className="text-xs text-slate-600">{log.description}</div>
                    ) : null}
                  </li>
                ))}
                {(data?.logs ?? []).length === 0 && (
                  <li className="text-sm text-muted-foreground">لا توجد أحداث بعد</li>
                )}
              </ol>
            </TabsContent>

            <TabsContent value="audit">
              <div className="overflow-x-auto rounded-lg border border-sky-100">
                <table className="w-full text-sm">
                  <thead className="bg-sky-50/70 text-sky-900">
                    <tr>
                      <th className="px-3 py-2 text-right">العملية</th>
                      <th className="px-3 py-2 text-right">الوصف</th>
                      <th className="px-3 py-2 text-right">المستخدم</th>
                      <th className="px-3 py-2 text-right">التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.logs ?? []).map((log) => (
                      <tr key={log.id} className="border-t border-sky-50">
                        <td className="px-3 py-2">{AUDIT_ACTION_LABELS[log.action] ?? log.action}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{log.description ?? "-"}</td>
                        <td className="px-3 py-2 text-xs">{log.user_email ?? "النظام"}</td>
                        <td className="px-3 py-2 text-xs">
                          {new Date(log.created_at).toLocaleString("ar-SA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* تسجيل سداد قسط */}
      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sky-900">
              تسجيل سداد القسط رقم {payDialog?.installment_number}
            </DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-3">
              {Number(payAmount) < round2(payDialog.amount - payDialog.paid_amount) && (
                <div className="flex gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  يوجد قسط سلفة مستحق ولكن صافي الراتب لا يسمح بالخصم الكامل — يمكنك خصم جزء من القسط
                  وترحيل المتبقي للشهر التالي.
                </div>
              )}
              <div className="space-y-1.5">
                <Label>المبلغ المخصوم</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>مرجع كشف الراتب (لمنع الخصم المكرر)</Label>
                <Input value={payrollRef} onChange={(e) => setPayrollRef(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={carryOver}
                  onChange={(e) => setCarryOver(e.target.checked)}
                />
                ترحيل المتبقي من القسط للشهر التالي
              </label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> تاريخ الاستحقاق {formatDateAr(payDialog.due_date)}
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={async () => {
                    await guardedAction(
                      () =>
                        payInstallment.mutateAsync({
                          advance,
                          installment: payDialog,
                          amount: Number(payAmount) || 0,
                          method: "payroll",
                          payrollReference: payrollRef,
                          carryOver,
                        }),
                      "تم تسجيل الخصم من كشف الراتب"
                    );
                    setPayDialog(null);
                  }}
                >
                  خصم من الراتب
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={async () => {
                    await guardedAction(
                      () =>
                        payInstallment.mutateAsync({
                          advance,
                          installment: payDialog,
                          amount: Number(payAmount) || 0,
                          method: "cash",
                        }),
                      "تم تسجيل السداد النقدي"
                    );
                    setPayDialog(null);
                  }}
                >
                  سداد نقدي
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdvanceDetailsDialog;
