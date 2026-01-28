import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import CustodyNavbar from '@/components/CustodyNavbar';

interface CustodyJournalEntry {
  id: string;
  custody_expense_id: string;
  journal_entry_id: string;
  debit_account_id: string;
  debit_account_name: string;
  credit_account_id: string;
  credit_account_name: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  description: string;
  entry_date: string;
  journal_entries?: {
    entry_number: string;
    description: string;
  };
}

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
  reference: string;
  journal_entry_lines: JournalEntryLine[];
}

const CustodyJournalEntries = () => {
  const [custodyEntries, setCustodyEntries] = useState<CustodyJournalEntry[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllEntries();
  }, []);

  const fetchAllEntries = async () => {
    try {
      // Fetch from custody_journal_entries (intermediate table)
      const { data: custodyData, error: custodyError } = await supabase
        .from('custody_journal_entries')
        .select(`
          *,
          journal_entries(entry_number, description)
        `)
        .order('entry_date', { ascending: false });

      if (custodyError) {
        console.error('Error fetching custody journal entries:', custodyError);
      } else {
        setCustodyEntries((custodyData || []) as CustodyJournalEntry[]);
      }

      // Fetch journal entries with their lines
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
        .like('reference', 'custody_%')
        .order('date', { ascending: false });

      if (journalError) throw journalError;

      setJournalEntries((journalData || []) as JournalEntry[]);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;

    // Calculate from custody entries
    custodyEntries.forEach(entry => {
      totalDebit += Number(entry.amount || 0) + Number(entry.tax_amount || 0);
      totalCredit += Number(entry.total_amount || 0);
    });

    // If no custody entries, calculate from journal entries
    if (custodyEntries.length === 0) {
      journalEntries.forEach(entry => {
        entry.journal_entry_lines?.forEach(line => {
          totalDebit += Number(line.debit || 0);
          totalCredit += Number(line.credit || 0);
        });
      });
    }

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
        {/* Custody Journal Entries from intermediate table */}
        {custodyEntries.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>قيود مصروفات العهد</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم القيد</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">حساب المدين</TableHead>
                    <TableHead className="text-right">حساب الدائن</TableHead>
                    <TableHead className="text-right">البيان</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الضريبة</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {custodyEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.journal_entries?.entry_number || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.entry_date), 'PPP', { locale: ar })}
                      </TableCell>
                      <TableCell className="text-red-600 font-medium">
                        {entry.debit_account_name}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {entry.credit_account_name}
                      </TableCell>
                      <TableCell>{entry.description || '-'}</TableCell>
                      <TableCell>
                        {Number(entry.amount).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {Number(entry.tax_amount).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-bold">
                        {Number(entry.total_amount).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={5} className="text-left">
                      الإجمالي
                    </TableCell>
                    <TableCell className="text-red-600">
                      {custodyEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                    </TableCell>
                    <TableCell>
                      {custodyEntries.reduce((sum, e) => sum + Number(e.tax_amount || 0), 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                    </TableCell>
                    <TableCell className="text-green-600">
                      {custodyEntries.reduce((sum, e) => sum + Number(e.total_amount || 0), 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Regular Journal Entries */}
        <Card>
          <CardHeader>
            <CardTitle>سجل القيود اليومية الكامل</CardTitle>
          </CardHeader>
          <CardContent>
            {journalEntries.length === 0 ? (
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
                    {journalEntries.map((entry) => (
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
                  {totals.debit === totals.credit && totals.debit > 0 && (
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