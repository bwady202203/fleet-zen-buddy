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

const ITEMS_PER_FIRST_PAGE = 12;
const ITEMS_PER_OTHER_PAGE = 18;

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

  // Split items into pages
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
    padding: '15mm',
    backgroundColor: '#FFFFFF',
    color: '#222222',
    fontFamily: 'Cairo, "Noto Naskh Arabic", sans-serif',
    fontSize: '14px',
    lineHeight: '1.7',
    direction: 'rtl',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    position: 'relative',
    pageBreakAfter: 'always',
  };

  const renderHeader = (pageNum: number) => (
    <div style={{ textAlign: 'center', marginBottom: '8mm' }}>
      <h1 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#1e40af',
        borderBottom: '3px solid #3b82f6',
        paddingBottom: '8px',
        display: 'inline-block',
      }}>
        {companyName}
      </h1>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '16px',
        color: '#333333',
        marginTop: '12px',
        padding: '14px 24px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        border: '2px solid #3b82f6',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>التاريخ الميلادي</span>
          <strong style={{ color: '#1e40af', fontSize: '18px', fontWeight: '700' }}>{gregorianDate}</strong>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>رقم الطلب</span>
          <strong style={{ color: '#1e40af', fontSize: '22px', fontWeight: '800' }}>#{request.request_number}</strong>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>التاريخ الهجري</span>
          <strong style={{ color: '#1e40af', fontSize: '18px', fontWeight: '700' }}>{hijriDate} هـ</strong>
        </div>
      </div>

      {/* Document Title */}
      <h2 style={{
        textAlign: 'center',
        fontSize: '22px',
        fontWeight: '700',
        marginTop: '8mm',
        color: '#1e40af',
        backgroundColor: '#dbeafe',
        padding: '12px 24px',
        borderRadius: '8px',
        border: '2px solid #3b82f6',
      }}>
        طلب تحويل {pageNum > 1 ? `(تابع - صفحة ${pageNum})` : ''}
      </h2>
    </div>
  );

  const renderTableHeader = () => (
    <thead>
      <tr>
        <th style={thStyle({ width: '50px' })}>م</th>
        <th style={thStyle({ textAlign: 'right' })}>الوصف</th>
        <th style={thStyle({ textAlign: 'right', width: '160px' })}>الحساب</th>
        <th style={thStyle({ textAlign: 'left', width: '110px' })}>المبلغ</th>
      </tr>
    </thead>
  );

  const thStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    border: '2px solid #3b82f6',
    padding: '12px 14px',
    backgroundColor: '#1e40af',
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: '14px',
    ...extra,
  });

  const renderFooter = (pageNum: number) => (
    <div style={{
      marginTop: 'auto',
      paddingTop: '5mm',
      textAlign: 'center',
      fontSize: '12px',
      color: '#64748b',
      borderTop: '1px solid #e2e8f0',
    }}>
      صفحة {pageNum} من {totalPages}
    </div>
  );

  const renderSignatures = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 'auto',
      paddingTop: '15mm',
      borderTop: '2px solid #3b82f6',
    }}>
      {[
        { title: 'المحاسب', name: 'حارس' },
        { title: 'المدير التنفيذي', name: 'عمر خضر' },
        { title: 'المدير العام', name: 'ناجي الجهني' },
      ].map((sig, i) => (
        <div key={i} style={{ textAlign: 'center', width: '30%' }}>
          <p style={{ marginBottom: '15mm', fontWeight: '600', color: '#1e40af', fontSize: '16px' }}>{sig.title}</p>
          <p style={{ fontWeight: '700', color: '#1e40af', fontSize: '14px', marginBottom: '5mm' }}>{sig.name}</p>
          <div style={{ borderBottom: '2px solid #1e40af', width: '80%', margin: '0 auto' }}></div>
        </div>
      ))}
    </div>
  );

  const renderTotal = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5mm', marginTop: '5mm' }}>
      <div style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#000000',
        backgroundColor: '#FFFFFF',
        padding: '14px 30px',
        borderRadius: '6px',
        border: '2px solid #1e40af',
      }}>
        <span>الإجمالي: </span>
        <span style={{ fontFamily: 'monospace', marginRight: '10px', fontWeight: '800' }}>
          {request.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span>ريال</span>
      </div>
    </div>
  );

  const renderNotes = () => {
    if (!request.notes) return null;
    return (
      <div style={{
        marginBottom: '5mm',
        padding: '10px 15px',
        backgroundColor: '#fef3c7',
        borderRadius: '6px',
        border: '1px solid #fcd34d',
        fontSize: '14px',
      }}>
        <strong style={{ color: '#92400e' }}>ملاحظات: </strong>
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
            {/* Header on every page */}
            {renderHeader(pageIndex + 1)}

            {/* Content area */}
            <div style={{ flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm' }}>
                {renderTableHeader()}
                <tbody>
                  {pageItems.map((item, index) => {
                    const globalIndex = isFirstPage ? index : ITEMS_PER_FIRST_PAGE + (pageIndex - 1) * ITEMS_PER_OTHER_PAGE + index;
                    return (
                      <tr key={item.id} style={{ backgroundColor: item.is_tax_row ? '#ecfdf5' : (globalIndex % 2 === 0 ? '#FFFFFF' : '#f0f9ff') }}>
                        <td style={{
                          border: '1px solid #93c5fd',
                          padding: '10px 12px',
                          textAlign: 'center',
                          fontWeight: '700',
                          color: item.is_tax_row ? '#059669' : '#1e40af',
                          fontSize: '14px',
                        }}>{item.serial_number}</td>
                        <td style={{
                          border: '1px solid #93c5fd',
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontSize: '14px',
                          color: item.is_tax_row ? '#059669' : 'inherit',
                          fontWeight: item.is_tax_row ? '600' : 'normal',
                        }}>{item.is_tax_row ? '📋 ' : ''}{item.description}</td>
                        <td style={{
                          border: '1px solid #93c5fd',
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontSize: '12px',
                          color: item.is_tax_row ? '#059669' : 'inherit',
                        }}>{item.is_tax_row ? 'ضريبة المشتريات' : getAccountName(item.account_id)}</td>
                        <td style={{
                          border: '1px solid #93c5fd',
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          color: item.is_tax_row ? '#059669' : '#1e40af',
                          fontSize: '15px',
                        }}>{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Total + Notes + Signatures only on last page */}
              {isLastPage && (
                <>
                  {renderTotal()}
                  {renderNotes()}
                </>
              )}
            </div>

            {/* Signatures only on last page, footer on all pages */}
            {isLastPage ? renderSignatures() : renderFooter(pageIndex + 1)}
          </div>
        );
      })}
    </div>
  );
};

export default TransferRequestPrintView;
