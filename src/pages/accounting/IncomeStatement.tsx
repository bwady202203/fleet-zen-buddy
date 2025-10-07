import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

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
          journal_entries!inner (date)
        `)
        .gte('journal_entries.date', fromDate)
        .lte('journal_entries.date', toDate);

      if (entriesError) throw entriesError;

      const balanceMap = new Map<string, AccountBalance>();

      entriesData?.forEach((line: any) => {
        const account = accountsData?.find(acc => acc.id === line.account_id);
        if (!account) return;

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
      <header className="border-b bg-card">
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

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>الفترة</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
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

        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-4 text-green-600">الإيرادات</h3>
              {revenues.map(b => (
                <div key={b.accountId} className="flex justify-between py-2 border-b">
                  <span className="font-medium">{b.accountCode} - {b.accountName}</span>
                  <span className="text-green-600">{b.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-4 border-t-2 text-green-600">
                <span>إجمالي الإيرادات</span>
                <span>{totalRevenues.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4 text-red-600">المصروفات</h3>
              {expenses.map(b => (
                <div key={b.accountId} className="flex justify-between py-2 border-b">
                  <span className="font-medium">{b.accountCode} - {b.accountName}</span>
                  <span className="text-red-600">{b.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-4 border-t-2 text-red-600">
                <span>إجمالي المصروفات</span>
                <span>{totalExpenses.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
              </div>
            </div>

            <div className={`flex justify-between text-xl font-bold pt-4 border-t-2 ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <span>{netIncome >= 0 ? 'صافي الربح' : 'صافي الخسارة'}</span>
              <span>{Math.abs(netIncome).toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default IncomeStatement;
