import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import CustodyNavbar from '@/components/CustodyNavbar';

interface FilteredTransfer {
  id: string;
  transfer_date: string;
  recipient_name: string;
  amount: number;
  description: string;
  expense_type: string;
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

const CustodyFilter = () => {
  const [transfers, setTransfers] = useState<FilteredTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  
  const [filters, setFilters] = useState({
    recipient: '',
    date: undefined as Date | undefined,
    minAmount: '',
    maxAmount: '',
    expenseType: ''
  });

  useEffect(() => {
    fetchRecipients();
    fetchAllTransfers();
  }, []);

  const fetchRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from('custody_transfers')
        .select('recipient_name');

      if (error) throw error;

      const uniqueRecipients = [...new Set(data?.map(t => t.recipient_name) || [])];
      setRecipients(uniqueRecipients);
    } catch (error) {
      console.error('Error fetching recipients:', error);
    }
  };

  const fetchAllTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('custody_transfers')
        .select('*')
        .order('transfer_date', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const handleFilter = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('custody_transfers')
        .select('*');

      if (filters.recipient) {
        query = query.eq('recipient_name', filters.recipient);
      }

      if (filters.date) {
        query = query.eq('transfer_date', format(filters.date, 'yyyy-MM-dd'));
      }

      if (filters.minAmount) {
        query = query.gte('amount', parseFloat(filters.minAmount));
      }

      if (filters.maxAmount) {
        query = query.lte('amount', parseFloat(filters.maxAmount));
      }

      if (filters.expenseType) {
        query = query.eq('expense_type', filters.expenseType);
      }

      const { data, error } = await query.order('transfer_date', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error filtering transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      recipient: '',
      date: undefined,
      minAmount: '',
      maxAmount: '',
      expenseType: ''
    });
    fetchAllTransfers();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold">تصفية العهد</h1>
            <p className="text-muted-foreground mt-1">
              البحث والتصفية في سجل العهد
            </p>
          </div>
        </div>
      </header>

      <CustodyNavbar />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>فلاتر البحث</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>اسم مستلم العهدة</Label>
                <Select
                  value={filters.recipient}
                  onValueChange={(value) => setFilters({ ...filters, recipient: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المستلم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">الكل</SelectItem>
                    {recipients.map((recipient) => (
                      <SelectItem key={recipient} value={recipient}>
                        {recipient}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right font-normal",
                        !filters.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {filters.date ? format(filters.date, 'PPP', { locale: ar }) : <span>اختر التاريخ</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.date}
                      onSelect={(date) => setFilters({ ...filters, date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>نوع المصروف</Label>
                <Select
                  value={filters.expenseType}
                  onValueChange={(value) => setFilters({ ...filters, expenseType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع المصروف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">الكل</SelectItem>
                    {EXPENSE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minAmount">المبلغ من</Label>
                <Input
                  id="minAmount"
                  type="number"
                  step="0.01"
                  value={filters.minAmount}
                  onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAmount">المبلغ إلى</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  step="0.01"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleFilter} disabled={loading}>
                <Search className="ml-2 h-4 w-4" />
                بحث
              </Button>
              <Button variant="outline" onClick={handleReset}>
                إعادة تعيين
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>نتائج البحث ({transfers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {transfers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  لا توجد نتائج
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
                    <TableHead className="text-right">نوع المصروف</TableHead>
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
                      <TableCell>{transfer.expense_type || '-'}</TableCell>
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

export default CustodyFilter;