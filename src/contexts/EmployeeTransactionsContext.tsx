import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  addTransaction: (transaction: Omit<EmployeeTransaction, "id">) => Promise<void>;
  updateTransactionBalance: (id: string, paidAmount: number) => Promise<void>;
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
  const [transactions, setTransactions] = useState<EmployeeTransaction[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_transactions')
        .select('*, employees(name)')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped: EmployeeTransaction[] = data.map(t => ({
          id: t.id,
          employeeId: t.employee_id,
          employeeName: t.employees?.name || '',
          type: t.type as "advance" | "addition" | "deduction",
          amount: Number(t.amount),
          originalAmount: Number(t.amount),
          remainingBalance: Number(t.remaining_balance) || 0,
          date: t.date,
          reason: t.description || '',
          voucherNumber: `${t.type.toUpperCase()}-${t.id.substring(0, 8)}`,
          status: 'approved',
          category: t.type,
        }));
        setTransactions(mapped);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

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

  const addTransaction = async (transaction: Omit<EmployeeTransaction, "id">) => {
    try {
      const { data, error } = await supabase
        .from('employee_transactions')
        .insert({
          employee_id: transaction.employeeId,
          type: transaction.type,
          amount: transaction.amount,
          remaining_balance: transaction.type === 'advance' ? transaction.amount : 0,
          date: transaction.date,
          description: transaction.reason,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newTransaction: EmployeeTransaction = {
          id: data.id,
          employeeId: transaction.employeeId,
          employeeName: transaction.employeeName,
          type: transaction.type,
          amount: transaction.amount,
          originalAmount: transaction.amount,
          remainingBalance: transaction.type === 'advance' ? transaction.amount : 0,
          date: transaction.date,
          reason: transaction.reason,
          voucherNumber: `${transaction.type.toUpperCase()}-${data.id.substring(0, 8)}`,
          status: 'approved',
          category: transaction.type,
        };
        setTransactions(prev => [...prev, newTransaction]);
        
        toast({
          title: 'تم التسجيل / Recorded',
          description: 'تم إضافة المعاملة بنجاح / Transaction added successfully',
        });
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل إضافة المعاملة / Failed to add transaction',
        variant: 'destructive',
      });
    }
  };

  const updateTransactionBalance = async (id: string, paidAmount: number) => {
    try {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction || transaction.type !== 'advance') return;

      const newBalance = Math.max(0, transaction.remainingBalance - paidAmount);

      const { error } = await supabase
        .from('employee_transactions')
        .update({ remaining_balance: newBalance })
        .eq('id', id);

      if (error) throw error;

      setTransactions(prev => prev.map(t => {
        if (t.id === id && t.type === "advance") {
          return { ...t, remainingBalance: newBalance };
        }
        return t;
      }));
    } catch (error) {
      console.error('Error updating transaction balance:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل تحديث الرصيد / Failed to update balance',
        variant: 'destructive',
      });
    }
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
