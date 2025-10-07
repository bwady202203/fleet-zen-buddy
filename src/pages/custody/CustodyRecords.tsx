import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Edit, Printer, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import CustodyNavbar from '@/components/CustodyNavbar';

interface CustodyTransfer {
  id: string;
  transfer_date: string;
  recipient_name: string;
  amount: number;
  description: string;
}

const CustodyRecords = () => {
  const [transfers, setTransfers] = useState<CustodyTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('custody_transfers')
        .select('*')
        .order('transfer_date', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast.error('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السند؟')) return;

    try {
      const { error } = await supabase
        .from('custody_transfers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف السند بنجاح');
      fetchTransfers();
    } catch (error) {
      console.error('Error deleting transfer:', error);
      toast.error('حدث خطأ أثناء حذف السند');
    }
  };

  const handlePrint = (transfer: CustodyTransfer) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>سند تحويل عهدة</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .content { margin: 20px 0; }
            .row { margin: 15px 0; display: flex; }
            .label { font-weight: bold; width: 150px; }
            .value { flex: 1; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>سند تحويل عهدة</h1>
          </div>
          <div class="content">
            <div class="row">
              <div class="label">التاريخ:</div>
              <div class="value">${format(new Date(transfer.transfer_date), 'PPP', { locale: ar })}</div>
            </div>
            <div class="row">
              <div class="label">اسم المستلم:</div>
              <div class="value">${transfer.recipient_name}</div>
            </div>
            <div class="row">
              <div class="label">المبلغ:</div>
              <div class="value">${transfer.amount.toLocaleString('ar-SA')} ريال</div>
            </div>
            <div class="row">
              <div class="label">الوصف:</div>
              <div class="value">${transfer.description || '-'}</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

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
            <h1 className="text-3xl font-bold">عرض العهد المستلمة</h1>
            <p className="text-muted-foreground mt-1">
              عرض وإدارة سندات التحويل
            </p>
          </div>
        </div>
      </header>

      <CustodyNavbar />

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>سجل العهد المستلمة</CardTitle>
          </CardHeader>
          <CardContent>
            {transfers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  لا توجد سندات حالياً
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">اسم المستلم</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الوصف</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        {format(new Date(transfer.transfer_date), 'PPP', { locale: ar })}
                      </TableCell>
                      <TableCell>{transfer.recipient_name}</TableCell>
                      <TableCell>
                        {transfer.amount.toLocaleString('ar-SA')} ريال
                      </TableCell>
                      <TableCell>{transfer.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(transfer)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(transfer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustodyRecords;