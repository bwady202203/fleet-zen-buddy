import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { ArrowRight, Printer } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface Account {
  id: string;
  code: string;
  name_ar: string;
  type: string;
}

interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
}

const BalanceSheet = () => {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [asOfDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .in('type', ['asset', 'liability', 'equity'])
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
        .lte('journal_entries.date', asOfDate);

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

        if (account.type === 'asset') {
          bal.balance += debit - credit;
        } else {
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

  const assets = balances.filter(b => b.accountType === 'asset' && b.balance !== 0);
  const liabilities = balances.filter(b => b.accountType === 'liability' && b.balance !== 0);
  const equity = balances.filter(b => b.accountType === 'equity' && b.balance !== 0);

  const totalAssets = assets.reduce((sum, b) => sum + b.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, b) => sum + b.balance, 0);
  const totalEquity = equity.reduce((sum, b) => sum + b.balance, 0);

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
                <h1 className="text-3xl font-bold">الميزانية العمومية</h1>
                <p className="text-muted-foreground mt-1">المركز المالي</p>
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
            <CardTitle>التاريخ</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>كما في</Label>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="max-w-xs"
            />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="bg-primary/10">
              <CardTitle>الأصول</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {assets.map(b => (
                <div key={b.accountId} className="flex justify-between py-2 border-b">
                  <span className="font-medium">{b.accountCode} - {b.accountName}</span>
                  <span>{b.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-4 mt-4 border-t-2">
                <span>إجمالي الأصول</span>
                <span>{totalAssets.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-primary/10">
              <CardTitle>الخصوم وحقوق الملكية</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {liabilities.length > 0 && (
                <div>
                  <h3 className="font-bold mb-2">الخصوم</h3>
              {liabilities.map(b => (
                <div key={b.accountId} className="flex justify-between py-2 border-b">
                  <span className="font-medium">{b.accountCode} - {b.accountName}</span>
                  <span>{b.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
                </div>
              ))}
                  <div className="flex justify-between font-semibold pt-2">
                    <span>المجموع</span>
                    <span>{totalLiabilities.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
                  </div>
                </div>
              )}
              {equity.length > 0 && (
                <div>
                  <h3 className="font-bold mb-2">حقوق الملكية</h3>
              {equity.map(b => (
                <div key={b.accountId} className="flex justify-between py-2 border-b">
                  <span className="font-medium">{b.accountCode} - {b.accountName}</span>
                  <span>{b.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
                </div>
              ))}
                  <div className="flex justify-between font-semibold pt-2">
                    <span>المجموع</span>
                    <span>{totalEquity.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between font-bold pt-4 mt-4 border-t-2">
                <span>الإجمالي</span>
                <span>{(totalLiabilities + totalEquity).toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardContent className="p-6 text-center">
            <div className="text-lg">
              {Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01 ? (
                <p className="text-green-600 font-bold">✓ الميزانية متوازنة</p>
              ) : (
                <p className="text-red-600 font-bold">✗ الميزانية غير متوازنة</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BalanceSheet;
