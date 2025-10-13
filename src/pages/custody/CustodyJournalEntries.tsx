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
      // First, get the custody account (1111)
      const { data: custodyAccount, error: custodyError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('code', '1111')
        .maybeSingle();

      if (custodyError) throw custodyError;
      
      if (!custodyAccount) {
        console.error('Custody account 1111 not found');
        setLoading(false);
        return;
      }

      // Get all sub-accounts under custody
      const { data: custodySubAccounts, error: subAccountsError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('parent_id', custodyAccount.id);

      if (subAccountsError) throw subAccountsError;

      const custodyAccountIds = custodySubAccounts?.map(acc => acc.id) || [];

      // Fetch journal entries that have lines with custody accounts
      const { data: journalData, error: journalError } = await supabase
        .from('journal_entries')
        .select(`
          id,
          entry_number,
          date,
          description,
          journal_entry_lines(
            id,
            debit,
            credit,
            description,
            chart_of_accounts(name_ar, code)
          )
        `)
        .order('date', { ascending: false });

      if (journalError) throw journalError;

      // Filter entries that contain custody accounts in their lines
      const custodyEntries = (journalData || []).filter(entry => 
        entry.journal_entry_lines?.some((line: any) => 
          custodyAccountIds.includes(line.account_id)
        )
      );

      setEntries(custodyEntries as any);
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