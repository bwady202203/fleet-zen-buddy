import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
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

const Ledger = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalLines, setJournalLines] = useState<JournalLine[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
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
  
  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
  
  const filteredEntries = journalEntries.filter(entry => {
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;
    const entryLines = journalLines.filter(line => line.journal_entry_id === entry.id);
    return entryLines.some(line => line.account_id === selectedAccount);
  });

  const ledgerEntries = filteredEntries.flatMap(entry => {
    const entryLines = journalLines.filter(
      line => line.journal_entry_id === entry.id && line.account_id === selectedAccount
    );
    return entryLines.map(line => ({
      date: entry.date,
      entryNumber: entry.entry_number,
      entryId: entry.id,
      description: line.description || entry.description,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
    }));
  });

  const handleOpenEntry = (entryId: string) => {
    navigate('/accounting/journal-entries', { state: { openEntryId: entryId } });
  };

  let runningBalance = 0;
  const ledgerWithBalance = ledgerEntries.map(entry => {
    runningBalance += entry.debit - entry.credit;
    return {
      ...entry,
      balance: runningBalance,
    };
  });

  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);

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
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .print-info {
            display: flex;
            justify-content: space-between;
            margin: 15px 0;
            font-size: 14px;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .print-table th, .print-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: right;
          }
          .print-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .print-total {
            background-color: #e8e8e8;
            font-weight: bold;
          }
        }
      `}</style>
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/accounting" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">دفتر الأستاذ</h1>
                <p className="text-muted-foreground mt-1">
                  عرض حركة الحسابات التفصيلية
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
            <CardTitle>فلترة البيانات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>الحساب</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    {level4Accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name_ar}
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

        {selectedAccountData && (
          <Card className="print-content">
            <CardHeader>
              <div className="print-header">
                <div className="print-title">دفتر الأستاذ</div>
                <div className="print-info">
                  <div>
                    <strong>الحساب:</strong> {selectedAccountData.code} - {selectedAccountData.name_ar}
                  </div>
                  <div>
                    {startDate && <span><strong>من:</strong> {new Date(startDate).toLocaleDateString('ar-SA')}</span>}
                    {startDate && endDate && <span className="mx-2">-</span>}
                    {endDate && <span><strong>إلى:</strong> {new Date(endDate).toLocaleDateString('ar-SA')}</span>}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center no-print">
                <div>
                  <CardTitle>{selectedAccountData.code} - {selectedAccountData.name_ar}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{selectedAccountData.name_en}</p>
                </div>
                <div className="text-left">
                  <div className="text-sm text-muted-foreground">الرصيد الحالي</div>
                  <div className="text-2xl font-bold">
                    {runningBalance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="print-table">
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
                      <TableCell>{new Date(entry.date).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell 
                        className="font-medium text-primary cursor-pointer hover:underline"
                        onClick={() => handleOpenEntry(entry.entryId)}
                      >
                        {entry.entryNumber}
                      </TableCell>
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
                    <TableRow className="font-bold bg-accent/50 print-total">
                      <TableCell colSpan={3} className="text-right">الإجمالي</TableCell>
                      <TableCell className="text-left">
                        {totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-left">
                        {totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-left">
                        {runningBalance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  )}
                  {ledgerWithBalance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        لا توجد حركات على هذا الحساب
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!selectedAccountData && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">يرجى اختيار حساب لعرض دفتر الأستاذ</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Ledger;
