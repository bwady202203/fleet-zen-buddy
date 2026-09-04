import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Loader2,
  Phone,
  UserRound,
  Wallet,
} from "lucide-react";

export interface EmployeeFormData {
  id?: string;
  name: string;
  position: string;
  department: string;
  phone: string;
  email: string;
  nationalId: string;
  residenceNumber: string;
  bankName: string;
  bankAccountNumber: string;
  joinDate: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
}

const EMPTY_FORM: EmployeeFormData = {
  name: "",
  position: "",
  department: "",
  phone: "",
  email: "",
  nationalId: "",
  residenceNumber: "",
  bankName: "",
  bankAccountNumber: "",
  joinDate: new Date().toISOString().split("T")[0],
  basicSalary: 0,
  housingAllowance: 0,
  transportAllowance: 0,
  otherAllowances: 0,
};

export const DEPARTMENTS = [
  "الإدارة",
  "المالية",
  "النقل",
  "الموارد البشرية",
  "التسويق",
  "الصيانة",
  "المستودعات",
];

const BANKS = [
  "بنك الرياض",
  "البنك الأهلي السعودي",
  "مصرف الراجحي",
  "بنك ساب",
  "البنك السعودي الفرنسي",
  "بنك البلاد",
  "بنك الجزيرة",
  "بنك الإنماء",
];

const STEPS = [
  { key: "personal", label: "بيانات شخصية", icon: UserRound },
  { key: "contact", label: "بيانات الاتصال", icon: Phone },
  { key: "financial", label: "بيانات مالية", icon: Wallet },
] as const;

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  employee?: EmployeeFormData | null;
}

const Field = ({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <Label className="text-xs font-semibold text-muted-foreground">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const inputClass =
  "h-11 rounded-xl border-transparent bg-muted/60 text-right shadow-none transition-colors focus-visible:border-hr focus-visible:bg-card focus-visible:ring-hr/30";

export const AddEmployeeDialog = ({ open, onOpenChange, onSaved, employee }: AddEmployeeDialogProps) => {
  const [formData, setFormData] = useState<EmployeeFormData>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { user, currentOrganizationId } = useAuth();

  useEffect(() => {
    if (open) {
      setFormData(employee ? { ...EMPTY_FORM, ...employee } : EMPTY_FORM);
      setStep(0);
    }
  }, [open, employee]);

  const set = <K extends keyof EmployeeFormData>(key: K, value: EmployeeFormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

  const totalSalary = useMemo(
    () =>
      Number(formData.basicSalary) +
      Number(formData.housingAllowance) +
      Number(formData.transportAllowance) +
      Number(formData.otherAllowances),
    [formData]
  );

  const stepValid = (index: number) => {
    if (index === 0) return Boolean(formData.name && formData.position && formData.department);
    return true;
  };

  const save = async () => {
    if (!stepValid(0)) {
      setStep(0);
      toast({ title: "بيانات ناقصة", description: "الاسم والمسمى الوظيفي والقسم مطلوبة", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        position: formData.position,
        department: formData.department,
        phone: formData.phone,
        email: formData.email,
        national_id: formData.nationalId,
        residence_number: formData.residenceNumber,
        bank_name: formData.bankName,
        bank_account_number: formData.bankAccountNumber,
        hire_date: formData.joinDate,
        salary: formData.basicSalary,
        housing_allowance: formData.housingAllowance,
        transport_allowance: formData.transportAllowance,
        other_allowances: formData.otherAllowances,
        status: "active",
      };

      if (employee?.id) {
        const { error } = await supabase.from("employees").update(payload).eq("id", employee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert({
          ...payload,
          user_id: user?.id ?? null,
          organization_id: currentOrganizationId ?? null,
        });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-employees"] });
      queryClient.invalidateQueries({ queryKey: ["advance-employees"] });

      toast({ title: "تم بنجاح", description: employee?.id ? "تم تحديث بيانات الموظف" : "تم إضافة الموظف بنجاح" });
      setFormData(EMPTY_FORM);
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      console.error("Error saving employee:", error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء حفظ بيانات الموظف", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-0 overflow-hidden rounded-3xl border-0 p-0 sm:max-w-[760px]"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-hr-surface px-7 pb-5 pt-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-hr text-hr-foreground">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {employee?.id ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
              </h2>
              <p className="text-sm text-muted-foreground">
                عبّئ البيانات على ثلاث خطوات — يمكنك التنقل بينها بحرية
              </p>
            </div>
          </div>

          {/* Progress steps */}
          <div className="mt-6 flex items-center">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <div key={s.key} className="flex flex-1 items-center last:flex-none">
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className="flex items-center gap-2 text-right"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                        active && "border-hr bg-hr text-hr-foreground shadow-md",
                        done && "border-hr bg-hr/15 text-hr",
                        !active && !done && "border-border bg-card text-muted-foreground"
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span
                      className={cn(
                        "hidden text-sm transition-colors sm:inline",
                        active ? "font-bold text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <span className="mx-3 h-[2px] flex-1 overflow-hidden rounded-full bg-border">
                      <span
                        className={cn(
                          "block h-full rounded-full bg-hr transition-all duration-500",
                          i < step ? "w-full" : "w-0"
                        )}
                      />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[52vh] overflow-y-auto bg-card px-7 py-6">
          {step === 0 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="الاسم الكامل" required>
                  <Input
                    className={inputClass}
                    value={formData.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="مثال: محمد عبدالله السالم"
                  />
                </Field>
                <Field label="المسمى الوظيفي" required>
                  <Input
                    className={inputClass}
                    value={formData.position}
                    onChange={(e) => set("position", e.target.value)}
                    placeholder="مثال: محاسب"
                  />
                </Field>
                <Field label="القسم" required>
                  <Select value={formData.department} onValueChange={(v) => set("department", v)}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="تاريخ التعيين">
                  <Input
                    type="date"
                    className={inputClass}
                    value={formData.joinDate}
                    onChange={(e) => set("joinDate", e.target.value)}
                  />
                </Field>
                <Field label="رقم الهوية">
                  <Input
                    className={cn(inputClass, "font-mono")}
                    inputMode="numeric"
                    value={formData.nationalId}
                    onChange={(e) => set("nationalId", e.target.value)}
                    placeholder="1xxxxxxxxx"
                  />
                </Field>
                <Field label="رقم الإقامة">
                  <Input
                    className={cn(inputClass, "font-mono")}
                    inputMode="numeric"
                    value={formData.residenceNumber}
                    onChange={(e) => set("residenceNumber", e.target.value)}
                    placeholder="2xxxxxxxxx"
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="رقم الهاتف">
                <Input
                  className={cn(inputClass, "font-mono")}
                  inputMode="tel"
                  value={formData.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="05xxxxxxxx"
                />
              </Field>
              <Field label="البريد الإلكتروني">
                <Input
                  type="email"
                  className={cn(inputClass, "text-left")}
                  dir="ltr"
                  value={formData.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="employee@company.com"
                />
              </Field>
              <Field label="اسم البنك">
                <Select value={formData.bankName} onValueChange={(v) => set("bankName", v)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="اختر البنك" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {BANKS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="رقم الحساب البنكي (IBAN)" hint="يُستخدم في مسيّر الرواتب وسندات السلف">
                <Input
                  className={cn(inputClass, "font-mono text-left")}
                  dir="ltr"
                  value={formData.bankAccountNumber}
                  onChange={(e) => set("bankAccountNumber", e.target.value)}
                  placeholder="SA00 0000 0000 0000 0000 0000"
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="الراتب الأساسي (ر.س)">
                  <Input
                    inputMode="decimal"
                    className={cn(inputClass, "font-mono")}
                    value={String(formData.basicSalary)}
                    onChange={(e) => set("basicSalary", num(e.target.value))}
                  />
                </Field>
                <Field label="بدل السكن (ر.س)">
                  <Input
                    inputMode="decimal"
                    className={cn(inputClass, "font-mono")}
                    value={String(formData.housingAllowance)}
                    onChange={(e) => set("housingAllowance", num(e.target.value))}
                  />
                </Field>
                <Field label="بدل النقل (ر.س)">
                  <Input
                    inputMode="decimal"
                    className={cn(inputClass, "font-mono")}
                    value={String(formData.transportAllowance)}
                    onChange={(e) => set("transportAllowance", num(e.target.value))}
                  />
                </Field>
                <Field label="بدلات أخرى (ر.س)">
                  <Input
                    inputMode="decimal"
                    className={cn(inputClass, "font-mono")}
                    value={String(formData.otherAllowances)}
                    onChange={(e) => set("otherAllowances", num(e.target.value))}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-hr/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-hr" />
                  <span className="font-semibold">إجمالي الراتب الشهري</span>
                </div>
                <span className="font-mono text-2xl font-bold text-hr">
                  {totalSalary.toLocaleString()} <span className="text-sm">ر.س</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t bg-hr-surface/60 px-7 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            إلغاء
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setStep((s) => s - 1)}>
                <ArrowRight className="h-4 w-4" />
                السابق
              </Button>
            )}
            {!isLast ? (
              <Button
                className="gap-2 rounded-xl bg-hr text-hr-foreground hover:bg-hr/90"
                onClick={() => {
                  if (!stepValid(step)) {
                    toast({
                      title: "بيانات ناقصة",
                      description: "الاسم والمسمى الوظيفي والقسم مطلوبة",
                      variant: "destructive",
                    });
                    return;
                  }
                  setStep((s) => s + 1);
                }}
              >
                التالي
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="gap-2 rounded-xl bg-hr text-hr-foreground hover:bg-hr/90"
                onClick={save}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {employee?.id ? "حفظ التعديلات" : "إضافة الموظف"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
