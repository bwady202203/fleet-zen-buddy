import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  BadgeCheck,
  Building2,
  CalendarDays,
  CreditCard,
  ExternalLink,
  FileText,
  IdCard,
  Mail,
  Minus,
  Pencil,
  Phone,
  Plus,
  Printer,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDateAr, formatMoneySar } from "@/lib/advances";
import LoadingCup from "@/components/LoadingCup";
import EmployeeFinancialStatement, { type StatementPeriod } from "@/components/hr/employees/EmployeeFinancialStatement";
import {
  ADVANCE_UI_STATUS_CLASSES,
  ADVANCE_UI_STATUS_LABELS,
  DEDUCTION_CATEGORY_LABELS,
  EXTRA_KIND_LABELS,
  LEDGER_SOURCE_LABELS,
  PAYROLL_STATUS_CLASSES,
  PAYROLL_STATUS_LABELS,
  useEmployeeAccount,
} from "@/hooks/useEmployeeAccount";

export interface DetailsEmployee {
  id: string;
  name: string;
  employee_number?: string | null;
  position?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  national_id?: string | null;
  residence_number?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  hire_date?: string | null;
  salary?: number | null;
  housing_allowance?: number | null;
  transport_allowance?: number | null;
  other_allowances?: number | null;
  status?: string | null;
}

interface Props {
  employee: DetailsEmployee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onPrintStatement: () => void;
  period: StatementPeriod;
  onPeriodChange: (p: StatementPeriod) => void;
}

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("");

const InfoRow = ({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: any;
  label: string;
  value?: string | null;
  mono?: boolean;
}) => (
  <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
    <Icon className="h-4 w-4 shrink-0 text-hr" />
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={cn("mr-auto text-sm font-semibold", mono && "font-mono")} dir={mono ? "ltr" : undefined}>
      {value || "—"}
    </span>
  </div>
);

const SummaryCard = ({
  label,
  value,
  icon: Icon,
  tone = "hr",
}: {
  label: string;
  value: string;
  icon: any;
  tone?: "hr" | "emerald" | "rose" | "amber" | "sky";
}) => {
  const tones: Record<string, string> = {
    hr: "bg-hr/10 text-hr",
    emerald: "bg-emerald-500/10 text-emerald-600",
    rose: "bg-rose-500/10 text-rose-600",
    amber: "bg-amber-500/10 text-amber-600",
    sky: "bg-sky-500/10 text-sky-600",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border/60">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-base font-bold">{value}</p>
      </div>
    </div>
  );
};

const SectionTitle = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="flex items-baseline justify-between gap-2">
    <h4 className="text-sm font-bold">{title}</h4>
    {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <p className="rounded-xl bg-muted/40 py-6 text-center text-sm text-muted-foreground">{text}</p>
);

export const EmployeeDetailsDialog = ({
  employee,
  open,
  onOpenChange,
  onEdit,
  onPrintStatement,
  period,
  onPeriodChange,
}: Props) => {
  const navigate = useNavigate();
  const { data: account, isLoading } = useEmployeeAccount(employee?.id);

  const allowances = useMemo(
    () =>
      Number(employee?.housing_allowance ?? 0) +
      Number(employee?.transport_allowance ?? 0) +
      Number(employee?.other_allowances ?? 0),
    [employee]
  );

  if (!employee) return null;

  const active = (employee.status ?? "active") === "active";
  const t = account?.totals;
  const basic = Number(employee.salary ?? 0);
  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[95vh] w-[96vw] gap-0 overflow-hidden rounded-3xl border-0 p-0 sm:max-w-[980px]"
        dir="rtl"
      >
        {/* رأس البيانات */}
        <div className="relative bg-hr-surface px-4 py-5 sm:px-7">
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-3 top-3 h-8 w-8 rounded-lg"
            onClick={() => onOpenChange(false)}
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-hr to-hr/60 text-lg font-bold text-hr-foreground shadow-md sm:h-16 sm:w-16 sm:text-xl">
                {initials(employee.name || "؟")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{employee.name}</h2>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      active ? "bg-emerald-500/12 text-emerald-600" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-muted-foreground")} />
                    {active ? "نشط" : "غير نشط"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <IdCard className="h-3.5 w-3.5 text-hr" />
                    الرقم الوظيفي: <b className="font-mono text-foreground">{employee.employee_number || "—"}</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-hr" />
                    القسم: <b className="text-foreground">{employee.department || "—"}</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-hr" />
                    المسمى: <b className="text-foreground">{employee.position || "—"}</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-hr" />
                    التعيين: <b className="font-mono text-foreground">{formatDateAr(employee.hire_date)}</b>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:flex-col">
              <Button
                className="gap-2 rounded-xl bg-hr text-hr-foreground shadow-md hover:bg-hr/90"
                onClick={onPrintStatement}
              >
                <Printer className="h-4 w-4" />
                طباعة كشف حساب الموظف
              </Button>
              <Button variant="outline" className="gap-2 rounded-xl border-hr/40 text-hr hover:bg-hr/10" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                تعديل الموظف
              </Button>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "إضافة سلفة", icon: Plus, path: "/hr/advances" },
              { label: "تسجيل سداد سلفة", icon: Receipt, path: "/hr/advances" },
              { label: "إضافة خصم", icon: Minus, path: "/hr/deductions" },
              { label: "إضافة إضافي", icon: TrendingUp, path: "/hr/additions" },
              { label: "عرض مسير الراتب", icon: Wallet, path: "/hr/payroll" },
              { label: "عرض القيد المحاسبي", icon: FileText, path: "/accounting/journal-entries" },
            ].map((a) => (
              <Button
                key={a.label}
                size="sm"
                variant="secondary"
                className="gap-1.5 rounded-xl bg-card text-xs shadow-sm hover:bg-hr/10 hover:text-hr"
                onClick={() => go(a.path)}
              >
                <a.icon className="h-3.5 w-3.5" />
                {a.label}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="max-h-[62vh] bg-card">
          <div className="px-4 py-5 sm:px-7">
            <Tabs defaultValue="personal">
              <TabsList className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 sm:grid-cols-4">
                <TabsTrigger value="personal" className="rounded-lg text-xs sm:text-sm">البيانات الشخصية</TabsTrigger>
                <TabsTrigger value="salary" className="rounded-lg text-xs sm:text-sm">الراتب والبدلات</TabsTrigger>
                <TabsTrigger value="advances" className="rounded-lg text-xs sm:text-sm">السلف والخصومات</TabsTrigger>
                <TabsTrigger value="account" className="rounded-lg text-xs sm:text-sm">الحساب المالي</TabsTrigger>
              </TabsList>

              {/* ============ البيانات الشخصية ============ */}
              <TabsContent value="personal" className="mt-5 grid gap-2 sm:grid-cols-2">
                <InfoRow icon={Building2} label="القسم" value={employee.department} />
                <InfoRow icon={BadgeCheck} label="المسمى الوظيفي" value={employee.position} />
                <InfoRow icon={CalendarDays} label="تاريخ التعيين" value={formatDateAr(employee.hire_date)} mono />
                <InfoRow icon={IdCard} label="رقم الهوية" value={employee.national_id} mono />
                <InfoRow icon={IdCard} label="رقم الإقامة" value={employee.residence_number} mono />
                <InfoRow icon={Phone} label="الهاتف" value={employee.phone} mono />
                <InfoRow icon={Mail} label="البريد الإلكتروني" value={employee.email} mono />
                <InfoRow icon={Banknote} label="اسم البنك" value={employee.bank_name} />
                <InfoRow icon={CreditCard} label="رقم الحساب" value={employee.bank_account_number} mono />
              </TabsContent>

              {/* ============ الراتب والبدلات ============ */}
              <TabsContent value="salary" className="mt-5 space-y-4">
                <div className="space-y-2">
                  {[
                    ["الراتب الأساسي", basic],
                    ["بدل السكن", Number(employee.housing_allowance ?? 0)],
                    ["بدل النقل", Number(employee.transport_allowance ?? 0)],
                    ["بدلات أخرى", Number(employee.other_allowances ?? 0)],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3"
                    >
                      <span className="text-sm text-muted-foreground">{label as string}</span>
                      <span className="font-mono font-semibold">{formatMoneySar(value as number)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-2xl bg-hr/10 px-5 py-4">
                    <span className="font-bold">إجمالي الراتب الشهري</span>
                    <span className="font-mono text-2xl font-bold text-hr">{formatMoneySar(basic + allowances)}</span>
                  </div>
                </div>

                {/* الإضافي والبدلات */}
                <SectionTitle title="الإضافي والبدلات والمكافآت" hint="من حركات الإضافي المسجلة" />
                <div className="grid gap-2 sm:grid-cols-4">
                  <SummaryCard label="إجمالي الإضافي" value={formatMoneySar(t?.overtimeTotal ?? 0)} icon={TrendingUp} tone="emerald" />
                  <SummaryCard label="إجمالي البدلات" value={formatMoneySar((t?.allowancesTotal ?? 0) + allowances)} icon={Wallet} tone="sky" />
                  <SummaryCard label="إجمالي المكافآت" value={formatMoneySar(t?.bonusTotal ?? 0)} icon={BadgeCheck} tone="amber" />
                  <SummaryCard label="إجمالي المستحقات الإضافية" value={formatMoneySar(t?.extrasTotal ?? 0)} icon={Banknote} tone="hr" />
                </div>
                {account && account.extras.length > 0 ? (
                  <div className="space-y-2">
                    {account.extras.map((e) => (
                      <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
                        <Badge variant="outline" className="rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700">
                          {EXTRA_KIND_LABELS[e.kind]}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">{formatDateAr(e.date)}</span>
                        <span className="text-sm">{e.description}</span>
                        <span className="mr-auto font-mono font-bold text-emerald-600">{formatMoneySar(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty text="لا توجد حركات إضافي أو مكافآت" />
                )}

                {/* الرواتب المستحقة */}
                <SectionTitle title="الرواتب المستحقة" hint="يُنشأ قيد الاستحقاق بعد اعتماد مسير الرواتب" />
                <div className="rounded-2xl bg-hr/5 p-3 text-xs text-muted-foreground">
                  القيد المحاسبي: <b className="text-foreground">من حـ/ مصروف الرواتب</b> إلى{" "}
                  <b className="text-foreground">حـ/ الرواتب والأجور المستحقة</b> — مرتبط بالموظف والشهر ومسير الرواتب،
                  ولا يُنشأ إلا مرة واحدة لكل موظف/شهر/مسير.
                </div>
                {account && account.payrolls.length > 0 ? (
                  <div className="space-y-2">
                    {account.payrolls.map((p) => (
                      <div
                        key={p.reference}
                        className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5"
                      >
                        <Badge variant="outline" className={cn("rounded-lg", PAYROLL_STATUS_CLASSES[p.status])}>
                          {PAYROLL_STATUS_LABELS[p.status]}
                        </Badge>
                        <span className="font-mono text-xs">{p.reference}</span>
                        <span className="text-sm text-muted-foreground">شهر {p.month}</span>
                        <span className="text-xs text-muted-foreground">
                          سلف مخصومة: <b className="font-mono text-foreground">{formatMoneySar(p.advancesDeducted)}</b>
                        </span>
                        <div className="mr-auto flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 gap-1 rounded-lg text-xs" onClick={() => go("/hr/payroll")}>
                            <Wallet className="h-3.5 w-3.5" /> مسير الراتب
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 rounded-lg text-xs"
                            onClick={() => go("/accounting/journal-entries")}
                          >
                            <FileText className="h-3.5 w-3.5" /> القيد
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty text="لا توجد رواتب معتمدة بعد لهذا الموظف" />
                )}
              </TabsContent>

              {/* ============ السلف والخصومات ============ */}
              <TabsContent value="advances" className="mt-5 space-y-5">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingCup />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <SummaryCard label="إجمالي السلف" value={formatMoneySar(t?.advancesTotal ?? 0)} icon={Wallet} tone="hr" />
                      <SummaryCard label="السلف المسددة" value={formatMoneySar(t?.advancesPaid ?? 0)} icon={BadgeCheck} tone="emerald" />
                      <SummaryCard
                        label="المخصومة من الرواتب"
                        value={formatMoneySar(t?.advancesPayrollDeducted ?? 0)}
                        icon={Receipt}
                        tone="sky"
                      />
                      <SummaryCard label="الرصيد المتبقي" value={formatMoneySar(t?.advancesRemaining ?? 0)} icon={TrendingDown} tone="rose" />
                    </div>

                    <SectionTitle title="سندات السلف" hint={`${account?.advances.length ?? 0} سند`} />
                    {account && account.advances.length > 0 ? (
                      <div className="space-y-2">
                        {account.advances.map((a) => (
                          <div key={a.id} className="rounded-2xl bg-muted/40 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-bold">{a.advance_number}</span>
                              <span className="font-mono text-xs text-muted-foreground">{formatDateAr(a.advance_date)}</span>
                              <Badge variant="outline" className={cn("rounded-lg", ADVANCE_UI_STATUS_CLASSES[a.uiStatus])}>
                                {ADVANCE_UI_STATUS_LABELS[a.uiStatus]}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="mr-auto h-8 gap-1 rounded-lg text-xs text-hr"
                                onClick={() => go("/hr/advances")}
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> فتح السند
                              </Button>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                              {[
                                ["قيمة السلفة", formatMoneySar(a.amount), ""],
                                ["المسدد", formatMoneySar(a.paid_amount), "text-emerald-600"],
                                ["المخصوم من الراتب", formatMoneySar(a.payrollDeducted), "text-sky-600"],
                                ["المتبقي", formatMoneySar(a.remaining_amount), "text-rose-600"],
                              ].map(([label, value, tone]) => (
                                <div key={label} className="rounded-xl bg-card px-3 py-2 shadow-sm">
                                  <p className="text-muted-foreground">{label}</p>
                                  <p className={cn("mt-0.5 font-mono text-sm font-bold", tone)}>{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty text="لا توجد سلف مسجلة لهذا الموظف" />
                    )}

                    <SectionTitle title="الخصومات" hint="خصم سلفة / غياب / تأخير / جزاء / أخرى" />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <SummaryCard label="خصومات هذا الشهر" value={formatMoneySar(t?.deductionsThisMonth ?? 0)} icon={Minus} tone="rose" />
                      <SummaryCard label="خصومات سابقة" value={formatMoneySar(t?.deductionsPrevious ?? 0)} icon={TrendingDown} tone="amber" />
                      <SummaryCard label="الإجمالي التراكمي" value={formatMoneySar(t?.deductionsTotal ?? 0)} icon={Receipt} tone="hr" />
                    </div>
                    {account && account.deductions.length > 0 ? (
                      <div className="space-y-2">
                        {account.deductions.map((d) => (
                          <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
                            <Badge variant="outline" className="rounded-lg border-rose-200 bg-rose-50 text-rose-700">
                              {DEDUCTION_CATEGORY_LABELS[d.category]}
                            </Badge>
                            <span className="font-mono text-xs">{d.documentNumber}</span>
                            <span className="font-mono text-xs text-muted-foreground">{formatDateAr(d.date)}</span>
                            <span className="text-sm">{d.description}</span>
                            <span className="mr-auto font-mono font-bold text-rose-600">{formatMoneySar(d.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty text="لا توجد خصومات مسجلة" />
                    )}
                  </>
                )}
              </TabsContent>

              {/* ============ الحساب المالي ============ */}
              <TabsContent value="account" className="mt-5">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingCup />
                  </div>
                ) : (
                  <EmployeeFinancialStatement
                    account={account ?? null}
                    period={period}
                    onPeriodChange={onPeriodChange}
                    onPreview={onPrintStatement}
                    onNavigate={go}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDetailsDialog;
