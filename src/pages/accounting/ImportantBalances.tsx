import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Plus, Trash2, Search, Eye, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ar } from "date-fns/locale";

interface WatchedAccount {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_name_en: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

interface LedgerEntry {
  id: string;
  entry_date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

type DateFilter = 'all' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'lastWeek';

const ImportantBalances = () => {
  const { toast } = useToast();
  const [watchedAccounts, setWatchedAccounts] = useState<WatchedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerAccount, setLedgerAccount] = useState<WatchedAccount | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case 'last7': return { start: subDays(now, 7), end: now };
      case 'last30': return { start: subDays(now, 30), end: now };
      case 'thisMonth': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth': {
        const lm = subMonths(now, 1);
        return { start: startOfMonth(lm), end: endOfMonth(lm) };
      }
      case 'lastWeek': return { start: startOfWeek(subDays(now, 7), { weekStartsOn: 0 }), end: endOfWeek(subDays(now, 7), { weekStartsOn: 0 }) };
      default: return null;
    }
  }, [dateFilter]);

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get watched accounts with account details
      const { data: watched, error: wErr } = await supabase
        .from('watched_accounts')
        .select('id, account_id, chart_of_accounts(id, code, name_ar, name_en)');
      
      if (wErr) throw wErr;

      if (!watched || watched.length === 0) {
        setWatchedAccounts([]);
        setLoading(false);
        return;
      }

      const accountIds = watched.map((w: any) => w.account_id);

      // Get journal entry lines for these accounts
      let query = supabase
        .from('journal_entry_lines')
        .select('account_id, debit, credit, journal_entries(date)')
        .in('account_id', accountIds);

      if (dateRange) {
        // We need to filter by date through the journal_entries relation
        // Supabase doesn't support filtering on joined tables directly in .in(),
        // so we'll filter client-side
      }

      const { data: lines, error: lErr } = await query;
      if (lErr) throw lErr;

      // Filter by date if needed
      let filteredLines = lines || [];
      if (dateRange) {
        const startStr = format(dateRange.start, 'yyyy-MM-dd');
        const endStr = format(dateRange.end, 'yyyy-MM-dd');
        filteredLines = filteredLines.filter((l: any) => {
          const date = (l.journal_entries as any)?.date;
          return date && date >= startStr && date <= endStr;
        });
      }

      // Aggregate by account
      const balances: Record<string, { debit: number; credit: number }> = {};
      accountIds.forEach(id => { balances[id] = { debit: 0, credit: 0 }; });
      
      filteredLines.forEach((line: any) => {
        if (balances[line.account_id]) {
          balances[line.account_id].debit += (line.debit || 0);
          balances[line.account_id].credit += (line.credit || 0);
        }
      });

      const result: WatchedAccount[] = watched.map((w: any) => {
        const acc = w.chart_of_accounts as any;
        const bal = balances[w.account_id] || { debit: 0, credit: 0 };
        return {
          id: w.id,
          account_id: w.account_id,
          account_code: acc?.code || '',
          account_name: acc?.name_ar || '',
          account_name_en: acc?.name_en || '',
          totalDebit: bal.debit,
          totalCredit: bal.credit,
          balance: bal.debit - bal.credit,
        };
      });

      setWatchedAccounts(result);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllAccounts = async () => {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('level', 4)
      .order('code');
    setAllAccounts(data || []);
  };

  const handleOpenAdd = () => {
    loadAllAccounts();
    setAccountSearch("");
    setAddDialogOpen(true);
  };

  const handleAddAccount = async (accountId: string) => {
    // Check if already added
    if (watchedAccounts.some(w => w.account_id === accountId)) {
      toast({ title: "الحساب مضاف مسبقاً", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('watched_accounts')
      .insert({ account_id: accountId });

    if (error) {
      toast({ title: "خطأ في الإضافة", variant: "destructive" });
      return;
    }

    toast({ title: "تمت الإضافة بنجاح" });
    setAddDialogOpen(false);
    loadData();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('watched_accounts').delete().eq('id', id);
    if (!error) {
      setWatchedAccounts(prev => prev.filter(w => w.id !== id));
      toast({ title: "تم الحذف" });
    }
  };

  const handleOpenLedger = async (acc: WatchedAccount) => {
    setLedgerAccount(acc);
    setLedgerOpen(true);
    setLedgerLoading(true);
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('account_id', acc.account_id)
        .order('entry_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      let runningBalance = 0;
      const entries: LedgerEntry[] = (data || []).map(e => {
        runningBalance += (e.debit || 0) - (e.credit || 0);
        return {
          id: e.id,
          entry_date: e.entry_date,
          description: e.description || '',
          reference: e.reference || '',
          debit: e.debit || 0,
          credit: e.credit || 0,
          balance: runningBalance,
        };
      });
      setLedgerEntries(entries);
    } catch (error) {
      console.error('Error loading ledger:', error);
    } finally {
      setLedgerLoading(false);
    }
  };

  const filteredAccounts = allAccounts.filter(acc => {
    if (!accountSearch) return true;
    const q = accountSearch.toLowerCase();
    return acc.code.includes(q) || acc.name_ar.includes(q) || (acc.name_en || '').toLowerCase().includes(q);
  });

  const filterButtons: { key: DateFilter; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'last7', label: 'آخر 7 أيام' },
    { key: 'lastWeek', label: 'الأسبوع الماضي' },
    { key: 'thisMonth', label: 'الشهر الحالي' },
    { key: 'lastMonth', label: 'الشهر السابق' },
    { key: 'last30', label: 'آخر 30 يوم' },
  ];

  const formatNum = (n: number) => n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/accounting">
                <Button variant="ghost" size="icon"><ArrowRight className="h-5 w-5" /></Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">أرصدة الحسابات الهامة</h1>
                <p className="text-sm text-muted-foreground">مراقبة أرصدة العهد والبنوك والحسابات المهمة</p>
              </div>
            </div>
            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة حساب
            </Button>
          </div>
        </div>
      </header>

      {/* Quick Filters */}
      <div className="container mx-auto px-4 py-4 print:hidden">
        <div className="flex flex-wrap gap-2">
          {filterButtons.map(f => (
            <Button
              key={f.key}
              variant={dateFilter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter(f.key)}
              className="rounded-full"
            >
              {f.label}
            </Button>
          ))}
        </div>
        {dateRange && (
          <p className="text-xs text-muted-foreground mt-2">
            الفترة: {format(dateRange.start, 'yyyy/MM/dd', { locale: ar })} - {format(dateRange.end, 'yyyy/MM/dd', { locale: ar })}
          </p>
        )}
      </div>

      {/* Accounts Grid */}
      <div className="container mx-auto px-4 pb-8">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">جاري التحميل...</div>
        ) : watchedAccounts.length === 0 ? (
          <div className="text-center py-20">
            <Eye className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">لا توجد حسابات مراقبة</p>
            <p className="text-sm text-muted-foreground mb-4">أضف حسابات هامة لمراقبة أرصدتها</p>
            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="h-4 w-4" />إضافة حساب
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {watchedAccounts.map(acc => (
              <Card key={acc.id} className="relative group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleOpenLedger(acc)}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-destructive hover:bg-destructive/10 z-10"
                  onClick={(e) => { e.stopPropagation(); handleRemove(acc.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{acc.account_code}</span>
                    <span className="text-sm font-semibold truncate">{acc.account_name}</span>
                  </div>
                  
                  <div className={`text-2xl font-bold mb-3 flex items-center gap-2 ${
                    acc.balance > 0 ? 'text-emerald-600' : acc.balance < 0 ? 'text-red-600' : 'text-muted-foreground'
                  }`}>
                    {acc.balance > 0 ? <TrendingUp className="h-5 w-5" /> : acc.balance < 0 ? <TrendingDown className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                    {formatNum(Math.abs(acc.balance))}
                    <span className="text-xs font-normal">{acc.balance > 0 ? 'مدين' : acc.balance < 0 ? 'دائن' : ''}</span>
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground border-t pt-2">
                    <span>مدين: {formatNum(acc.totalDebit)}</span>
                    <span>دائن: {formatNum(acc.totalCredit)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة حساب للمراقبة</DialogTitle>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالكود أو الاسم..."
              value={accountSearch}
              onChange={e => setAccountSearch(e.target.value)}
              className="pr-10"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-[50vh] space-y-1">
            {filteredAccounts.map(acc => {
              const isAdded = watchedAccounts.some(w => w.account_id === acc.id);
              return (
                <button
                  key={acc.id}
                  disabled={isAdded}
                  onClick={() => handleAddAccount(acc.id)}
                  className={`w-full text-right p-3 rounded-lg border transition-colors flex items-center justify-between ${
                    isAdded 
                      ? 'bg-muted/50 opacity-50 cursor-not-allowed' 
                      : 'hover:bg-primary/5 hover:border-primary/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{acc.code}</span>
                    <span className="font-medium text-sm">{acc.name_ar}</span>
                    {acc.name_en && <span className="text-xs text-muted-foreground">({acc.name_en})</span>}
                  </div>
                  {isAdded && <span className="text-xs text-muted-foreground">مضاف</span>}
                </button>
              );
            })}
            {filteredAccounts.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">لا توجد نتائج</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ledger Dialog */}
      <Dialog open={ledgerOpen} onOpenChange={setLedgerOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>كشف حساب:</span>
              {ledgerAccount && (
                <>
                  <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{ledgerAccount.account_code}</span>
                  <span>{ledgerAccount.account_name}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {ledgerLoading ? (
            <div className="text-center py-16 text-muted-foreground">جاري تحميل كشف الحساب...</div>
          ) : ledgerEntries.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">لا توجد حركات لهذا الحساب</div>
          ) : (
            <div className="overflow-auto max-h-[65vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-[50px]">#</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">البيان</TableHead>
                    <TableHead className="text-right">المرجع</TableHead>
                    <TableHead className="text-right">مدين</TableHead>
                    <TableHead className="text-right">دائن</TableHead>
                    <TableHead className="text-right">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((entry, idx) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.entry_date}</TableCell>
                      <TableCell className="text-sm">{entry.description}</TableCell>
                      <TableCell className="font-mono text-xs text-primary">{entry.reference}</TableCell>
                      <TableCell className={entry.debit > 0 ? 'text-red-600 font-medium' : ''}>{entry.debit > 0 ? formatNum(entry.debit) : '-'}</TableCell>
                      <TableCell className={entry.credit > 0 ? 'text-emerald-600 font-medium' : ''}>{entry.credit > 0 ? formatNum(entry.credit) : '-'}</TableCell>
                      <TableCell className={`font-bold ${entry.balance > 0 ? 'text-red-600' : entry.balance < 0 ? 'text-emerald-600' : ''}`}>
                        {formatNum(Math.abs(entry.balance))} {entry.balance > 0 ? 'مدين' : entry.balance < 0 ? 'دائن' : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell colSpan={4} className="text-right">الإجمالي</TableCell>
                    <TableCell className="text-red-600">{formatNum(ledgerEntries.reduce((s, e) => s + e.debit, 0))}</TableCell>
                    <TableCell className="text-emerald-600">{formatNum(ledgerEntries.reduce((s, e) => s + e.credit, 0))}</TableCell>
                    <TableCell className={`${ledgerEntries.length > 0 && ledgerEntries[ledgerEntries.length - 1].balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {ledgerEntries.length > 0 ? `${formatNum(Math.abs(ledgerEntries[ledgerEntries.length - 1].balance))} ${ledgerEntries[ledgerEntries.length - 1].balance > 0 ? 'مدين' : 'دائن'}` : '-'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportantBalances;
