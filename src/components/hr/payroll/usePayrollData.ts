import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeTransactions } from "@/contexts/EmployeeTransactionsContext";
import { useDueAdvanceInstallments } from "@/hooks/useAdvances";

import { PayrollRow, PayrollTotals } from "./types";

export interface PayrollEmployee {
  id: string;
  name: string;
  employeeNumber: string;
  residenceNumber: string;
  bankName: string;
  bankAccountNumber: string;
  department: string;
  status: string;
  basicSalary: number;
  allowances: number;
}

/** بيانات تجريبية تُستخدم فقط عند عدم وجود موظفين في قاعدة البيانات */
const DEMO_EMPLOYEES: PayrollEmployee[] = [
  {
    id: "emp1",
    name: "أحمد محمد علي",
    employeeNumber: "EMP-001",
    residenceNumber: "2345678901",
    bankName: "البنك الأهلي",
    bankAccountNumber: "SA1234567890123456789012",
    department: "الإدارة",
    status: "active",
    basicSalary: 15000,
    allowances: 5000,
  },
  {
    id: "emp2",
    name: "فاطمة أحمد",
    employeeNumber: "EMP-002",
    residenceNumber: "3456789012",
    bankName: "بنك الراجحي",
    bankAccountNumber: "SA9876543210987654321098",
    department: "المحاسبة",
    status: "active",
    basicSalary: 12000,
    allowances: 4000,
  },
  {
    id: "emp3",
    name: "محمد سالم",
    employeeNumber: "EMP-003",
    residenceNumber: "4567890123",
    bankName: "البنك السعودي الفرنسي",
    bankAccountNumber: "SA5544332211445566778899",
    department: "التشغيل",
    status: "active",
    basicSalary: 8000,
    allowances: 3000,
  },
];

/** جلب الموظفين مرة واحدة فقط — لا يعتمد على الشهر أو الفلاتر */
export const usePayrollEmployees = () => {
  return useQuery({
    queryKey: ["payroll-employees"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<PayrollEmployee[]> => {
      const { data, error } = await supabase
        .from("employees")
        .select(
          "id, name, position, department, employee_number, salary, status, bank_name, bank_account_number, residence_number, housing_allowance, transport_allowance, other_allowances"
        )
        .order("name", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return DEMO_EMPLOYEES;

      return data.map((e, i) => ({
        id: e.id,
        name: e.name ?? "-",
        employeeNumber: e.employee_number ?? `EMP-${String(i + 1).padStart(3, "0")}`,
        residenceNumber: e.residence_number ?? "",
        bankName: e.bank_name ?? "",
        bankAccountNumber: e.bank_account_number ?? "",
        department: e.department ?? e.position ?? "",
        status: e.status ?? "active",
        basicSalary: Number(e.salary ?? 0),
        allowances:
          Number(e.housing_allowance ?? 0) +
          Number(e.transport_allowance ?? 0) +
          Number(e.other_allowances ?? 0),
      }));
    },
  });
};

export interface PayrollFilters {
  search: string;
  bank: string;
  department: string;
  status: string;
}

/** يحسب صفوف الكشف للشهر المحدد — بدون أي جلب جديد من قاعدة البيانات */
export const usePayrollRows = (
  employees: PayrollEmployee[] | undefined,
  month: string,
  filters: PayrollFilters
) => {
  const { transactions } = useEmployeeTransactions();
  const { data: dueInstallments } = useDueAdvanceInstallments(month);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => (t.date ?? "").startsWith(month)),
    [transactions, month]
  );

  /** أقساط السلف المعتمدة المستحقة لهذا الشهر — تُخصم تلقائيًا */
  const advancesByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const inst of dueInstallments ?? []) {
      map.set(inst.employeeId, (map.get(inst.employeeId) ?? 0) + Number(inst.amount || 0));
    }
    return map;
  }, [dueInstallments]);

  const rows = useMemo<PayrollRow[]>(() => {
    if (!employees) return [];
    const byEmployee = new Map<string, { additions: number; deductions: number; advances: number }>();
    for (const t of monthTransactions) {
      const bucket =
        byEmployee.get(t.employeeId) ?? { additions: 0, deductions: 0, advances: 0 };
      if (t.type === "addition") bucket.additions += Number(t.amount || 0);
      else if (t.type === "deduction") bucket.deductions += Number(t.amount || 0);
      byEmployee.set(t.employeeId, bucket);
    }

    return employees.map((emp) => {
      const b = byEmployee.get(emp.id) ?? { additions: 0, deductions: 0, advances: 0 };
      const advances = advancesByEmployee.get(emp.id) ?? b.advances;
      const netSalary =
        emp.basicSalary + emp.allowances + b.additions - b.deductions - advances;
      return {
        id: emp.id,
        employeeName: emp.name,
        employeeNumber: emp.employeeNumber,
        residenceNumber: emp.residenceNumber,
        bankAccountNumber: emp.bankAccountNumber,
        bankName: emp.bankName,
        department: emp.department,
        status: emp.status,
        basicSalary: emp.basicSalary,
        allowances: emp.allowances,
        additions: b.additions,
        deductions: b.deductions,
        advances,
        netSalary,
      };
    });
  }, [employees, monthTransactions, advancesByEmployee]);


  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.bank !== "all" && r.bankName !== filters.bank) return false;
      if (filters.department !== "all" && r.department !== filters.department) return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (!q) return true;
      return (
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeNumber.toLowerCase().includes(q) ||
        r.residenceNumber.toLowerCase().includes(q) ||
        r.bankAccountNumber.toLowerCase().includes(q)
      );
    });
  }, [rows, filters]);

  const totals = useMemo<PayrollTotals>(
    () =>
      filteredRows.reduce<PayrollTotals>(
        (acc, r) => ({
          basicSalary: acc.basicSalary + r.basicSalary,
          allowances: acc.allowances + r.allowances,
          additions: acc.additions + r.additions,
          deductions: acc.deductions + r.deductions,
          advances: acc.advances + r.advances,
          netSalary: acc.netSalary + r.netSalary,
          count: acc.count + 1,
        }),
        {
          basicSalary: 0,
          allowances: 0,
          additions: 0,
          deductions: 0,
          advances: 0,
          netSalary: 0,
          count: 0,
        }
      ),
    [filteredRows]
  );

  const banks = useMemo(
    () => Array.from(new Set(rows.map((r) => r.bankName).filter(Boolean))),
    [rows]
  );
  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department).filter(Boolean))),
    [rows]
  );

  return { rows, filteredRows, totals, banks, departments };
};
