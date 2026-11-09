import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Upload, Download, RefreshCw, ClipboardPaste } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { compareMonthlyMovements, detectStatementColumns, parseStatementRows, type DailyMovement, type StatementColumns } from '@/lib/monthlyBankComparison';

interface Account { id: string; code: string; name_ar: string }
interface ImportedStatement { name: string; movements: DailyMovement[] }
const number = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MonthlyBankComparison() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [current, setCurrent] = useState<DailyMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [statements, setStatements] = useState<Record<string, ImportedStatement>>({});
  const [swap, setSwap] = useState(false);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [paste, setPaste] = useState('');
  const [sheets, setSheets] = useState<Record<string, unknown[][]>>({});
  const [sheet, setSheet] = useState('');
  const [raw, setRaw] = useState<unknown[][]>([]);
  const [sourceName, setSourceName] = useState('');
  const [headerRow, setHeaderRow] = useState('1');
  const [hasHeader, setHasHeader] = useState(true);
  const [columns, setColumns] = useState<StatementColumns>({ date: -1, debit: -1, credit: -1 });
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const statement = statements[accountId];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list: Account[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from('chart_of_accounts').select('id, code, name_ar')
          .eq('level', 4).order('code').order('id').range(offset, offset + 999);
        if (error) { if (!cancelled) setError('تعذر تحميل الحسابات'); return; }
        list.push(...(data ?? []));
        if ((data?.length ?? 0) < 1000) break;
      }
      if (!cancelled) { setAccounts(list); setAccountId(list.find(a => a.code === '111004')?.id ?? list[0]?.id ?? ''); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!accountId || !/^\d{4}-\d{2}$/.test(month)) return;
    let cancelled = false;
    setLoading(true); setError(''); setCurrent([]);
    (async () => {
      try {
        const [year, monthNumber] = month.split('-').map(Number);
        const end = `${month}-${new Date(year, monthNumber, 0).getDate()}`;
        const lines: DailyMovement[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await supabase.from('journal_entry_lines')
            .select('id, debit, credit, journal_entries!inner(date)').eq('account_id', accountId)
            .gte('journal_entries.date', `${month}-01`).lte('journal_entries.date', end)
            .order('id').range(offset, offset + 999);
          if (error) throw error;
          if (cancelled) return;
          for (const line of data ?? []) {
            const entry = line.journal_entries as { date: string } | null;
            if (entry?.date) lines.push({ date: entry.date, debit: Number(line.debit ?? 0), credit: Number(line.credit ?? 0) });
          }
          if ((data?.length ?? 0) < 1000) break;
        }
        if (!cancelled) setCurrent(lines);
      } catch { if (!cancelled) setError('تعذر تحميل الحركة الحالية؛ أعد المحاولة'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [accountId, month, reload]);

  useEffect(() => {
    const index = Math.max(0, Number(headerRow) - 1);
    setColumns(detectStatementColumns(raw[index] ?? []));
  }, [raw, headerRow]);

  const rows = useMemo(() => compareMonthlyMovements(month, current, statement?.movements ?? [], swap), [month, current, statement, swap]);
  const totals = rows.reduce((sum, row) => ({ debit: sum.debit + row.debit, credit: sum.credit + row.credit,
    bankDebit: sum.bankDebit + row.bankDebit, bankCredit: sum.bankCredit + row.bankCredit,
    debitDifference: sum.debitDifference + row.debitDifference, creditDifference: sum.creditDifference + row.creditDifference }),
    { debit: 0, credit: 0, bankDebit: 0, bankCredit: 0, debitDifference: 0, creditDifference: 0 });
  const mappingValid = Object.values(columns).every(v => v >= 0) && new Set(Object.values(columns)).size === 3;
  const parsed = useMemo(() => mappingValid ? parseStatementRows(raw, columns, Math.max(0, Number(headerRow) - 1) + (hasHeader ? 1 : 0)) : null,
    [raw, columns, headerRow, hasHeader, mappingValid]);
  const monthTransactions = statement?.movements.filter(row => row.date.startsWith(month)).length ?? 0;

  const readFile = async (file: File) => {
    setReading(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const next: Record<string, unknown[][]> = {};
      for (const name of workbook.SheetNames) next[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
      const name = workbook.SheetNames[0];
      if (!name) throw new Error();
      setSheets(next); setSheet(name); setRaw(next[name]); setSourceName(file.name); setHeaderRow('1'); setImportOpen(true);
    } catch { toast({ title: 'تعذر قراءة الملف، استخدم Excel أو CSV', variant: 'destructive' }); }
    finally { setReading(false); }
  };

  const parsePaste = async () => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(paste, { type: 'string', FS: paste.includes('\t') ? '\t' : ',' });
    const name = workbook.SheetNames[0];
    if (!name) return;
    setRaw(XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' }));
    setSheets({}); setSheet(''); setSourceName('كشف ملصق'); setHeaderRow('1');
  };

  const confirmImport = () => {
    if (!parsed?.movements.length || parsed.rejected.length) return;
    setStatements(prev => ({ ...prev, [accountId]: { name: sourceName, movements: parsed.movements } }));
    const firstDate = parsed.movements.map(r => r.date).sort()[0];
    if (!parsed.movements.some(r => r.date.startsWith(month)) && firstDate) setMonth(firstDate.slice(0, 7));
    setImportOpen(false);
    toast({ title: 'تم استيراد الكشف للمقارنة', description: `${parsed.movements.length} حركة — لم يتم تعديل أي قيد` });
  };

  const exportRows = async () => {
    const XLSX = await import('xlsx');
    const data = rows.map(r => ({ 'التاريخ': r.date, 'الحركة المدينة': r.debit, 'الحركة الدائنة': r.credit,
      ...(statement ? { 'مدين كشف البنك': r.bankDebit, 'دائن كشف البنك': r.bankCredit, 'فرق مدين': r.debitDifference, 'فرق دائن': r.creditDifference, 'المقارنة': r.matches ? 'مطابق' : 'فرق' } : {}) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'المقارنة الشهرية');
    XLSX.writeFile(workbook, `${accounts.find(a => a.id === accountId)?.code ?? ''}_${month}_مقارنة.xlsx`);
  };

  return <div className="container mx-auto px-4 py-4 space-y-4" dir="rtl">
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-80 space-y-2"><Label>الحساب</Label>
        <Select value={accountId} onValueChange={setAccountId}><SelectTrigger aria-label="حساب المقارنة"><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
          <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name_ar}</SelectItem>)}</SelectContent>
        </Select></div>
      <div className="space-y-2"><Label htmlFor="comparison-month">الشهر</Label><Input id="comparison-month" type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} className="w-44" /></div>
      <Button disabled={!accountId || reading} onClick={() => fileInput.current?.click()} className="gap-2"><Upload className="h-4 w-4" />استيراد كشف البنك</Button>
      <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv,.tsv" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void readFile(file); e.target.value = ''; }} />
      <Button variant="outline" disabled={!accountId} onClick={() => { setRaw([]); setPaste(''); setImportOpen(true); }} className="gap-2"><ClipboardPaste className="h-4 w-4" />لصق كشف</Button>
      <Button variant="outline" size="icon" title="تحديث الحركة الحالية" aria-label="تحديث الحركة الحالية" onClick={() => setReload(v => v + 1)} disabled={loading}><RefreshCw className="h-4 w-4" /></Button>
      <Button variant="outline" disabled={loading || !!error || !accountId} onClick={exportRows} className="gap-2"><Download className="h-4 w-4" />تحميل المقارنة</Button>
    </div>
    {statement && <div className="flex flex-wrap items-center gap-4 border-y py-3 text-sm">
      <span className="break-all">{statement.name} · حركات الشهر: {monthTransactions}</span>
      <label className="flex items-center gap-2"><Checkbox checked={swap} onCheckedChange={v => setSwap(v === true)} />عكس مدين ودائن كشف البنك</label>
      <label className="flex items-center gap-2"><Checkbox checked={differencesOnly} onCheckedChange={v => setDifferencesOnly(v === true)} />الفروق فقط</label>
      <Button variant="ghost" size="sm" onClick={() => setStatements(prev => { const next = { ...prev }; delete next[accountId]; return next; })}>إزالة الكشف من المقارنة</Button>
      {monthTransactions === 0 && <span className="text-destructive">الكشف لا يحتوي حركات للشهر المحدد</span>}
    </div>}
    {error ? <p role="alert" className="text-destructive py-8">{error}</p> : loading ? <p className="text-muted-foreground py-8">جاري تحميل الحركة الحالية...</p> : !accountId ? <p className="text-muted-foreground py-8">اختر الحساب</p> :
      <div className="border rounded-lg overflow-hidden"><Table className="min-w-[540px]" aria-label="المقارنة الشهرية">
        <TableHeader><TableRow>{['اليوم', 'الحركة المدينة', 'الحركة الدائنة', ...(statement ? ['مدين كشف البنك', 'دائن كشف البنك', 'فرق مدين', 'فرق دائن', 'المقارنة'] : [])].map(h => <TableHead key={h} className="text-right whitespace-nowrap">{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.filter(r => !statement || !differencesOnly || !r.matches).map(r => <TableRow key={r.date} data-date={r.date}>
          <TableCell className="whitespace-nowrap">{r.date}</TableCell><TableCell className="tabular-nums">{number(r.debit)}</TableCell><TableCell className="tabular-nums">{number(r.credit)}</TableCell>
          {statement && <><TableCell className="tabular-nums bg-accent/30">{number(r.bankDebit)}</TableCell><TableCell className="tabular-nums bg-accent/30">{number(r.bankCredit)}</TableCell><TableCell className={r.debitDifference ? 'text-destructive tabular-nums' : 'text-muted-foreground tabular-nums'}>{number(r.debitDifference)}</TableCell><TableCell className={r.creditDifference ? 'text-destructive tabular-nums' : 'text-muted-foreground tabular-nums'}>{number(r.creditDifference)}</TableCell><TableCell className={r.matches ? 'text-primary whitespace-nowrap' : 'text-destructive whitespace-nowrap'}>{r.matches ? 'مطابق' : 'فرق'}</TableCell></>}
        </TableRow>)}
          {statement && differencesOnly && rows.every(r => r.matches) && <TableRow><TableCell colSpan={8} className="text-center text-primary">جميع أيام الشهر مطابقة</TableCell></TableRow>}
          <TableRow className="font-bold bg-muted"><TableCell>الإجمالي</TableCell><TableCell>{number(totals.debit)}</TableCell><TableCell>{number(totals.credit)}</TableCell>{statement && <><TableCell>{number(totals.bankDebit)}</TableCell><TableCell>{number(totals.bankCredit)}</TableCell><TableCell>{number(totals.debitDifference)}</TableCell><TableCell>{number(totals.creditDifference)}</TableCell><TableCell>{rows.filter(r => !r.matches).length} يوم مختلف</TableCell></>}</TableRow>
        </TableBody></Table></div>}
    <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl"><DialogHeader><DialogTitle>استيراد كشف البنك للمقارنة</DialogTitle></DialogHeader>
      {raw.length === 0 ? <><Textarea aria-label="نص كشف البنك" value={paste} onChange={e => setPaste(e.target.value)} rows={8} /><Button disabled={!paste.trim()} onClick={parsePaste}>قراءة الكشف الملصق</Button></> : <>
        <p className="text-sm break-all">{sourceName}</p>
        {Object.keys(sheets).length > 1 && <Select value={sheet} onValueChange={name => { setSheet(name); setRaw(sheets[name]); }}><SelectTrigger aria-label="ورقة الكشف"><SelectValue /></SelectTrigger><SelectContent>{Object.keys(sheets).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select>}
        <div className="flex flex-wrap items-center gap-3"><Label htmlFor="statement-header">أول صف للكشف</Label><Input id="statement-header" type="text" inputMode="numeric" className="w-20" value={headerRow} onChange={e => { if (/^\d*$/.test(e.target.value)) setHeaderRow(e.target.value); }} />
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={hasHeader} onCheckedChange={v => setHasHeader(v === true)} />هذا الصف عناوين الأعمدة</label></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{(['date', 'debit', 'credit'] as const).map((field, index) => <div key={field} className="space-y-2"><Label>{['عمود التاريخ', 'عمود المدين', 'عمود الدائن'][index]}</Label>
          <Select value={columns[field] < 0 ? '' : String(columns[field])} onValueChange={v => setColumns(prev => ({ ...prev, [field]: Number(v) }))}><SelectTrigger aria-label={['عمود التاريخ', 'عمود المدين', 'عمود الدائن'][index]}><SelectValue placeholder="اختر العمود" /></SelectTrigger><SelectContent>{Array.from({ length: Math.max(0, ...raw.map(r => r.length)) }, (_, i) => <SelectItem key={i} value={String(i)}>{i + 1} - {String(raw[Math.max(0, Number(headerRow) - 1)]?.[i] ?? '') || 'بدون عنوان'}</SelectItem>)}</SelectContent></Select>
        </div>)}</div>
        <div className="overflow-x-auto border rounded-md"><Table><TableBody>{raw.slice(Math.max(0, Number(headerRow) - 1), Math.max(0, Number(headerRow) - 1) + 5).map((row, i) => <TableRow key={i}>{row.map((cell, j) => <TableCell key={j} className="whitespace-nowrap">{String(cell)}</TableCell>)}</TableRow>)}</TableBody></Table></div>
        {!mappingValid && <p role="alert" className="text-destructive">اختر ثلاثة أعمدة مختلفة للتاريخ والمدين والدائن</p>}
        {parsed && <p className="text-sm">الحركات الصالحة: {parsed.movements.length} · الصفوف غير الصالحة: {parsed.rejected.length}</p>}
        {Boolean(parsed?.rejected.length) && <p role="alert" className="text-destructive text-sm">راجع التواريخ والمبالغ أو نطاق الكشف؛ الصفوف: {parsed?.rejected.slice(0, 20).join('، ')}</p>}
        <Button disabled={!parsed?.movements.length || Boolean(parsed.rejected.length) || !headerRow || Number(headerRow) < 1} onClick={confirmImport}>اعتماد الكشف للمقارنة</Button>
      </>}
    </DialogContent></Dialog>
  </div>;
}