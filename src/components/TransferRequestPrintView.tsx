import { format } from 'date-fns';

interface TransferRequestItem {
  id: string;
  serial_number: number;
  description: string;
  amount: number;
  account_id: string | null;
  is_tax_row?: boolean;
}

interface TransferRequest {
  id: string;
  request_number: number;
  request_date: string;
  status: string;
  total_amount: number;
  notes: string | null;
  items: TransferRequestItem[];
}

interface Account {
  id: string;
  code: string;
  name_ar: string;
}

interface Props {
  request: TransferRequest;
  accounts: Account[];
  companyName?: string;
}

const ITEMS_PER_FIRST_PAGE = 14;
const ITEMS_PER_OTHER_PAGE = 20;

const TransferRequestPrintView = ({ request, accounts, companyName = 'شركة الرمال الناعمة' }: Props) => {
  const requestDate = new Date(request.request_date);
  const gregorianDate = format(requestDate, 'yyyy/MM/dd');

  const getHijriDate = (date: Date) => {
    const gregorianYear = date.getFullYear();
    const gregorianMonth = date.getMonth();
    const gregorianDay = date.getDate();
    const julianDay = Math.floor(365.25 * (gregorianYear + 4716)) +
      Math.floor(30.6001 * (gregorianMonth + 1 + 1)) +
      gregorianDay - 1524.5;
    const l = Math.floor(julianDay - 1948439.5 + 10632);
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
      Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const hijriMonth = Math.floor((24 * l3) / 709);
    const hijriDay = l3 - Math.floor((709 * hijriMonth) / 24);
    const hijriYear = 30 * n + j - 30;
    return `${hijriDay}/${hijriMonth}/${hijriYear}`;
  };

  const hijriDate = getHijriDate(requestDate);

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return '—';
    const account = accounts.find(a => a.id === accountId);
    return account ? `${account.code} - ${account.name_ar}` : '—';
  };

  const pages: TransferRequestItem[][] = [];
  const items = request.items;
  if (items.length <= ITEMS_PER_FIRST_PAGE) {
    pages.push(items);
  } else {
    pages.push(items.slice(0, ITEMS_PER_FIRST_PAGE));
    let remaining = items.slice(ITEMS_PER_FIRST_PAGE);
    while (remaining.length > 0) {
      pages.push(remaining.slice(0, ITEMS_PER_OTHER_PAGE));
      remaining = remaining.slice(ITEMS_PER_OTHER_PAGE);
    }
  }

  const totalPages = pages.length;

  const pageStyle: React.CSSProperties = {
    width: '210mm',
    height: '297mm',
    padding: '20mm',
    backgroundColor: '#FFFFFF',
    color: '#222222',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '12px',
    lineHeight: '1.6',
    direction: 'rtl',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    position: 'relative',
    pageBreakAfter: 'always',
  };

  const renderHeader = (pageNum: number) => (
    <div style={{ marginBottom: '6mm' }}>
      {/* Company Name - centered */}
      <div style={{ textAlign: 'center', marginBottom: '5mm' }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#1a3a6b',
          margin: '0 0 6px 0',
          letterSpacing: '0.5px',
        }}>
          {companyName}
        </h1>
        <div style={{ width: '60%', margin: '0 auto', borderBottom: '2px solid #1a3a6b' }} />
      </div>

      {/* Document info bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        backgroundColor: '#f0f4fa',
        borderRadius: '6px',
        border: '1px solid #d0d9e8',
        fontSize: '13px',
        color: '#333',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '2px' }}>التاريخ الميلادي</span>
          <strong style={{ fontSize: '14px', fontWeight: '700' }}>{gregorianDate}</strong>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '2px' }}>رقم الطلب</span>
          <strong style={{ fontSize: '16px', fontWeight: '800', color: '#1a3a6b' }}>#{request.request_number}</strong>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '2px' }}>التاريخ الهجري</span>
          <strong style={{ fontSize: '14px', fontWeight: '700' }}>{hijriDate} هـ</strong>
        </div>
      </div>

      {/* Document Title */}
      <h2 style={{
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: '700',
        marginTop: '5mm',
        color: '#1a3a6b',
        backgroundColor: '#e8eef7',
        padding: '8px 20px',
        borderRadius: '6px',
        border: '1px solid #c5d3e8',
      }}>
        طلب تحويل {pageNum > 1 ? `(تابع - صفحة ${pageNum})` : ''}
      </h2>
    </div>
  );

  const thStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    border: '1px solid #b8c9e0',
    padding: '8px 10px',
    backgroundColor: '#1a3a6b',
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: '12px',
    ...extra,
  });

  const renderTableHeader = () => (
    <thead>
      <tr>
        <th style={thStyle({ width: '40px' })}>م</th>
        <th style={thStyle({ textAlign: 'right' })}>الوصف</th>
        <th style={thStyle({ textAlign: 'right', width: '150px' })}>الحساب</th>
        <th style={thStyle({ textAlign: 'center', width: '100px' })}>المبلغ</th>
      </tr>
    </thead>
  );

  const renderFooter = (pageNum: number) => (
    <div style={{
      marginTop: 'auto',
      paddingTop: '4mm',
      textAlign: 'center',
      fontSize: '11px',
      color: '#888',
      borderTop: '1px solid #ddd',
    }}>
      صفحة {pageNum} من {totalPages}
    </div>
  );

  const renderSignatures = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 'auto',
      paddingTop: '12mm',
      borderTop: '1.5px solid #1a3a6b',
    }}>
      {[
        { title: 'المحاسب', name: 'حارس' },
        { title: 'المدير التنفيذي', name: 'عمر خضر' },
        { title: 'المدير العام', name: 'ناجي الجهني' },
      ].map((sig, i) => (
        <div key={i} style={{ textAlign: 'center', width: '30%' }}>
          <p style={{ marginBottom: '12mm', fontWeight: '700', color: '#1a3a6b', fontSize: '14px' }}>{sig.title}</p>
          <p style={{ fontWeight: '700', color: '#1a3a6b', fontSize: '12px', marginBottom: '4mm' }}>{sig.name}</p>
          <div style={{ borderBottom: '1.5px solid #1a3a6b', width: '80%', margin: '0 auto' }} />
        </div>
      ))}
    </div>
  );

  const renderTotal = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4mm', marginTop: '4mm' }}>
      <div style={{
        fontSize: '16px',
        fontWeight: '700',
        color: '#1a3a6b',
        backgroundColor: '#f0f4fa',
        padding: '10px 24px',
        borderRadius: '6px',
        border: '1.5px solid #1a3a6b',
      }}>
        <span>الإجمالي: </span>
        <span style={{ fontFamily: 'monospace', marginRight: '8px', fontWeight: '800', fontSize: '18px', color: '#000' }}>
          {request.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span>ريال سعودي</span>
      </div>
    </div>
  );

  const renderNotes = () => {
    if (!request.notes) return null;
    return (
      <div style={{
        marginBottom: '4mm',
        padding: '8px 12px',
        backgroundColor: '#fef9e7',
        borderRadius: '5px',
        border: '1px solid #f0dfa0',
        fontSize: '12px',
      }}>
        <strong style={{ color: '#7a6200' }}>ملاحظات: </strong>
        <span>{request.notes}</span>
      </div>
    );
  };

  return (
    <div id="print-content">
      {pages.map((pageItems, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;

        return (
          <div
            key={pageIndex}
            className="print-page"
            style={{
              ...pageStyle,
              pageBreakAfter: isLastPage ? 'auto' : 'always',
            }}
          >
            {renderHeader(pageIndex + 1)}

            <div style={{ flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm' }}>
                {renderTableHeader()}
                <tbody>
                  {pageItems.map((item, index) => {
                    const globalIndex = isFirstPage ? index : ITEMS_PER_FIRST_PAGE + (pageIndex - 1) * ITEMS_PER_OTHER_PAGE + index;
                    return (
                      <tr key={item.id} style={{ backgroundColor: item.is_tax_row ? '#f0faf5' : (globalIndex % 2 === 0 ? '#FFFFFF' : '#f7f9fc') }}>
                        <td style={{
                          border: '1px solid #d0d9e8',
                          padding: '7px 8px',
                          textAlign: 'center',
                          fontWeight: '700',
                          color: item.is_tax_row ? '#0d7a4a' : '#1a3a6b',
                          fontSize: '11px',
                        }}>{item.serial_number}</td>
                        <td style={{
                          border: '1px solid #d0d9e8',
                          padding: '7px 8px',
                          textAlign: 'right',
                          fontSize: '11px',
                          color: item.is_tax_row ? '#0d7a4a' : 'inherit',
                          fontWeight: item.is_tax_row ? '600' : 'normal',
                        }}>{item.is_tax_row ? '📋 ' : ''}{item.description}</td>
                        <td style={{
                          border: '1px solid #d0d9e8',
                          padding: '7px 8px',
                          textAlign: 'right',
                          fontSize: '11px',
                          color: item.is_tax_row ? '#0d7a4a' : 'inherit',
                        }}>{item.is_tax_row ? 'ضريبة المشتريات' : getAccountName(item.account_id)}</td>
                        <td style={{
                          border: '1px solid #d0d9e8',
                          padding: '7px 8px',
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          color: item.is_tax_row ? '#0d7a4a' : '#1a3a6b',
                          fontSize: '12px',
                        }}>{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {isLastPage && (
                <>
                  {renderTotal()}
                  {renderNotes()}
                </>
              )}
            </div>

            {isLastPage ? renderSignatures() : renderFooter(pageIndex + 1)}
          </div>
        );
      })}
    </div>
  );
};

export default TransferRequestPrintView;
