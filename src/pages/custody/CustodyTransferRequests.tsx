 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { toast } from 'sonner';
 import { useAuth } from '@/contexts/AuthContext';
 import CustodyNavbar from '@/components/CustodyNavbar';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Plus, Trash2, Printer, FileDown, Calendar } from 'lucide-react';
 import { format } from 'date-fns';
 import { ar } from 'date-fns/locale';
 import jsPDF from 'jspdf';
 import html2canvas from 'html2canvas';
 
 interface TransferRequest {
   id: string;
   serial_number: number;
   description: string;
   amount: number;
   created_at: string;
 }
 
 const CustodyTransferRequests = () => {
   const { user } = useAuth();
   const [requests, setRequests] = useState<TransferRequest[]>([]);
   const [description, setDescription] = useState('');
   const [amount, setAmount] = useState('');
   const [loading, setLoading] = useState(false);
 
   // Get today's dates
   const today = new Date();
   const gregorianDate = format(today, 'yyyy/MM/dd', { locale: ar });
   const dayName = format(today, 'EEEE', { locale: ar });
 
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
 
   const hijriDate = getHijriDate(today);
 
   useEffect(() => {
     fetchRequests();
   }, []);
 
   const fetchRequests = async () => {
     try {
       // Fetch from local state for now - can be connected to DB later
       const savedRequests = localStorage.getItem('custody_transfer_requests');
       if (savedRequests) {
         setRequests(JSON.parse(savedRequests));
       }
     } catch (error) {
       console.error('Error fetching requests:', error);
     }
   };
 
   const handleAddRequest = () => {
     if (!description.trim() || !amount) {
       toast.error('الرجاء ملء جميع الحقول');
       return;
     }
 
     const newRequest: TransferRequest = {
       id: Date.now().toString(),
       serial_number: requests.length + 1,
       description: description.trim(),
       amount: parseFloat(amount),
       created_at: new Date().toISOString()
     };
 
     const updatedRequests = [...requests, newRequest];
     setRequests(updatedRequests);
     localStorage.setItem('custody_transfer_requests', JSON.stringify(updatedRequests));
     
     setDescription('');
     setAmount('');
     toast.success('تم إضافة الطلب بنجاح');
   };
 
   const handleDeleteRequest = (id: string) => {
     const updatedRequests = requests.filter(r => r.id !== id).map((r, index) => ({
       ...r,
       serial_number: index + 1
     }));
     setRequests(updatedRequests);
     localStorage.setItem('custody_transfer_requests', JSON.stringify(updatedRequests));
     toast.success('تم حذف الطلب');
   };
 
   const handlePrint = () => {
     window.print();
   };
 
   const handleExportPDF = async () => {
     const element = document.getElementById('print-content');
     if (!element) return;
 
     try {
       toast.info('جاري إنشاء ملف PDF...');
       const canvas = await html2canvas(element, {
         scale: 2,
         useCORS: true,
         backgroundColor: '#ffffff'
       });
       
       const imgData = canvas.toDataURL('image/png');
       const pdf = new jsPDF('p', 'mm', 'a4');
       const imgWidth = 190;
       const imgHeight = (canvas.height * imgWidth) / canvas.width;
       
       pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
       pdf.save(`طلبات-التحويل-${format(today, 'yyyy-MM-dd')}.pdf`);
       toast.success('تم تحميل ملف PDF');
     } catch (error) {
       console.error('PDF export error:', error);
       toast.error('حدث خطأ في إنشاء ملف PDF');
     }
   };
 
   const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0);
 
   return (
     <div className="min-h-screen bg-background" dir="rtl">
       <header className="border-b bg-card print:hidden">
         <div className="container mx-auto px-4 py-6">
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div>
               <h1 className="text-2xl sm:text-3xl font-bold">طلبات التحويل</h1>
               <p className="text-muted-foreground mt-1">إدارة طلبات تحويل العهد</p>
             </div>
             <div className="flex items-center gap-3 flex-wrap">
               <div className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-lg">
                 <Calendar className="h-4 w-4 text-primary" />
                 <span className="font-medium">{dayName}</span>
                 <span className="text-muted-foreground">|</span>
                 <span>{gregorianDate}</span>
                 <span className="text-muted-foreground">|</span>
                 <span className="text-primary">{hijriDate} هـ</span>
               </div>
               <Button variant="outline" size="sm" onClick={handlePrint}>
                 <Printer className="h-4 w-4 ml-1" />
                 طباعة
               </Button>
               <Button variant="outline" size="sm" onClick={handleExportPDF}>
                 <FileDown className="h-4 w-4 ml-1" />
                 PDF
               </Button>
             </div>
           </div>
         </div>
       </header>
 
       <CustodyNavbar />
 
       <main className="container mx-auto px-4 py-8">
         {/* Add Request Form */}
         <Card className="mb-6 print:hidden">
           <CardHeader>
             <CardTitle className="text-lg">إضافة طلب جديد</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div className="sm:col-span-2 space-y-2">
                 <Label htmlFor="description">وصف التحويل</Label>
                 <Textarea
                   id="description"
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   placeholder="أدخل وصف طلب التحويل"
                   rows={2}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="amount">المبلغ</Label>
                 <Input
                   id="amount"
                   type="number"
                   step="0.01"
                   value={amount}
                   onChange={(e) => setAmount(e.target.value)}
                   placeholder="0.00"
                 />
               </div>
             </div>
             <Button onClick={handleAddRequest} className="mt-4 gap-2">
               <Plus className="h-4 w-4" />
               إضافة الطلب
             </Button>
           </CardContent>
         </Card>
 
         {/* Requests Table */}
         <div id="print-content">
           <Card>
             <CardHeader className="print:pb-2">
               <div className="flex items-center justify-between">
                 <CardTitle>قائمة طلبات التحويل</CardTitle>
                 <div className="hidden print:block text-sm text-muted-foreground">
                   التاريخ: {gregorianDate} | {hijriDate} هـ
                 </div>
               </div>
             </CardHeader>
             <CardContent>
               {requests.length === 0 ? (
                 <div className="text-center py-12 text-muted-foreground">
                   لا توجد طلبات تحويل حالياً
                 </div>
               ) : (
                 <>
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead className="w-20 text-center">م</TableHead>
                         <TableHead>وصف التحويل</TableHead>
                         <TableHead className="w-32 text-left">المبلغ</TableHead>
                         <TableHead className="w-20 text-center print:hidden">حذف</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {requests.map((request) => (
                         <TableRow key={request.id}>
                           <TableCell className="text-center font-medium">
                             {request.serial_number}
                           </TableCell>
                           <TableCell>{request.description}</TableCell>
                           <TableCell className="text-left font-mono">
                             {request.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                           </TableCell>
                           <TableCell className="text-center print:hidden">
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-8 w-8 text-destructive hover:text-destructive"
                               onClick={() => handleDeleteRequest(request.id)}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                   <div className="mt-4 pt-4 border-t flex justify-between items-center">
                     <span className="font-bold">الإجمالي</span>
                     <span className="font-bold font-mono text-lg">
                       {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                     </span>
                   </div>
                 </>
               )}
             </CardContent>
           </Card>
         </div>
       </main>
 
       <style>{`
         @media print {
           body * { visibility: hidden; }
           #print-content, #print-content * { visibility: visible; }
           #print-content { 
             position: absolute; 
             left: 0; 
             top: 0; 
             width: 100%;
             padding: 20mm;
           }
         }
       `}</style>
     </div>
   );
 };
 
 export default CustodyTransferRequests;