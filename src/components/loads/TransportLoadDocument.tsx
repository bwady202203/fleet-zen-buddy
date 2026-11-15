import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { transportLoadFields } from "@/lib/transportLoads";
import type { Tables } from "@/integrations/supabase/types";

export type TransportLoad = Tables<"transport_loads">;
export function TransportLoadDocument({ load, company }: { load: TransportLoad; company: string }) {
  return <article className="transport-load-paper" dir="rtl">
    <header className="transport-paper-header"><div><h2>{company}</h2><p>سجل حمولات النقل</p></div><div className="transport-paper-reference">رقم الفاتورة<strong dir="ltr">{load.invoice_number}</strong></div></header>
    <h1>بيان حمولة نقل</h1>
    <div className="transport-paper-dates"><span>تاريخ التحميل: <b dir="ltr">{load.loading_date.split("-").reverse().join("/")}</b></span><span>تاريخ التسليم: <b dir="ltr">{load.delivery_date.split("-").reverse().join("/")}</b></span></div>
    <table><thead><tr><th>البيان</th><th>التفاصيل</th></tr></thead><tbody>{transportLoadFields.map(field => <tr key={field.key}><th>{field.label}</th><td dir={field.type !== "text" ? "ltr" : "rtl"}>{field.type === "date" ? String(load[field.key]).split("-").reverse().join("/") : field.type === "decimal" ? Number(load[field.key]).toLocaleString("en-US", { maximumFractionDigits: 2 }) : load[field.key]}{field.key === "commission" ? " ر.س" : ""}</td></tr>)}</tbody></table>
    <div className="transport-paper-signatures">{["المورد", "السائق", "المسؤول"].map(label => <div key={label}><strong>{label}</strong><span>الاسم والتوقيع</span></div>)}</div>
    <footer><span>بيان حمولة نقل • {load.invoice_number}</span><span dir="ltr">1 / 1</span></footer>
  </article>;
}

export function TransportLoadPreview({ load, company }: { load: TransportLoad; company: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = () => setScale(Math.min(element.clientWidth / (210 * 96 / 25.4), 1));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} className="transport-preview"><div className="relative mx-auto" style={{ width: 210 * 96 / 25.4 * scale, height: 297 * 96 / 25.4 * scale }}><div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})` }}><TransportLoadDocument load={load} company={company} /></div></div></div>;
}

export function TransportLoadPrintPortal({ load, company }: { load: TransportLoad; company: string }) {
  return createPortal(<div className="transport-load-print"><TransportLoadDocument load={load} company={company} /></div>, document.body);
}