import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, Save, ShieldCheck, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  ADVANCE_TYPE_LABELS,
  AdvanceFrequency,
  FREQUENCY_LABELS,
  buildSchedule,
  computeInstallmentAmount,
  formatDateAr,
  formatMoneySar,
  round2,
} from "@/lib/advances";
import { AdvanceEmployee, CreateAdvanceInput, useAdvanceEmployees } from "@/hooks/useAdvances";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateAdvanceInput) => Promise<void>;
  submitting: boolean;
  canApprove: boolean;
}

const today = () => new Date().toISOString().split("T")[0];
const nextMonthFirst = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split("T")[0];
};

export const AdvanceFormDialog = ({ open, onOpenChange, onSubmit, submitting, canApprove }: Props) => {
  const { data: employees, isLoading } = useAdvanceEmployees();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [employee, setEmployee] = useState<AdvanceEmployee | null>(null);
  const [form, setForm] = useState({
    advance_date: today(),
    amount: "",
    reason: "",
    advance_type: "personal",
    installments_count: "5",
    installment_amount: "",
    manualInstallment: false,
    frequency: "monthly" as AdvanceFrequency,
    first_installment_date: nextMonthFirst(),
    notes: "",
  });

  useEffect(() => {
    if (!open) {
      setEmployee(null);
      setForm({
        advance_date: today(),
        amount: "",
        reason: "",
        advance_type: "personal",
        installments_count: "5",
        installment_amount: "",
        manualInstallment: false,
        frequency: "monthly",
        first_installment_date: nextMonthFirst(),
        notes: "",
      });
    }
  }, [open]);

  const amount = Number(form.amount) || 0;
  const count = Math.max(1, Math.floor(Number(form.installments_count) || 1));
  const autoInstallment = computeInstallmentAmount(amount, count);
  const installmentAmount = form.manualInstallment
    ? Number(form.installment_amount) || 0
    : autoInstallment;

  const schedule = useMemo(
    () =>
      amount > 0
        ? buildSchedule(amount, count, form.first_installment_date, form.frequency, installmentAmount)
        : [],
    [amount, count, form.first_installment_date, form.frequency, installmentAmount]
  );

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (status: "draft" | "pending" | "approved") => {
    if (!employee) {
      toast({ title: "اختر الموظف أولًا", variant: "destructive" });
      return;
    }
    if (amount <= 0) {
      toast({ title: "أدخل مبلغ السلفة", variant: "destructive" });
      return;
    }
    if (!schedule.length) {
      toast({ title: "تحقق من جدولة الأقساط", variant: "destructive" });
      return;
    }
    await onSubmit({
      advance_date: form.advance_date,
      employee,
      amount,
      reason: form.reason,
      advance_type: form.advance_type,
      installments_count: count,
      installment_amount: installmentAmount,
      frequency: form.frequency,
      first_installment_date: form.first_installment_date,
      notes: form.notes,
      status,
    });
  };

  const employeeField = (label: string, value: string) => (
    <div className="rounded-md border border-sky-100 bg-white px-3 py-2">
      <div className="text-[11px] text-sky-700">{label}</div>
      <div className="truncate text-sm font-medium text-slate-800">{value || "-"}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-sky-900">إضافة سند سلفة جديد</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* بيانات السند */}
          <section className="rounded-lg border border-sky-100 bg-sky-50/40 p-4">
            <h3 className="mb-3 text-sm font-bold text-sky-900">بيانات السند</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>رقم السند</Label>
                <Input value="يتم توليده تلقائيًا (ADV-XXXXXX)" disabled className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  className="bg-white"
                  value={form.advance_date}
                  onChange={(e) => set("advance_date", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>نوع السلفة</Label>
                <Select value={form.advance_type} onValueChange={(v) => set("advance_type", v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ADVANCE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* بيانات الموظف */}
          <section className="rounded-lg border border-sky-100 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-sky-900">بيانات الموظف</h3>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between border-sky-200"
                >
                  {employee ? `${employee.name} — ${employee.employee_number}` : "ابحث واختر الموظف"}
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(560px,90vw)] p-0" dir="rtl">
                <Command>
                  <CommandInput placeholder="بحث بالاسم أو رقم الموظف..." />
                  <CommandList>
                    <CommandEmpty>لا يوجد موظفون مطابقون</CommandEmpty>
                    <CommandGroup>
                      {(employees ?? []).map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={`${emp.name} ${emp.employee_number} ${emp.department}`}
                          onSelect={() => {
                            setEmployee(emp);
                            setPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "ml-2 h-4 w-4",
                              employee?.id === emp.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="flex-1">{emp.name}</span>
                          <span className="text-xs text-muted-foreground">{emp.employee_number}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {employee ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {employeeField("اسم الموظف", employee.name)}
                {employeeField("رقم الموظف", employee.employee_number)}
                {employeeField("القسم", employee.department)}
                {employeeField("المسمى الوظيفي", employee.position)}
                {employeeField("رقم الهوية / الإقامة", employee.residence_number)}
                {employeeField("اسم البنك", employee.bank_name)}
                {employeeField("رقم الحساب البنكي", employee.bank_account_number)}
                {employeeField("الراتب الأساسي", formatMoneySar(employee.basic_salary))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                يتم جلب بيانات الموظف تلقائيًا من ملفه بعد الاختيار.
              </p>
            )}
          </section>

          {/* بيانات السلفة والجدولة */}
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-lg border border-sky-100 bg-white p-4">
              <h3 className="mb-3 text-sm font-bold text-sky-900">بيانات السلفة</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>مبلغ السلفة (ر.س)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="5000"
                    value={form.amount}
                    onChange={(e) => set("amount", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>سبب السلفة</Label>
                  <Input
                    placeholder="سبب السلفة"
                    value={form.reason}
                    onChange={(e) => set("reason", e.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>عدد الأقساط</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={form.installments_count}
                      onChange={(e) => set("installments_count", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center justify-between">
                      <span>قيمة القسط</span>
                      <button
                        type="button"
                        className="text-[11px] text-sky-700 underline"
                        onClick={() => {
                          set("manualInstallment", !form.manualInstallment);
                          set("installment_amount", String(autoInstallment));
                        }}
                      >
                        {form.manualInstallment ? "حساب تلقائي" : "تعديل يدوي"}
                      </button>
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      disabled={!form.manualInstallment}
                      value={form.manualInstallment ? form.installment_amount : String(autoInstallment)}
                      onChange={(e) => set("installment_amount", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-sky-100 bg-white p-4">
              <h3 className="mb-3 text-sm font-bold text-sky-900">جدولة السداد</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>تاريخ أول قسط</Label>
                  <Input
                    type="date"
                    value={form.first_installment_date}
                    onChange={(e) => set("first_installment_date", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>دورية السداد</Label>
                  <Select
                    value={form.frequency}
                    onValueChange={(v) => set("frequency", v as AdvanceFrequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-sky-50 px-3 py-2">
                  <span className="text-sky-700">عدد الأقساط: </span>
                  <b>{schedule.length || count}</b>
                </div>
                <div className="rounded-md bg-sky-50 px-3 py-2">
                  <span className="text-sky-700">قيمة القسط: </span>
                  <b>{formatMoneySar(installmentAmount)}</b>
                </div>
                <div className="rounded-md bg-sky-50 px-3 py-2">
                  <span className="text-sky-700">أول قسط: </span>
                  <b>{formatDateAr(schedule[0]?.due_date ?? form.first_installment_date)}</b>
                </div>
                <div className="rounded-md bg-sky-50 px-3 py-2">
                  <span className="text-sky-700">آخر قسط: </span>
                  <b>{formatDateAr(schedule[schedule.length - 1]?.due_date ?? null)}</b>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea
                  rows={2}
                  placeholder="ملاحظات اختيارية"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </section>
          </div>

          {/* الملخص المباشر */}
          <section className="grid grid-cols-2 gap-3 rounded-lg border border-sky-200 bg-sky-50/70 p-4 md:grid-cols-5">
            {[
              ["مبلغ السلفة", formatMoneySar(amount)],
              ["القسط", formatMoneySar(installmentAmount)],
              ["عدد الأقساط", String(schedule.length || count)],
              ["إجمالي المسدد", formatMoneySar(0)],
              ["المتبقي", formatMoneySar(round2(amount))],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-white px-3 py-2 text-center">
                <div className="text-[11px] text-sky-700">{label}</div>
                <div className="text-sm font-bold text-slate-800">{value}</div>
              </div>
            ))}
          </section>

          {/* جدول الأقساط المتوقع */}
          {schedule.length > 0 && (
            <section className="rounded-lg border border-sky-100">
              <div className="flex items-center gap-2 border-b bg-sky-50/60 px-4 py-2 text-sm font-bold text-sky-900">
                <Eye className="h-4 w-4" /> جدول الأقساط المتوقع
              </div>
              <div className="max-h-52 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-sky-800">
                    <tr>
                      <th className="px-3 py-2 text-right">رقم القسط</th>
                      <th className="px-3 py-2 text-right">تاريخ الاستحقاق</th>
                      <th className="px-3 py-2 text-right">قيمة القسط</th>
                      <th className="px-3 py-2 text-right">المتبقي بعد القسط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((s) => (
                      <tr key={s.installment_number} className="border-t border-sky-50">
                        <td className="px-3 py-1.5">{s.installment_number}</td>
                        <td className="px-3 py-1.5">{formatDateAr(s.due_date)}</td>
                        <td className="px-3 py-1.5">{formatMoneySar(s.amount)}</td>
                        <td className="px-3 py-1.5">{formatMoneySar(s.remaining_after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="gap-2 border-sky-200"
              disabled={submitting}
              onClick={() => submit("draft")}
            >
              <Save className="h-4 w-4" /> حفظ كمسودة
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-sky-300 text-sky-800"
              disabled={submitting}
              onClick={() => submit("pending")}
            >
              إرسال للاعتماد
            </Button>
            {canApprove && (
              <Button className="gap-2" disabled={submitting} onClick={() => submit("approved")}>
                <ShieldCheck className="h-4 w-4" /> حفظ واعتماد السلفة
              </Button>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvanceFormDialog;
