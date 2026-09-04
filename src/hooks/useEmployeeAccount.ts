import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { round2 } from "@/lib/advances";
import type { EmployeeTxn, EmployeeTxnType } from "@/lib/employeeLedger";


export type LedgerSource =
  | "advance"
  | "advance_payment"
  | "payroll"
  | "deduction"
  | "addition"
  | "allowance"
  | "bonus"
  | "accrual"
  | "voucher";

export const LEDGER_SOURCE_LABELS: Record<LedgerSource, string> = {
  advance: "سلفة",
  advance_payment: "سداد سلفة",
  payroll: "مسير راتب",
  deduction: "خصم",
  addition: "إضافي",
  allowance: "بدل",
  bonus: "مكافأة",
  accrual: "قيد استحقاق",
  voucher: "سند صرف",
};

export interface LedgerRow {
  id: string;
  date: string;
  documentNumber: string;
  description: string;
  debit: number;
  credit: number;
  /** أثر الحركة على رصيد الموظف: +1 يزيد الالتزام، -1 يخفضه */
  effect: 1 | -1;
  source: LedgerSource;
  /** رابط المستند الأصلي */
  link?: string;
}

export type AdvanceUiStatus = "new" | "running" | "settled" | "cancelled";

export const ADVANCE_UI_STATUS_LABELS: Record<AdvanceUiStatus, string> = {
  new: "جديدة",
  running: "جارية",
  settled: "مسددة بالكامل",
  cancelled: "ملغاة",
};

export const ADVANCE_UI_STATUS_CLASSES: Record<AdvanceUiStatus, string> = {
  new: "bg-sky-100 text-sky-700 border-sky-200",
  running: "bg-amber-50 text-amber-700 border-amber-200",
  settled: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

export interface EmployeeAdvanceRow {
  id: string;
  advance_number: string;
  advance_date: string;
  advance_type: string;
  amount: number;
  paid_amount: number;
  payrollDeducted: number;
  remaining_amount: number;
  status: string;
  uiStatus: AdvanceUiStatus;
}

export interface EmployeeDeductionRow {
  id: string;
  date: string;
  documentNumber: string;
  category: "advance" | "absence" | "late" | "penalty" | "other";
  description: string;
  amount: number;
}

export const DEDUCTION_CATEGORY_LABELS: Record<EmployeeDeductionRow["category"], string> = {
  advance: "خصم سلفة",
  absence: "خصم غياب",
  late: "خصم تأخير",
  penalty: "خصم جزاء",
  other: "خصومات أخرى",
};

export interface EmployeeExtraRow {
  id: string;
  date: string;
  documentNumber: string;
  kind: "overtime" | "allowance" | "bonus" | "other";
  description: string;
  amount: number;
}

export const EXTRA_KIND_LABELS: Record<EmployeeExtraRow["kind"], string> = {
  overtime: "عمل إضافي",
  allowance: "بدل",
  bonus: "مكافأة",
  other: "مستحقات أخرى",
};

export interface PayrollAccrualRow {
  month: string;
  reference: string;
  advancesDeducted: number;
  status: "draft" | "approved" | "accrued" | "paid";
}

export const PAYROLL_STATUS_LABELS: Record<PayrollAccrualRow["status"], string> = {
  draft: "مسودة",
  approved: "معتمد",
  accrued: "تم إثبات الاستحقاق",
  paid: "تم الدفع",
};

export const PAYROLL_STATUS_CLASSES: Record<PayrollAccrualRow["status"], string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  approved: "bg-sky-100 text-sky-700 border-sky-200",
  accrued: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const classifyDeduction = (text: string): EmployeeDeductionRow["category"] => {
  const t = text || "";
  if (t.includes("سلف")) return "advance";
  if (t.includes("غياب")) return "absence";
  if (t.includes("تأخ")) return "late";
  if (t.includes("جزاء") || t.includes("جزائ")) return "penalty";
  return "other";
};

const classifyExtra = (text: string): EmployeeExtraRow["kind"] => {
  const t = text || "";
  if (t.includes("إضاف") || t.includes("اضاف") || t.includes("ساع")) return "overtime";
  if (t.includes("بدل")) return "allowance";
  if (t.includes("مكاف") || t.includes("حافز")) return "bonus";
  return "other";
};

export interface EmployeeAccount {
  advances: EmployeeAdvanceRow[];
  deductions: EmployeeDeductionRow[];
  extras: EmployeeExtraRow[];
  payrolls: PayrollAccrualRow[];
  ledger: LedgerRow[];
  /** الحركات الخام للمحرك المحاسبي الموحد */
  transactions: EmployeeTxn[];

  totals: {
    advancesTotal: number;
    advancesPaid: number;
    advancesPayrollDeducted: number;
    advancesRemaining: number;
    deductionsThisMonth: number;
    deductionsPrevious: number;
    deductionsTotal: number;
    overtimeTotal: number;
    allowancesTotal: number;
    bonusTotal: number;
    extrasTotal: number;
    debit: number;
    credit: number;
    balance: number;
    openingBalance: number;
  };
}

export const useEmployeeAccount = (employeeId?: string) =>
  useQuery({
    queryKey: ["employee-account", employeeId],
    enabled: !!employeeId,
    queryFn: async (): Promise<EmployeeAccount> => {
      const [advancesRes, transactionsRes] = await Promise.all([
        supabase
          .from("employee_advances")
          .select("*")
          .eq("employee_id", employeeId!)
          .order("advance_date", { ascending: true }),
        supabase
          .from("employee_transactions")
          .select("*")
          .eq("employee_id", employeeId!)
          .order("date", { ascending: true }),
      ]);

      if (advancesRes.error) throw advancesRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      const advanceRecords = advancesRes.data ?? [];
      const advanceIds = advanceRecords.map((a: any) => a.id);

      let installments: any[] = [];
      let payments: any[] = [];
      if (advanceIds.length) {
        const [insRes, payRes] = await Promise.all([
          supabase
            .from("advance_installments")
            .select("*")
            .in("advance_id", advanceIds)
            .order("due_date", { ascending: true }),
          supabase
            .from("advance_payments")
            .select("*")
            .in("advance_id", advanceIds)
            .order("payment_date", { ascending: true }),
        ]);
        if (insRes.error) throw insRes.error;
        if (payRes.error) throw payRes.error;
        installments = insRes.data ?? [];
        payments = payRes.data ?? [];
      }

      const numberByAdvance = new Map<string, string>(
        advanceRecords.map((a: any) => [a.id, a.advance_number as string])
      );

      const payrollDeductedByAdvance = new Map<string, number>();
      installments.forEach((i: any) => {
        if (i.payroll_reference) {
          payrollDeductedByAdvance.set(
            i.advance_id,
            round2((payrollDeductedByAdvance.get(i.advance_id) ?? 0) + Number(i.paid_amount || 0))
          );
        }
      });

      const advances: EmployeeAdvanceRow[] = advanceRecords.map((a: any) => {
        const paid = Number(a.paid_amount || 0);
        const remaining = Number(a.remaining_amount ?? Number(a.amount || 0) - paid);
        const uiStatus: AdvanceUiStatus =
          a.status === "cancelled" || a.status === "rejected"
            ? "cancelled"
            : remaining <= 0.009
              ? "settled"
              : paid > 0
                ? "running"
                : "new";
        return {
          id: a.id,
          advance_number: a.advance_number,
          advance_date: a.advance_date,
          advance_type: a.advance_type,
          amount: Number(a.amount || 0),
          paid_amount: paid,
          payrollDeducted: payrollDeductedByAdvance.get(a.id) ?? 0,
          remaining_amount: Math.max(0, round2(remaining)),
          status: a.status,
          uiStatus,
        };
      });

      const transactions = transactionsRes.data ?? [];

      const deductions: EmployeeDeductionRow[] = transactions
        .filter((t: any) => t.type === "deduction")
        .map((t: any) => ({
          id: t.id,
          date: t.date,
          documentNumber: `DED-${String(t.id).slice(0, 6).toUpperCase()}`,
          category: classifyDeduction(t.description || ""),
          description: t.description || "خصم",
          amount: Number(t.amount || 0),
        }));

      // خصومات أقساط السلف المرحّلة عبر مسير الرواتب
      payments
        .filter((p: any) => p.method === "payroll")
        .forEach((p: any) => {
          deductions.push({
            id: `pay-${p.id}`,
            date: p.payment_date,
            documentNumber: p.payroll_reference || numberByAdvance.get(p.advance_id) || "PAY",
            category: "advance",
            description: `خصم قسط سلفة ${numberByAdvance.get(p.advance_id) ?? ""}`.trim(),
            amount: Number(p.amount || 0),
          });
        });

      const extras: EmployeeExtraRow[] = transactions
        .filter((t: any) => t.type === "addition")
        .map((t: any) => ({
          id: t.id,
          date: t.date,
          documentNumber: `ADD-${String(t.id).slice(0, 6).toUpperCase()}`,
          kind: classifyExtra(t.description || ""),
          description: t.description || "إضافي",
          amount: Number(t.amount || 0),
        }));

      // مسيرات الرواتب المرتبطة بالموظف (من مراجع خصم أقساط السلف)
      const payrollMap = new Map<string, PayrollAccrualRow>();
      installments
        .filter((i: any) => i.payroll_reference)
        .forEach((i: any) => {
          const reference: string = i.payroll_reference;
          const month = reference.replace(/^PAY-/, "");
          const existing = payrollMap.get(reference);
          const amount = Number(i.paid_amount || 0);
          if (existing) existing.advancesDeducted = round2(existing.advancesDeducted + amount);
          else
            payrollMap.set(reference, {
              month,
              reference,
              advancesDeducted: round2(amount),
              status: "accrued",
            });
        });
      const payrolls = Array.from(payrollMap.values()).sort((a, b) => b.month.localeCompare(a.month));

      // كشف الحساب
      const ledger: LedgerRow[] = [];
      advances
        .filter((a) => a.uiStatus !== "cancelled")
        .forEach((a) =>
          ledger.push({
            id: `adv-${a.id}`,
            date: a.advance_date,
            documentNumber: a.advance_number,
            description: "سلفة موظف",
            debit: a.amount,
            credit: 0,
            effect: 1,
            source: "advance",
            link: "/hr/advances",
          })
        );

      payments.forEach((p: any) =>
        ledger.push({
          id: `pmt-${p.id}`,
          date: p.payment_date,
          documentNumber: p.payroll_reference || numberByAdvance.get(p.advance_id) || "-",
          description:
            p.method === "payroll"
              ? `خصم قسط سلفة من الراتب ${numberByAdvance.get(p.advance_id) ?? ""}`.trim()
              : `سداد سلفة ${numberByAdvance.get(p.advance_id) ?? ""}`.trim(),
          debit: Number(p.amount || 0),
          credit: 0,
          effect: -1,
          source: p.method === "payroll" ? "advance_payment" : "voucher",
          link: "/hr/advances",
        })
      );

      deductions
        .filter((d) => d.category !== "advance")
        .forEach((d) =>
          ledger.push({
            id: `ded-${d.id}`,
            date: d.date,
            documentNumber: d.documentNumber,
            description: `${DEDUCTION_CATEGORY_LABELS[d.category]} — ${d.description}`,
            debit: d.amount,
            credit: 0,
            effect: -1,
            source: "deduction",
            link: "/hr/deductions",
          })
        );

      extras.forEach((e) =>
        ledger.push({
          id: `ext-${e.id}`,
          date: e.date,
          documentNumber: e.documentNumber,
          description: `${EXTRA_KIND_LABELS[e.kind]} — ${e.description}`,
          debit: 0,
          credit: e.amount,
          effect: -1,
          source: e.kind === "allowance" ? "allowance" : e.kind === "bonus" ? "bonus" : "addition",
          link: "/hr/additions",
        })
      );

      ledger.sort((a, b) => a.date.localeCompare(b.date));

      const thisMonth = new Date().toISOString().slice(0, 7);
      const deductionsThisMonth = round2(
        deductions.filter((d) => (d.date || "").startsWith(thisMonth)).reduce((s, d) => s + d.amount, 0)
      );
      const deductionsTotal = round2(deductions.reduce((s, d) => s + d.amount, 0));

      const sumExtras = (kind: EmployeeExtraRow["kind"]) =>
        round2(extras.filter((e) => e.kind === kind).reduce((s, e) => s + e.amount, 0));

      const debit = round2(ledger.reduce((s, r) => s + r.debit, 0));
      const credit = round2(ledger.reduce((s, r) => s + r.credit, 0));
      const balance = round2(ledger.reduce((s, r) => s + r.effect * (r.debit || r.credit), 0));

      return {
        advances,
        deductions: deductions.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
        extras: extras.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
        payrolls,
        ledger,
        totals: {
          advancesTotal: round2(advances.reduce((s, a) => s + (a.uiStatus === "cancelled" ? 0 : a.amount), 0)),
          advancesPaid: round2(advances.reduce((s, a) => s + a.paid_amount, 0)),
          advancesPayrollDeducted: round2(advances.reduce((s, a) => s + a.payrollDeducted, 0)),
          advancesRemaining: round2(advances.reduce((s, a) => s + (a.uiStatus === "cancelled" ? 0 : a.remaining_amount), 0)),
          deductionsThisMonth,
          deductionsPrevious: round2(deductionsTotal - deductionsThisMonth),
          deductionsTotal,
          overtimeTotal: sumExtras("overtime"),
          allowancesTotal: sumExtras("allowance"),
          bonusTotal: sumExtras("bonus"),
          extrasTotal: round2(extras.reduce((s, e) => s + e.amount, 0)),
          debit,
          credit,
          balance,
          openingBalance: 0,
        },
      };
    },
  });
