export type PayrollColumnKey =
  | "employeeName"
  | "employeeNumber"
  | "residenceNumber"
  | "bankAccountNumber"
  | "bankName"
  | "basicSalary"
  | "allowances"
  | "additions"
  | "deductions"
  | "advances"
  | "netSalary"
  | "actions";

export const COLUMN_LABELS: Record<PayrollColumnKey, string> = {
  employeeName: "اسم الموظف",
  employeeNumber: "رقم الموظف",
  residenceNumber: "رقم الإقامة",
  bankAccountNumber: "رقم الحساب البنكي",
  bankName: "اسم البنك",
  basicSalary: "الراتب الأساسي",
  allowances: "البدلات",
  additions: "الإضافي",
  deductions: "الخصومات",
  advances: "السلف",
  netSalary: "صافي الراتب",
  actions: "الإجراءات",
};

/** الأعمدة الرقمية التي تُجمَع في صف الإجماليات */
export const NUMERIC_COLUMNS: PayrollColumnKey[] = [
  "basicSalary",
  "allowances",
  "additions",
  "deductions",
  "advances",
  "netSalary",
];

export const DEFAULT_COLUMN_ORDER: PayrollColumnKey[] = [
  "employeeName",
  "employeeNumber",
  "residenceNumber",
  "bankName",
  "bankAccountNumber",
  "basicSalary",
  "allowances",
  "additions",
  "deductions",
  "advances",
  "netSalary",
  "actions",
];

export type PageOrientation = "portrait" | "landscape";

export interface PayrollSettings {
  order: PayrollColumnKey[];
  visible: Record<PayrollColumnKey, boolean>;
  orientation: PageOrientation;
  fontScale: number; // 0.8 - 1.3
  showLogo: boolean;
  showCompanyInfo: boolean;
  showPeriod: boolean;
  showIssueDate: boolean;
  showEmployeeCount: boolean;
  showHeaderTotals: boolean;
  showTotalsRow: boolean;
  showSummary: boolean;
  showFooter: boolean;
  showSignatures: boolean;
  companyName: string;
  footerNote: string;
}

export const DEFAULT_SETTINGS: PayrollSettings = {
  order: DEFAULT_COLUMN_ORDER,
  visible: {
    employeeName: true,
    employeeNumber: true,
    residenceNumber: true,
    bankAccountNumber: true,
    bankName: true,
    basicSalary: true,
    allowances: true,
    additions: true,
    deductions: true,
    advances: true,
    netSalary: true,
    actions: true,
  },
  orientation: "landscape",
  fontScale: 1,
  showLogo: true,
  showCompanyInfo: true,
  showPeriod: true,
  showIssueDate: true,
  showEmployeeCount: true,
  showHeaderTotals: true,
  showTotalsRow: true,
  showSummary: true,
  showFooter: true,
  showSignatures: true,
  companyName: "شركة رمال",
  footerNote: "تم إنشاء الكشف بواسطة النظام",
};

export interface PayrollRow {
  id: string;
  employeeName: string;
  employeeNumber: string;
  residenceNumber: string;
  bankAccountNumber: string;
  bankName: string;
  department: string;
  status: string;
  basicSalary: number;
  allowances: number;
  additions: number;
  deductions: number;
  advances: number;
  netSalary: number;
}

export interface PayrollTotals {
  basicSalary: number;
  allowances: number;
  additions: number;
  deductions: number;
  advances: number;
  netSalary: number;
  count: number;
}

export const MONTH_NAMES_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export const formatMonthLabel = (month: string) => {
  const [y, m] = month.split("-");
  const idx = Number(m) - 1;
  return `${MONTH_NAMES_AR[idx] ?? m} ${y}`;
};

export const formatMoney = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
