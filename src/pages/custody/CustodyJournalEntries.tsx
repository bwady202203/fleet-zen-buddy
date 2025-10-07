import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface JournalEntry {
  id: string;
  entry_date: string;
  from_account: string;
  to_account: string;
  amount: number;
  description: string;
}

const CustodyJournalEntries = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJournalEntries();
  }, []);

  const fetchJournalEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('custody_journal_entries')
        .select('*')
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalDebit = entries.reduce((sum, entry) => sum + entry.amount, 0);
    return {
      debit: totalDebit,
      credit: totalDebit
    };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">قيود اليومية - العهد</h1>
              <p className="text-muted-foreground mt-1">
                عرض القيود المحاسبية الخاصة بالعهد
              </p>
            </div>
            <Link to="/">
              <Button variant="outline">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>سجل القيود اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  لا توجد قيود حالياً
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">من حساب</TableHead>
                      <TableHead className="text-right">إلى حساب</TableHead>
                      <TableHead className="text-right">المبلغ (مدين)</TableHead>
                      <TableHead className="text-right">المبلغ (دائن)</TableHead>
                      <TableHead className="text-right">البيان</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {format(new Date(entry.entry_date), 'PPP', { locale: ar })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.from_account}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.to_account}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {entry.amount.toLocaleString('ar-SA')} ريال
                        </TableCell>
                        <TableCell className="text-green-600">
                          {entry.amount.toLocaleString('ar-SA')} ريال
                        </TableCell>
                        <TableCell>{entry.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3} className="text-left">
                        الإجمالي
                      </TableCell>
                      <TableCell className="text-red-600">
                        {totals.debit.toLocaleString('ar-SA')} ريال
                      </TableCell>
                      <TableCell className="text-green-600">
                        {totals.credit.toLocaleString('ar-SA')} ريال
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">إجمالي المدين</p>
                      <p className="text-2xl font-bold text-red-600">
                        {totals.debit.toLocaleString('ar-SA')} ريال
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">إجمالي الدائن</p>
                      <p className="text-2xl font-bold text-green-600">
                        {totals.credit.toLocaleString('ar-SA')} ريال
                      </p>
                    </div>
                  </div>
                  {totals.debit === totals.credit && (
                    <p className="text-center mt-4 text-sm text-green-600 font-medium">
                      ✓ القيد متوازن
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustodyJournalEntries;