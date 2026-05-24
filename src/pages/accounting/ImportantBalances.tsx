import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Plus, Trash2, Search, Eye, TrendingUp, TrendingDown, Minus, CalendarDays, LayoutGrid, CalendarRange, ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, getDaysInMonth, isSameDay, addMonths } from "date-fns";
import { ar } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

type DateFilter = 'all' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'lastWeek' | 'specificDay';

const ImportantBalances = () => {
  const { toast } = useToast();
  const [watchedAccounts, setWatchedAccounts] = useState<WatchedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [specificDay, setSpecificDay] = useState<Date | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerAccount, setLedgerAccount] = useState<WatchedAccount | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Monthly view state
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly'>('overview');
  const [monthlyAccountId, setMonthlyAccountId] = useState<string>('');
  const [monthlyDate, setMonthlyDate] = useState<Date>(new Date());
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyDays, setMonthlyDays] = useState<Array<{ date: string; opening: number; debit: number; credit: number; closing: number }>>([]);
  const [allAccountsList, setAllAccountsList] = useState<any[]>([]);

  // Generate current month days
  const currentMonthDays = useMemo(() => {
    const now = new Date();
    const totalDays = getDaysInMonth(now);
    const year = now.getFullYear();
    const month = now.getMonth();
    const days: Date[] = [];
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, []);

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
      case 'specificDay': {
        if (specificDay) return { start: specificDay, end: specificDay };
        return null;
      }
      default: return null;
    }
  }, [dateFilter, specificDay]);

  useEffect(() => {
    loadData();
  }, [dateFilter, specificDay]);

  const handleDayClick = (day: Date) => {
    setSpecificDay(day);
    setDateFilter('specificDay');
  };

  const loadData = async () => {
    setLoading(true);
    try {
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

      // Fetch all journal_entry_lines for all watched accounts in ONE query (parallel batches)
      const balances: Record<string, { debit: number; credit: number }> = {};
      accountIds.forEach(id => { balances[id] = { debit: 0, credit: 0 }; });

      if (!dateRange) {
        // "all" filter - fetch all lines for all accounts at once
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data: batch } = await supabase
            .from('journal_entry_lines')
            .select('account_id, debit, credit')
            .in('account_id', accountIds)
            .range(from, from + batchSize - 1);
          
          if (batch && batch.length > 0) {
            batch.forEach((line: any) => {
              if (balances[line.account_id]) {
                balances[line.account_id].debit += (line.debit || 0);
                balances[line.account_id].credit += (line.credit || 0);
              }
            });
            hasMore = batch.length === batchSize;
            from += batchSize;
          } else {
            hasMore = false;
          }
        }
      } else {
        const startStr = format(dateRange.start, 'yyyy-MM-dd');
        const endStr = format(dateRange.end, 'yyyy-MM-dd');
        
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data: batch } = await supabase
            .from('journal_entry_lines')
            .select('account_id, debit, credit, journal_entries!inner(date)')
            .in('account_id', accountIds)
            .gte('journal_entries.date', startStr)
            .lte('journal_entries.date', endStr)
            .range(from, from + batchSize - 1);
          
          if (batch && batch.length > 0) {
            batch.forEach((line: any) => {
              if (balances[line.account_id]) {
                balances[line.account_id].debit += (line.debit || 0);
                balances[line.account_id].credit += (line.credit || 0);
              }
            });
            hasMore = batch.length === batchSize;
            from += batchSize;
          } else {
            hasMore = false;
          }
        }
      }

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

  // Load accounts list for monthly tab selector
  useEffect(() => {
    if (activeTab === 'monthly' && allAccountsList.length === 0) {
      supabase
        .from('chart_of_accounts')
        .select('id, code, name_ar')
        .eq('level', 4)
        .order('code')
        .then(({ data }) => setAllAccountsList(data || []));
    }
  }, [activeTab]);

  // Default monthly account to first watched if not set
  useEffect(() => {
    if (activeTab === 'monthly' && !monthlyAccountId && watchedAccounts.length > 0) {
      setMonthlyAccountId(watchedAccounts[0].account_id);
    }
  }, [activeTab, watchedAccounts]);

  const loadMonthlyView = async () => {
    if (!monthlyAccountId) return;
    setMonthlyLoading(true);
    try {
      const monthStart = startOfMonth(monthlyDate);
      const monthEnd = endOfMonth(monthlyDate);
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

      // 1) Opening balance before the month
      let openingBalance = 0;
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data: batch } = await supabase
          .from('journal_entry_lines')
          .select('debit, credit, journal_entries!inner(date)')
          .eq('account_id', monthlyAccountId)
          .lt('journal_entries.date', monthStartStr)
          .range(from, from + batchSize - 1);
        if (batch && batch.length > 0) {
          batch.forEach((l: any) => { openingBalance += (l.debit || 0) - (l.credit || 0); });
          hasMore = batch.length === batchSize;
          from += batchSize;
        } else hasMore = false;
      }

      // 2) Fetch this month's lines grouped by date
      const dailyMap = new Map<string, { debit: number; credit: number }>();
      from = 0; hasMore = true;
      while (hasMore) {
        const { data: batch } = await supabase
          .from('journal_entry_lines')
          .select('debit, credit, journal_entries!inner(date)')
          .eq('account_id', monthlyAccountId)
          .gte('journal_entries.date', monthStartStr)
          .lte('journal_entries.date', monthEndStr)
          .range(from, from + batchSize - 1);
        if (batch && batch.length > 0) {
          batch.forEach((l: any) => {
            const d = l.journal_entries?.date;
            if (!d) return;
            const cur = dailyMap.get(d) || { debit: 0, credit: 0 };
            cur.debit += (l.debit || 0);
            cur.credit += (l.credit || 0);
            dailyMap.set(d, cur);
          });
          hasMore = batch.length === batchSize;
          from += batchSize;
        } else hasMore = false;
      }

      // 3) Build per-day rows
      const totalDays = getDaysInMonth(monthlyDate);
      const year = monthlyDate.getFullYear();
      const month = monthlyDate.getMonth();
      let running = openingBalance;
      const rows: Array<{ date: string; opening: number; debit: number; credit: number; closing: number }> = [];
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = format(new Date(year, month, d), 'yyyy-MM-dd');
        const m = dailyMap.get(dateStr) || { debit: 0, credit: 0 };
        const opening = running;
        const closing = opening + m.debit - m.credit;
        rows.push({ date: dateStr, opening, debit: m.debit, credit: m.credit, closing });
        running = closing;
      }
      setMonthlyDays(rows);
    } catch (err) {
      console.error('Error loading monthly view:', err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'monthly' && monthlyAccountId) {
      loadMonthlyView();
    }
  }, [activeTab, monthlyAccountId, monthlyDate]);

  const handleOpenAdd = () => {
    loadAllAccounts();
    setAccountSearch("");
    setAddDialogOpen(true);
  };

  const handleAddAccount = async (accountId: string) => {
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
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate running balance from oldest to newest first, then reverse for display
      const sorted = [...(data || [])].sort((a, b) => {
        if (a.entry_date !== b.entry_date) return a.entry_date.localeCompare(b.entry_date);
        return (a.created_at || '').localeCompare(b.created_at || '');
      });

      let runningBalance = 0;
      const balanceMap = new Map<string, number>();
      sorted.forEach(e => {
        runningBalance += (e.debit || 0) - (e.credit || 0);
        balanceMap.set(e.id, runningBalance);
      });

      // Display newest first
      const entries: LedgerEntry[] = (data || []).map(e => ({
        id: e.id,
        entry_date: e.entry_date,
        description: e.description || '',
        reference: e.reference || '',
        debit: e.debit || 0,
        credit: e.credit || 0,
        balance: balanceMap.get(e.id) || 0,
      }));
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

  const today = new Date();
  const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'monthly')} className="w-full">
        <div className="container mx-auto px-4 pt-3 print:hidden">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <CalendarRange className="h-4 w-4" />
              عرض شهري
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0">
          {/* Current Month Days Strip */}
          <div className="border-b bg-card/50 print:hidden">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  أيام {format(today, 'MMMM yyyy', { locale: ar })}
                </span>
              </div>
              <ScrollArea className="w-full" dir="rtl">
                <div className="flex gap-1.5 pb-2">
                  {currentMonthDays.map((day) => {
                    const isToday = isSameDay(day, today);
                    const isSelected = dateFilter === 'specificDay' && specificDay && isSameDay(day, specificDay);
                    const isFuture = day > today;
                    const dayOfWeek = day.getDay();
                    const isFriday = dayOfWeek === 5;
                    
                    return (
                      <button
                        key={day.getDate()}
                        disabled={isFuture}
                        onClick={() => handleDayClick(day)}
                        className={`flex flex-col items-center min-w-[3rem] px-2 py-1.5 rounded-lg border text-xs transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : isToday
                            ? 'bg-accent text-accent-foreground border-accent font-bold'
                            : isFuture
                            ? 'opacity-30 cursor-not-allowed border-border'
                            : isFriday
                            ? 'border-border bg-muted/30 hover:bg-muted hover:border-primary/30'
                            : 'border-border hover:bg-muted hover:border-primary/30 cursor-pointer'
                        }`}
                      >
                        <span className="text-[10px] leading-tight opacity-70">{dayNames[dayOfWeek]}</span>
                        <span className="text-sm font-bold leading-tight">{day.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="container mx-auto px-4 py-3 print:hidden">
            <div className="flex flex-wrap gap-2">
              {filterButtons.map(f => (
                <Button
                  key={f.key}
                  variant={dateFilter === f.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setDateFilter(f.key); setSpecificDay(null); }}
                  className="rounded-full"
                >
                  {f.label}
                </Button>
              ))}
            </div>
            {dateRange && (
              <p className="text-xs text-muted-foreground mt-2">
                {dateFilter === 'specificDay' && specificDay
                  ? `اليوم: ${format(specificDay, 'EEEE yyyy/MM/dd', { locale: ar })}`
                  : `الفترة: ${format(dateRange.start, 'yyyy/MM/dd', { locale: ar })} - ${format(dateRange.end, 'yyyy/MM/dd', { locale: ar })}`
                }
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
        </TabsContent>

        <TabsContent value="monthly" className="mt-0">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {/* Controls: account select + month nav */}
            <div className="flex flex-wrap items-center gap-3 bg-card border rounded-lg p-3">
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">الحساب:</span>
                <Select value={monthlyAccountId} onValueChange={setMonthlyAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر حساباً" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {allAccountsList.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="font-mono text-xs ml-2">{a.code}</span>
                        {a.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setMonthlyDate(d => subMonths(d, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="min-w-[140px] text-center font-bold">
                  {format(monthlyDate, 'MMMM yyyy', { locale: ar })}
                </div>
                <Button variant="outline" size="icon" onClick={() => setMonthlyDate(d => addMonths(d, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMonthlyDate(new Date())}>
                  الشهر الحالي
                </Button>
              </div>
            </div>

            {!monthlyAccountId ? (
              <div className="text-center py-20 text-muted-foreground">يرجى اختيار حساب لعرض الأرصدة الشهرية</div>
            ) : monthlyLoading ? (
              <div className="text-center py-20 text-muted-foreground">جاري التحميل...</div>
            ) : (
              <>
                {/* Month summary */}
                {monthlyDays.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card><CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">رصيد أول الشهر</div>
                      <div className="text-lg font-bold">{formatNum(Math.abs(monthlyDays[0].opening))} <span className="text-xs">{monthlyDays[0].opening >= 0 ? 'مدين' : 'دائن'}</span></div>
                    </CardContent></Card>
                    <Card><CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">إجمالي المدين</div>
                      <div className="text-lg font-bold text-red-600">{formatNum(monthlyDays.reduce((s, d) => s + d.debit, 0))}</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">إجمالي الدائن</div>
                      <div className="text-lg font-bold text-emerald-600">{formatNum(monthlyDays.reduce((s, d) => s + d.credit, 0))}</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">رصيد نهاية الشهر</div>
                      <div className="text-lg font-bold">{formatNum(Math.abs(monthlyDays[monthlyDays.length - 1].closing))} <span className="text-xs">{monthlyDays[monthlyDays.length - 1].closing >= 0 ? 'مدين' : 'دائن'}</span></div>
                    </CardContent></Card>
                  </div>
                )}

                {/* Daily boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {monthlyDays.map(day => {
                    const dateObj = new Date(day.date);
                    const dow = dateObj.getDay();
                    const isToday = isSameDay(dateObj, today);
                    const hasMovement = day.debit > 0 || day.credit > 0;
                    return (
                      <Card key={day.date} className={`overflow-hidden ${isToday ? 'ring-2 ring-primary' : ''} ${!hasMovement ? 'opacity-70' : ''}`}>
                        <div className="bg-muted/60 px-3 py-1.5 flex items-center justify-between border-b">
                          <span className="text-xs font-bold">{dayNames[dow]} {dateObj.getDate()}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{day.date}</span>
                        </div>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">الرصيد السابق</span>
                            <span className="font-semibold">
                              {formatNum(Math.abs(day.opening))}
                              <span className="text-[10px] mr-1">{day.opening >= 0 ? 'مدين' : 'دائن'}</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs bg-muted/30 rounded px-2 py-1">
                            <span className="text-muted-foreground">حركة اليوم</span>
                            <div className="flex flex-col items-end leading-tight">
                              {day.debit > 0 && <span className="text-red-600 font-semibold">+{formatNum(day.debit)} مدين</span>}
                              {day.credit > 0 && <span className="text-emerald-600 font-semibold">-{formatNum(day.credit)} دائن</span>}
                              {!hasMovement && <span className="text-muted-foreground">لا توجد حركة</span>}
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm pt-1 border-t">
                            <span className="font-medium">الرصيد الختامي</span>
                            <span className={`font-bold ${day.closing > 0 ? 'text-red-600' : day.closing < 0 ? 'text-emerald-600' : ''}`}>
                              {formatNum(Math.abs(day.closing))}
                              <span className="text-[10px] mr-1">{day.closing > 0 ? 'مدين' : day.closing < 0 ? 'دائن' : '-'}</span>
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>


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
                    <TableCell className={`${ledgerEntries.length > 0 && ledgerEntries[0].balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {ledgerEntries.length > 0 ? `${formatNum(Math.abs(ledgerEntries[0].balance))} ${ledgerEntries[0].balance > 0 ? 'مدين' : 'دائن'}` : '-'}
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
