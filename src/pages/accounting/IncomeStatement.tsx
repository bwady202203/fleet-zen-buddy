import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { ArrowRight, Printer } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
}

const IncomeStatement = () => {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchBranches();

    // Subscribe to real-time updates
    const journalChannel = supabase
      .channel('income-statement-journal-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journal_entries'
        },
        () => {
          console.log('Journal entries changed - updating income statement');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journal_entry_lines'
        },
        () => {
          console.log('Journal lines changed - updating income statement');
          fetchData();
        }
      )
      .subscribe();

    const accountsChannel = supabase
      .channel('income-statement-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chart_of_accounts'
        },
        () => {
          console.log('Accounts changed - updating income statement');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(journalChannel);
      supabase.removeChannel(accountsChannel);
    };
  }, [fromDate, toDate]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .in('type', ['revenue', 'expense'])
        .order('code');

      if (accountsError) throw accountsError;

      const { data: entriesData, error: entriesError } = await supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          branch_id,
          journal_entries!inner (date)
        `)
        .gte('journal_entries.date', fromDate)
        .lte('journal_entries.date', toDate)
        .limit(100000);

      if (entriesError) throw entriesError;

      const balanceMap = new Map<string, AccountBalance>();

      entriesData?.forEach((line: any) => {
        const account = accountsData?.find(acc => acc.id === line.account_id);
        if (!account) return;

        // Apply branch filter
        if (selectedBranch && selectedBranch !== 'all' && selectedBranch !== '' && line.branch_id !== selectedBranch) {
          return;
        }

        if (!balanceMap.has(line.account_id)) {
          balanceMap.set(line.account_id, {
            accountId: line.account_id,
            accountCode: account.code,
            accountName: account.name_ar,
            accountType: account.type,
            balance: 0,
          });
        }

        const bal = balanceMap.get(line.account_id)!;
        const debit = Number(line.debit);
        const credit = Number(line.credit);

        if (account.type === 'expense') {
          bal.balance += debit - credit;
        } else if (account.type === 'revenue') {
          bal.balance += credit - debit;
        }
      });

      setBalances(Array.from(balanceMap.values()));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const revenues = balances.filter(b => b.accountType === 'revenue' && b.balance !== 0);
  const expenses = balances.filter(b => b.accountType === 'expense' && b.balance !== 0);

  const totalRevenues = revenues.reduce((sum, b) => sum + b.balance, 0);
  const totalExpenses = expenses.reduce((sum, b) => sum + b.balance, 0);
  const netIncome = totalRevenues - totalExpenses;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
          }
          .print-title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .print-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 15px;
          }
          .print-date {
            font-size: 14px;
            margin-top: 10px;
          }
          .print-section {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .print-section-title {
            font-size: 20px;
            font-weight: bold;
            padding: 10px;
            background-color: #f0f0f0;
            border: 1px solid #000;
            margin-bottom: 10px;
          }
          .print-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 10px;
            border-bottom: 1px solid #ddd;
          }
          .print-total {
            display: flex;
            justify-content: space-between;
            padding: 12px 10px;
            font-weight: bold;
            background-color: #e8e8e8;
            border: 2px solid #000;
            margin-top: 10px;
            font-size: 16px;
          }
          .print-net-income {
            display: flex;
            justify-content: space-between;
            padding: 15px 10px;
            font-weight: bold;
            background-color: #d0d0d0;
            border: 3px solid #000;
            margin-top: 20px;
            font-size: 20px;
          }
        }
      `}</style>
      <header className="border-b bg-card no-print">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/accounting" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">قائمة الدخل</h1>
                <p className="text-muted-foreground mt-1">الإيرادات والمصروفات</p>
              </div>
            </div>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 print-content">
        <div className="print-header">
          <div className="print-title">قائمة الدخل</div>
          <div className="print-subtitle">Income Statement - قائمة الأرباح والخسائر</div>
          <div className="print-date">
            <strong>من:</strong> {new Date(fromDate).toLocaleDateString('en-GB')} 
            <strong className="mx-2">إلى:</strong> {new Date(toDate).toLocaleDateString('en-GB')} | 
            <strong className="mr-4">تاريخ الطباعة:</strong> {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>

        <Card className="mb-6 no-print">
          <CardHeader>
            <CardTitle>الفترة</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <Label>الفرع</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفروع</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.code} - {branch.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>من</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label>إلى</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-8 space-y-8">
            <div className="print-section">
              <h3 className="font-bold text-xl mb-4 pb-2 border-b-2 border-green-600 text-green-600 print-section-title">
                الإيرادات - Revenue
              </h3>
              <div className="space-y-2">
                {revenues.map(b => (
                  <div key={b.accountId} className="flex justify-between py-3 border-b hover:bg-green-50 transition-colors px-2 rounded print-item">
                    <span className="font-medium">{b.accountCode} - {b.accountName}</span>
                    <span className="text-green-600 font-semibold">{b.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-lg pt-4 mt-2 border-t-2 border-green-600 bg-green-50 p-3 rounded print-total">
                <span>إجمالي الإيرادات</span>
                <span className="text-green-600">{totalRevenues.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="print-section">
              <h3 className="font-bold text-xl mb-4 pb-2 border-b-2 border-red-600 text-red-600 print-section-title">
                المصروفات - Expenses
              </h3>
              <div className="space-y-2">
                {expenses.map(b => (
                  <div key={b.accountId} className="flex justify-between py-3 border-b hover:bg-red-50 transition-colors px-2 rounded print-item">
                    <span className="font-medium">{b.accountCode} - {b.accountName}</span>
                    <span className="text-red-600 font-semibold">{b.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-lg pt-4 mt-2 border-t-2 border-red-600 bg-red-50 p-3 rounded print-total">
                <span>إجمالي المصروفات</span>
                <span className="text-red-600">{totalExpenses.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className={`flex justify-between text-2xl font-bold pt-6 border-t-4 p-4 rounded-lg shadow-md print-net-income ${netIncome >= 0 ? 'bg-green-50 border-green-600 text-green-600' : 'bg-red-50 border-red-600 text-red-600'}`}>
              <span>{netIncome >= 0 ? 'صافي الربح - Net Profit' : 'صافي الخسارة - Net Loss'}</span>
              <span>{Math.abs(netIncome).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default IncomeStatement;
