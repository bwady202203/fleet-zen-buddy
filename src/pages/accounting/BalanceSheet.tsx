import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { ArrowRight, Printer, ChevronDown, ChevronLeft } from "lucide-react";
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
  children?: AccountBalance[]; // For hierarchical display
  isParent?: boolean;
}

const BalanceSheet = () => {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
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
  }, [startDate, endDate, selectedBranch]);

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

      // Build query for journal entry lines with date filter
      let query = supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          branch_id,
          journal_entries!inner (date)
        `)
        .limit(100000);

      if (startDate) {
        query = query.gte('journal_entries.date', startDate);
      }
      if (endDate) {
        query = query.lte('journal_entries.date', endDate);
      }

      const { data: entriesData, error: entriesError } = await query;

      if (entriesError) throw entriesError;

      // Calculate all leaf account balances
      const allBalances = new Map<string, number>();

      entriesData?.forEach((line: any) => {
        const account = accountsData?.find(acc => acc.id === line.account_id);
        if (!account) return;

        // Apply branch filter
        if (selectedBranch && selectedBranch !== 'all' && selectedBranch !== '' && line.branch_id !== selectedBranch) {
          return;
        }

        if (!allBalances.has(line.account_id)) {
          allBalances.set(line.account_id, 0);
        }

        const debit = Number(line.debit);
        const credit = Number(line.credit);
        const currentBalance = allBalances.get(line.account_id)!;

        if (account.type === 'asset') {
          allBalances.set(line.account_id, currentBalance + debit - credit);
        } else {
          allBalances.set(line.account_id, currentBalance + credit - debit);
        }
      });

      // Build hierarchical structure
      const buildHierarchy = (parentCode: string | null, type: string): AccountBalance[] => {
        const accounts = accountsData?.filter(acc => {
          if (acc.type !== type) return false;
          
          const parts = acc.code.split('/');
          if (parentCode === null) {
            return parts.length === 1; // Root level
          }
          
          const parentParts = parentCode.split('/');
          return parts.length === parentParts.length + 1 && 
                 acc.code.startsWith(parentCode + '/');
        }) || [];

        const result: AccountBalance[] = [];

        accounts.forEach(account => {
          // Calculate total balance including all children
          let totalBalance = 0;
          
          accountsData?.forEach(childAcc => {
            if (childAcc.code === account.code || childAcc.code.startsWith(account.code + '/')) {
              const childBalance = allBalances.get(childAcc.id) || 0;
              totalBalance += childBalance;
            }
          });

          // Get direct children
          const children = buildHierarchy(account.code, type);

          if (totalBalance !== 0 || children.length > 0) {
            result.push({
              accountId: account.id,
              accountCode: account.code,
              accountName: account.name_ar,
              accountType: account.type,
              balance: totalBalance,
              children: children.length > 0 ? children : undefined,
              isParent: children.length > 0
            });
          }
        });

        return result.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      };

      const assets = buildHierarchy(null, 'asset');
      const liabilities = buildHierarchy(null, 'liability');
      const equity = buildHierarchy(null, 'equity');

      setBalances([...assets, ...liabilities, ...equity]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const renderAccountTree = (accounts: AccountBalance[], level: number = 0): JSX.Element[] => {
    return accounts.map(account => (
      <div key={account.accountId} className={level > 0 ? 'mr-4' : ''}>
        <div 
          className={`flex justify-between py-3 border-b hover:bg-accent/50 transition-colors px-2 rounded print-item cursor-pointer ${
            account.isParent ? 'font-bold bg-accent/10' : ''
          }`}
          onClick={() => account.children && toggleAccount(account.accountId)}
        >
          <span className="flex items-center gap-2 font-medium">
            {account.children && (
              expandedAccounts.has(account.accountId) ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronLeft className="h-4 w-4" />
            )}
            {account.accountCode} - {account.accountName}
          </span>
          <span className="font-semibold">{account.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
        </div>
        {account.children && expandedAccounts.has(account.accountId) && (
          <div className="mr-4">
            {renderAccountTree(account.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const assets = balances.filter(b => b.accountType === 'asset');
  const liabilities = balances.filter(b => b.accountType === 'liability');
  const equity = balances.filter(b => b.accountType === 'equity');

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
            {startDate && <><strong>من:</strong> {new Date(startDate).toLocaleDateString('en-GB')} - </>}
            <strong>إلى:</strong> {new Date(endDate).toLocaleDateString('en-GB')} | 
            <strong className="mr-4">تاريخ الطباعة:</strong> {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>

        <Card className="mb-6 no-print">
          <CardHeader>
            <CardTitle>الفلاتر</CardTitle>
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
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div>
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
              <div className="space-y-1">
                {renderAccountTree(assets)}
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
                  <div className="space-y-1">
                    {renderAccountTree(liabilities)}
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
                  <div className="space-y-1">
                    {renderAccountTree(equity)}
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
