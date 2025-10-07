import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchData();
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

  const calculateLevel = (account: Account): number => {
    if (!account.parent_id) return 1;
    const parent = accounts.find(a => a.id === account.parent_id);
    if (!parent) return 1;
    return calculateLevel(parent) + 1;
  };

  const level4Accounts = accounts.filter(acc => calculateLevel(acc) === 4);

  const trialBalanceData = level4Accounts.map(account => {
    const filteredEntries = journalEntries.filter(entry => {
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;
      return true;
    });

    const accountLines = journalLines.filter(line => {
      const lineEntry = filteredEntries.find(e => e.id === line.journal_entry_id);
      return lineEntry && line.account_id === account.id;
    });

    const debit = accountLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const credit = accountLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    const balance = debit - credit;

    return {
      code: account.code,
      name: account.name_ar,
      debit,
      credit,
      balance,
    };
  });

  const totalDebit = trialBalanceData.reduce((sum, acc) => sum + acc.debit, 0);
  const totalCredit = trialBalanceData.reduce((sum, acc) => sum + acc.credit, 0);
  const totalBalance = totalDebit - totalCredit;

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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>فلترة الفترة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
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

        <Card>
          <CardHeader>
            <CardTitle>ميزان المراجعة</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رمز الحساب</TableHead>
                  <TableHead className="text-right">اسم الحساب</TableHead>
                  <TableHead className="text-right">المدين</TableHead>
                  <TableHead className="text-right">الدائن</TableHead>
                  <TableHead className="text-right">الرصيد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalanceData.map((account, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{account.code}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell className="text-left font-medium">
                      {account.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left font-medium">
                      {account.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left font-bold">
                      {account.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                {trialBalanceData.length > 0 && (
                  <TableRow className="font-bold bg-accent/50">
                    <TableCell colSpan={2} className="text-right">الإجمالي</TableCell>
                    <TableCell className="text-left text-lg">
                      {totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left text-lg">
                      {totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left text-lg">
                      {totalBalance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                )}
                {trialBalanceData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      لا توجد حركات محاسبية في الفترة المحددة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          {trialBalanceData.length > 0 && (
            <CardContent className="border-t">
              <div className="flex justify-center">
                {totalDebit === totalCredit ? (
                  <div className="text-green-600 font-bold text-lg">
                    ✓ ميزان المراجعة متوازن
                  </div>
                ) : (
                  <div className="text-destructive font-bold text-lg">
                    ✗ ميزان المراجعة غير متوازن - الفرق: {Math.abs(totalDebit - totalCredit).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
};

export default TrialBalance;
