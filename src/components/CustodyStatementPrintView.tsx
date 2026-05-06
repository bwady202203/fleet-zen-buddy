import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface StatementItem {
  expense_type_id: string;
  expense_type_name: string;
  amount: number;
  tax: number;
  total: number;
  description?: string;
}

interface Props {
  representativeName: string;
  representativeCode?: string;
  date: Date;
  items: StatementItem[];
  notes?: string;
  statementNumber?: string;
  companyName?: string;
}

const CustodyStatementPrintView = ({
  representativeName,
  representativeCode,
  date,
  items,
  notes,
  statementNumber,
  companyName = 'شركة الرمال الصناعية',
}: Props) => {
  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const totalTax = items.reduce((s, i) => s + i.tax, 0);
  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  return (
    <div
      dir="rtl"
      className="custody-statement-print bg-white text-black mx-auto"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm',
        fontFamily: 'Cairo, sans-serif',
        fontSize: '13pt',
        lineHeight: 1.5,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '3px double #1a1a1a', paddingBottom: '8mm', marginBottom: '8mm' }}>
        <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
          <h1 style={{ fontSize: '28pt', fontWeight: 800, margin: 0 }}>{companyName}</h1>
          <h2 style={{ fontSize: '18pt', fontWeight: 700, margin: '4mm 0 0 0', color: '#0a4a8a' }}>
            بيان مصروفات عهدة
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '4mm',
            marginTop: '6mm',
            fontSize: '13pt',
          }}
        >
          <div>
            <strong>المندوب: </strong>
            {representativeName} {representativeCode ? `(${representativeCode})` : ''}
          </div>
          <div style={{ textAlign: 'center' }}>
            <strong>التاريخ: </strong>
            {format(date, 'PPP', { locale: ar })}
          </div>
          <div style={{ textAlign: 'left' }}>
            <strong>رقم البيان: </strong>
            {statementNumber || '—'}
          </div>
        </div>
      </div>

      {/* Items table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12pt',
          marginBottom: '6mm',
        }}
      >
        <thead>
          <tr style={{ background: '#0a4a8a', color: '#fff' }}>
            <th style={th}>م</th>
            <th style={th}>نوع المصروف</th>
            <th style={th}>الوصف</th>
            <th style={th}>المبلغ</th>
            <th style={th}>الضريبة 15%</th>
            <th style={th}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? '#f7f9fc' : '#fff' }}>
              <td style={{ ...td, textAlign: 'center', width: '12mm' }}>{idx + 1}</td>
              <td style={td}>{item.expense_type_name}</td>
              <td style={td}>{item.description || '-'}</td>
              <td style={{ ...td, textAlign: 'left' }}>{fmt(item.amount)}</td>
              <td style={{ ...td, textAlign: 'left' }}>{fmt(item.tax)}</td>
              <td style={{ ...td, textAlign: 'left', fontWeight: 700 }}>{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#e8eef7', fontWeight: 700 }}>
            <td style={td} colSpan={3}>
              الإجمالي
            </td>
            <td style={{ ...td, textAlign: 'left' }}>{fmt(totalAmount)}</td>
            <td style={{ ...td, textAlign: 'left' }}>{fmt(totalTax)}</td>
            <td style={{ ...td, textAlign: 'left', fontSize: '14pt' }}>{fmt(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      {notes && (
        <div
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '4mm',
            marginBottom: '8mm',
            background: '#fafafa',
          }}
        >
          <strong>ملاحظات: </strong>
          {notes}
        </div>
      )}

      {/* Signatures */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6mm',
          marginTop: '20mm',
          textAlign: 'center',
          fontSize: '12pt',
        }}
      >
        {['المندوب', 'المحاسب', 'المدير'].map((label) => (
          <div key={label}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '3mm', fontWeight: 700 }}>
              {label}
            </div>
            <div style={{ marginTop: '2mm', color: '#555' }}>التوقيع: ____________</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const th: React.CSSProperties = {
  border: '1px solid #1a1a1a',
  padding: '3mm 2mm',
  textAlign: 'right',
  fontWeight: 700,
};
const td: React.CSSProperties = {
  border: '1px solid #999',
  padding: '2.5mm 2mm',
  textAlign: 'right',
};
const fmt = (n: number) =>
  n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default CustodyStatementPrintView;
