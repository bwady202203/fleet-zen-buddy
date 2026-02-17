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

const ITEMS_PER_FIRST_PAGE = 11;
const ITEMS_PER_OTHER_PAGE = 16;

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

  // Colors
  const PRIMARY = '#1F3A5F';
  const BORDER = '#C5CED8';

  const pageStyle: React.CSSProperties = {
    width: '210mm',
    height: '297mm',
    paddingTop: '15mm',
    paddingBottom: '20mm',
    paddingRight: '15mm',
    paddingLeft: '15mm',
    backgroundColor: '#FFFFFF',
    color: '#222222',
    fontFamily: 'Cairo, sans-serif',
    fontSize: '16px',
    lineHeight: '1.5',
    direction: 'rtl',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    position: 'relative',
    pageBreakAfter: 'always',
  };

  const renderHeader = (pageNum: number) => (
    <div style={{ marginBottom: '8mm' }}>
      {/* Company Name */}
      <div style={{
        textAlign: 'center',
        backgroundColor: PRIMARY,
        padding: '14px 24px',
        borderRadius: '4px',
        marginBottom: '6mm',
      }}>
        <h1 style={{
          fontSize: '32pt',
          fontWeight: '700',
          color: '#FFFFFF',
          margin: '0',
          letterSpacing: '1px',
          lineHeight: '1.3',
        }}>
          {companyName}
        </h1>
      </div>

      {/* Document info bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        backgroundColor: '#FFFFFF',
        borderRadius: '4px',
        border: `2px solid ${BORDER}`,
        fontSize: '16px',
        color: '#333',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '13px', color: '#777', marginBottom: '3px' }}>التاريخ الهجري</span>
          <strong style={{ fontSize: '16px', fontWeight: '700' }}>{hijriDate} هـ</strong>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '13px', color: '#777', marginBottom: '3px' }}>رقم الطلب</span>
          <strong style={{ fontSize: '20px', fontWeight: '800', color: PRIMARY }}>#{request.request_number}</strong>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '13px', color: '#777', marginBottom: '3px' }}>التاريخ الميلادي</span>
          <strong style={{ fontSize: '16px', fontWeight: '700' }}>{gregorianDate}</strong>
        </div>
      </div>

      {/* Document Title */}
      <h2 style={{
        textAlign: 'center',
        fontSize: '18pt',
        fontWeight: '700',
        marginTop: '6mm',
        marginBottom: '0',
        color: '#FFFFFF',
        backgroundColor: PRIMARY,
        padding: '10px 24px',
        borderRadius: '4px',
      }}>
        طلب تحويل {pageNum > 1 ? `(تابع - صفحة ${pageNum})` : ''}
      </h2>
    </div>
  );

  const thStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    border: `1.5px solid ${BORDER}`,
    padding: '10px 12px',
    backgroundColor: PRIMARY,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: '16px',
    height: '27.5mm',
    verticalAlign: 'middle',
    ...extra,
  });

  const tdStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    border: `1px solid ${BORDER}`,
    padding: '8px 12px',
    fontSize: '16px',
    height: '17.6mm',
    verticalAlign: 'middle',
    ...extra,
  });

  const renderTableHeader = () => (
    <thead>
      <tr>
        <th style={thStyle({ width: '50px' })}>م</th>
        <th style={thStyle({ textAlign: 'right' })}>الوصف</th>
        <th style={thStyle({ textAlign: 'right', width: '180px' })}>الحساب</th>
        <th style={thStyle({ textAlign: 'center', width: '120px' })}>المبلغ</th>
      </tr>
    </thead>
  );

  const renderFooter = (pageNum: number) => (
    <div style={{
      marginTop: 'auto',
      paddingTop: '4mm',
      textAlign: 'center',
      fontSize: '13px',
      color: '#999',
      borderTop: `1px solid ${BORDER}`,
    }}>
      صفحة {pageNum} من {totalPages}
    </div>
  );

  const renderSignatures = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 'auto',
      paddingTop: '10mm',
      borderTop: `2px solid ${PRIMARY}`,
      height: '33mm',
    }}>
      {[
        { title: 'المحاسب', name: 'حارس' },
        { title: 'المدير التنفيذي', name: 'عمر خضر' },
        { title: 'المدير العام', name: 'ناجي الجهني' },
      ].map((sig, i) => (
        <div key={i} style={{ textAlign: 'center', width: '30%' }}>
          <p style={{ marginBottom: '10mm', fontWeight: '700', color: PRIMARY, fontSize: '16px' }}>{sig.title}</p>
          <p style={{ fontWeight: '700', color: PRIMARY, fontSize: '14px', marginBottom: '8mm' }}>{sig.name}</p>
          <div style={{ borderBottom: `2px solid ${PRIMARY}`, width: '80%', margin: '0 auto' }} />
        </div>
      ))}
    </div>
  );

  const renderTotal = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '5mm', marginTop: '5mm' }}>
      <div style={{
        fontSize: '20pt',
        fontWeight: '700',
        color: PRIMARY,
        backgroundColor: '#EDF1F7',
        padding: '12px 28px',
        borderRadius: '4px',
        border: `2.5px solid ${PRIMARY}`,
      }}>
        <span>الإجمالي: </span>
        <span style={{ marginRight: '10px', fontWeight: '800', color: '#000' }}>
          {request.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span style={{ fontSize: '16px' }}> ريال سعودي</span>
      </div>
    </div>
  );

  const renderNotes = () => {
    if (!request.notes) return null;
    return (
      <div style={{
        marginBottom: '5mm',
        padding: '10px 14px',
        backgroundColor: '#FEF9E7',
        borderRadius: '4px',
        border: `1px solid #F0DFA0`,
        fontSize: '16px',
      }}>
        <strong style={{ color: '#7A6200' }}>ملاحظات: </strong>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm' }}>
                {renderTableHeader()}
                <tbody>
                  {pageItems.map((item, index) => {
                    const globalIndex = isFirstPage ? index : ITEMS_PER_FIRST_PAGE + (pageIndex - 1) * ITEMS_PER_OTHER_PAGE + index;
                    return (
                      <tr key={item.id} style={{ backgroundColor: item.is_tax_row ? '#F0FAF5' : (globalIndex % 2 === 0 ? '#FFFFFF' : '#F7F9FC') }}>
                        <td style={tdStyle({
                          textAlign: 'center',
                          fontWeight: '700',
                          color: item.is_tax_row ? '#0D7A4A' : PRIMARY,
                        })}>{item.serial_number}</td>
                        <td style={tdStyle({
                          textAlign: 'right',
                          color: item.is_tax_row ? '#0D7A4A' : 'inherit',
                          fontWeight: item.is_tax_row ? '600' : 'normal',
                        })}>{item.is_tax_row ? '📋 ' : ''}{item.description}</td>
                        <td style={tdStyle({
                          textAlign: 'right',
                          color: item.is_tax_row ? '#0D7A4A' : 'inherit',
                        })}>{item.is_tax_row ? 'ضريبة المشتريات' : getAccountName(item.account_id)}</td>
                        <td style={tdStyle({
                          textAlign: 'center',
                          fontFamily: 'Cairo, monospace',
                          fontWeight: '700',
                          color: item.is_tax_row ? '#0D7A4A' : PRIMARY,
                        })}>{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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
