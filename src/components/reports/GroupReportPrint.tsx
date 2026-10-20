import { createPortal } from "react-dom";

export interface GRInvoice {
  id: string;
  invoice_number: string;
  total: number;
  payment_type: string;
  created_at: string;
  driver_name: string | null;
  plate_number: string | null;
}
export interface GRExpense {
  id: string;
  amount: number;
  description: string | null;
  expense_date: string;
  recipient_name: string | null;
}

interface Props {
  fromDate: string;
  toDate: string;
  invoices: GRInvoice[];
  expenses: GRExpense[];
}

const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
const pay = (t: string) =>
  t === "cash" ? "نقدي" : t === "credit" ? "آجل" : t === "network" ? "شبكة" : t;

export const groupReportStyles = `
.grp-doc{direction:rtl;font-family:Cairo,sans-serif;color:#0f172a;background:#fff;width:182mm;margin:0 auto;font-size:9.5pt;line-height:1.45}
.grp-head{display:flex;justify-content:space-between;align-items:flex-end;padding:0 0 4mm;border-bottom:2.5px solid #0c4a6e;margin-bottom:5mm;position:relative}
.grp-head:after{content:"";position:absolute;bottom:-5px;right:0;width:40mm;height:2px;background:#0891b2}
.grp-title{font-size:20pt;font-weight:800;margin:0;color:#0c4a6e}
.grp-sub{font-size:10pt;color:#0891b2;font-weight:700;margin:1mm 0 0}
.grp-meta{text-align:left;font-size:8.5pt;color:#475569}
.grp-meta b{color:#0f172a}
.grp-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-bottom:5mm}
.grp-card{border:1px solid #cbd5e1;border-radius:2.5mm;padding:2.5mm 3mm;border-top:3px solid #0891b2;break-inside:avoid}
.grp-card .l{font-size:8pt;color:#64748b}
.grp-card .v{font-size:12.5pt;font-weight:800;font-variant-numeric:tabular-nums}
.grp-card.s{border-top-color:#059669}.grp-card.e{border-top-color:#d97706}.grp-card.n{border-top-color:#0c4a6e}
.grp-split{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-bottom:6mm}
.grp-split div{display:flex;justify-content:space-between;background:#f1f5f9;border-radius:2mm;padding:2mm 3mm;font-size:9pt}
.grp-split b{font-variant-numeric:tabular-nums}
.grp-sec{font-size:11.5pt;font-weight:800;color:#0c4a6e;margin:0 0 2mm;padding-right:2.5mm;border-right:3px solid #0891b2}
.grp-t{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6mm}
.grp-t th{background:#0c4a6e;color:#fff;font-weight:700;padding:1.8mm 1.5mm;font-size:8.5pt;text-align:right;border:1px solid #0c4a6e}
.grp-t td{padding:1.5mm;border:1px solid #e2e8f0;overflow-wrap:anywhere;vertical-align:middle}
.grp-t tbody tr:nth-child(even) td{background:#f8fafc}
.grp-t tr{break-inside:avoid}
.grp-t thead{display:table-header-group}
.grp-t .num{text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap}
.grp-t .c{text-align:center}
.grp-t tfoot td{background:#e0f2fe;font-weight:800;border-color:#bae6fd}
.grp-foot{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm;margin-top:10mm;text-align:center;font-size:9pt;break-inside:avoid}
.grp-foot div{border-top:1px solid #334155;padding-top:2mm;font-weight:700}
.grp-print-root{display:none}
@page grp-a4{size:A4 portrait;margin:14mm 14mm 16mm}
@media print{
  body>*:not(.grp-print-root){display:none !important}
  .grp-print-root{display:block !important;page:grp-a4}
  .grp-doc{width:auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;

export const GroupReportDocument = ({ fromDate, toDate, invoices, expenses }: Props) => {
  const sales = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const exp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const cash = invoices.filter((i) => i.payment_type === "cash").reduce((s, i) => s + Number(i.total || 0), 0);
  return (
    <div className="grp-doc">
      <div className="grp-head">
        <div>
          <h1 className="grp-title">تقرير المجمعة</h1>
          <p className="grp-sub">ملخص المبيعات والمصروفات للفترة</p>
        </div>
        <div className="grp-meta">
          <div>من: <b>{fromDate}</b> &nbsp; إلى: <b>{toDate}</b></div>
          <div>تاريخ الإصدار: <b>{new Date().toLocaleDateString("en-GB")}</b></div>
        </div>
      </div>
      <div className="grp-cards">
        <div className="grp-card"><div className="l">عدد الفواتير</div><div className="v">{invoices.length}</div></div>
        <div className="grp-card s"><div className="l">إجمالي المبيعات</div><div className="v">{money(sales)}</div></div>
        <div className="grp-card e"><div className="l">إجمالي المصروفات</div><div className="v">{money(exp)}</div></div>
        <div className="grp-card n"><div className="l">صافي الفترة</div><div className="v">{money(sales - exp)}</div></div>
      </div>
      <div className="grp-split">
        <div><span>مبيعات نقدية</span><b>{money(cash)}</b></div>
        <div><span>مبيعات أخرى (شبكة/آجل)</span><b>{money(sales - cash)}</b></div>
      </div>

      <h2 className="grp-sec">الفواتير ({invoices.length})</h2>
      <table className="grp-t">
        <colgroup><col style={{ width: "7%" }} /><col style={{ width: "15%" }} /><col style={{ width: "19%" }} /><col style={{ width: "24%" }} /><col style={{ width: "12%" }} /><col style={{ width: "9%" }} /><col style={{ width: "14%" }} /></colgroup>
        <thead><tr><th className="c">م</th><th>رقم الفاتورة</th><th>التاريخ</th><th>السائق</th><th>اللوحة</th><th>الدفع</th><th className="num">الإجمالي</th></tr></thead>
        <tbody>
          {invoices.map((i, n) => (
            <tr key={i.id}><td className="c">{n + 1}</td><td>{i.invoice_number}</td><td>{dt(i.created_at)}</td><td>{i.driver_name || "-"}</td><td>{i.plate_number || "-"}</td><td>{pay(i.payment_type)}</td><td className="num">{money(Number(i.total || 0))}</td></tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={6}>إجمالي الفواتير</td><td className="num">{money(sales)}</td></tr></tfoot>
      </table>

      <h2 className="grp-sec">المصروفات ({expenses.length})</h2>
      <table className="grp-t">
        <colgroup><col style={{ width: "7%" }} /><col style={{ width: "15%" }} /><col style={{ width: "44%" }} /><col style={{ width: "18%" }} /><col style={{ width: "16%" }} /></colgroup>
        <thead><tr><th className="c">م</th><th>التاريخ</th><th>البيان</th><th>المستلم</th><th className="num">المبلغ</th></tr></thead>
        <tbody>
          {expenses.length === 0 ? (
            <tr><td colSpan={5} className="c">لا توجد مصروفات</td></tr>
          ) : expenses.map((e, n) => (
            <tr key={e.id}><td className="c">{n + 1}</td><td>{e.expense_date}</td><td>{e.description || "-"}</td><td>{e.recipient_name || "-"}</td><td className="num">{money(Number(e.amount || 0))}</td></tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={4}>إجمالي المصروفات</td><td className="num">{money(exp)}</td></tr></tfoot>
      </table>

      <div className="grp-foot"><div>المحاسب</div><div>المدير المالي</div><div>المدير العام</div></div>
    </div>
  );
};

export const GroupReportPrintPortal = (props: Props) =>
  createPortal(
    <div className="grp-print-root"><GroupReportDocument {...props} /></div>,
    document.body
  );
