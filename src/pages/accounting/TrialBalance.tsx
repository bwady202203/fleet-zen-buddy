import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { ArrowRight, Printer, Calendar, CalendarClock, CalendarRange, Plus, Layers } from "lucide-react";
import { toast } from "sonner";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  type: string;
  parent_id: string | null;
}

interface JournalEntry {
  id: string;
  date: string;
  entry_number: string;
  description: string;
  reference?: string;
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
  const [displayLevel, setDisplayLevel] = useState<number>(4);
  const [editingBalances, setEditingBalances] = useState<{[key: string]: { debit: string, credit: string }}>({});
  
  // Opening Balance Dialog
  const [openingBalanceDialog, setOpeningBalanceDialog] = useState(false);
  const [openingBalanceAccount, setOpeningBalanceAccount] = useState("");
  const [openingBalanceDebit, setOpeningBalanceDebit] = useState("");
  const [openingBalanceCredit, setOpeningBalanceCredit] = useState("");
  const [openingBalanceDate, setOpeningBalanceDate] = useState("");
  const [openingBalanceDescription, setOpeningBalanceDescription] = useState("");
  
  // Add Account Dialog
  const [addAccountDialog, setAddAccountDialog] = useState(false);
  const [quickAddParentId, setQuickAddParentId] = useState<string>("");
  const [newAccountParent, setNewAccountParent] = useState("");
  const [newAccountType, setNewAccountType] = useState("");
  const [newAccountCode, setNewAccountCode] = useState("");
  const [newAccountNameAr, setNewAccountNameAr] = useState("");
  const [newAccountNameEn, setNewAccountNameEn] = useState("");

  useEffect(() => {
    fetchData();
    fetchBranches();

    // Subscribe to real-time updates
    const journalChannel = supabase
      .channel('trial-balance-journal-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journal_entries'
        },
        () => {
          console.log('Journal entries changed - updating trial balance');
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
          console.log('Journal lines changed - updating trial balance');
          fetchData();
        }
      )
      .subscribe();

    const accountsChannel = supabase
      .channel('trial-balance-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chart_of_accounts'
        },
        () => {
          console.log('Accounts changed - updating trial balance');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(journalChannel);
      supabase.removeChannel(accountsChannel);
    };
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

  const setQuickFilter = (filterType: 'currentYear' | 'last3Months' | 'currentMonth') => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    if (filterType === 'currentYear') {
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    } else if (filterType === 'last3Months') {
      const threeMonthsAgo = new Date(year, month - 3, 1);
      setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (filterType === 'currentMonth') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
  };

  const calculateLevel = (account: Account): number => {
    if (!account.parent_id) return 1;
    const parent = accounts.find(a => a.id === account.parent_id);
    if (!parent) return 1;
    return calculateLevel(parent) + 1;
  };

  const getAccountLevel = (code: string): number => {
    const parts = code.split('-').filter(p => p);
    return parts.length;
  };

  const generateAccountCode = (parentId: string): string => {
    if (parentId === "none") {
      const rootAccounts = accounts.filter(acc => !acc.parent_id);
      const maxCode = Math.max(0, ...rootAccounts.map(acc => parseInt(acc.code.split('-')[0]) || 0));
      return (maxCode + 1).toString();
    }

    const parent = accounts.find(acc => acc.id === parentId);
    if (!parent) return "1";

    const siblings = accounts.filter(acc => acc.parent_id === parentId);
    const parentCode = parent.code;
    
    if (siblings.length === 0) {
      return `${parentCode}-1`;
    }

    const maxSubCode = Math.max(
      ...siblings.map(acc => {
        const parts = acc.code.split('-');
        return parseInt(parts[parts.length - 1]) || 0;
      })
    );

    return `${parentCode}-${maxSubCode + 1}`;
  };

  const handleAddOpeningBalance = async () => {
    if (!openingBalanceAccount || (!openingBalanceDebit && !openingBalanceCredit) || !openingBalanceDate) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      const debit = parseFloat(openingBalanceDebit) || 0;
      const credit = parseFloat(openingBalanceCredit) || 0;

      // Create journal entry for opening balance
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          date: openingBalanceDate,
          entry_number: `OB-${Date.now()}`,
          description: openingBalanceDescription || "رصيد افتتاحي",
          reference: "OPENING_BALANCE"
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal entry line
      const { error: lineError } = await supabase
        .from('journal_entry_lines')
        .insert({
          journal_entry_id: entry.id,
          account_id: openingBalanceAccount,
          debit,
          credit,
          description: openingBalanceDescription || "رصيد افتتاحي"
        });

      if (lineError) throw lineError;

      toast.success("تم إضافة الرصيد الافتتاحي بنجاح");
      setOpeningBalanceDialog(false);
      setOpeningBalanceAccount("");
      setOpeningBalanceDebit("");
      setOpeningBalanceCredit("");
      setOpeningBalanceDate("");
      setOpeningBalanceDescription("");
      fetchData();
    } catch (error) {
      console.error('Error adding opening balance:', error);
      toast.error("حدث خطأ في إضافة الرصيد الافتتاحي");
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountCode || !newAccountNameAr || !newAccountType) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      const { error } = await supabase
        .from('chart_of_accounts')
        .insert({
          code: newAccountCode,
          name_ar: newAccountNameAr,
          name_en: newAccountNameEn,
          type: newAccountType,
          parent_id: newAccountParent === "none" ? null : newAccountParent,
          balance: 0,
          is_active: true
        });

      if (error) throw error;

      toast.success("تم إضافة الحساب بنجاح");
      setAddAccountDialog(false);
      setQuickAddParentId("");
      setNewAccountParent("");
      setNewAccountType("");
      setNewAccountCode("");
      setNewAccountNameAr("");
      setNewAccountNameEn("");
      fetchData();
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error("حدث خطأ في إضافة الحساب");
    }
  };

  const handleQuickAddAccount = (parentAccount: Account) => {
    setQuickAddParentId(parentAccount.id);
    setNewAccountParent(parentAccount.id);
    setNewAccountType(parentAccount.type);
    setAddAccountDialog(true);
  };

  const handleUpdateBalance = async (accountId: string) => {
    const balance = editingBalances[accountId];
    if (!balance || (!balance.debit && !balance.credit)) {
      toast.error("يرجى إدخال قيمة");
      return;
    }

    const debit = parseFloat(balance.debit) || 0;
    const credit = parseFloat(balance.credit) || 0;

    try {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return;

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          date: new Date().toISOString().split('T')[0],
          entry_number: `OB-${Date.now()}`,
          description: `رصيد افتتاحي - ${account.name_ar}`,
          reference: "OPENING_BALANCE"
        })
        .select()
        .single();

      if (entryError) throw entryError;

      const { error: lineError } = await supabase
        .from('journal_entry_lines')
        .insert({
          journal_entry_id: entry.id,
          account_id: accountId,
          debit,
          credit,
          description: `رصيد افتتاحي - ${account.name_ar}`
        });

      if (lineError) throw lineError;

      toast.success("تم تحديث الرصيد بنجاح");
      setEditingBalances(prev => {
        const updated = { ...prev };
        delete updated[accountId];
        return updated;
      });
      fetchData();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error("حدث خطأ في تحديث الرصيد");
    }
  };

  useEffect(() => {
    if (newAccountParent && newAccountParent !== "none") {
      const code = generateAccountCode(newAccountParent);
      setNewAccountCode(code);
    } else if (newAccountParent === "none") {
      const code = generateAccountCode("none");
      setNewAccountCode(code);
    }
  }, [newAccountParent, accounts]);

  // Filter accounts by display level and aggregate balances
  const getDisplayAccounts = () => {
    const accountsAtLevel = accounts.filter(acc => calculateLevel(acc) === displayLevel);
    
    return accountsAtLevel.map(account => {
      // Get all child accounts recursively
      const getChildAccounts = (parentId: string): Account[] => {
        const children = accounts.filter(acc => acc.parent_id === parentId);
        return [
          ...children,
          ...children.flatMap(child => getChildAccounts(child.id))
        ];
      };

      const childAccounts = getChildAccounts(account.id);
      const accountsToCalculate = [account, ...childAccounts];

      // Calculate opening balance - includes entries before startDate AND opening balance entries
      const openingEntries = journalEntries.filter(entry => {
        // Include entries with OPENING_BALANCE reference regardless of date
        if (entry.reference === 'OPENING_BALANCE') return true;
        // Include entries before startDate
        if (startDate && entry.date < startDate) return true;
        return false;
      });

      const openingLines = journalLines.filter(line => {
        const lineEntry = openingEntries.find(e => e.id === line.journal_entry_id);
        return lineEntry && accountsToCalculate.some(acc => acc.id === line.account_id);
      });

      const openingDebit = openingLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
      const openingCredit = openingLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

      // Calculate period movement - excludes opening balance entries
      const periodEntries = journalEntries.filter(entry => {
        // Exclude opening balance entries
        if (entry.reference === 'OPENING_BALANCE') return false;
        // Only include entries within the date range
        if (startDate && entry.date < startDate) return false;
        if (endDate && entry.date > endDate) return false;
        return true;
      });

      const periodLines = journalLines.filter(line => {
        const lineEntry = periodEntries.find(e => e.id === line.journal_entry_id);
        return lineEntry && accountsToCalculate.some(acc => acc.id === line.account_id);
      });

      const periodDebit = periodLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
      const periodCredit = periodLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

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
  };

  const trialBalanceData = getDisplayAccounts();

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
            <div className="flex gap-2">
              <Dialog open={addAccountDialog} onOpenChange={setAddAccountDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة حساب
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة حساب فرعي</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>نوع الحساب</Label>
                      <Select value={newAccountType} onValueChange={setNewAccountType}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asset">أصول / Asset</SelectItem>
                          <SelectItem value="liability">التزامات / Liability</SelectItem>
                          <SelectItem value="equity">حقوق ملكية / Equity</SelectItem>
                          <SelectItem value="revenue">إيرادات / Revenue</SelectItem>
                          <SelectItem value="expense">مصروفات / Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>الحساب الرئيسي</Label>
                      <Select value={newAccountParent} onValueChange={setNewAccountParent}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب الرئيسي" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون حساب رئيسي</SelectItem>
                          {accounts
                            .filter(acc => {
                              if (acc.type !== newAccountType) return false;
                              const level = getAccountLevel(acc.code);
                              return level < 4;
                            })
                            .map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name_ar}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>رمز الحساب</Label>
                      <Input value={newAccountCode} onChange={(e) => setNewAccountCode(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>الاسم بالعربية *</Label>
                      <Input value={newAccountNameAr} onChange={(e) => setNewAccountNameAr(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                      <Label>الاسم بالإنجليزية</Label>
                      <Input value={newAccountNameEn} onChange={(e) => setNewAccountNameEn(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddAccountDialog(false)}>إلغاء</Button>
                    <Button onClick={handleAddAccount}>إضافة</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={openingBalanceDialog} onOpenChange={setOpeningBalanceDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Layers className="h-4 w-4 ml-2" />
                    رصيد افتتاحي
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة رصيد افتتاحي</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>الحساب</Label>
                      <Select value={openingBalanceAccount} onValueChange={setOpeningBalanceAccount}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name_ar}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>التاريخ</Label>
                      <Input
                        type="date"
                        value={openingBalanceDate}
                        onChange={(e) => setOpeningBalanceDate(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>مدين</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={openingBalanceDebit}
                        onChange={(e) => setOpeningBalanceDebit(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>دائن</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={openingBalanceCredit}
                        onChange={(e) => setOpeningBalanceCredit(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>الوصف</Label>
                      <Textarea
                        value={openingBalanceDescription}
                        onChange={(e) => setOpeningBalanceDescription(e.target.value)}
                        placeholder="رصيد افتتاحي"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpeningBalanceDialog(false)}>إلغاء</Button>
                    <Button onClick={handleAddOpeningBalance}>إضافة</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6 no-print">
          <CardHeader>
            <CardTitle>فلترة الفترة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('currentYear')}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                السنة الحالية
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('last3Months')}
                className="gap-2"
              >
                <CalendarRange className="h-4 w-4" />
                آخر 3 أشهر
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('currentMonth')}
                className="gap-2"
              >
                <CalendarClock className="h-4 w-4" />
                الشهر الحالي
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>مستوى العرض</Label>
                <Select value={displayLevel.toString()} onValueChange={(value) => setDisplayLevel(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">المستوى الأول</SelectItem>
                    <SelectItem value="2">المستوى الثاني</SelectItem>
                    <SelectItem value="3">المستوى الثالث</SelectItem>
                    <SelectItem value="4">المستوى الرابع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <div className="overflow-x-auto">
              <Table className="print-table">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right font-bold" rowSpan={2}>رمز الحساب</TableHead>
                    <TableHead className="text-right font-bold" rowSpan={2}>اسم الحساب</TableHead>
                    <TableHead className="text-center font-bold border-x" colSpan={2}>الرصيد الافتتاحي</TableHead>
                    <TableHead className="text-center font-bold border-x" colSpan={2}>حركة الفترة</TableHead>
                    <TableHead className="text-center font-bold border-x" colSpan={2}>الرصيد الختامي</TableHead>
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-right font-semibold">مدين</TableHead>
                    <TableHead className="text-right font-semibold border-l">دائن</TableHead>
                    <TableHead className="text-right font-semibold">مدين</TableHead>
                    <TableHead className="text-right font-semibold border-l">دائن</TableHead>
                    <TableHead className="text-right font-semibold">مدين</TableHead>
                    <TableHead className="text-right font-semibold border-l">دائن</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {trialBalanceData.map((account, index) => {
                  const isEditing = editingBalances[account.account.id];
                  const accountLevel = calculateLevel(account.account);
                  
                  return (
                    <TableRow 
                      key={index} 
                      className={`group hover:bg-primary/5 transition-all border-b ${
                        accountLevel === 1 ? 'bg-muted/30 font-bold' : 
                        accountLevel === 2 ? 'bg-muted/10' : ''
                      }`}
                    >
                      <TableCell 
                        className="font-mono text-primary cursor-pointer hover:underline transition-all"
                        onClick={() => setSelectedAccountForLedger(account.account)}
                      >
                        {account.code}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer hover:text-primary transition-all"
                        onClick={() => setSelectedAccountForLedger(account.account)}
                      >
                        <div className="flex items-center gap-2">
                          <span className={accountLevel === 1 ? 'font-bold text-lg' : accountLevel === 2 ? 'font-semibold' : ''}>
                            {account.name}
                          </span>
                          {accountLevel === 3 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-accent-foreground no-print"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAddAccount(account.account);
                              }}
                              title="إضافة حساب فرعي"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="w-32 h-9 text-left no-print border-primary/50 focus:border-primary"
                            value={isEditing.debit}
                            onChange={(e) => setEditingBalances(prev => ({
                              ...prev,
                              [account.account.id]: { ...prev[account.account.id], debit: e.target.value }
                            }))}
                            placeholder="0.00"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:bg-accent/50 px-3 py-1.5 rounded-md transition-all block no-print"
                            onClick={() => setEditingBalances(prev => ({
                              ...prev,
                              [account.account.id]: { debit: "", credit: "" }
                            }))}
                          >
                            {account.openingDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        <span className="print-only">{account.openingDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                      </TableCell>
                      <TableCell className="text-left border-l">
                        {isEditing ? (
                          <div className="flex gap-1.5">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-32 h-9 text-left no-print border-primary/50 focus:border-primary"
                              value={isEditing.credit}
                              onChange={(e) => setEditingBalances(prev => ({
                                ...prev,
                                [account.account.id]: { ...prev[account.account.id], credit: e.target.value }
                              }))}
                              placeholder="0.00"
                            />
                            <Button
                              size="sm"
                              variant="default"
                              className="h-9 w-9 p-0 no-print bg-accent hover:bg-accent/90"
                              onClick={() => handleUpdateBalance(account.account.id)}
                              title="حفظ"
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 no-print hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setEditingBalances(prev => {
                                const updated = { ...prev };
                                delete updated[account.account.id];
                                return updated;
                              })}
                              title="إلغاء"
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer hover:bg-accent/50 px-3 py-1.5 rounded-md transition-all block no-print"
                            onClick={() => setEditingBalances(prev => ({
                              ...prev,
                              [account.account.id]: { debit: "", credit: "" }
                            }))}
                          >
                            {account.openingCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        <span className="print-only">{account.openingCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                      </TableCell>
                      <TableCell className="text-left font-medium">
                        {account.periodDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-left font-medium border-l">
                        {account.periodCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-left font-bold text-primary">
                        {account.closingDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-left font-bold text-primary border-l">
                        {account.closingCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {trialBalanceData.length > 0 && (
                  <TableRow className="font-bold bg-gradient-to-r from-primary/10 to-primary/5 print-total border-t-2 border-primary/20">
                    <TableCell colSpan={2} className="text-right text-lg py-4">
                      <span className="text-primary">الإجمالي / Total</span>
                    </TableCell>
                    <TableCell className="text-left text-lg py-4">
                      <span className="text-primary">{totalOpeningDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                    </TableCell>
                    <TableCell className="text-left text-lg py-4 border-l">
                      <span className="text-primary">{totalOpeningCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                    </TableCell>
                    <TableCell className="text-left text-lg py-4">
                      <span className="text-primary">{totalPeriodDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                    </TableCell>
                    <TableCell className="text-left text-lg py-4 border-l">
                      <span className="text-primary">{totalPeriodCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                    </TableCell>
                    <TableCell className="text-left text-lg py-4">
                      <span className="text-primary font-extrabold">{totalClosingDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                    </TableCell>
                    <TableCell className="text-left text-lg py-4 border-l">
                      <span className="text-primary font-extrabold">{totalClosingCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                    </TableCell>
                  </TableRow>
                )}
                {trialBalanceData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-lg">لا توجد حركات محاسبية في الفترة المحددة</span>
                        <span className="text-sm">قم بإضافة قيود محاسبية أو اختر فترة أخرى</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
          {trialBalanceData.length > 0 && (
            <CardContent className="border-t bg-gradient-to-r from-background to-muted/20">
              <div className="print-balance-status py-4">
                {(Math.abs(totalOpeningDebit - totalOpeningCredit) < 0.01 && 
                  Math.abs(totalPeriodDebit - totalPeriodCredit) < 0.01 && 
                  Math.abs(totalClosingDebit - totalClosingCredit) < 0.01) ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-2xl">✓</span>
                    </div>
                    <span className="text-accent font-bold text-xl">ميزان المراجعة متوازن</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                        <span className="text-2xl text-destructive">✗</span>
                      </div>
                      <div className="text-center">
                        <div className="text-destructive font-bold text-xl">الميزان غير متوازن</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 mt-2 text-sm">
                      {Math.abs(totalOpeningDebit - totalOpeningCredit) >= 0.01 && (
                        <div className="text-center">
                          <div className="text-muted-foreground">فرق الأرصدة الافتتاحية</div>
                          <div className="text-destructive font-semibold">
                            {Math.abs(totalOpeningDebit - totalOpeningCredit).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                      {Math.abs(totalPeriodDebit - totalPeriodCredit) >= 0.01 && (
                        <div className="text-center">
                          <div className="text-muted-foreground">فرق حركة الفترة</div>
                          <div className="text-destructive font-semibold">
                            {Math.abs(totalPeriodDebit - totalPeriodCredit).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                      {Math.abs(totalClosingDebit - totalClosingCredit) >= 0.01 && (
                        <div className="text-center">
                          <div className="text-muted-foreground">فرق الرصيد الختامي</div>
                          <div className="text-destructive font-semibold">
                            {Math.abs(totalClosingDebit - totalClosingCredit).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                    </div>
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
