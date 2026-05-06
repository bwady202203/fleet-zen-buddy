import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Printer, Save, ArrowRight, Star, CalendarIcon, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import CustodyNavbar from '@/components/CustodyNavbar';
import ExpenseTypeSelectorDialog from '@/components/ExpenseTypeSelectorDialog';
import RepresentativeSelectorDialog from '@/components/RepresentativeSelectorDialog';
import CustodyStatementPrintView, { StatementItem } from '@/components/CustodyStatementPrintView';

interface Representative {
  id: string;
  name_ar: string;
  code: string;
  balance: number;
  debit_total: number;
  credit_total: number;
}

interface ExpenseType {
  id: string;
  name_ar: string;
  code: string;
}

const CustodyCombinedStatement = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [selectedRep, setSelectedRep] = useState<Representative | null>(null);
  const [repDialogOpen, setRepDialogOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());

  const [items, setItems] = useState<StatementItem[]>([]);
  const [selectedType, setSelectedType] = useState<ExpenseType | null>(null);
  const [amount, setAmount] = useState('');
  const [withTax, setWithTax] = useState(true);
  const [desc, setDesc] = useState('');
  const [notes, setNotes] = useState('');
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [savedNumber, setSavedNumber] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    // Custody parent (1111)
    const { data: cust } = await supabase.from('chart_of_accounts').select('id').eq('code', '1111').maybeSingle();
    if (cust) {
      const { data: subs } = await supabase
        .from('chart_of_accounts')
        .select('id, name_ar, code, balance')
        .eq('parent_id', cust.id)
        .order('code');
      const enriched = await Promise.all(
        (subs || []).map(async (a) => {
          const { data: lines } = await supabase
            .from('journal_entry_lines')
            .select('debit, credit')
            .eq('account_id', a.id);
          const debit_total = lines?.reduce((s, e) => s + Number(e.debit || 0), 0) || 0;
          const credit_total = lines?.reduce((s, e) => s + Number(e.credit || 0), 0) || 0;
          return { ...a, debit_total, credit_total, balance: debit_total - credit_total };
        })
      );
      setRepresentatives(enriched);
      const repId = params.get('rep');
      if (repId) {
        const r = enriched.find((x) => x.id === repId);
        if (r) setSelectedRep(r);
      }
    }
    // Expense types (5104)
    const { data: opEx } = await supabase.from('chart_of_accounts').select('id').eq('code', '5104').maybeSingle();
    if (opEx) {
      const { data: types } = await supabase
        .from('chart_of_accounts')
        .select('id, name_ar, code')
        .eq('parent_id', opEx.id)
        .eq('is_active', true)
        .order('code');
      setExpenseTypes(types || []);
    }
  };

  const addItem = () => {
    const a = parseFloat(amount);
    if (!selectedType || !a || a <= 0) {
      toast.error('اختر نوع المصروف وأدخل مبلغاً صحيحاً');
      return;
    }
    const tax = withTax ? +(a * 0.15).toFixed(2) : 0;
    setItems((prev) => [
      ...prev,
      {
        expense_type_id: selectedType.id,
        expense_type_name: selectedType.name_ar,
        amount: a,
        tax,
        total: +(a + tax).toFixed(2),
        description: desc,
      },
    ]);
    setSelectedType(null);
    setAmount('');
    setDesc('');
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const totals = items.reduce(
    (acc, i) => ({ amount: acc.amount + i.amount, tax: acc.tax + i.tax, total: acc.total + i.total }),
    { amount: 0, tax: 0, total: 0 }
  );

  const handleSave = async () => {
    if (!selectedRep) return toast.error('اختر المندوب أولاً');
    if (items.length === 0) return toast.error('أضف بنداً واحداً على الأقل');
    setSaving(true);
    try {
      const expenseDateStr = format(date, 'yyyy-MM-dd');
      const grandTotal = items.reduce((s, i) => s + i.total, 0);
      const totalTax = items.reduce((s, i) => s + i.tax, 0);

      const { data: taxAccounts } = await supabase
        .from('chart_of_accounts').select('id').eq('code', '110801').limit(1);
      const taxAccountId = taxAccounts?.[0]?.id || null;

      const expenseRows = items.map((it) => ({
        representative_id: selectedRep.id,
        expense_date: expenseDateStr,
        expense_type: it.expense_type_id,
        amount: it.total,
        description: it.description || notes || '',
        created_by: user?.id,
      }));
      const { data: insertedExpenses, error: expErr } = await supabase
        .from('custody_expenses').insert(expenseRows).select();
      if (expErr) throw expErr;

      const timestamp = Date.now();
      const entryNumber = `JE-${timestamp}-${Math.floor(Math.random() * 1000)}`;
      const { data: serialData } = await supabase.rpc('generate_universal_serial', { prefix: 'CD' });

      const { data: journalEntry, error: journalError } = await supabase
        .from('journal_entries')
        .insert([{
          entry_number: entryNumber,
          date: expenseDateStr,
          description: `بيان مصروفات ${selectedRep.name_ar} - ${expenseDateStr}${notes ? ' - ' + notes : ''}`,
          reference: `custody_statement_${selectedRep.id}_${timestamp}`,
          created_by: user?.id,
          universal_serial: serialData as string,
        }])
        .select()
        .single();
      if (journalError) throw journalError;

      const lines: any[] = items.map((it) => ({
        journal_entry_id: journalEntry.id,
        account_id: it.expense_type_id,
        debit: it.amount,
        credit: 0,
        description: it.description || it.expense_type_name,
      }));
      if (taxAccountId && totalTax > 0) {
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: taxAccountId,
          debit: totalTax,
          credit: 0,
          description: 'ضريبة القيمة المضافة 15%',
        });
      }
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: selectedRep.id,
        debit: 0,
        credit: grandTotal,
        description: `بيان مصروفات ${selectedRep.name_ar}`,
      });
      const { error: linesError } = await supabase.from('journal_entry_lines').insert(lines);
      if (linesError) throw linesError;

      const interRows = items.map((it, idx) => ({
        custody_expense_id: insertedExpenses?.[idx]?.id,
        journal_entry_id: journalEntry.id,
        debit_account_id: it.expense_type_id,
        debit_account_name: it.expense_type_name,
        credit_account_id: selectedRep.id,
        credit_account_name: selectedRep.name_ar,
        amount: it.amount,
        tax_amount: it.tax,
        total_amount: it.total,
        description: it.description || it.expense_type_name,
        entry_date: expenseDateStr,
      }));
      await supabase.from('custody_journal_entries').insert(interRows);

      setSavedNumber(entryNumber);
      toast.success('تم حفظ البيان والقيد بنجاح');
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء حفظ البيان');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (items.length === 0) return toast.error('لا توجد بنود للمعاينة');
    setShowPreview(true);
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card print:hidden">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">بيان مصروفات مجمّع</h1>
            <p className="text-muted-foreground mt-1">عدة بنود في قيد محاسبي واحد</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/custody/expenses')}>
            <ArrowRight className="ml-2 h-4 w-4" /> رجوع
          </Button>
        </div>
      </header>

      <div className="print:hidden">
        <CustodyNavbar />
      </div>

      <main className="container mx-auto px-4 py-6 space-y-6 print:hidden">
        {/* Header info */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات البيان</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المندوب</Label>
              <Button
                type="button"
                variant="outline"
                className={cn('w-full justify-start text-right h-12', !selectedRep && 'text-muted-foreground')}
                onClick={() => setRepDialogOpen(true)}
              >
                <User className="ml-2 h-5 w-5" />
                {selectedRep ? `${selectedRep.name_ar} (${selectedRep.code})` : 'اختر المندوب'}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right h-12">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {format(date, 'PPP', { locale: ar })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Add row */}
        <Card>
          <CardHeader>
            <CardTitle>إضافة بند</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 md:col-span-4 space-y-1">
                <Label>نوع المصروف</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 justify-start text-right h-10"
                    onClick={() => setTypeDialogOpen(true)}
                  >
                    {selectedType ? `${selectedType.name_ar} (${selectedType.code})` : 'اختر نوع المصروف'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    title="اختر نوع الحساب"
                    onClick={() => setTypeDialogOpen(true)}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="col-span-6 md:col-span-2 space-y-1">
                <Label>المبلغ</Label>
                <Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="col-span-12 md:col-span-3 space-y-1">
                <Label>وصف</Label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="اختياري" />
              </div>
              <div className="col-span-6 md:col-span-2 flex items-center gap-2 pb-2">
                <Checkbox id="withTax" checked={withTax} onCheckedChange={(v) => setWithTax(!!v)} />
                <Label htmlFor="withTax" className="cursor-pointer">شامل ضريبة 15%</Label>
              </div>
              <div className="col-span-12 md:col-span-1">
                <Button onClick={addItem} className="w-full">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle>البنود ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">م</TableHead>
                  <TableHead className="text-right">نوع المصروف</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الضريبة</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      لا توجد بنود — أضف بنداً للبدء
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{it.expense_type_name}</TableCell>
                      <TableCell>{it.description || '-'}</TableCell>
                      <TableCell>{it.amount.toFixed(2)}</TableCell>
                      <TableCell>{it.tax.toFixed(2)}</TableCell>
                      <TableCell className="font-bold">{it.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {items.length > 0 && (
                  <TableRow className="bg-muted font-bold">
                    <TableCell colSpan={3}>الإجمالي</TableCell>
                    <TableCell>{totals.amount.toFixed(2)}</TableCell>
                    <TableCell>{totals.tax.toFixed(2)}</TableCell>
                    <TableCell>{totals.total.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="secondary" onClick={handlePrint} disabled={items.length === 0}>
                <Printer className="h-4 w-4 ml-2" /> معاينة الطباعة
              </Button>
              <Button onClick={handleSave} disabled={saving || items.length === 0 || !selectedRep}>
                <Save className="h-4 w-4 ml-2" />
                {saving ? 'جاري الحفظ...' : 'حفظ القيد'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <RepresentativeSelectorDialog
        open={repDialogOpen}
        onOpenChange={setRepDialogOpen}
        representatives={representatives}
        selectedId={selectedRep?.id || ''}
        onSelect={(rep) => setSelectedRep(rep as Representative)}
      />
      <ExpenseTypeSelectorDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        expenseTypes={expenseTypes}
        selectedId={selectedType?.id}
        onSelect={(t) => setSelectedType(t)}
      />

      {/* Print preview */}
      {showPreview && (
        <div className="custody-statement-print-wrapper fixed inset-0 z-[9999] bg-white overflow-auto print:static print:inset-auto">
          <div className="p-4 flex gap-2 justify-center print:hidden border-b">
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 ml-2" />طباعة
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)}>إغلاق المعاينة</Button>
          </div>
          <CustodyStatementPrintView
            representativeName={selectedRep?.name_ar || ''}
            representativeCode={selectedRep?.code}
            date={date}
            items={items}
            notes={notes}
            statementNumber={savedNumber || `BN-${format(date, 'yyyyMMdd')}`}
          />
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              .custody-statement-print-wrapper, .custody-statement-print-wrapper * { visibility: visible !important; }
              .custody-statement-print-wrapper { position: absolute !important; left: 0; top: 0; width: 100%; }
              @page { size: A4; margin: 0; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default CustodyCombinedStatement;
