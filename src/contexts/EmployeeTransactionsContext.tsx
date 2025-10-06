import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface EmployeeTransaction {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "advance" | "addition" | "deduction";
  amount: number;
  originalAmount: number;
  remainingBalance: number;
  date: string;
  reason: string;
  voucherNumber: string;
  status?: string;
  category?: string;
}

interface EmployeeTransactionsContextType {
  transactions: EmployeeTransaction[];
  getEmployeeTransactions: (employeeId: string) => {
    advances: EmployeeTransaction[];
    additions: EmployeeTransaction[];
    deductions: EmployeeTransaction[];
    advancesBalance: number;
  };
  addTransaction: (transaction: Omit<EmployeeTransaction, "id">) => void;
  updateTransactionBalance: (id: string, paidAmount: number) => void;
}

const EmployeeTransactionsContext = createContext<EmployeeTransactionsContextType | undefined>(undefined);

const initialTransactions: EmployeeTransaction[] = [
  {
    id: "adv-1",
    employeeId: "emp1",
    employeeName: "أحمد محمد علي",
    type: "advance",
    amount: 5000,
    originalAmount: 5000,
    remainingBalance: 5000,
    date: "2025-01-15",
    reason: "سلفة شخصية",
    voucherNumber: "ADV-001",
    status: "approved"
  },
  {
    id: "add-1",
    employeeId: "emp1",
    employeeName: "أحمد محمد علي",
    type: "addition",
    amount: 2000,
    originalAmount: 2000,
    remainingBalance: 0,
    date: "2025-01-15",
    reason: "مكافأة أداء",
    voucherNumber: "ADD-001",
    category: "bonus"
  },
  {
    id: "ded-1",
    employeeId: "emp1",
    employeeName: "أحمد محمد علي",
    type: "deduction",
    amount: 300,
    originalAmount: 300,
    remainingBalance: 0,
    date: "2025-01-18",
    reason: "قسط سلفة",
    voucherNumber: "DED-002",
    category: "advance_repayment"
  },
  {
    id: "adv-2",
    employeeId: "emp2",
    employeeName: "فاطمة أحمد",
    type: "advance",
    amount: 3000,
    originalAmount: 3000,
    remainingBalance: 3000,
    date: "2025-01-20",
    reason: "طارئ عائلي",
    voucherNumber: "ADV-002",
    status: "pending"
  },
  {
    id: "add-2",
    employeeId: "emp2",
    employeeName: "فاطمة أحمد",
    type: "addition",
    amount: 1500,
    originalAmount: 1500,
    remainingBalance: 0,
    date: "2025-01-20",
    reason: "ساعات إضافية",
    voucherNumber: "ADD-002",
    category: "overtime"
  },
  {
    id: "ded-2",
    employeeId: "emp3",
    employeeName: "محمد سالم",
    type: "deduction",
    amount: 500,
    originalAmount: 500,
    remainingBalance: 0,
    date: "2025-01-15",
    reason: "غياب بدون إذن",
    voucherNumber: "DED-001",
    category: "absence"
  }
];

export const EmployeeTransactionsProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<EmployeeTransaction[]>(() => {
    const stored = localStorage.getItem("employeeTransactions");
    return stored ? JSON.parse(stored) : initialTransactions;
  });

  useEffect(() => {
    localStorage.setItem("employeeTransactions", JSON.stringify(transactions));
  }, [transactions]);

  const getEmployeeTransactions = (employeeId: string) => {
    const employeeTransactions = transactions.filter(t => t.employeeId === employeeId);
    
    return {
      advances: employeeTransactions.filter(t => t.type === "advance"),
      additions: employeeTransactions.filter(t => t.type === "addition"),
      deductions: employeeTransactions.filter(t => t.type === "deduction"),
      advancesBalance: employeeTransactions
        .filter(t => t.type === "advance")
        .reduce((sum, t) => sum + t.remainingBalance, 0)
    };
  };

  const addTransaction = (transaction: Omit<EmployeeTransaction, "id">) => {
    const newTransaction: EmployeeTransaction = {
      ...transaction,
      id: `${transaction.type}-${Date.now()}`
    };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const updateTransactionBalance = (id: string, paidAmount: number) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id && t.type === "advance") {
        const newBalance = Math.max(0, t.remainingBalance - paidAmount);
        return { ...t, remainingBalance: newBalance };
      }
      return t;
    }));
  };

  return (
    <EmployeeTransactionsContext.Provider value={{
      transactions,
      getEmployeeTransactions,
      addTransaction,
      updateTransactionBalance
    }}>
      {children}
    </EmployeeTransactionsContext.Provider>
  );
};

export const useEmployeeTransactions = () => {
  const context = useContext(EmployeeTransactionsContext);
  if (!context) {
    throw new Error("useEmployeeTransactions must be used within EmployeeTransactionsProvider");
  }
  return context;
};
