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
 
 const TransferRequestPrintView = ({ request, accounts, companyName = 'اسم الشركة / المؤسسة' }: Props) => {
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
       className="hidden print:block"
       style={{
         width: '210mm',
         minHeight: '297mm',
         padding: '20mm 15mm',
         backgroundColor: '#FFFFFF',
         color: '#222222',
         fontFamily: 'Cairo, "Noto Naskh Arabic", sans-serif',
         fontSize: '11px',
         lineHeight: '1.6',
         direction: 'rtl',
       }}
     >
       {/* Header */}
       <div style={{ textAlign: 'center', marginBottom: '15mm' }}>
         <h1 style={{ 
           fontSize: '18px', 
           fontWeight: '700', 
           marginBottom: '10px',
           color: '#000000'
         }}>
           {companyName}
         </h1>
         
         <div style={{ 
           display: 'flex', 
           justifyContent: 'space-between', 
           alignItems: 'center',
           fontSize: '10px',
           color: '#444444',
           marginTop: '8px'
         }}>
           <div>
             <span>التاريخ الميلادي: </span>
             <strong>{gregorianDate}</strong>
           </div>
           <div>
             <span>رقم الطلب: </span>
             <strong>#{request.request_number}</strong>
           </div>
           <div>
             <span>التاريخ الهجري: </span>
             <strong>{hijriDate} هـ</strong>
           </div>
         </div>
         
         <hr style={{ 
           border: 'none', 
           borderTop: '1px solid #DDDDDD', 
           marginTop: '10px' 
         }} />
       </div>
 
       {/* Document Title */}
       <h2 style={{ 
         textAlign: 'center', 
         fontSize: '20px', 
         fontWeight: '700',
         marginBottom: '12mm',
         color: '#000000'
       }}>
         طلب تحويل
       </h2>
 
       {/* Data Table */}
       <table style={{ 
         width: '100%', 
         borderCollapse: 'collapse',
         marginBottom: '10mm'
       }}>
         <thead>
           <tr>
             <th style={{ 
               border: '1px solid #CCCCCC', 
               padding: '8px 10px',
               backgroundColor: '#FAFAFA',
               fontWeight: '600',
               textAlign: 'center',
               width: '40px'
             }}>م</th>
             <th style={{ 
               border: '1px solid #CCCCCC', 
               padding: '8px 10px',
               backgroundColor: '#FAFAFA',
               fontWeight: '600',
               textAlign: 'right'
             }}>الوصف</th>
             <th style={{ 
               border: '1px solid #CCCCCC', 
               padding: '8px 10px',
               backgroundColor: '#FAFAFA',
               fontWeight: '600',
               textAlign: 'right',
               width: '140px'
             }}>الحساب</th>
             <th style={{ 
               border: '1px solid #CCCCCC', 
               padding: '8px 10px',
               backgroundColor: '#FAFAFA',
               fontWeight: '600',
               textAlign: 'left',
               width: '100px'
             }}>المبلغ</th>
           </tr>
         </thead>
         <tbody>
           {request.items.map((item) => (
             <tr key={item.id}>
               <td style={{ 
                 border: '1px solid #CCCCCC', 
                 padding: '8px 10px',
                 textAlign: 'center',
                 fontWeight: '600'
               }}>{item.serial_number}</td>
               <td style={{ 
                 border: '1px solid #CCCCCC', 
                 padding: '8px 10px',
                 textAlign: 'right'
               }}>{item.description}</td>
               <td style={{ 
                 border: '1px solid #CCCCCC', 
                 padding: '8px 10px',
                 textAlign: 'right',
                 fontSize: '10px'
               }}>{getAccountName(item.account_id)}</td>
               <td style={{ 
                 border: '1px solid #CCCCCC', 
                 padding: '8px 10px',
                 textAlign: 'left',
                 fontFamily: 'monospace',
                 fontWeight: '600'
               }}>{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
             </tr>
           ))}
         </tbody>
       </table>
 
       {/* Total */}
       <div style={{ 
         display: 'flex', 
         justifyContent: 'flex-end',
         marginBottom: '20mm',
         paddingTop: '5mm'
       }}>
         <div style={{ 
           fontSize: '14px',
           fontWeight: '700',
           color: '#000000'
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
         <div style={{ marginBottom: '15mm' }}>
           <strong>ملاحظات: </strong>
           <span>{request.notes}</span>
         </div>
       )}
 
       {/* Signature & Stamp Section */}
       <div style={{ 
         display: 'flex', 
         justifyContent: 'space-between',
         marginTop: '25mm',
         paddingTop: '10mm',
         borderTop: '1px solid #EEEEEE'
       }}>
         <div style={{ textAlign: 'center', width: '45%' }}>
           <p style={{ marginBottom: '20mm', fontWeight: '600' }}>التوقيع</p>
           <div style={{ 
             borderBottom: '1px solid #000000', 
             width: '80%',
             margin: '0 auto'
           }}></div>
         </div>
         <div style={{ textAlign: 'center', width: '45%' }}>
           <p style={{ marginBottom: '20mm', fontWeight: '600' }}>الختم</p>
           <div style={{ 
             width: '50mm',
             height: '25mm',
             border: '1px dashed #CCCCCC',
             margin: '0 auto'
           }}></div>
         </div>
       </div>
     </div>
   );
 };
 
 export default TransferRequestPrintView;