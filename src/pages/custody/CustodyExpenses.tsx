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
  name: string;
  current_custody: number;
  received_custody: number;
  total_expenses: number;
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
      const { data: reps, error: repsError } = await supabase
        .from('custody_representatives')
        .select('*')
        .order('name');

      if (repsError) throw repsError;

      const repsWithData = await Promise.all((reps || []).map(async (rep) => {
        // Get received custody (total transfers)
        const { data: transfers } = await supabase
          .from('custody_transfers')
          .select('amount')
          .eq('recipient_name', rep.name);
        
        const received_custody = transfers?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        // Get total expenses
        const { data: expenses } = await supabase
          .from('custody_expenses')
          .select('amount')
          .eq('representative_id', rep.id);
        
        const total_expenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

        return {
          ...rep,
          received_custody,
          total_expenses,
          current_custody: received_custody - total_expenses
        };
      }));

      setRepresentatives(repsWithData);
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
      const { error } = await supabase
        .from('custody_expenses')
        .insert([{
          representative_id: selectedRepId,
          expense_date: format(date, 'yyyy-MM-dd'),
          expense_type: expenseType,
          amount: parseFloat(amount),
          description: description,
          created_by: user?.id
        }]);

      if (error) throw error;

      toast.success('تم إضافة المصروف بنجاح');
      
      // Reset form
      setExpenseType('');
      setAmount('');
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
                      {rep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRep && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">العهدة المستلمة</p>
                  <p className="text-lg font-bold text-green-600">
                    {(selectedRep.received_custody || 0).toLocaleString('ar-SA')} ريال
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                  <p className="text-lg font-bold text-red-600">
                    {(selectedRep.total_expenses || 0).toLocaleString('ar-SA')} ريال
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">العهدة الحالية</p>
                  <p className="text-lg font-bold text-blue-600">
                    {(selectedRep.current_custody || 0).toLocaleString('ar-SA')} ريال
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
                    <Label htmlFor="amount">المبلغ *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
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
