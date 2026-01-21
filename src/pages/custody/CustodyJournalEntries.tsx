import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import CustodyNavbar from '@/components/CustodyNavbar';

interface JournalEntryLine {
  id: string;
  debit: number;
  credit: number;
  description: string;
  chart_of_accounts: {
    name_ar: string;
    code: string;
  };
}

interface JournalEntry {
  id: string;
  entry_number: string;
  date: string;
  description: string;
  journal_entry_lines: JournalEntryLine[];
}

const CustodyJournalEntries = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJournalEntries();
  }, []);

  const fetchJournalEntries = async () => {
    try {
      // Fetch all journal entries with their lines
      const { data: journalData, error: journalError } = await supabase
        .from('journal_entries')
        .select(`
          id,
          entry_number,
          date,
          description,
          reference,
          journal_entry_lines(
            id,
            debit,
            credit,
            description,
            account_id,
            chart_of_accounts(name_ar, code)
          )
        `)
        .order('date', { ascending: false });

      if (journalError) throw journalError;

      // For entries without lines (created from custody_expenses), get amounts from custody_expenses
      const entriesWithAmounts = await Promise.all((journalData || []).map(async (entry: any) => {
        if (entry.journal_entry_lines && entry.journal_entry_lines.length > 0) {
          return entry;
        }
        
        // Check if this is a custody expense entry
        if (entry.reference && entry.reference.startsWith('custody_expense_')) {
          const expenseId = entry.reference.replace('custody_expense_', '');
          const { data: expenseData } = await supabase
            .from('custody_expenses')
            .select(`
              amount,
              description,
              representative_id,
              expense_type,
              chart_of_accounts!custody_expenses_representative_id_fkey(name_ar, code),
              expense_account:chart_of_accounts!custody_expenses_expense_type_fkey(name_ar, code)
            `)
            .eq('id', expenseId)
            .maybeSingle();

          if (expenseData) {
            // Create virtual journal entry lines from the expense data
            const virtualLines = [
              {
                id: `virtual-debit-${entry.id}`,
                debit: expenseData.amount,
                credit: 0,
                description: expenseData.description || entry.description,
                chart_of_accounts: expenseData.expense_account
              },
              {
                id: `virtual-credit-${entry.id}`,
                debit: 0,
                credit: expenseData.amount,
                description: expenseData.description || entry.description,
                chart_of_accounts: expenseData.chart_of_accounts
              }
            ];
            return { ...entry, journal_entry_lines: virtualLines };
          }
        }
        return entry;
      }));

      console.log('Journal entries fetched:', entriesWithAmounts?.length);
      setEntries(entriesWithAmounts as any);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach(entry => {
      entry.journal_entry_lines?.forEach(line => {
        totalDebit += Number(line.debit || 0);
        totalCredit += Number(line.credit || 0);
      });
    });

    return {
      debit: totalDebit,
      credit: totalCredit
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
          <div>
            <h1 className="text-3xl font-bold">قيود اليومية - العهد</h1>
            <p className="text-muted-foreground mt-1">
              عرض القيود المحاسبية الخاصة بالعهد
            </p>
          </div>
        </div>
      </header>

      <CustodyNavbar />

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
                      <TableHead className="text-right">رقم القيد</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الحساب</TableHead>
                      <TableHead className="text-right">البيان</TableHead>
                      <TableHead className="text-right">مدين</TableHead>
                      <TableHead className="text-right">دائن</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <>
                        {entry.journal_entry_lines?.map((line, index) => (
                          <TableRow key={`${entry.id}-${line.id}`}>
                            {index === 0 && (
                              <>
                                <TableCell rowSpan={entry.journal_entry_lines.length} className="font-medium border-l">
                                  {entry.entry_number}
                                </TableCell>
                                <TableCell rowSpan={entry.journal_entry_lines.length} className="border-l">
                                  {format(new Date(entry.date), 'PPP', { locale: ar })}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="font-medium">
                              {line.chart_of_accounts?.name_ar} ({line.chart_of_accounts?.code})
                            </TableCell>
                            <TableCell>{line.description || entry.description || '-'}</TableCell>
                            <TableCell className="text-red-600 font-medium">
                              {line.debit > 0 ? line.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                            </TableCell>
                            <TableCell className="text-green-600 font-medium">
                              {line.credit > 0 ? line.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={6}></TableCell>
                        </TableRow>
                      </>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={4} className="text-left">
                        الإجمالي
                      </TableCell>
                      <TableCell className="text-red-600">
                        {totals.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                      </TableCell>
                      <TableCell className="text-green-600">
                        {totals.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">إجمالي المدين</p>
                      <p className="text-2xl font-bold text-red-600">
                        {totals.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">إجمالي الدائن</p>
                      <p className="text-2xl font-bold text-green-600">
                        {totals.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
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