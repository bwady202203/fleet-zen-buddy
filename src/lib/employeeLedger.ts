import { round2 } from "@/lib/advances";

/** ============================================================
 *  محرك موحد لحساب كشف حساب الموظف (Single Source of Truth)
 *  ============================================================ */

export type EmployeeTxnType =
  | "SALARY_ACCRUAL"
  | "SALARY_PAYMENT"
  | "ADVANCE"
  | "ADVANCE_DEDUCTION"
  | "ADVANCE_PAYMENT"
  | "DEDUCTION"
  | "OVERTIME"
  | "ALLOWANCE"
  | "BONUS"
  | "OTHER";

export const TXN_TYPE_LABELS: Record<EmployeeTxnType, string> = {
  SALARY_ACCRUAL: "استحقاق راتب",
  SALARY_PAYMENT: "صرف راتب",
  ADVANCE: "صرف سلفة",
  ADVANCE_DEDUCTION: "خصم سلفة من الراتب",
  ADVANCE_PAYMENT: "سداد سلفة",
  DEDUCTION: "خصم",
  OVERTIME: "إضافي",
  ALLOWANCE: "بدل",
  BONUS: "مكافأة",
  OTHER: "حركة أخرى",
};

/** القاعدة المحاسبية الثابتة لكل نوع حركة — لا يمكن تجاوزها من الواجهة */
export const TXN_SIDE: Record<EmployeeTxnType, "debit" | "credit"> = {
  SALARY_ACCRUAL: "credit",
  SALARY_PAYMENT: "debit",
  ADVANCE: "debit",
  ADVANCE_DEDUCTION: "debit",
  ADVANCE_PAYMENT: "debit",
  DEDUCTION: "debit",
  OVERTIME: "credit",
  ALLOWANCE: "credit",
  BONUS: "credit",
  OTHER: "debit",
};

/**
 * حركات استرشادية (بيانية) لا تؤثر على الأرصدة:
 * السلفة تُسجَّل مرة واحدة في الجانب المدين عند صرفها، وخصم قسطها من الراتب
 * يظهر كبيان فقط لأن صرف الراتب يُثبت بالصافي بعد الخصم.
 */
export const MEMO_TYPES: EmployeeTxnType[] = ["ADVANCE_DEDUCTION"];

/** الحركات التي تمثل مبالغ صُرفت فعليًا للموظف */
const DISBURSED_TYPES: EmployeeTxnType[] = ["SALARY_PAYMENT", "ADVANCE"];


export type EmployeeTxnStatus = "posted" | "pending" | "cancelled";

export interface EmployeeTxn {
  id: string;
  date: string;
  employeeId: string;
  type: EmployeeTxnType;
  documentNumber: string;
  description: string;
  amount: number;
  source: string;
  createdBy?: string | null;
  createdAt?: string | null;
  status?: EmployeeTxnStatus;
  link?: string;
  /** ربط حركة الصرف بحركة الاستحقاق */
  relatedId?: string | null;
}

export interface EmployeeLedgerRow extends EmployeeTxn {
  debit: number;
  credit: number;
  balance: number;
}

export interface EmployeeLedgerTotals {
  openingBalance: number;
  debit: number;
  credit: number;
  disbursed: number;
  advancesTotal: number;
  advancesDeducted: number;
  advancesPaid: number;
  advancesRemaining: number;
  deductionsTotal: number;
  extrasTotal: number;
  salaryAccrued: number;
  salaryPaid: number;
  closingBalance: number;
  /** تحقق آلي: الختامي = السابق + المدين - الدائن */
  balanced: boolean;
}

export interface EmployeeLedgerResult {
  rows: EmployeeLedgerRow[];
  totals: EmployeeLedgerTotals;
}

export interface LedgerPeriod {
  from?: string;
  to?: string;
}

const sideAmounts = (t: EmployeeTxn) => {
  const amount = round2(Math.abs(Number(t.amount || 0)));
  return TXN_SIDE[t.type] === "debit" ? { debit: amount, credit: 0 } : { debit: 0, credit: amount };
};

const sortTxns = (a: EmployeeTxn, b: EmployeeTxn) =>
  (a.date || "").localeCompare(b.date || "") || (a.documentNumber || "").localeCompare(b.documentNumber || "");

/**
 * يبني كشف الحساب مع الرصيد السابق والرصيد الجاري والرصيد الختامي.
 * قاعدة الرصيد: الرصيد بعد الحركة = الرصيد السابق + المدين - الدائن
 */
export const buildEmployeeLedger = (
  txns: EmployeeTxn[],
  period: LedgerPeriod = {}
): EmployeeLedgerResult => {
  const active = txns.filter((t) => t.status !== "cancelled").sort(sortTxns);

  const before = active.filter((t) => (period.from ? (t.date || "") < period.from : false));
  const inRange = active.filter(
    (t) =>
      (!period.from || (t.date || "") >= period.from) && (!period.to || (t.date || "") <= period.to)
  );

  const openingBalance = round2(
    before.reduce((sum, t) => {
      const { debit, credit } = sideAmounts(t);
      return sum + debit - credit;
    }, 0)
  );

  let running = openingBalance;
  const rows: EmployeeLedgerRow[] = inRange.map((t) => {
    const { debit, credit } = sideAmounts(t);
    running = round2(running + debit - credit);
    return { ...t, debit, credit, balance: running };
  });

  const sumBy = (types: EmployeeTxnType[]) =>
    round2(
      inRange
        .filter((t) => types.includes(t.type))
        .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0)
    );

  const debit = round2(rows.reduce((s, r) => s + r.debit, 0));
  const credit = round2(rows.reduce((s, r) => s + r.credit, 0));
  const closingBalance = round2(openingBalance + debit - credit);

  const advancesTotal = sumBy(["ADVANCE"]);
  const advancesDeducted = sumBy(["ADVANCE_DEDUCTION"]);
  const advancesPaid = sumBy(["ADVANCE_PAYMENT"]);

  return {
    rows,
    totals: {
      openingBalance,
      debit,
      credit,
      disbursed: sumBy(DISBURSED_TYPES),
      advancesTotal,
      advancesDeducted,
      advancesPaid,
      advancesRemaining: round2(Math.max(0, advancesTotal - advancesDeducted - advancesPaid)),
      deductionsTotal: sumBy(["DEDUCTION"]),
      extrasTotal: sumBy(["OVERTIME", "ALLOWANCE", "BONUS"]),
      salaryAccrued: sumBy(["SALARY_ACCRUAL"]),
      salaryPaid: sumBy(["SALARY_PAYMENT"]),
      closingBalance,
      balanced: Math.abs(closingBalance - round2(openingBalance + debit - credit)) < 0.01,
    },
  };
};
