import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";
import { Calendar, Download, Eye, FileSpreadsheet, MessageCircle, Printer, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Row = any;
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = (s?: string) => { if (!s) return "-"; const d = new Date(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const dt = (s?: string) => { if (!s) return "-"; const d = new Date(s); return `${pad(d.getHours())}:${pad(d.getMinutes())} ${dmy(s)}`; };
const kg = (v: any) => Number(v || 0).toFixed(2);

function ranges() {
  const t = new Date(); const y = new Date(t); y.setDate(t.getDate() - 1);
  const ms = new Date(t.getFullYear(), t.getMonth(), 1);
  const ps = new Date(t.getFullYear(), t.getMonth() - 1, 1), pe = new Date(t.getFullYear(), t.getMonth(), 0);
  return { today: [ymd(t), ymd(t)], yesterday: [ymd(y), ymd(y)], month: [ymd(ms), ymd(t)], prev: [ymd(ps), ymd(pe)] } as Record<string, [string, string]>;
}

export function ShipmentDocument({ r }: { r: Row }) {
  const lbl = "text-[11px] text-slate-600"; const val = "text-[11px] text-slate-800";
  const Line = ({ a, b }: any) => (<div className="flex justify-between gap-3 py-2"><span className={lbl}>{a}</span><span className={`${val} text-left`}>{b}</span></div>);
  const W = ({ t, v }: any) => (<div className="flex-1 rounded-md border border-slate-300 p-3 text-center"><div className={lbl}>{t}</div><div className="text-lg font-bold text-red-600 my-2">{kg(v)}</div><div className="text-[10px] text-slate-500">KG | كجم</div></div>);
  return (
    <div className="shipment-doc bg-white text-slate-900 mx-auto" dir="rtl" style={{ width: "210mm", minHeight: "297mm", padding: "10mm", fontFamily: "Cairo, sans-serif", boxSizing: "border-box" }}>
      <div className="flex justify-between items-start">
        <div className="rounded-md shadow border border-slate-200 px-3 py-2 text-left" dir="ltr"><div className="font-bold text-sm">soft industrial remal company</div><div className="font-bold text-xs mt-1">2050147243</div></div>
        <div className="flex-1 text-center"><div className="text-2xl font-bold text-slate-400">مستند شحنة</div><div className="text-[11px] text-slate-400 mt-2">Shipment Document</div><div className="text-[11px] text-slate-400">Shipping Receipt | إيصال الشحن</div></div>
        <div className="w-40" />
      </div>
      <div className="h-1 bg-red-500 mt-4" />
      <div className="flex justify-between text-[11px] py-3 border-b border-slate-200">
        <span>رقم المستند | Document No: {r.doc_number}</span><span>رقم الطباعة | Print No: {String(r.doc_number - 4).padStart(6, "0")}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="rounded-md border border-slate-200 border-r-4 border-r-sky-500 p-3">
          <div className="font-bold text-sm border-b-2 border-slate-300 pb-2">معلومات الشحنة | Shipment Info</div>
          <Line a="رقم الشاحنة | Shipment No:" b={r.shipment_number || "-"} />
          <Line a="تاريخ الدخول | Entry Date:" b={dt(r.entry_at)} />
          <Line a="تاريخ الخروج | Exit Date:" b={dt(r.exit_at)} />
          <Line a="نوع المواد | Material Type:" b={r.material_type || "-"} />
        </div>
        <div className="rounded-md border border-slate-200 border-r-4 border-r-sky-500 p-3">
          <div className="font-bold text-sm border-b-2 border-slate-300 pb-2">معلومات الأطراف | Party Info</div>
          <Line a="اسم العميل | Client Name:" b={r.client_name || "-"} />
          <Line a="اسم السائق | Driver Name:" b={r.driver_name || "-"} />
          <Line a="اسم المورد | Supplier Name:" b={r.supplier_name || r.establishment || "-"} />
        </div>
      </div>
      <div className="rounded-md border border-dashed border-slate-300 p-3 mt-4">
        <div className="text-center font-bold text-sm mb-3">بيانات الوزن | Weight Data</div>
        <div className="flex gap-3"><W t="وزن فارغ | Empty Weight" v={r.empty_weight} /><W t="وزن كامل | Full Weight" v={r.full_weight} /><W t="الوزن الصافي | Net Weight" v={r.net_weight} /></div>
      </div>
      <div className="border-t-2 border-dashed border-slate-300 mt-4" />
      <div className="grid grid-cols-3 gap-4 mt-10 text-center text-[11px]">
        {[["توقيع السائق", "Driver Signature"], ["توقيع المستلم", "Receiver Signature"], ["توقيع المسؤول", "Manager Signature"]].map(([a, b]) => (
          <div key={a} className="border-t border-slate-700 pt-2"><div className="font-semibold">{a}</div><div className="mt-1">{b}</div></div>))}
      </div>
      <div className="rounded-lg border-2 border-dashed border-slate-700 p-4 mt-6 flex items-center justify-between">
        <div className="text-center"><div className="text-[10px] text-slate-500">رقم الفاتورة | Invoice No.</div><div className="text-lg font-bold tracking-widest mt-2">{r.invoice_number}</div></div>
        <div className="text-center"><div className="text-[10px] text-slate-500">رقم السريال | Serial No.</div><div className="text-lg font-bold tracking-[0.3em] mt-2">{r.serial_number}</div></div>
        <div className="text-center"><QRCodeSVG value={`DOC:${r.doc_number}|INV:${r.invoice_number}|SN:${r.serial_number}|NET:${kg(r.net_weight)}`} size={72} /><div className="text-[9px] text-slate-500 mt-1">رمز التحقق | Verify QR</div></div>
      </div>
    </div>
  );
}

export default function CrusherShipmentsList({ refreshKey }: { refreshKey: number }) {
  const R = ranges();
  const [range, setRange] = useState<[string, string]>(R.month);
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<Row | null>(null);
  const [printing, setPrinting] = useState<Row | null>(null);

  const load = async () => {
    const { data, error } = await (supabase as any).from("crusher_shipments").select("*")
      .gte("entry_at", `${range[0]}T00:00:00`).lte("entry_at", `${range[1]}T23:59:59`).order("doc_number", { ascending: false });
    if (error) toast.error(error.message); else setRows(data || []);
  };
  useEffect(() => { load(); }, [range[0], range[1], refreshKey]);

  const pdfUrl = async (p: string, download = false) => {
    const { data, error } = await supabase.storage.from("crusher-invoices").createSignedUrl(p, 120, download ? { download: true } : undefined);
    if (error) { toast.error(error.message); return null; } return data.signedUrl;
  };
  const openPdf = async (r: Row, dl = false) => { const w = window.open("", "_blank"); const u = await pdfUrl(r.invoice_pdf_path, dl); if (u && w) w.location.href = u; else w?.close(); };
  const replacePdf = (r: Row) => {
    const i = document.createElement("input"); i.type = "file"; i.accept = "application/pdf";
    i.onchange = async () => { const f = i.files?.[0]; if (!f) return;
      const { error } = await supabase.storage.from("crusher-invoices").upload(r.invoice_pdf_path, f, { upsert: true, contentType: "application/pdf" });
      error ? toast.error(error.message) : toast.success("تم استبدال ملف PDF"); };
    i.click();
  };
  const del = async (r: Row) => {
    if (prompt("أدخل رمز الأمان للحذف") !== "363636") { toast.error("رمز غير صحيح"); return; }
    const { error } = await (supabase as any).from("crusher_shipments").delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };
  const doPrint = (r: Row) => { setPrinting(r); setTimeout(() => { window.print(); setTimeout(() => setPrinting(null), 500); }, 300); };
  const exportXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({ "رقم المستند": r.doc_number, "التاريخ": dmy(r.entry_at), "العميل": r.client_name, "السائق": r.driver_name, "رقم الشاحنة": r.shipment_number, "المورد": r.supplier_name, "نوع المواد": r.material_type, "الوزن الصافي": Number(r.net_weight), "رقم الفاتورة": r.invoice_number, "السريال": r.serial_number })));
    ws["!views"] = [{ RTL: true }] as any; const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] } as any;
    XLSX.utils.book_append_sheet(wb, ws, "الشحنات"); XLSX.writeFile(wb, `shipments-${range[0]}_${range[1]}.xlsx`);
  };
  const whatsapp = () => {
    const total = rows.reduce((s, r) => s + Number(r.net_weight || 0), 0);
    const txt = `تقرير الشحنات ${range[0]} إلى ${range[1]}\nعدد الشحنات: ${rows.length}\nإجمالي الوزن الصافي: ${kg(total)} كجم`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
  };
  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.net_weight || 0), 0), [rows]);
  const chip = (k: string, t: string) => (
    <Button key={k} size="sm" variant={range[0] === R[k][0] && range[1] === R[k][1] ? "default" : "secondary"} onClick={() => setRange(R[k])}><Calendar className="h-4 w-4 ml-1" />{t}</Button>);

  return (
    <section className="space-y-3" dir="rtl">
      <div className="flex flex-wrap items-center gap-2">
        {chip("today", "اليوم")}{chip("yesterday", "الأمس")}{chip("month", "الشهر الحالي")}{chip("prev", "الشهر السابق")}
        <input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" value={range[0]} onChange={(e) => setRange([e.target.value, range[1]])} />
        <input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" value={range[1]} onChange={(e) => setRange([range[0], e.target.value])} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={exportXlsx}><FileSpreadsheet className="h-4 w-4 ml-1" />تصدير Excel</Button>
        <Button size="sm" variant="outline" onClick={whatsapp}><MessageCircle className="h-4 w-4 ml-1" />إرسال واتساب</Button>
        <span className="text-sm text-muted-foreground self-center mr-auto">{rows.length} شحنة — الصافي {kg(total)} كجم</span>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm text-center">
          <thead className="bg-primary/10 text-foreground">
            <tr>{["رقم المستند", "التاريخ", "العميل", "السائق", "رقم الشاحنة", "المورد", "نوع المواد", "الوزن الصافي", "PDF", "إجراءات"].map((h) => <th key={h} className="p-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={10} className="p-6 text-muted-foreground">لا توجد شحنات في هذه الفترة</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-r-4 border-r-primary/60 bg-primary/5 hover:bg-primary/10">
                <td className="p-2 text-primary font-semibold">{r.doc_number}</td>
                <td className="p-2">{dmy(r.entry_at)}</td>
                <td className="p-2 max-w-[120px]">{r.client_name || "-"}</td>
                <td className="p-2">{r.driver_name || "-"}</td>
                <td className="p-2">{r.shipment_number || "-"}</td>
                <td className="p-2 max-w-[140px] text-xs">{r.supplier_name || r.establishment}</td>
                <td className="p-2">{r.material_type || "-"}</td>
                <td className="p-2 text-accent-foreground font-semibold">{kg(r.net_weight)}<div className="text-xs">كجم</div></td>
                <td className="p-2"><div className="flex justify-center gap-2">
                  <button aria-label="عرض" onClick={() => openPdf(r)}><Eye className="h-4 w-4 text-primary" /></button>
                  <button aria-label="تحميل" onClick={() => openPdf(r, true)}><Download className="h-4 w-4 text-primary" /></button>
                  <button aria-label="استبدال" onClick={() => replacePdf(r)}><Upload className="h-4 w-4 text-muted-foreground" /></button>
                </div></td>
                <td className="p-2"><div className="flex justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPreview(r)}><Eye className="h-4 w-4 ml-1" />معاينة</Button>
                  <Button size="sm" variant="outline" onClick={() => doPrint(r)}><Printer className="h-4 w-4 ml-1" />طباعة</Button>
                  <Button size="sm" variant="destructive" onClick={() => del(r)}><Trash2 className="h-4 w-4 ml-1" />حذف</Button>
                </div></td>
              </tr>))}
          </tbody>
        </table>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-foreground/60 overflow-auto p-4 print:hidden" onClick={() => setPreview(null)}>
          <div className="mx-auto w-fit" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-2 justify-end mb-2">
              <Button size="sm" onClick={() => doPrint(preview)}><Printer className="h-4 w-4 ml-1" />طباعة</Button>
              <Button size="sm" variant="secondary" onClick={() => setPreview(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="shadow-xl origin-top" style={{ zoom: typeof window !== "undefined" && window.innerWidth < 820 ? (window.innerWidth - 32) / 794 : 1 }}><ShipmentDocument r={preview} /></div>
          </div>
        </div>)}

      {printing && createPortal(
        <div id="shipment-print-root"><style>{`@page shipment{size:A4;margin:0}
@media screen{#shipment-print-root{display:none}}
@media print{body>*:not(#shipment-print-root){display:none !important}#shipment-print-root{page:shipment}#shipment-print-root *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`}</style><ShipmentDocument r={printing} /></div>, document.body)}
    </section>
  );
}
