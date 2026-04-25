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
  scale?: number;
}

const ITEMS_PER_FIRST_PAGE = 11;
const ITEMS_PER_OTHER_PAGE = 16;

const TransferRequestPrintView = ({ request, accounts, companyName = 'شركة الرمال الناعمة', scale = 1 }: Props) => {
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

  // Always render all items on a single page
  const items = request.items;
  const pages: TransferRequestItem[][] = [items];
  const totalPages = 1;

  // Dynamically shrink row height when there are many items so everything fits on one A4 page
  const itemCount = items.length;
  const baseRowHeight = 17.6; // mm
  const baseHeaderHeight = 27.5; // mm
  const baseFontSize = 16; // px
  const baseHeaderFontSize = 16; // px
  const baseCellPadY = 8; // px
  const baseHeaderPadY = 10; // px

  // Approx vertical budget for the rows area on A4 (after header/footer/total/signatures): ~190mm
  const rowsBudgetMm = 190;
  const naturalRowsHeight = baseHeaderHeight + itemCount * baseRowHeight;
  const densityFactor = naturalRowsHeight > rowsBudgetMm
    ? Math.max(0.5, rowsBudgetMm / naturalRowsHeight)
    : 1;

  const rowHeight = baseRowHeight * densityFactor;
  const headerHeight = baseHeaderHeight * densityFactor;
  const cellFontSize = Math.max(9, baseFontSize * densityFactor);
  const headerFontSize = Math.max(10, baseHeaderFontSize * densityFactor);
  const cellPadY = Math.max(2, baseCellPadY * densityFactor);
  const headerPadY = Math.max(3, baseHeaderPadY * densityFactor);


  // Colors
  const PRIMARY = '#1F3A5F';
  const BORDER = '#C5CED8';

  // Scale helper
  const s = (val: number) => val * scale;
  const sPx = (val: number) => `${val * scale}px`;
  const sMm = (val: number) => `${val * scale}mm`;
  const sPt = (val: number) => `${val * scale}pt`;

  const pageStyle: React.CSSProperties = {
    width: '210mm',
    height: '297mm',
    paddingTop: sMm(15),
    paddingBottom: sMm(20),
    paddingRight: sMm(15),
    paddingLeft: sMm(15),
    backgroundColor: '#FFFFFF',
    color: '#222222',
    fontFamily: 'Cairo, sans-serif',
    fontSize: sPx(16),
    lineHeight: '1.5',
    direction: 'rtl',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    position: 'relative',
    pageBreakAfter: 'always',
  };

  const renderHeader = (pageNum: number) => (
    <div style={{ marginBottom: sMm(8) }}>
      {/* Company Name */}
      <div style={{
        textAlign: 'center',
        backgroundColor: PRIMARY,
        padding: `${s(14)}px ${s(24)}px`,
        borderRadius: '4px',
        marginBottom: sMm(6),
      }}>
        <h1 style={{
          fontSize: sPt(32),
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
        padding: `${s(12)}px ${s(24)}px`,
        backgroundColor: '#FFFFFF',
        borderRadius: '4px',
        border: `2px solid ${BORDER}`,
        fontSize: sPx(16),
        color: '#333',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: sPx(13), color: '#777', marginBottom: '3px' }}>التاريخ الهجري</span>
          <strong style={{ fontSize: sPx(16), fontWeight: '700' }}>{hijriDate} هـ</strong>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: sPx(13), color: '#777', marginBottom: '3px' }}>رقم الطلب</span>
          <strong style={{ fontSize: sPx(20), fontWeight: '800', color: PRIMARY }}>#{request.request_number}</strong>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: sPx(13), color: '#777', marginBottom: '3px' }}>التاريخ الميلادي</span>
          <strong style={{ fontSize: sPx(16), fontWeight: '700' }}>{gregorianDate}</strong>
        </div>
      </div>

      {/* Document Title */}
      <h2 style={{
        textAlign: 'center',
        fontSize: sPt(18),
        fontWeight: '700',
        marginTop: sMm(6),
        marginBottom: '0',
        color: '#FFFFFF',
        backgroundColor: PRIMARY,
        padding: `${s(10)}px ${s(24)}px`,
        borderRadius: '4px',
      }}>
        طلب تحويل {pageNum > 1 ? `(تابع - صفحة ${pageNum})` : ''}
      </h2>
    </div>
  );

  const thStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    border: `1.5px solid ${BORDER}`,
    padding: `${s(headerPadY)}px ${s(12)}px`,
    backgroundColor: PRIMARY,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: sPx(headerFontSize),
    height: sMm(headerHeight),
    verticalAlign: 'middle',
    ...extra,
  });

  const tdStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    border: `1px solid ${BORDER}`,
    padding: `${s(cellPadY)}px ${s(12)}px`,
    fontSize: sPx(cellFontSize),
    height: sMm(rowHeight),
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
      paddingTop: sMm(4),
      textAlign: 'center',
      fontSize: sPx(13),
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
      paddingTop: sMm(10),
      borderTop: `2px solid ${PRIMARY}`,
      height: sMm(33),
    }}>
      {[
        { title: 'المحاسب', name: 'حارس' },
        { title: 'المدير التنفيذي', name: 'عمر خضر' },
        { title: 'المدير العام', name: 'ناجي الجهني' },
      ].map((sig, i) => (
        <div key={i} style={{ textAlign: 'center', width: '30%' }}>
          <p style={{ marginBottom: sMm(10), fontWeight: '700', color: PRIMARY, fontSize: sPx(16) }}>{sig.title}</p>
          <p style={{ fontWeight: '700', color: PRIMARY, fontSize: sPx(14), marginBottom: sMm(8) }}>{sig.name}</p>
          <div style={{ borderBottom: `2px solid ${PRIMARY}`, width: '80%', margin: '0 auto' }} />
        </div>
      ))}
    </div>
  );

  const renderTotal = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: sMm(5), marginTop: sMm(5) }}>
      <div style={{
        fontSize: sPt(20),
        fontWeight: '700',
        color: PRIMARY,
        backgroundColor: '#EDF1F7',
        padding: `${s(12)}px ${s(28)}px`,
        borderRadius: '4px',
        border: `2.5px solid ${PRIMARY}`,
      }}>
        <span>الإجمالي: </span>
        <span style={{ marginRight: '10px', fontWeight: '800', color: '#000' }}>
          {request.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span style={{ fontSize: sPx(16) }}> ريال سعودي</span>
      </div>
    </div>
  );

  const renderNotes = () => {
    if (!request.notes) return null;
    return (
      <div style={{
        marginBottom: sMm(5),
        padding: `${s(10)}px ${s(14)}px`,
        backgroundColor: '#FEF9E7',
        borderRadius: '4px',
        border: `1px solid #F0DFA0`,
        fontSize: sPx(16),
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
