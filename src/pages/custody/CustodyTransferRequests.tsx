 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { toast } from 'sonner';
 import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Printer, FileDown, Calendar, Sparkles, Info, Wallet, SendHorizontal } from 'lucide-react';
 import { format } from 'date-fns';
 import { ar } from 'date-fns/locale';
 import jsPDF from 'jspdf';
 import html2canvas from 'html2canvas';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
 
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
      <header className="border-b bg-gradient-to-l from-primary/5 via-card to-card print:hidden">
         <div className="container mx-auto px-4 py-6">
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <SendHorizontal className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">طلبات التحويل</h1>
                  <p className="text-muted-foreground mt-1">إدارة طلبات تحويل العهد</p>
                </div>
              </div>
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
 
        <div className="border-b bg-card/50 backdrop-blur-sm print:hidden">
          <div className="container mx-auto px-4 py-3">
            <Link to="/accounting">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowRight className="h-4 w-4" />
                العودة للمحاسبة
              </Button>
            </Link>
          </div>
        </div>
 
      <main className="container mx-auto px-4 py-6">
         {/* Add Request Form */}
          <Card className="mb-8 print:hidden border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">✨ إضافة طلب جديد</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    قم بإدخال بيانات طلب التحويل بدقة لضمان تسجيله بشكل صحيح في النظام
                  </p>
                </div>
              </div>
           </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-3">
                  <Label htmlFor="description" className="flex items-center gap-2 text-base font-medium">
                    <Info className="h-4 w-4 text-primary" />
                    وصف التحويل
                  </Label>
                 <Textarea
                   id="description"
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                    placeholder="اكتب شرحًا واضحًا ومختصرًا (مثل: مصروف ديزل، صيانة، إيجار...)"
                    rows={3}
                    className="resize-none text-base border-2 focus:border-primary/50 transition-colors"
                 />
                  <p className="text-xs text-muted-foreground">
                    يوضح سبب التحويل أو نوع المصروف
                  </p>
               </div>
                <div className="space-y-3">
                  <Label htmlFor="amount" className="flex items-center gap-2 text-base font-medium">
                    <Wallet className="h-4 w-4 text-primary" />
                    المبلغ
                  </Label>
                 <Input
                   id="amount"
                   type="number"
                   step="0.01"
                   value={amount}
                   onChange={(e) => setAmount(e.target.value)}
                   placeholder="0.00"
                    className="text-xl font-mono h-14 text-center border-2 focus:border-primary/50 transition-colors"
                 />
                  <p className="text-xs text-muted-foreground">
                    أدخل القيمة بالأرقام
                  </p>
               </div>
             </div>
              
              <Separator className="my-6" />
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button onClick={handleAddRequest} className="gap-3 w-full sm:w-auto px-8" size="lg">
                  <Plus className="h-5 w-5" />
                  إضافة الطلب
                </Button>
                <p className="text-sm text-muted-foreground">
                  🔹 اضغط على إضافة الطلب ليتم حفظه في القائمة
                </p>
              </div>
           </CardContent>
         </Card>
 
         {/* Requests Table */}
         <div id="print-content">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-l from-muted/50 to-transparent print:pb-2 border-b">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg print:hidden">
                      <FileDown className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-xl">📋 قائمة طلبات التحويل</CardTitle>
                  </div>
                 <div className="hidden print:block text-sm text-muted-foreground">
                   التاريخ: {gregorianDate} | {hijriDate} هـ
                 </div>
               </div>
                <p className="text-sm text-muted-foreground mt-1 print:hidden">
                  تعرض جميع طلبات التحويل التي تم إدخالها، مع تفاصيل كل طلب لسهولة المتابعة والمراجعة
                </p>
             </CardHeader>
              <CardContent className="p-0">
               {requests.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                      <FileDown className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-medium">لا توجد طلبات تحويل حالياً</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">ابدأ بإضافة طلب جديد من النموذج أعلاه</p>
                 </div>
               ) : (
                 <>
                    <Alert className="mx-6 mt-4 print:hidden bg-muted/30 border-muted rounded-lg">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>وصف التحويل:</strong> يوضح الغرض من الطلب • 
                        <strong className="mr-2">المبلغ:</strong> قيمة التحويل المسجلة • 
                        <strong className="mr-2">حذف:</strong> إمكانية إزالة أي طلب غير صحيح أو مكرر
                      </AlertDescription>
                    </Alert>
                    <div className="px-6 py-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="w-20 text-center font-bold text-foreground">م</TableHead>
                            <TableHead className="font-bold text-foreground">وصف التحويل</TableHead>
                            <TableHead className="w-40 text-left font-bold text-foreground">المبلغ</TableHead>
                            <TableHead className="w-20 text-center print:hidden font-bold text-foreground">حذف</TableHead>
                         </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requests.map((request, index) => (
                            <TableRow 
                              key={request.id}
                              className={cn(
                                "transition-colors",
                                index % 2 === 0 ? "bg-background" : "bg-muted/20"
                              )}
                            >
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                  {request.serial_number}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium text-base">{request.description}</TableCell>
                              <TableCell className="text-left">
                                <span className="font-mono text-lg font-semibold text-primary">
                                  {request.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </TableCell>
                              <TableCell className="text-center print:hidden">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                  onClick={() => handleDeleteRequest(request.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Total Section */}
                    <div className="mx-6 mb-6 mt-2">
                      <div className="flex justify-between items-center bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-5 rounded-xl border-2 border-primary/20">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-primary" />
                          <span className="font-bold text-xl">💰 الإجمالي</span>
                        </div>
                        <div className="text-left">
                          <span className="font-bold font-mono text-2xl text-primary">
                            {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-lg font-semibold text-primary mr-2">ريال</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center print:hidden">
                        يتم تحديث المجموع تلقائيًا عند الإضافة أو الحذف
                      </p>
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