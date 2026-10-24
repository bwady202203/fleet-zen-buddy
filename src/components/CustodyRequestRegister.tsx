import { useMemo, useState } from "react";
import { Eye, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CustodyRequestRecord } from "@/lib/custodyRequests";

interface Props {
  records: CustodyRequestRecord[];
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  onPreview: (record: CustodyRequestRecord) => void;
  onPrint: (record: CustodyRequestRecord) => void;
}

export default function CustodyRequestRegister({ records, loading, error, onRefresh, onPreview, onPrint }: Props) {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = useMemo(() => records.filter(record =>
    record.request_number.toLowerCase().includes(query.trim().toLowerCase()) &&
    (!from || record.request_date >= from) && (!to || record.request_date <= to)
  ), [records, query, from, to]);

  return <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-2"><Label htmlFor="custody-search">رقم الطلب</Label><Input id="custody-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="بحث برقم الطلب" /></div>
      <div className="space-y-2"><Label htmlFor="custody-from">من تاريخ</Label><Input id="custody-from" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="custody-to">إلى تاريخ</Label><Input id="custody-to" type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span>{filtered.length} طلب • الإجمالي: <strong>{filtered.reduce((sum, record) => sum + Number(record.amount), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</strong></span>
      <Button variant="outline" size="icon" aria-label="تحديث سجل الطلبات" title="تحديث سجل الطلبات" onClick={onRefresh} disabled={loading}><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></Button>
    </div>
    {error ? <p role="alert" className="text-destructive text-center py-6">تعذر تحميل سجل الطلبات، حاول التحديث.</p> : loading ? <p className="text-muted-foreground text-center py-6">جارٍ تحميل الطلبات…</p> : <Table>
      <TableHeader><TableRow><TableHead className="text-right">رقم الطلب</TableHead><TableHead className="text-right">التاريخ</TableHead><TableHead className="text-right">المبلغ (ر.س)</TableHead><TableHead className="text-right">الإجراءات</TableHead></TableRow></TableHeader>
      <TableBody>{filtered.map(record => <TableRow key={record.id}>
        <TableCell className="font-semibold whitespace-nowrap" dir="ltr">{record.request_number}</TableCell>
        <TableCell className="whitespace-nowrap">{record.request_date}</TableCell>
        <TableCell>{Number(record.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
        <TableCell><div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={`معاينة ${record.request_number}`} title="معاينة" onClick={() => onPreview(record)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" aria-label={`طباعة ${record.request_number}`} title="طباعة" onClick={() => onPrint(record)}><Printer className="h-4 w-4" /></Button>
        </div></TableCell>
      </TableRow>)}{filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد طلبات عهدة مسجلة ضمن الفترة المحددة.</TableCell></TableRow>}</TableBody>
    </Table>}
  </div>;
}