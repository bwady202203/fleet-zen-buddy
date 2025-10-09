import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, Printer } from "lucide-react";
import { toast } from "sonner";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
}

interface JournalEntry {
  id: string;
  date: string;
  entry_number: string;
  description: string;
}

interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string;
}

const TrialBalance = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalLines, setJournalLines] = useState<JournalLine[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAccountForLedger, setSelectedAccountForLedger] = useState<Account | null>(null);

  useEffect(() => {
    fetchData();
    fetchBranches();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, entriesRes, linesRes] = await Promise.all([
        supabase.from('chart_of_accounts').select('*').eq('is_active', true),
        supabase.from('journal_entries').select('*').order('date', { ascending: true }),
        supabase.from('journal_entry_lines').select('*')
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (entriesRes.error) throw entriesRes.error;
      if (linesRes.error) throw linesRes.error;

      setAccounts(accountsRes.data || []);
      setJournalEntries(entriesRes.data || []);
      setJournalLines(linesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    }
  };

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

  const calculateLevel = (account: Account): number => {
    if (!account.parent_id) return 1;
    const parent = accounts.find(a => a.id === account.parent_id);
    if (!parent) return 1;
    return calculateLevel(parent) + 1;
  };

  const level4Accounts = accounts.filter(acc => calculateLevel(acc) === 4);

  const trialBalanceData = level4Accounts.map(account => {
    // حساب الرصيد الافتتاحي (قبل تاريخ البداية)
    const openingEntries = journalEntries.filter(entry => {
      if (startDate && entry.date < startDate) return true;
      return false;
    });

    const openingLines = journalLines.filter(line => {
      const lineEntry = openingEntries.find(e => e.id === line.journal_entry_id);
      return lineEntry && line.account_id === account.id;
    });

    const openingDebit = openingLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const openingCredit = openingLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

    // حساب حركة الفترة (من تاريخ البداية إلى تاريخ النهاية)
    const periodEntries = journalEntries.filter(entry => {
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;
      return true;
    });

    const periodLines = journalLines.filter(line => {
      const lineEntry = periodEntries.find(e => e.id === line.journal_entry_id);
      return lineEntry && line.account_id === account.id;
    });

    const periodDebit = periodLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const periodCredit = periodLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

    // حساب الرصيد الختامي
    const closingDebit = openingDebit + periodDebit;
    const closingCredit = openingCredit + periodCredit;

    return {
      account,
      code: account.code,
      name: account.name_ar,
      openingDebit,
      openingCredit,
      periodDebit,
      periodCredit,
      closingDebit,
      closingCredit,
    };
  });

  const totalOpeningDebit = trialBalanceData.reduce((sum, acc) => sum + acc.openingDebit, 0);
  const totalOpeningCredit = trialBalanceData.reduce((sum, acc) => sum + acc.openingCredit, 0);
  const totalPeriodDebit = trialBalanceData.reduce((sum, acc) => sum + acc.periodDebit, 0);
  const totalPeriodCredit = trialBalanceData.reduce((sum, acc) => sum + acc.periodCredit, 0);
  const totalClosingDebit = trialBalanceData.reduce((sum, acc) => sum + acc.closingDebit, 0);
  const totalClosingCredit = trialBalanceData.reduce((sum, acc) => sum + acc.closingCredit, 0);

  // معاينة دفتر الأستاذ
  const ledgerFilteredEntries = selectedAccountForLedger 
    ? journalEntries.filter(entry => {
        if (startDate && entry.date < startDate) return false;
        if (endDate && entry.date > endDate) return false;
        const entryLines = journalLines.filter(line => line.journal_entry_id === entry.id);
        return entryLines.some(line => line.account_id === selectedAccountForLedger.id);
      })
    : [];

  const ledgerEntries = ledgerFilteredEntries.flatMap(entry => {
    const entryLines = journalLines.filter(
      line => line.journal_entry_id === entry.id && line.account_id === selectedAccountForLedger?.id
    );
    return entryLines.map(line => ({
      date: entry.date,
      entryNumber: entry.entry_number,
      description: line.description || entry.description,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
    }));
  });

  let runningBalance = 0;
  const ledgerWithBalance = ledgerEntries.map(entry => {
    runningBalance += entry.debit - entry.credit;
    return {
      ...entry,
      balance: runningBalance,
    };
  });

  const ledgerTotalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const ledgerTotalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);

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
            margin-bottom: 10px;
          }
          .print-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 15px;
          }
          .print-info {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            margin-top: 10px;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .print-table th, .print-table td {
            border: 1px solid #000;
            padding: 10px;
            text-align: right;
          }
          .print-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .print-total {
            background-color: #e8e8e8;
            font-weight: bold;
            font-size: 16px;
          }
          .print-balance-status {
            margin-top: 20px;
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
                <h1 className="text-3xl font-bold">ميزان المراجعة</h1>
                <p className="text-muted-foreground mt-1">
                  عرض أرصدة الحسابات والتحقق من التوازن
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6 no-print">
          <CardHeader>
            <CardTitle>فلترة الفترة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
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
                />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print-content">
          <CardHeader>
            <div className="print-header">
              <div className="print-title">ميزان المراجعة</div>
              <div className="print-subtitle">Trial Balance</div>
              <div className="print-info">
                <div>
                  {startDate && <span><strong>من:</strong> {new Date(startDate).toLocaleDateString('en-GB')}</span>}
                  {startDate && endDate && <span className="mx-2">-</span>}
                  {endDate && <span><strong>إلى:</strong> {new Date(endDate).toLocaleDateString('en-GB')}</span>}
                </div>
                <div>
                  <strong>تاريخ الطباعة:</strong> {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>
            <CardTitle className="no-print">ميزان المراجعة</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right" rowSpan={2}>رمز الحساب</TableHead>
                  <TableHead className="text-right" rowSpan={2}>اسم الحساب</TableHead>
                  <TableHead className="text-center" colSpan={2}>الرصيد الافتتاحي</TableHead>
                  <TableHead className="text-center" colSpan={2}>حركة الفترة</TableHead>
                  <TableHead className="text-center" colSpan={2}>الرصيد الختامي</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-right">مدين</TableHead>
                  <TableHead className="text-right">دائن</TableHead>
                  <TableHead className="text-right">مدين</TableHead>
                  <TableHead className="text-right">دائن</TableHead>
                  <TableHead className="text-right">مدين</TableHead>
                  <TableHead className="text-right">دائن</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalanceData.map((account, index) => (
                  <TableRow key={index} className="hover:bg-accent/50 transition-colors">
                    <TableCell 
                      className="font-medium text-primary cursor-pointer hover:underline"
                      onClick={() => setSelectedAccountForLedger(account.account)}
                    >
                      {account.code}
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer hover:text-primary hover:underline"
                      onClick={() => setSelectedAccountForLedger(account.account)}
                    >
                      {account.name}
                    </TableCell>
                    <TableCell className="text-left font-medium">
                      {account.openingDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left font-medium">
                      {account.openingCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left font-medium">
                      {account.periodDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left font-medium">
                      {account.periodCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left font-bold">
                      {account.closingDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left font-bold">
                      {account.closingCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                {trialBalanceData.length > 0 && (
                  <TableRow className="font-bold bg-accent/50 print-total">
                    <TableCell colSpan={2} className="text-right text-lg">الإجمالي</TableCell>
                    <TableCell className="text-left text-lg">
                      {totalOpeningDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left text-lg">
                      {totalOpeningCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left text-lg">
                      {totalPeriodDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left text-lg">
                      {totalPeriodCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left text-lg">
                      {totalClosingDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left text-lg">
                      {totalClosingCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                )}
                {trialBalanceData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      لا توجد حركات محاسبية في الفترة المحددة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          {trialBalanceData.length > 0 && (
            <CardContent className="border-t">
              <div className="print-balance-status">
                {Math.abs(totalPeriodDebit - totalPeriodCredit) < 0.01 ? (
                  <div className="text-green-600 font-bold text-xl">
                    ✓ ميزان المراجعة متوازن
                  </div>
                ) : (
                  <div className="text-destructive font-bold text-xl">
                    ✗ ميزان المراجعة غير متوازن - الفرق: {Math.abs(totalPeriodDebit - totalPeriodCredit).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </main>

      {/* معاينة دفتر الأستاذ */}
      <Dialog open={!!selectedAccountForLedger} onOpenChange={() => setSelectedAccountForLedger(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl">دفتر الأستاذ - معاينة</DialogTitle>
          </DialogHeader>
          
          {selectedAccountForLedger && (
            <div className="space-y-6">
              <div className="p-4 bg-accent/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">الحساب</div>
                    <div className="font-bold text-lg">
                      {selectedAccountForLedger.code} - {selectedAccountForLedger.name_ar}
                    </div>
                    <div className="text-sm text-muted-foreground">{selectedAccountForLedger.name_en}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-muted-foreground">الرصيد</div>
                    <div className="text-2xl font-bold">
                      {runningBalance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">رقم القيد</TableHead>
                      <TableHead className="text-right">البيان</TableHead>
                      <TableHead className="text-right">المدين</TableHead>
                      <TableHead className="text-right">الدائن</TableHead>
                      <TableHead className="text-right">الرصيد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerWithBalance.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(entry.date).toLocaleDateString('en-GB')}</TableCell>
                        <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-left font-medium">
                          {entry.debit > 0 ? entry.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                        </TableCell>
                        <TableCell className="text-left font-medium">
                          {entry.credit > 0 ? entry.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                        </TableCell>
                        <TableCell className="text-left font-bold">
                          {entry.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {ledgerWithBalance.length > 0 && (
                      <TableRow className="font-bold bg-accent/50">
                        <TableCell colSpan={3} className="text-right">الإجمالي</TableCell>
                        <TableCell className="text-left">
                          {ledgerTotalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-left">
                          {ledgerTotalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-left">
                          {runningBalance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    )}
                    {ledgerWithBalance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          لا توجد حركات على هذا الحساب في الفترة المحددة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedAccountForLedger(null)}>
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrialBalance;
