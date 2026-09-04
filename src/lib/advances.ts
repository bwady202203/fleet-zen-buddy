export type AdvanceStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

export type InstallmentStatus =
  | "upcoming"
  | "due"
  | "deducted"
  | "paid"
  | "late"
  | "cancelled";

export type AdvanceFrequency = "monthly" | "weekly" | "semimonthly";

export const ADVANCE_STATUS_LABELS: Record<AdvanceStatus, string> = {
  draft: "مسودة",
  pending: "بانتظار الاعتماد",
  approved: "معتمد",
  rejected: "مرفوض",
  completed: "مكتمل السداد",
  cancelled: "ملغي",
};

/** ألوان هادئة لكل حالة */
export const ADVANCE_STATUS_CLASSES: Record<AdvanceStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending: "bg-sky-100 text-sky-700 border-sky-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  upcoming: "قادم",
  due: "مستحق",
  deducted: "تم الخصم",
  paid: "مدفوع",
  late: "متأخر",
  cancelled: "ملغي",
};

export const INSTALLMENT_STATUS_CLASSES: Record<InstallmentStatus, string> = {
  upcoming: "bg-slate-100 text-slate-600 border-slate-200",
  due: "bg-sky-100 text-sky-700 border-sky-200",
  deducted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  late: "bg-orange-50 text-orange-700 border-orange-200",
  cancelled: "bg-slate-100 text-slate-400 border-slate-200",
};

export const ADVANCE_TYPE_LABELS: Record<string, string> = {
  personal: "سلفة شخصية",
  emergency: "سلفة طارئة",
  salary: "سلفة راتب",
  other: "أخرى",
};

export const FREQUENCY_LABELS: Record<AdvanceFrequency, string> = {
  monthly: "شهري",
  weekly: "أسبوعي",
  semimonthly: "نصف شهري",
};

export interface AdvanceRecord {
  id: string;
  advance_number: string;
  advance_date: string;
  employee_id: string;
  employee_name: string | null;
  employee_number: string | null;
  department: string | null;
  position: string | null;
  residence_number: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  basic_salary: number;
  amount: number;
  reason: string | null;
  advance_type: string;
  installments_count: number;
  installment_amount: number;
  frequency: AdvanceFrequency;
  first_installment_date: string;
  last_installment_date: string | null;
  paid_amount: number;
  remaining_amount: number;
  status: AdvanceStatus;
  notes: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  cancelled_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface InstallmentRecord {
  id: string;
  advance_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  remaining_after: number;
  status: InstallmentStatus;
  payroll_reference: string | null;
  deducted_at: string | null;
}

export interface AdvancePaymentRecord {
  id: string;
  advance_id: string;
  installment_id: string | null;
  payment_date: string;
  amount: number;
  method: string;
  payroll_reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface AdvanceAuditRecord {
  id: string;
  advance_id: string;
  action: string;
  description: string | null;
  user_email: string | null;
  created_at: string;
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  created: "إنشاء السلفة",
  updated: "تعديل السلفة",
  approved: "اعتماد السلفة",
  rejected: "رفض السلفة",
  cancelled: "إلغاء السلفة",
  payment: "تسجيل سداد",
  early_payoff: "سداد مبكر",
  payroll_deduction: "خصم من الراتب",
  installment_updated: "تعديل قسط",
  edit_request: "طلب تعديل",
};

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const formatMoneySar = (n: number) =>
  `${round2(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;

export const formatDateAr = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const toISO = (d: Date) => d.toISOString().split("T")[0];

export const addFrequency = (date: Date, frequency: AdvanceFrequency, steps: number) => {
  const d = new Date(date.getTime());
  if (frequency === "monthly") d.setMonth(d.getMonth() + steps);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7 * steps);
  else d.setDate(d.getDate() + 15 * steps);
  return d;
};

export interface ScheduleRow {
  installment_number: number;
  due_date: string;
  amount: number;
  remaining_after: number;
}

/**
 * توليد جدول الأقساط. يتم تعديل القسط الأخير تلقائيًا لتغطية فرق التقريب.
 */
export const buildSchedule = (
  amount: number,
  count: number,
  firstDate: string,
  frequency: AdvanceFrequency,
  installmentAmount?: number
): ScheduleRow[] => {
  const total = round2(amount);
  const n = Math.max(1, Math.floor(count || 1));
  const per = round2(installmentAmount && installmentAmount > 0 ? installmentAmount : total / n);
  const start = new Date(firstDate);
  if (Number.isNaN(start.getTime())) return [];

  const rows: ScheduleRow[] = [];
  let remaining = total;
  for (let i = 0; i < n; i += 1) {
    const isLast = i === n - 1;
    let value = isLast ? round2(remaining) : Math.min(per, round2(remaining));
    if (value < 0) value = 0;
    remaining = round2(remaining - value);
    rows.push({
      installment_number: i + 1,
      due_date: toISO(addFrequency(start, frequency, i)),
      amount: value,
      remaining_after: remaining,
    });
    if (remaining <= 0 && !isLast) break;
  }
  return rows;
};

export const computeInstallmentAmount = (amount: number, count: number) => {
  const n = Math.max(1, Math.floor(count || 1));
  return round2((Number(amount) || 0) / n);
};
