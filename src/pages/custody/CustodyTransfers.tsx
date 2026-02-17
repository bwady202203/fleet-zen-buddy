import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface Representative {
  id: string;
  name_ar: string;
  code: string;
}

const CustodyTransfers = () => {
  const { user } = useAuth();
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [selectedRepId, setSelectedRepId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchRepresentatives();
  }, []);

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
        .select('id, name_ar, code')
        .eq('parent_id', custodyAccount.id)
        .order('code');

      if (subAccountsError) throw subAccountsError;
      setRepresentatives(subAccounts || []);
    } catch (error) {
      console.error('Error fetching representatives:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRepId || !amount) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const repAccount = representatives.find(r => r.id === selectedRepId);
      if (!repAccount) {
        toast.error('المندوب غير موجود');
        return;
      }

      const transferAmount = parseFloat(amount);

      const { data: transfer, error: transferError } = await supabase
        .from('custody_transfers')
        .insert([{
          transfer_date: format(date, 'yyyy-MM-dd'),
          recipient_name: repAccount.name_ar,
          amount: transferAmount,
          description: description,
          created_by: user?.id
        }])
        .select()
        .single();

      if (transferError) throw transferError;

      // Generate unique entry number with timestamp
      const timestamp = Date.now();
      const randomPart = Math.floor(Math.random() * 1000);
      const entryNumber = `JE-${timestamp}-${randomPart}`;

      // Generate universal serial for custody transfer
      const { data: serialData } = await supabase.rpc('generate_universal_serial', { prefix: 'JE' });
      const universalSerial = serialData as string;

      // Insert journal entry
      const { data: journalEntry, error: journalError } = await supabase
        .from('journal_entries')
        .insert([{
          entry_number: entryNumber,
          date: format(date, 'yyyy-MM-dd'),
          description: `تحويل عهدة - ${repAccount.name_ar}`,
          reference: `custody_transfer_${transfer.id}`,
          created_by: user?.id,
          universal_serial: universalSerial
        }])
        .select()
        .single();

      if (journalError) throw journalError;

      // Find cash account (assuming it's under code 1 or a standard cash account)
      const { data: cashAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('code', '111')
        .maybeSingle();

      // Insert journal entry lines (debit representative, credit cash)
      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: repAccount.id,
            debit: transferAmount,
            credit: 0,
            description: description || `تحويل عهدة`
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: cashAccount?.id || repAccount.id,
            debit: 0,
            credit: transferAmount,
            description: description || `تحويل عهدة`
          }
        ]);

      if (linesError) throw linesError;

      toast.success('تم حفظ سند التحويل والقيد اليومي بنجاح');
      
      // Reset form
      setSelectedRepId('');
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
                <Label htmlFor="recipient">المندوب *</Label>
                <Select
                  value={selectedRepId}
                  onValueChange={setSelectedRepId}
                >
                  <SelectTrigger id="recipient">
                    <SelectValue placeholder="اختر المندوب" />
                  </SelectTrigger>
                  <SelectContent>
                    {representatives.length === 0 ? (
                      <SelectItem value="no-data" disabled>
                        لا يوجد مندوبين
                      </SelectItem>
                    ) : (
                      representatives.map((rep) => (
                        <SelectItem key={rep.id} value={rep.id}>
                          {rep.name_ar} ({rep.code})
                        </SelectItem>
                      ))
                    )}
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