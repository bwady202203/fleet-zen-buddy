 import { format } from 'date-fns';
 import { ar } from 'date-fns/locale';
 
 interface TransferRequestItem {
   id: string;
   serial_number: number;
   description: string;
   amount: number;
   account_id: string | null;
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
 
const TransferRequestPrintView = ({ request, accounts, companyName = 'شركة الرمال الناعمة' }: Props) => {
   const requestDate = new Date(request.request_date);
   const gregorianDate = format(requestDate, 'yyyy/MM/dd');
   
   // Simple Hijri approximation
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
 
   return (
     <div 
       id="print-content"
       style={{
         width: '210mm',
         minHeight: '297mm',
        height: '297mm',
         padding: '20mm 15mm',
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
       }}
     >
       {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '10mm' }}>
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
          fontSize: '13px',
           color: '#444444',
          marginTop: '12px',
          padding: '10px 18px',
          backgroundColor: '#eff6ff',
          borderRadius: '6px',
          border: '1px solid #bfdbfe',
         }}>
           <div>
             <span>التاريخ الميلادي: </span>
            <strong style={{ color: '#1e40af' }}>{gregorianDate}</strong>
           </div>
           <div>
             <span>رقم الطلب: </span>
            <strong style={{ color: '#1e40af' }}>#{request.request_number}</strong>
           </div>
           <div>
             <span>التاريخ الهجري: </span>
            <strong style={{ color: '#1e40af' }}>{hijriDate} هـ</strong>
           </div>
         </div>
       </div>
 
       {/* Document Title */}
       <h2 style={{ 
         textAlign: 'center', 
        fontSize: '22px', 
         fontWeight: '700',
        marginBottom: '8mm',
        color: '#1e40af',
        backgroundColor: '#dbeafe',
        padding: '12px 24px',
        borderRadius: '8px',
        border: '2px solid #3b82f6',
       }}>
         طلب تحويل
       </h2>
 
      {/* Content Area - grows to push signatures to bottom */}
      <div style={{ flex: 1 }}>
        {/* Data Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          marginBottom: '8mm'
        }}>
          <thead>
            <tr>
              <th style={{ 
                border: '2px solid #3b82f6', 
              padding: '12px 14px',
                backgroundColor: '#1e40af',
                color: '#FFFFFF',
              fontWeight: '700',
                textAlign: 'center',
              width: '50px',
              fontSize: '14px',
              }}>م</th>
              <th style={{ 
                border: '2px solid #3b82f6', 
              padding: '12px 14px',
                backgroundColor: '#1e40af',
                color: '#FFFFFF',
              fontWeight: '700',
              textAlign: 'right',
              fontSize: '14px',
              }}>الوصف</th>
              <th style={{ 
                border: '2px solid #3b82f6', 
              padding: '12px 14px',
                backgroundColor: '#1e40af',
                color: '#FFFFFF',
              fontWeight: '700',
                textAlign: 'right',
              width: '160px',
              fontSize: '14px',
              }}>الحساب</th>
              <th style={{ 
                border: '2px solid #3b82f6', 
              padding: '12px 14px',
                backgroundColor: '#1e40af',
                color: '#FFFFFF',
              fontWeight: '700',
                textAlign: 'left',
              width: '110px',
              fontSize: '14px',
              }}>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item, index) => (
              <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#f0f9ff' }}>
                <td style={{ 
                  border: '1px solid #93c5fd', 
                padding: '10px 12px',
                  textAlign: 'center',
                fontWeight: '700',
                color: '#1e40af',
                fontSize: '14px',
                }}>{item.serial_number}</td>
                <td style={{ 
                  border: '1px solid #93c5fd', 
                padding: '10px 12px',
                textAlign: 'right',
                fontSize: '14px',
                }}>{item.description}</td>
                <td style={{ 
                  border: '1px solid #93c5fd', 
                padding: '10px 12px',
                  textAlign: 'right',
                fontSize: '12px',
                }}>{getAccountName(item.account_id)}</td>
                <td style={{ 
                  border: '1px solid #93c5fd', 
                padding: '10px 12px',
                  textAlign: 'left',
                  fontFamily: 'monospace',
                fontWeight: '700',
                color: '#1e40af',
                fontSize: '15px',
                }}>{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
 
        {/* Total */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          marginBottom: '5mm',
        }}>
          <div style={{ 
          fontSize: '18px',
            fontWeight: '700',
            color: '#FFFFFF',
            backgroundColor: '#1e40af',
          padding: '12px 25px',
            borderRadius: '6px',
          }}>
            <span>الإجمالي: </span>
            <span style={{ fontFamily: 'monospace', marginRight: '10px' }}>
              {request.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span>ريال</span>
          </div>
         </div>
 
        {/* Notes */}
        {request.notes && (
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
        )}
      </div>
 
      {/* Signature Section - Always at bottom */}
       <div style={{ 
         display: 'flex', 
         justifyContent: 'space-between',
        marginTop: 'auto',
        paddingTop: '15mm',
        borderTop: '2px solid #3b82f6',
       }}>
         <div style={{ textAlign: 'center', width: '45%' }}>
          <p style={{ 
            marginBottom: '20mm', 
            fontWeight: '600',
            color: '#1e40af',
          fontSize: '16px',
          }}>المحاسب</p>
           <div style={{ 
            borderBottom: '2px solid #1e40af', 
             width: '80%',
             margin: '0 auto'
           }}></div>
         </div>
         <div style={{ textAlign: 'center', width: '45%' }}>
          <p style={{ 
            marginBottom: '20mm', 
            fontWeight: '600',
            color: '#1e40af',
          fontSize: '16px',
          }}>المدير العام</p>
           <div style={{ 
            borderBottom: '2px solid #1e40af', 
            width: '80%',
             margin: '0 auto'
           }}></div>
         </div>
       </div>
     </div>
   );
 };
 
 export default TransferRequestPrintView;