import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Grid3X3, User } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import CustodyNavbar from '@/components/CustodyNavbar';
import ExpenseTypeSelectorDialog from '@/components/ExpenseTypeSelectorDialog';
import RepresentativeSelectorDialog from '@/components/RepresentativeSelectorDialog';
import TaxOptionDialog from '@/components/TaxOptionDialog';
import CalculatorAmountDialog from '@/components/CalculatorAmountDialog';

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
  chart_of_accounts?: {
    name_ar: string;
  };
}

interface ExpenseType {
  id: string;
  name_ar: string;
  code: string;
}

const CustodyExpenses = () => {
  const { user } = useAuth();
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [selectedRepId, setSelectedRepId] = useState('');
  const [selectedRep, setSelectedRep] = useState<Representative | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [expenseType, setExpenseType] = useState('');
  const [selectedExpenseTypeName, setSelectedExpenseTypeName] = useState('');
  const [amount, setAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseTypeDialogOpen, setExpenseTypeDialogOpen] = useState(false);
  const [representativeDialogOpen, setRepresentativeDialogOpen] = useState(false);
  const [taxOptionDialogOpen, setTaxOptionDialogOpen] = useState(false);
  const [calculatorDialogOpen, setCalculatorDialogOpen] = useState(false);
  const [withTax, setWithTax] = useState(true);

  useEffect(() => {
    fetchRepresentatives();
    fetchExpenseTypes();
  }, []);

  useEffect(() => {
    if (selectedRepId) {
      const rep = representatives.find(r => r.id === selectedRepId);
      setSelectedRep(rep || null);
      fetchExpenses(selectedRepId);
    }
  }, [selectedRepId, representatives]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if any dialog is already open
      if (expenseTypeDialogOpen || taxOptionDialogOpen || calculatorDialogOpen || representativeDialogOpen) {
        return;
      }
      
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Open representative dialog on Enter key press (when no representative selected)
      if (e.key === 'Enter') {
        e.preventDefault();
        setRepresentativeDialogOpen(true);
        return;
      }

      // Open expense type dialog on "+" key press (only if representative is selected)
      if ((e.key === '+' || e.key === '=') && selectedRepId) {
        e.preventDefault();
        setExpenseTypeDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRepId, expenseTypeDialogOpen, taxOptionDialogOpen, calculatorDialogOpen, representativeDialogOpen]);

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

  const fetchExpenseTypes = async () => {
    try {
      // Find operating expenses account (مصروفات التشغيل) by code 5104
      const { data: operatingExpensesAccount, error: opExpError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('code', '5104')
        .maybeSingle();

      if (opExpError) throw opExpError;
      
      if (!operatingExpensesAccount) {
        toast.error('لم يتم العثور على حساب مصروفات التشغيل (5104)');
        return;
      }

      // Fetch all sub-accounts under operating expenses
      const { data: subAccounts, error: subAccountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, name_ar, code')
        .eq('parent_id', operatingExpensesAccount.id)
        .eq('is_active', true)
        .order('code');

      if (subAccountsError) throw subAccountsError;
      setExpenseTypes(subAccounts || []);
    } catch (error) {
      console.error('Error fetching expense types:', error);
      toast.error('حدث خطأ في تحميل أنواع المصروفات');
    }
  };

  const fetchExpenses = async (repId: string) => {
    try {
      const { data, error } = await supabase
        .from('custody_expenses')
        .select(`
          *,
          chart_of_accounts!custody_expenses_expense_type_fkey(name_ar)
        `)
        .eq('representative_id', repId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  // Handle expense type selection - opens tax option dialog
  const handleExpenseTypeSelected = (type: ExpenseType) => {
    setExpenseType(type.id);
    setSelectedExpenseTypeName(type.name_ar);
    // Open tax option dialog after selecting expense type
    setTaxOptionDialogOpen(true);
  };

  // Handle tax option selection - opens calculator dialog
  const handleTaxOptionSelected = (hasTax: boolean) => {
    setWithTax(hasTax);
    // Open calculator dialog after selecting tax option
    setCalculatorDialogOpen(true);
  };

  // Handle calculator confirm - saves the expense
  const handleCalculatorConfirm = async (enteredAmount: number) => {
    if (!selectedRepId || !expenseType) {
      toast.error('الرجاء اختيار المندوب ونوع المصروف');
      return;
    }

    try {
      const baseAmount = enteredAmount;
      const tax = withTax ? baseAmount * 0.15 : 0;
      const total = baseAmount + tax;
      const expenseDateStr = format(date, 'yyyy-MM-dd');

      // Insert the expense
      const { data: expenseData, error: expenseError } = await supabase
        .from('custody_expenses')
        .insert([{
          representative_id: selectedRepId,
          expense_date: expenseDateStr,
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
      if (!repAccount) {
        toast.error('المندوب غير موجود');
        return;
      }

      // Get the selected expense type account
      const expenseAccount = expenseTypes.find(e => e.id === expenseType);
      if (!expenseAccount) {
        toast.error('نوع المصروف غير موجود');
        return;
      }

      // Get tax account by code 110801
      const { data: taxAccounts, error: taxAccError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('code', '110801')
        .limit(1);

      if (taxAccError) throw taxAccError;

      let taxAccountId = taxAccounts && taxAccounts.length > 0 ? taxAccounts[0].id : null;

      // Check if there's an existing journal entry for same representative and date
      const { data: existingEntry, error: existingError } = await supabase
        .from('journal_entries')
        .select('id, entry_number')
        .eq('date', expenseDateStr)
        .like('reference', `custody_daily_${selectedRepId}_%`)
        .maybeSingle();

      if (existingError) throw existingError;

      let journalEntryId: string;
      let journalEntryNumber: string;

      if (existingEntry) {
        // Use existing journal entry
        journalEntryId = existingEntry.id;
        journalEntryNumber = existingEntry.entry_number;

        // Update the existing credit line for the representative (add to the total)
        const { data: existingCreditLine, error: creditLineError } = await supabase
          .from('journal_entry_lines')
          .select('id, credit')
          .eq('journal_entry_id', journalEntryId)
          .eq('account_id', repAccount.id)
          .maybeSingle();

        if (creditLineError) throw creditLineError;

        if (existingCreditLine) {
          // Update existing credit line
          const newCredit = Number(existingCreditLine.credit) + total;
          await supabase
            .from('journal_entry_lines')
            .update({ credit: newCredit })
            .eq('id', existingCreditLine.id);
        } else {
          // Insert new credit line
          await supabase
            .from('journal_entry_lines')
            .insert([{
              journal_entry_id: journalEntryId,
              account_id: repAccount.id,
              debit: 0,
              credit: total,
              description: `مصروفات ${repAccount.name_ar}`
            }]);
        }

        // Add debit line for expense type
        await supabase
          .from('journal_entry_lines')
          .insert([{
            journal_entry_id: journalEntryId,
            account_id: expenseAccount.id,
            debit: baseAmount,
            credit: 0,
            description: description || expenseAccount.name_ar
          }]);

        // Add tax line if applicable
        if (taxAccountId && tax > 0) {
          await supabase
            .from('journal_entry_lines')
            .insert([{
              journal_entry_id: journalEntryId,
              account_id: taxAccountId,
              debit: tax,
              credit: 0,
              description: 'ضريبة القيمة المضافة 15%'
            }]);
        }

      } else {
        // Create new journal entry for this representative and date
        const timestamp = Date.now();
        const randomPart = Math.floor(Math.random() * 1000);
        const entryNumber = `JE-${timestamp}-${randomPart}`;

        const { data: journalEntry, error: journalError } = await supabase
          .from('journal_entries')
          .insert([{
            entry_number: entryNumber,
            date: expenseDateStr,
            description: `مصروفات ${repAccount.name_ar} - ${expenseDateStr}`,
            reference: `custody_daily_${selectedRepId}_${expenseDateStr}`,
            created_by: user?.id
          }])
          .select()
          .single();

        if (journalError) throw journalError;

        journalEntryId = journalEntry.id;
        journalEntryNumber = entryNumber;

        // Insert journal entry lines
        const journalLines = [
          {
            journal_entry_id: journalEntryId,
            account_id: expenseAccount.id,
            debit: baseAmount,
            credit: 0,
            description: description || expenseAccount.name_ar
          },
          {
            journal_entry_id: journalEntryId,
            account_id: repAccount.id,
            debit: 0,
            credit: total,
            description: `مصروفات ${repAccount.name_ar}`
          }
        ];

        // Add tax line if tax account exists
        if (taxAccountId && tax > 0) {
          journalLines.splice(1, 0, {
            journal_entry_id: journalEntryId,
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

      // Insert into custody_journal_entries intermediate table
      const { error: custodyJournalError } = await supabase
        .from('custody_journal_entries')
        .insert([{
          custody_expense_id: expenseData.id,
          journal_entry_id: journalEntryId,
          debit_account_id: expenseAccount.id,
          debit_account_name: expenseAccount.name_ar,
          credit_account_id: repAccount.id,
          credit_account_name: repAccount.name_ar,
          amount: baseAmount,
          tax_amount: tax,
          total_amount: total,
          description: description || expenseAccount.name_ar,
          entry_date: expenseDateStr
        }]);

      if (custodyJournalError) {
        console.error('Error inserting custody journal entry:', custodyJournalError);
      }

      toast.success('تم إضافة المصروف والقيد اليومي بنجاح');
      
      // Reset form
      setExpenseType('');
      setSelectedExpenseTypeName('');
      setAmount('');
      setTaxAmount('');
      setTotalAmount('');
      setDescription('');
      
      // Refresh data
      fetchRepresentatives();
      if (selectedRepId) fetchExpenses(selectedRepId);
      
      return true; // Return success
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('حدث خطأ أثناء حفظ البيانات');
      return false;
    }
  };

  // Handle save and add new - saves current and opens expense type dialog again
  const handleConfirmAndNew = async (enteredAmount: number) => {
    const success = await handleCalculatorConfirm(enteredAmount);
    if (success) {
      // Close calculator and reopen expense type dialog for new entry
      setCalculatorDialogOpen(false);
      setTimeout(() => {
        setExpenseTypeDialogOpen(true);
      }, 300);
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
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-normal h-12",
                  !selectedRepId && "text-muted-foreground"
                )}
                onClick={() => setRepresentativeDialogOpen(true)}
              >
                <User className="ml-2 h-5 w-5" />
                {selectedRep ? `${selectedRep.name_ar} (${selectedRep.code})` : "اختر المندوب"}
              </Button>
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

        {/* Quick Add Expense Section */}
        {selectedRepId && (
          <Card>
            <CardHeader>
              <CardTitle>إضافة مصروف جديد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Selection */}
              <div className="flex items-center gap-4">
                <Label className="min-w-20">التاريخ:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-right font-normal",
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

              {/* Big Button to Start Expense Flow */}
              <Button
                type="button"
                size="lg"
                className="w-full h-16 text-xl"
                onClick={() => setExpenseTypeDialogOpen(true)}
              >
                <Plus className="ml-3 h-6 w-6" />
                إضافة مصروف جديد
              </Button>

              {/* Optional Description */}
              <div className="space-y-2">
                <Label htmlFor="description">ملاحظات (اختياري)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="أدخل ملاحظات إضافية..."
                  rows={2}
                />
              </div>
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
                      <TableCell>{expense.chart_of_accounts?.name_ar || expense.expense_type}</TableCell>
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

        {/* Representative Selector Dialog */}
        <RepresentativeSelectorDialog
          open={representativeDialogOpen}
          onOpenChange={setRepresentativeDialogOpen}
          representatives={representatives}
          selectedId={selectedRepId}
          onSelect={(rep) => {
            setSelectedRepId(rep.id);
            setSelectedRep(rep);
          }}
        />

        {/* Expense Type Selector Dialog */}
        <ExpenseTypeSelectorDialog
          open={expenseTypeDialogOpen}
          onOpenChange={setExpenseTypeDialogOpen}
          expenseTypes={expenseTypes}
          selectedId={expenseType}
          onSelect={handleExpenseTypeSelected}
        />

        {/* Tax Option Dialog */}
        <TaxOptionDialog
          open={taxOptionDialogOpen}
          onOpenChange={setTaxOptionDialogOpen}
          onSelect={handleTaxOptionSelected}
        />

        {/* Calculator Amount Dialog */}
        <CalculatorAmountDialog
          open={calculatorDialogOpen}
          onOpenChange={setCalculatorDialogOpen}
          onConfirm={handleCalculatorConfirm}
          onConfirmAndNew={handleConfirmAndNew}
          withTax={withTax}
          expenseTypeName={selectedExpenseTypeName}
        />
      </main>
    </div>
  );
};

export default CustodyExpenses;
