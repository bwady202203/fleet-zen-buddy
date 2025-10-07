import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import CustodyNavbar from '@/components/CustodyNavbar';

const CustodyTransfers = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientName || !amount) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const { data: transfer, error: transferError } = await supabase
        .from('custody_transfers')
        .insert([{
          transfer_date: format(date, 'yyyy-MM-dd'),
          recipient_name: recipientName,
          amount: parseFloat(amount),
          description: description,
          created_by: user?.id
        }])
        .select()
        .single();

      if (transferError) throw transferError;

      // Create journal entry
      const { error: journalError } = await supabase
        .from('custody_journal_entries')
        .insert([{
          entry_date: format(date, 'yyyy-MM-dd'),
          from_account: 'حساب المصروفات',
          to_account: recipientName,
          amount: parseFloat(amount),
          description: description,
          transfer_id: transfer.id
        }]);

      if (journalError) throw journalError;

      toast.success('تم حفظ سند التحويل بنجاح');
      
      // Reset form
      setRecipientName('');
      setAmount('');
      setDescription('');
      setDate(new Date());
    } catch (error) {
      console.error('Error saving transfer:', error);
      toast.error('حدث خطأ أثناء حفظ البيانات');
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold">سند تحويل عهدة</h1>
            <p className="text-muted-foreground mt-1">
              إنشاء سند تحويل عهدة جديد
            </p>
          </div>
        </div>
      </header>

      <CustodyNavbar />

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>بيانات السند</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>التاريخ</Label>
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
                <Label htmlFor="recipient">اسم المستلم *</Label>
                <Input
                  id="recipient"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="أدخل اسم المستلم (حساس لحالة الأحرف)"
                  required
                />
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

              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="أدخل وصف العهدة"
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full" size="lg">
                حفظ السند
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustodyTransfers;