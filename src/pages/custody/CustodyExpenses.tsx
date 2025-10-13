import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import CustodyNavbar from '@/components/CustodyNavbar';

interface Representative {
  id: string;
  name_ar: string;
  code: string;
  balance: number;
  debit_total: number;
  credit_total: number;
}

interface Expense {
  id: string;
  expense_date: string;
  expense_type: string;
  amount: number;
  description: string;
}

const EXPENSE_TYPES = [
  'وقود',
  'صيانة',
  'رواتب',
  'مشتريات',
  'إيجار',
  'مصاريف إدارية',
  'أخرى'
];

const CustodyExpenses = () => {
  const { user } = useAuth();
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedRepId, setSelectedRepId] = useState('');
  const [selectedRep, setSelectedRep] = useState<Representative | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [expenseType, setExpenseType] = useState('');
  const [amount, setAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchRepresentatives();
  }, []);

  useEffect(() => {
    if (selectedRepId) {
      const rep = representatives.find(r => r.id === selectedRepId);
      setSelectedRep(rep || null);
      fetchExpenses(selectedRepId);
    }
  }, [selectedRepId, representatives]);

  const fetchRepresentatives = async () => {
    try {
      // Find the custody parent account (العهد) by code 1111
      const { data: custodyAccount, error: custodyError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('code', '1111')
        .maybeSingle();

      if (custodyError) throw custodyError;
      
      if (!custodyAccount) {
        toast.error('لم يتم العثور على حساب العهد (1111)');
        return;
      }

      // Fetch all sub-accounts under custody account
      const { data: subAccounts, error: subAccountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, name_ar, code, balance')
        .eq('parent_id', custodyAccount.id)
        .order('code');

      if (subAccountsError) throw subAccountsError;

      // Fetch journal entry lines for each account to calculate debit/credit totals
      const accountsWithBalances = await Promise.all(
        (subAccounts || []).map(async (account) => {
          const { data: entries, error: entriesError } = await supabase
            .from('journal_entry_lines')
            .select('debit, credit')
            .eq('account_id', account.id);

          if (entriesError) throw entriesError;

          const debit_total = entries?.reduce((sum, e) => sum + Number(e.debit || 0), 0) || 0;
          const credit_total = entries?.reduce((sum, e) => sum + Number(e.credit || 0), 0) || 0;
          const balance = debit_total - credit_total;

          return {
            ...account,
            debit_total,
            credit_total,
            balance,
          };
        })
      );

      setRepresentatives(accountsWithBalances);
    } catch (error) {
      console.error('Error fetching representatives:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    }
  };

  const fetchExpenses = async (repId: string) => {
    try {
      const { data, error } = await supabase
        .from('custody_expenses')
        .select('*')
        .eq('representative_id', repId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRepId || !expenseType || !amount) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const baseAmount = parseFloat(amount);
      const tax = parseFloat(taxAmount) || 0;
      const total = parseFloat(totalAmount) || baseAmount;

      // Insert the expense
      const { data: expenseData, error: expenseError } = await supabase
        .from('custody_expenses')
        .insert([{
          representative_id: selectedRepId,
          expense_date: format(date, 'yyyy-MM-dd'),
          expense_type: expenseType,
          amount: total,
          description: description,
          created_by: user?.id
        }])
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Get the representative's account
      const repAccount = representatives.find(r => r.id === selectedRepId);

      // Get operating expenses account (مصروفات التشغيل)
      const { data: operatingExpensesAccount, error: opExpError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('name_ar', 'مصروفات التشغيل')
        .maybeSingle();

      if (opExpError) throw opExpError;

      if (!operatingExpensesAccount) {
        toast.error('لم يتم العثور على حساب مصروفات التشغيل في الدليل المحاسبي');
        return;
      }

      // Get or create specific expense type account under operating expenses
      let expenseAccountId;
      const { data: expenseAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('name_ar', `مصروف ${expenseType}`)
        .eq('parent_id', operatingExpensesAccount.id)
        .maybeSingle();

      if (expenseAccount) {
        expenseAccountId = expenseAccount.id;
      } else {
        // Create expense account under operating expenses
        const { data: existingAccounts } = await supabase
          .from('chart_of_accounts')
          .select('code')
          .eq('parent_id', operatingExpensesAccount.id)
          .order('code', { ascending: false })
          .limit(1);

        let newCode = '5101';
        if (existingAccounts && existingAccounts.length > 0) {
          const lastCode = parseInt(existingAccounts[0].code);
          newCode = (lastCode + 1).toString();
        }

        const { data: newExpenseAccount, error: newExpError } = await supabase
          .from('chart_of_accounts')
          .insert([{
            code: newCode,
            name_ar: `مصروف ${expenseType}`,
            name_en: `${expenseType} Expense`,
            type: 'expense',
            parent_id: operatingExpensesAccount.id,
            is_active: true
          }])
          .select()
          .single();

        if (newExpError) throw newExpError;
        expenseAccountId = newExpenseAccount.id;
      }

      // Get tax account (ضريبة القيمة المضافة)
      const { data: taxAccount, error: taxAccError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .ilike('name_ar', '%ضريبة%')
        .maybeSingle();

      if (taxAccError) throw taxAccError;

      let taxAccountId = taxAccount?.id;

      // Create journal entry
      if (repAccount && expenseAccountId) {
        // Generate entry number
        const { data: lastEntry } = await supabase
          .from('journal_entries')
          .select('entry_number')
          .order('entry_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextNumber = 1;
        if (lastEntry?.entry_number) {
          const match = lastEntry.entry_number.match(/\d+/);
          if (match) {
            nextNumber = parseInt(match[0]) + 1;
          }
        }
        const entryNumber = `JE-${nextNumber.toString().padStart(6, '0')}`;

        // Insert journal entry
        const { data: journalEntry, error: journalError } = await supabase
          .from('journal_entries')
          .insert([{
            entry_number: entryNumber,
            date: format(date, 'yyyy-MM-dd'),
            description: `مصروف ${expenseType} - ${repAccount?.name_ar}`,
            created_by: user?.id
          }])
          .select()
          .single();

        if (journalError) throw journalError;

        // Insert journal entry lines (debit: expense + tax, credit: representative)
        const journalLines = [
          {
            journal_entry_id: journalEntry.id,
            account_id: expenseAccountId,
            debit: baseAmount,
            credit: 0,
            description: description || `مصروف ${expenseType}`
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: repAccount.id,
            debit: 0,
            credit: total,
            description: description || `مصروف ${expenseType}`
          }
        ];

        // Add tax line if tax account exists
        if (taxAccountId && tax > 0) {
          journalLines.splice(1, 0, {
            journal_entry_id: journalEntry.id,
            account_id: taxAccountId,
            debit: tax,
            credit: 0,
            description: 'ضريبة القيمة المضافة 15%'
          });
        }

        const { error: linesError } = await supabase
          .from('journal_entry_lines')
          .insert(journalLines);

        if (linesError) throw linesError;
      }

      toast.success('تم إضافة المصروف والقيد اليومي بنجاح');
      
      // Reset form
      setExpenseType('');
      setAmount('');
      setTaxAmount('');
      setTotalAmount('');
      setDescription('');
      setDate(new Date());
      
      // Refresh data
      fetchRepresentatives();
      if (selectedRepId) fetchExpenses(selectedRepId);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleDelete = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('custody_expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast.success('تم حذف المصروف بنجاح');
      fetchRepresentatives();
      if (selectedRepId) fetchExpenses(selectedRepId);
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('حدث خطأ أثناء حذف المصروف');
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold">مصروفات المندوبين</h1>
            <p className="text-muted-foreground mt-1">
              إدارة وتسجيل مصروفات كل مندوب
            </p>
          </div>
        </div>
      </header>

      <CustodyNavbar />

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Representative Selection */}
        <Card>
          <CardHeader>
            <CardTitle>اختيار المندوب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>المندوب</Label>
              <Select value={selectedRepId} onValueChange={setSelectedRepId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المندوب" />
                </SelectTrigger>
                <SelectContent>
                  {representatives.map((rep) => (
                    <SelectItem key={rep.id} value={rep.id}>
                      {rep.name_ar} ({rep.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRep && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المدين</p>
                  <p className="text-lg font-bold text-green-600">
                    {(selectedRep.debit_total || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الدائن</p>
                  <p className="text-lg font-bold text-red-600">
                    {(selectedRep.credit_total || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الرصيد الختامي</p>
                  <p className={`text-lg font-bold ${selectedRep.balance >= 0 ? 'text-primary' : 'text-orange-600'}`}>
                    {(selectedRep.balance || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Expense Form */}
        {selectedRepId && (
          <Card>
            <CardHeader>
              <CardTitle>إضافة مصروف جديد</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>التاريخ *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-right font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {date ? format(date, 'PPP', { locale: ar }) : <span>اختر التاريخ</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(date) => date && setDate(date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>نوع المصروف *</Label>
                    <Select value={expenseType} onValueChange={setExpenseType}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع المصروف" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">المبلغ (قبل الضريبة) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAmount(val);
                        const base = parseFloat(val) || 0;
                        const tax = base * 0.15; // 15% tax
                        setTaxAmount(tax.toFixed(2));
                        setTotalAmount((base + tax).toFixed(2));
                      }}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxAmount">الضريبة (15%)</Label>
                    <Input
                      id="taxAmount"
                      type="number"
                      step="0.01"
                      value={taxAmount}
                      placeholder="0.00"
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">الإجمالي</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      value={totalAmount}
                      placeholder="0.00"
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="أدخل وصف المصروف"
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة مصروف
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Expenses Table */}
        {selectedRepId && expenses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>سجل المصروفات ({expenses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">نوع المصروف</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الوصف</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {format(new Date(expense.expense_date), 'PPP', { locale: ar })}
                      </TableCell>
                      <TableCell>{expense.expense_type}</TableCell>
                      <TableCell className="font-medium">
                        {expense.amount.toLocaleString('ar-SA')} ريال
                      </TableCell>
                      <TableCell>{expense.description || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CustodyExpenses;
