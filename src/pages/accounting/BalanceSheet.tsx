import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchBranches();

    // Subscribe to real-time updates
    const journalChannel = supabase
      .channel('balance-sheet-journal-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journal_entries'
        },
        () => {
          console.log('Journal entries changed - updating balance sheet');
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
          console.log('Journal lines changed - updating balance sheet');
          fetchData();
        }
      )
      .subscribe();

    const accountsChannel = supabase
      .channel('balance-sheet-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chart_of_accounts'
        },
        () => {
          console.log('Accounts changed - updating balance sheet');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(journalChannel);
      supabase.removeChannel(accountsChannel);
    };
  }, [asOfDate]);

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
        .in('type', ['asset', 'liability', 'equity'])
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
        .lte('journal_entries.date', asOfDate);

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
          .print-balance-status {
            margin-top: 30px;
            padding: 15px;
            text-align: center;
            border: 2px solid #000;
            font-size: 18px;
            font-weight: bold;
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

      <main className="container mx-auto px-4 py-8 print-content">
        <div className="print-header">
          <div className="print-title">الميزانية العمومية</div>
          <div className="print-subtitle">Balance Sheet - قائمة المركز المالي</div>
          <div className="print-date">
            <strong>كما في:</strong> {new Date(asOfDate).toLocaleDateString('en-GB')} | 
            <strong className="mr-4">تاريخ الطباعة:</strong> {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>

        <Card className="mb-6 no-print">
          <CardHeader>
            <CardTitle>التاريخ</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
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
              <Label>كما في</Label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10 border-b-2 border-primary">
              <CardTitle className="text-2xl">الأصول - Assets</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                {assets.map(b => (
                  <div key={b.accountId} className="flex justify-between py-3 border-b hover:bg-accent/50 transition-colors px-2 rounded print-item">
                    <span className="font-medium">{b.accountCode} - {b.accountName}</span>
                    <span className="font-semibold">{b.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-lg pt-4 mt-4 border-t-2 border-primary bg-primary/5 p-3 rounded print-total">
                <span>إجمالي الأصول</span>
                <span>{totalAssets.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10 border-b-2 border-primary">
              <CardTitle className="text-2xl">الخصوم وحقوق الملكية</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {liabilities.length > 0 && (
                <div className="print-section">
                  <h3 className="font-bold text-lg mb-3 text-primary print-section-title">الخصوم - Liabilities</h3>
                  <div className="space-y-2">
                    {liabilities.map(b => (
                      <div key={b.accountId} className="flex justify-between py-3 border-b hover:bg-accent/50 transition-colors px-2 rounded print-item">
                        <span className="font-medium">{b.accountCode} - {b.accountName}</span>
                        <span className="font-semibold">{b.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-semibold pt-3 mt-2 bg-accent/30 p-2 rounded">
                    <span>المجموع</span>
                    <span>{totalLiabilities.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
              {equity.length > 0 && (
                <div className="print-section">
                  <h3 className="font-bold text-lg mb-3 text-primary print-section-title">حقوق الملكية - Equity</h3>
                  <div className="space-y-2">
                    {equity.map(b => (
                      <div key={b.accountId} className="flex justify-between py-3 border-b hover:bg-accent/50 transition-colors px-2 rounded print-item">
                        <span className="font-medium">{b.accountCode} - {b.accountName}</span>
                        <span className="font-semibold">{b.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-semibold pt-3 mt-2 bg-accent/30 p-2 rounded">
                    <span>المجموع</span>
                    <span>{totalEquity.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-4 mt-4 border-t-2 border-primary bg-primary/5 p-3 rounded print-total">
                <span>الإجمالي</span>
                <span>{(totalLiabilities + totalEquity).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 shadow-lg">
          <CardContent className="p-6 text-center print-balance-status">
            <div className="text-xl">
              {Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01 ? (
                <p className="text-green-600 font-bold">✓ الميزانية متوازنة - Balance Sheet is Balanced</p>
              ) : (
                <p className="text-red-600 font-bold">✗ الميزانية غير متوازنة - Balance Sheet is not Balanced</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BalanceSheet;
