import { createPortal } from "react-dom";

export interface CRShipment {
  id: string;
  shipment_number: string | null;
  entry_date: string;
  client_name: string | null;
  driver_name: string | null;
  net_weight: number | null;
  invoice_number: string | null;
  material_types: { name: string } | null;
}
type Grp = [string, { n: number; kg: number }][];
interface Props {
  fromDate: string;
  toDate: string;
  rows: CRShipment[];
  byMaterial: Grp;
  byClient: Grp;
}

const t = (kg: number) => (kg / 1000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

const GroupTable = ({ title, data, total }: { title: string; data: Grp; total: number }) => (
  <div>
    <h2 className="grp-sec">{title}</h2>
    <table className="grp-t">
      <colgroup><col style={{ width: "52%" }} /><col style={{ width: "18%" }} /><col style={{ width: "30%" }} /></colgroup>
      <thead><tr><th>البيان</th><th className="c">الشحنات</th><th className="num">الأطنان</th></tr></thead>
      <tbody>
        {data.map(([k, v]) => (
          <tr key={k}><td>{k}</td><td className="c">{v.n}</td><td className="num">{t(v.kg)}</td></tr>
        ))}
      </tbody>
      <tfoot><tr><td colSpan={2}>الإجمالي</td><td className="num">{t(total)}</td></tr></tfoot>
    </table>
  </div>
);

export const CrusherReportDocument = ({ fromDate, toDate, rows, byMaterial, byClient }: Props) => {
  const kg = rows.reduce((s, r) => s + Number(r.net_weight || 0), 0);
  const avg = rows.length ? kg / rows.length : 0;
  return (
    <div className="grp-doc">
      <div className="grp-head">
        <div>
          <h1 className="grp-title">تقرير الكسارة</h1>
          <p className="grp-sub">ملخص الشحنات والأطنان للفترة</p>
        </div>
        <div className="grp-meta">
          <div>من: <b>{fromDate}</b> &nbsp; إلى: <b>{toDate}</b></div>
          <div>تاريخ الإصدار: <b>{new Date().toLocaleDateString("en-GB")}</b></div>
        </div>
      </div>
      <div className="grp-cards">
        <div className="grp-card"><div className="l">عدد الشحنات</div><div className="v">{rows.length}</div></div>
        <div className="grp-card s"><div className="l">إجمالي الأطنان</div><div className="v">{t(kg)}</div></div>
        <div className="grp-card e"><div className="l">متوسط الشحنة (طن)</div><div className="v">{t(avg)}</div></div>
        <div className="grp-card n"><div className="l">عدد العملاء</div><div className="v">{byClient.length}</div></div>
      </div>
      <div className="grp-split" style={{ alignItems: "start" }}>
        <GroupTable title="الأطنان حسب المادة" data={byMaterial} total={kg} />
        <GroupTable title="الأطنان حسب العميل" data={byClient} total={kg} />
      </div>

      <h2 className="grp-sec">الشحنات ({rows.length})</h2>
      <table className="grp-t">
        <colgroup><col style={{ width: "6%" }} /><col style={{ width: "11%" }} /><col style={{ width: "17%" }} /><col style={{ width: "26%" }} /><col style={{ width: "10%" }} /><col style={{ width: "16%" }} /><col style={{ width: "14%" }} /></colgroup>
        <thead><tr><th className="c">م</th><th>الشحنة</th><th>التاريخ</th><th>العميل</th><th>المادة</th><th>السائق</th><th className="num">الصافي (طن)</th></tr></thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={7} className="c">لا توجد شحنات</td></tr>
          ) : rows.map((r, n) => (
            <tr key={r.id}><td className="c">{n + 1}</td><td>{r.shipment_number || "-"}</td><td>{dt(r.entry_date)}</td><td>{r.client_name || "-"}</td><td>{r.material_types?.name || "-"}</td><td>{r.driver_name || "-"}</td><td className="num">{t(Number(r.net_weight || 0))}</td></tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={6}>إجمالي الأطنان</td><td className="num">{t(kg)}</td></tr></tfoot>
      </table>

      <div className="grp-foot"><div>مسؤول الكسارة</div><div>المدير المالي</div><div>المدير العام</div></div>
    </div>
  );
};

export const CrusherReportPrintPortal = (props: Props) =>
  createPortal(<div className="grp-print-root"><CrusherReportDocument {...props} /></div>, document.body);
