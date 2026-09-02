import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { ArrowRight, FileDown, Search, RotateCcw, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import LoadingCup from '@/components/LoadingCup';

interface ItemRow {
  id: string;
  serial_number: number;
  description: string;
  amount: number;
  is_tax_row: boolean | null;
  account: { code: string; name_ar: string } | null;
}

interface RequestRow {
  id: string;
  request_number: number;
  request_date: string;
  status: string;
  total_amount: number;
  notes: string | null;
  transfer_request_items: ItemRow[];
}

const statusLabel = (s: string) =>
  s === 'posted' ? 'مرحّل' : s === 'approved' ? 'معتمد' : 'مسودة';

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const TransferRequestsArchive = () => {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(2026);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const toggleMonth = (m: number) => {
    setSelectedDay(null);
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
    );
  };

  const daysInSelection = useMemo(() => {
    if (selectedMonths.length === 1) {
      return new Date(year, selectedMonths[0] + 1, 0).getDate();
    }
    return 31;
  }, [selectedMonths, year]);


  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transfer_requests')
        .select(
          'id, request_number, request_date, status, total_amount, notes, transfer_request_items(id, serial_number, description, amount, is_tax_row, account:chart_of_accounts(code, name_ar))'
        )
        .order('request_date', { ascending: false })
        .limit(5000);
      if (error) throw error;
      setRows((data as unknown as RequestRow[]) || []);
    } catch (e) {
      console.error(e);
      toast.error('تعذر تحميل طلبات التحويل');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const min = minAmount ? parseFloat(minAmount) : null;
    const max = maxAmount ? parseFloat(maxAmount) : null;
    const q = search.trim();
    return rows.filter((r) => {
      if (startDate && r.request_date < startDate) return false;
      if (endDate && r.request_date > endDate) return false;
      if (selectedMonths.length > 0) {
        const [y, m, d] = (r.request_date || '').split('-').map(Number);
        if (y !== year) return false;
        if (!selectedMonths.includes((m || 1) - 1)) return false;
        if (selectedDay !== null && d !== selectedDay) return false;
      } else if (selectedDay !== null) {
        const [, , d] = (r.request_date || '').split('-').map(Number);
        if (d !== selectedDay) return false;
      }
      if (min !== null && Number(r.total_amount) < min) return false;
      if (max !== null && Number(r.total_amount) > max) return false;
      if (q) {
        const hay = [
          String(r.request_number),
          r.notes || '',
          ...(r.transfer_request_items || []).map((i) => i.description || ''),
          ...(r.transfer_request_items || []).map((i) => i.account?.name_ar || ''),
        ].join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, startDate, endDate, minAmount, maxAmount, search, selectedMonths, selectedDay, year]);


  const totalAmount = filtered.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalItems = filtered.reduce((s, r) => s + (r.transfer_request_items?.length || 0), 0);

  const exportExcel = () => {
    if (filtered.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }
    const summary = filtered.map((r) => ({
      'رقم الطلب': r.request_number,
      'التاريخ': r.request_date,
      'الحالة': statusLabel(r.status),
      'عدد البنود': r.transfer_request_items?.length || 0,
      'الإجمالي': Number(r.total_amount || 0),
      'ملاحظات': r.notes || '',
    }));
    const details = filtered.flatMap((r) =>
      (r.transfer_request_items || [])
        .slice()
        .sort((a, b) => a.serial_number - b.serial_number)
        .map((i) => ({
          'رقم الطلب': r.request_number,
          'التاريخ': r.request_date,
          'م': i.serial_number,
          'البيان': i.description,
          'الحساب': i.account ? `${i.account.code} - ${i.account.name_ar}` : '',
          'ضريبة': i.is_tax_row ? 'نعم' : '',
          'المبلغ': Number(i.amount || 0),
        }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'ملخص الطلبات');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(details), 'تفاصيل البنود');
    const range = `${startDate || 'الكل'}_${endDate || 'الكل'}`;
    XLSX.writeFile(wb, `قوائم_التحويل_${range}.xlsx`);
    toast.success('تم تصدير الملف');
  };

  const reset = () => {
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSearch('');
    setSelectedMonths([]);
    setSelectedDay(null);
  };


  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ListChecks className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">جداول قوائم التحويل</h1>
              <p className="text-sm text-muted-foreground">بحث بالتاريخ أو المبلغ وتصدير إكسل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportExcel} className="gap-2">
              <FileDown className="h-4 w-4" />
              تحميل إكسل
            </Button>
            <Link to="/accounting/transfer-requests">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowRight className="h-4 w-4" />
                طلبات التحويل
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setYear((y) => y - 1); setSelectedDay(null); }}>
                  {'<'}
                </Button>
                <span className="font-bold text-lg">{year}</span>
                <Button variant="outline" size="sm" onClick={() => { setYear((y) => y + 1); setSelectedDay(null); }}>
                  {'>'}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSelectedMonths(Array.from({ length: 12 }, (_, i) => i)); setSelectedDay(null); }}
                >
                  كل الشهور
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedMonths([]); setSelectedDay(null); }}>
                  إلغاء التحديد
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
              {MONTHS_AR.map((m, idx) => {
                const active = selectedMonths.includes(idx);
                return (
                  <button
                    key={m}
                    onClick={() => toggleMonth(idx)}
                    className={`rounded-md border py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card hover:bg-muted text-foreground'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-8 sm:grid-cols-12 lg:grid-cols-[repeat(31,minmax(0,1fr))] gap-1">
              {Array.from({ length: daysInSelection }, (_, i) => i + 1).map((d) => {
                const active = selectedDay === d;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(active ? null : d)}
                    className={`rounded border py-1 text-xs transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>

          <CardHeader className="pb-3">
            <CardTitle className="text-lg">فلاتر البحث</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label>من تاريخ</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>إلى تاريخ</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>المبلغ من</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>المبلغ إلى</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>بحث</Label>
                <div className="relative">
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pr-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="رقم الطلب / بيان / حساب"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={reset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                إعادة تعيين
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">عدد الطلبات</p>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">عدد البنود</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">إجمالي المبالغ</p>
              <p className="text-2xl font-bold text-primary">
                {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">الجداول</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingCup />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">لا توجد نتائج</p>
            ) : (
              <div className="space-y-8">
                {filtered.map((r) => (
                  <div key={r.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between flex-wrap gap-2 bg-muted/40 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold">طلب رقم {r.request_number}</span>
                        <Badge variant="outline">{r.request_date}</Badge>
                        <Badge>{statusLabel(r.status)}</Badge>
                      </div>
                      <span className="font-bold text-primary">
                        {Number(r.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right w-12">م</TableHead>
                          <TableHead className="text-right">البيان</TableHead>
                          <TableHead className="text-right">الحساب</TableHead>
                          <TableHead className="text-right w-40">المبلغ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(r.transfer_request_items || [])
                          .slice()
                          .sort((a, b) => a.serial_number - b.serial_number)
                          .map((i) => (
                            <TableRow key={i.id} className={i.is_tax_row ? 'bg-emerald-500/5' : ''}>
                              <TableCell>{i.serial_number}</TableCell>
                              <TableCell>{i.description}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {i.account ? `${i.account.code} - ${i.account.name_ar}` : '-'}
                              </TableCell>
                              <TableCell>
                                {Number(i.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TransferRequestsArchive;
