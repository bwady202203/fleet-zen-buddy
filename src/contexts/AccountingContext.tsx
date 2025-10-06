import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Account {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  level: 1 | 2 | 3 | 4;
  parentId: string | null;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  isActive: boolean;
  balance: number;
  debit: number;
  credit: number;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  costCenter?: string;
  projectName?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  createdAt: string;
}

interface AccountingContextType {
  accounts: Account[];
  journalEntries: JournalEntry[];
  addAccount: (account: Omit<Account, 'id' | 'balance' | 'debit' | 'credit'>) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'> & { entryNumber?: string }) => void;
  updateJournalEntry: (id: string, entry: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  getAccountsByLevel: (level: number) => Account[];
  getChildAccounts: (parentId: string) => Account[];
  searchAccounts: (query: string) => Account[];
  getNextEntryNumber: () => string;
  calculateAccountBalance: (accountId: string) => { debit: number; credit: number; balance: number };
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

// بيانات تجريبية لشجرة الحسابات
const initialAccounts: Account[] = [
  // المستوى الأول - الأصول
  { id: 'acc1', code: '1', name: 'الأصول', nameEn: 'Assets', level: 1, parentId: null, type: 'asset', isActive: true, balance: 0, debit: 0, credit: 0 },
  { id: 'acc2', code: '2', name: 'الخصوم', nameEn: 'Liabilities', level: 1, parentId: null, type: 'liability', isActive: true, balance: 0, debit: 0, credit: 0 },
  { id: 'acc3', code: '3', name: 'حقوق الملكية', nameEn: 'Equity', level: 1, parentId: null, type: 'equity', isActive: true, balance: 0, debit: 0, credit: 0 },
  { id: 'acc4', code: '4', name: 'الإيرادات', nameEn: 'Revenue', level: 1, parentId: null, type: 'revenue', isActive: true, balance: 0, debit: 0, credit: 0 },
  { id: 'acc5', code: '5', name: 'المصروفات', nameEn: 'Expenses', level: 1, parentId: null, type: 'expense', isActive: true, balance: 0, debit: 0, credit: 0 },
  
  // المستوى الثاني - الأصول المتداولة
  { id: 'acc11', code: '11', name: 'الأصول المتداولة', nameEn: 'Current Assets', level: 2, parentId: 'acc1', type: 'asset', isActive: true, balance: 0, debit: 0, credit: 0 },
  { id: 'acc12', code: '12', name: 'الأصول الثابتة', nameEn: 'Fixed Assets', level: 2, parentId: 'acc1', type: 'asset', isActive: true, balance: 0, debit: 0, credit: 0 },
  
  // المستوى الثالث
  { id: 'acc111', code: '111', name: 'النقدية', nameEn: 'Cash', level: 3, parentId: 'acc11', type: 'asset', isActive: true, balance: 0, debit: 0, credit: 0 },
  { id: 'acc112', code: '112', name: 'البنوك', nameEn: 'Banks', level: 3, parentId: 'acc11', type: 'asset', isActive: true, balance: 0, debit: 0, credit: 0 },
  { id: 'acc113', code: '113', name: 'العملاء', nameEn: 'Accounts Receivable', level: 3, parentId: 'acc11', type: 'asset', isActive: true, balance: 0, debit: 0, credit: 0 },
  
  // المستوى الرابع
  { id: 'acc1111', code: '1111', name: 'الصندوق', nameEn: 'Cash Box', level: 4, parentId: 'acc111', type: 'asset', isActive: true, balance: 0, debit: 0, credit: 0 },
  { id: 'acc1121', code: '1121', name: 'البنك الأهلي', nameEn: 'National Bank', level: 4, parentId: 'acc112', type: 'asset', isActive: true, balance: 0, debit: 0, credit: 0 },
  
  // حسابات المصروفات
  { id: 'acc51', code: '51', name: 'مصروفات التشغيل', nameEn: 'Operating Expenses', level: 2, parentId: 'acc5', type: 'expense', isActive: true, balance: 0, debit: 0, credit: 0 },
  { id: 'acc511', code: '511', name: 'الرواتب والأجور', nameEn: 'Salaries', level: 3, parentId: 'acc51', type: 'expense', isActive: true, balance: 0, debit: 0, credit: 0 },
  
  // حسابات الإيرادات
  { id: 'acc41', code: '41', name: 'إيرادات التشغيل', nameEn: 'Operating Revenue', level: 2, parentId: 'acc4', type: 'revenue', isActive: true, balance: 0, debit: 0, credit: 0 },
  { id: 'acc411', code: '411', name: 'إيرادات المبيعات', nameEn: 'Sales Revenue', level: 3, parentId: 'acc41', type: 'revenue', isActive: true, balance: 0, debit: 0, credit: 0 },
];

export const AccountingProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  const addAccount = (account: Omit<Account, 'id' | 'balance' | 'debit' | 'credit'>) => {
    const newAccount: Account = {
      ...account,
      id: `acc${Date.now()}`,
      balance: 0,
      debit: 0,
      credit: 0,
    };
    setAccounts([...accounts, newAccount]);
  };

  const updateAccount = (id: string, updatedAccount: Partial<Account>) => {
    setAccounts(accounts.map(acc => acc.id === id ? { ...acc, ...updatedAccount } : acc));
  };

  const deleteAccount = (id: string) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
  };

  const addJournalEntry = (entry: Omit<JournalEntry, 'id' | 'createdAt'> & { entryNumber?: string }) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: `je${Date.now()}`,
      entryNumber: entry.entryNumber || getNextEntryNumber(),
      createdAt: new Date().toISOString(),
    };
    
    setJournalEntries([...journalEntries, newEntry]);
    
    // تحديث أرصدة الحسابات
    const updatedAccounts = [...accounts];
    entry.lines.forEach(line => {
      const accountIndex = updatedAccounts.findIndex(acc => acc.id === line.accountId);
      if (accountIndex !== -1) {
        updatedAccounts[accountIndex].debit += line.debit;
        updatedAccounts[accountIndex].credit += line.credit;
        updatedAccounts[accountIndex].balance = updatedAccounts[accountIndex].debit - updatedAccounts[accountIndex].credit;
      }
    });
    setAccounts(updatedAccounts);
  };

  const updateJournalEntry = (id: string, updatedEntry: Partial<JournalEntry>) => {
    setJournalEntries(journalEntries.map(entry => entry.id === id ? { ...entry, ...updatedEntry } : entry));
  };

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(journalEntries.filter(entry => entry.id !== id));
  };

  const getAccountsByLevel = (level: number) => {
    return accounts.filter(acc => acc.level === level);
  };

  const getChildAccounts = (parentId: string) => {
    return accounts.filter(acc => acc.parentId === parentId);
  };

  const searchAccounts = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return accounts.filter(acc => 
      acc.code.includes(query) || 
      acc.name.toLowerCase().includes(lowerQuery) ||
      acc.nameEn.toLowerCase().includes(lowerQuery)
    );
  };

  const getNextEntryNumber = () => {
    const currentYear = new Date().getFullYear();
    const entriesThisYear = journalEntries.filter(entry => 
      entry.entryNumber.startsWith(currentYear.toString())
    );
    const nextNumber = entriesThisYear.length + 1;
    return `${currentYear}${nextNumber.toString().padStart(6, '0')}`;
  };

  const calculateAccountBalance = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return { debit: 0, credit: 0, balance: 0 };
    
    return {
      debit: account.debit,
      credit: account.credit,
      balance: account.balance
    };
  };

  return (
    <AccountingContext.Provider
      value={{
        accounts,
        journalEntries,
        addAccount,
        updateAccount,
        deleteAccount,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        getAccountsByLevel,
        getChildAccounts,
        searchAccounts,
        getNextEntryNumber,
        calculateAccountBalance,
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};
