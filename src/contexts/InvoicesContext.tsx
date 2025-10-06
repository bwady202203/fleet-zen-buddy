import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAccounting } from './AccountingContext';

export interface InvoiceItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate: number;
  taxAmount: number;
  accountId: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'sales' | 'purchase' | 'sales-return' | 'purchase-return';
  date: string;
  customerSupplierName: string;
  customerSupplierAccount: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string;
  createdAt: string;
  journalEntryId?: string;
}

interface InvoicesContextType {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'journalEntryId'>) => void;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  getInvoicesByType: (type: Invoice['type']) => Invoice[];
  getNextInvoiceNumber: (type: Invoice['type']) => string;
}

const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined);

export const InvoicesProvider = ({ children }: { children: ReactNode }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { addJournalEntry } = useAccounting();

  const createJournalEntryFromInvoice = (invoice: Invoice) => {
    const lines = [];
    const isDebit = invoice.type === 'sales' || invoice.type === 'purchase-return';

    // سطر العميل/المورد
    lines.push({
      id: `line-${Date.now()}-1`,
      accountId: invoice.customerSupplierAccount,
      accountCode: '',
      accountName: invoice.customerSupplierName,
      description: `${getInvoiceTypeText(invoice.type)} - ${invoice.invoiceNumber}`,
      debit: isDebit ? invoice.total : 0,
      credit: isDebit ? 0 : invoice.total,
    });

    // سطور الأصناف
    invoice.items.forEach((item, index) => {
      lines.push({
        id: `line-${Date.now()}-${index + 2}`,
        accountId: item.accountId,
        accountCode: '',
        accountName: item.itemName,
        description: item.itemName,
        debit: isDebit ? 0 : item.total - item.taxAmount,
        credit: isDebit ? item.total - item.taxAmount : 0,
      });

      // سطر الضريبة إذا وجدت
      if (item.taxAmount > 0) {
        lines.push({
          id: `line-${Date.now()}-${index + 2}-tax`,
          accountId: 'acc_tax', // يجب إنشاء حساب الضريبة
          accountCode: '',
          accountName: 'ضريبة القيمة المضافة',
          description: `ضريبة ${item.itemName}`,
          debit: isDebit ? 0 : item.taxAmount,
          credit: isDebit ? item.taxAmount : 0,
        });
      }
    });

    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    addJournalEntry({
      entryNumber: `INV-${invoice.invoiceNumber}`,
      date: invoice.date,
      description: `${getInvoiceTypeText(invoice.type)} - ${invoice.customerSupplierName}`,
      lines,
      totalDebit,
      totalCredit,
      createdBy: 'نظام الفواتير',
    });
  };

  const getInvoiceTypeText = (type: Invoice['type']) => {
    switch (type) {
      case 'sales': return 'فاتورة مبيعات';
      case 'purchase': return 'فاتورة مشتريات';
      case 'sales-return': return 'مرتجع مبيعات';
      case 'purchase-return': return 'مرتجع مشتريات';
      default: return '';
    }
  };

  const addInvoice = (invoice: Omit<Invoice, 'id' | 'createdAt' | 'journalEntryId'>) => {
    const newInvoice: Invoice = {
      ...invoice,
      id: `inv${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    
    setInvoices([...invoices, newInvoice]);
    createJournalEntryFromInvoice(newInvoice);
  };

  const updateInvoice = (id: string, updatedInvoice: Partial<Invoice>) => {
    setInvoices(invoices.map(inv => inv.id === id ? { ...inv, ...updatedInvoice } : inv));
  };

  const deleteInvoice = (id: string) => {
    setInvoices(invoices.filter(inv => inv.id !== id));
  };

  const getInvoicesByType = (type: Invoice['type']) => {
    return invoices.filter(inv => inv.type === type);
  };

  const getNextInvoiceNumber = (type: Invoice['type']) => {
    const prefix = {
      'sales': 'S',
      'purchase': 'P',
      'sales-return': 'SR',
      'purchase-return': 'PR',
    }[type];

    const currentYear = new Date().getFullYear();
    const invoicesOfType = invoices.filter(inv => 
      inv.type === type && inv.invoiceNumber.startsWith(`${prefix}${currentYear}`)
    );
    const nextNumber = invoicesOfType.length + 1;
    return `${prefix}${currentYear}${nextNumber.toString().padStart(5, '0')}`;
  };

  return (
    <InvoicesContext.Provider
      value={{
        invoices,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        getInvoicesByType,
        getNextInvoiceNumber,
      }}
    >
      {children}
    </InvoicesContext.Provider>
  );
};

export const useInvoices = () => {
  const context = useContext(InvoicesContext);
  if (!context) {
    throw new Error('useInvoices must be used within an InvoicesProvider');
  }
  return context;
};
