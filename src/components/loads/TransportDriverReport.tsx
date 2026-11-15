import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { summarizeTransportDrivers } from "@/lib/transportDriverReport";
import type { TransportLoad } from "./TransportLoadDocument";
const fmt = (amount: number) => amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
export default function TransportDriverReport({ organizationId }: { organizationId: string | null }) {
  const [driver, setDriver] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [page, setPage] = useState(0);
  const query = useQuery({ queryKey: ["transport-driver-report", organizationId], enabled: Boolean(organizationId), queryFn: async () => {
    if (!organizationId) throw new Error("لم يتم تحديد الشركة");
    const rows: TransportLoad[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await supabase.from("transport_loads").select("*").eq("organization_id", organizationId).order("delivery_date", { ascending: false }).order("id").range(offset, offset + 499);
      if (result.error) throw result.error;
      rows.push(...result.data);
      if (result.data.length < 500) break;
    }
    return rows;
  } });
  const drivers = useMemo(() => [...new Set(query.data?.map(row => row.driver_name) ?? [])].sort((a,b) => a.localeCompare(b,"ar")), [query.data]);
  const report = useMemo(() => summarizeTransportDrivers(query.data ?? [], start, end, driver === "all" ? "" : driver), [query.data, start, end, driver]);
  const invalidDates = Boolean(start && end && start > end);
  return <div className="space-y-6"><h2 className="border-b pb-4 text-xl font-bold">تقرير السائقين والعمولات المستحقة</h2>
    <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>السائق</Label><Select value={driver} onValueChange={value => { setDriver(value); setPage(0); }}><SelectTrigger aria-label="السائق في التقرير" className="transport-white-field"><SelectValue /></SelectTrigger><SelectContent dir="rtl"><SelectItem value="all">كل السائقين</SelectItem>{drivers.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="report-start">تاريخ التسليم من</Label><Input id="report-start" type="date" dir="ltr" className="transport-white-field" value={start} onChange={e => { setStart(e.target.value); setPage(0); }} /></div><div className="space-y-2"><Label htmlFor="report-end">تاريخ التسليم إلى</Label><Input id="report-end" type="date" dir="ltr" className="transport-white-field" value={end} onChange={e => { setEnd(e.target.value); setPage(0); }} /></div>
    </div>
    {query.isLoading ? <p className="py-8 text-center">جاري تحميل التقرير…</p> : query.isError ? <div><p className="text-destructive">تعذر تحميل التقرير</p><Button variant="outline" onClick={() => query.refetch()}>إعادة المحاولة</Button></div> : invalidDates ? <p role="alert" className="text-destructive">تاريخ البداية يجب ألا يتجاوز تاريخ النهاية</p> : <>
      <dl className="grid gap-4 border-y py-5 sm:grid-cols-3">{[{ label: "عدد الحمولات", value: report.count }, { label: "إجمالي الوزن (طن)", value: report.weight }, { label: "إجمالي العمولات المستحقة (ريال)", value: report.commission }].map(item => <div key={item.label}><dt className="text-sm text-muted-foreground">{item.label}</dt><dd className="mt-2 text-2xl font-bold tabular-nums" dir="ltr">{fmt(item.value)}</dd></div>)}</dl>
      {!report.rows.length ? <p className="py-8 text-center text-muted-foreground">لا توجد حمولات خلال الفترة المحددة</p> : <>
        <div className="overflow-hidden rounded-md border"><Table><TableHeader><TableRow><TableHead className="text-right">السائق</TableHead><TableHead className="text-right">الحمولات</TableHead><TableHead className="text-right">الوزن (طن)</TableHead><TableHead className="text-right">العمولات المستحقة (ريال)</TableHead></TableRow></TableHeader><TableBody>{report.summaries.map(row => <TableRow key={row.driver}><TableCell><Button variant="link" className="h-auto whitespace-normal p-0 text-right" onClick={() => { setDriver(row.driver); setPage(0); }}>{row.driver}</Button></TableCell><TableCell>{row.count}</TableCell><TableCell>{fmt(row.weight)}</TableCell><TableCell className="font-bold">{fmt(row.commission)}</TableCell></TableRow>)}</TableBody></Table></div>
        <h3 className="text-lg font-bold">تفاصيل حمولات {driver === "all" ? "السائقين" : driver}</h3><div className="overflow-hidden rounded-md border"><Table className="min-w-[760px]"><TableHeader><TableRow>{["تاريخ التسليم", "السائق", "المورد", "رقم الفاتورة", "الوزن (طن)", "العمولة (ريال)"].map(label => <TableHead key={label} className="text-right">{label}</TableHead>)}</TableRow></TableHeader><TableBody>{report.rows.slice(page * 50, page * 50 + 50).map(row => <TableRow key={row.id}><TableCell>{row.delivery_date.split("-").reverse().join("/")}</TableCell><TableCell>{row.driver_name}</TableCell><TableCell>{row.supplier_name}</TableCell><TableCell>{row.invoice_number}</TableCell><TableCell>{fmt(row.delivery_weight)}</TableCell><TableCell className="font-bold">{fmt(row.commission)}</TableCell></TableRow>)}</TableBody></Table></div>
        {report.count > 50 && <div className="flex items-center justify-end gap-3"><Button variant="outline" disabled={page === 0} onClick={() => setPage(value => value - 1)}>السابق</Button><span>{page + 1} / {Math.ceil(report.count / 50)}</span><Button variant="outline" disabled={(page + 1) * 50 >= report.count} onClick={() => setPage(value => value + 1)}>التالي</Button></div>}
      </>}
    </>}
  </div>;
}