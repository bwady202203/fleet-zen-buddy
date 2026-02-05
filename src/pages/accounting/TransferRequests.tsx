 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { toast } from 'sonner';
 import { useAuth } from '@/contexts/AuthContext';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Plus, Trash2, Printer, FileDown, Calendar, Save, CheckCircle, ArrowUpCircle, Edit, ArrowRight, Sparkles, Info, Wallet, SendHorizontal } from 'lucide-react';
 import { format } from 'date-fns';
 import { ar } from 'date-fns/locale';
 import jsPDF from 'jspdf';
 import html2canvas from 'html2canvas';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import { Separator } from '@/components/ui/separator';
 import { cn } from '@/lib/utils';
 import { Link } from 'react-router-dom';
 import { Badge } from '@/components/ui/badge';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TransferRequestPrintView from '@/components/TransferRequestPrintView';
 
interface TransferRequest {
  id: string;
  request_number: number;
  request_date: string;
  status: string;
  total_amount: number;
  notes: string | null;
  approved_at: string | null;
  posted_at: string | null;
  journal_entry_id: string | null;
  items: TransferRequestItem[];
}
 
 interface TransferRequestItem {
   id: string;
   serial_number: number;
   description: string;
   amount: number;
   account_id: string | null;
 }
 
 interface Account {
   id: string;
   code: string;
   name_ar: string;
   type: string;
 }
 
 const TransferRequests = () => {
   const { user } = useAuth();
   const [requests, setRequests] = useState<TransferRequest[]>([]);
   const [accounts, setAccounts] = useState<Account[]>([]);
   const [loading, setLoading] = useState(true);
   const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
   const [isCreating, setIsCreating] = useState(false);
   
   // Form state for new items
   const [description, setDescription] = useState('');
   const [amount, setAmount] = useState('');
   const [newItems, setNewItems] = useState<Omit<TransferRequestItem, 'id'>[]>([]);
   const [notes, setNotes] = useState('');
 
   // Dialog for account selection
   const [showAccountDialog, setShowAccountDialog] = useState(false);
   const [editingItem, setEditingItem] = useState<{requestId: string, itemId: string, currentAccountId: string | null} | null>(null);
  const [printingRequest, setPrintingRequest] = useState<TransferRequest | null>(null);
 
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
     fetchAccounts();
   }, []);
 
   const fetchAccounts = async () => {
     const { data, error } = await supabase
       .from('chart_of_accounts')
       .select('id, code, name_ar, type')
       .eq('level', 4)
       .eq('is_active', true)
       .order('code');
     
     if (!error && data) {
       setAccounts(data);
     }
   };
 
   const fetchRequests = async () => {
     setLoading(true);
     try {
       const { data: requestsData, error: requestsError } = await supabase
         .from('transfer_requests')
         .select('*')
         .order('request_number', { ascending: false });
 
       if (requestsError) throw requestsError;
 
       // Fetch items for each request
       const requestsWithItems: TransferRequest[] = [];
       for (const req of requestsData || []) {
         const { data: items } = await supabase
           .from('transfer_request_items')
           .select('*')
           .eq('transfer_request_id', req.id)
           .order('serial_number');
         
         requestsWithItems.push({
           ...req,
           items: items || []
         });
       }
 
       setRequests(requestsWithItems);
     } catch (error) {
       console.error('Error fetching requests:', error);
       toast.error('خطأ في جلب البيانات');
     } finally {
       setLoading(false);
     }
   };
 
   const handleAddItem = () => {
     if (!description.trim() || !amount) {
       toast.error('الرجاء ملء جميع الحقول');
       return;
     }
 
     const newItem: Omit<TransferRequestItem, 'id'> = {
       serial_number: newItems.length + 1,
       description: description.trim(),
       amount: parseFloat(amount),
       account_id: null
     };
 
     setNewItems([...newItems, newItem]);
     setDescription('');
     setAmount('');
   };
 
   const handleRemoveNewItem = (index: number) => {
     const updated = newItems.filter((_, i) => i !== index).map((item, i) => ({
       ...item,
       serial_number: i + 1
     }));
     setNewItems(updated);
   };
 
   const handleSaveRequest = async () => {
     if (newItems.length === 0) {
       toast.error('الرجاء إضافة عنصر واحد على الأقل');
       return;
     }
 
     try {
       const totalAmount = newItems.reduce((sum, item) => sum + item.amount, 0);
 
       // Create the request
       const { data: requestData, error: requestError } = await supabase
         .from('transfer_requests')
         .insert({
           total_amount: totalAmount,
           notes: notes || null,
           created_by: user?.id
         })
         .select()
         .single();
 
       if (requestError) throw requestError;
 
       // Create items
       const itemsToInsert = newItems.map(item => ({
         transfer_request_id: requestData.id,
         serial_number: item.serial_number,
         description: item.description,
         amount: item.amount,
         account_id: null
       }));
 
       const { error: itemsError } = await supabase
         .from('transfer_request_items')
         .insert(itemsToInsert);
 
       if (itemsError) throw itemsError;
 
       toast.success(`تم حفظ طلب التحويل رقم ${requestData.request_number}`);
       setNewItems([]);
       setNotes('');
       setIsCreating(false);
       fetchRequests();
     } catch (error) {
       console.error('Error saving request:', error);
       toast.error('خطأ في حفظ الطلب');
     }
   };
 
   const handleApprove = async (request: TransferRequest) => {
     // Check if all items have accounts assigned
     const missingAccounts = request.items.some(item => !item.account_id);
     if (missingAccounts) {
       toast.error('يجب تحديد الحساب لجميع البنود قبل الاعتماد');
       return;
     }
 
     try {
       const { error } = await supabase
         .from('transfer_requests')
         .update({
           status: 'approved',
           approved_at: new Date().toISOString(),
           approved_by: user?.id
         })
         .eq('id', request.id);
 
       if (error) throw error;
 
       toast.success('تم اعتماد الطلب بنجاح');
       fetchRequests();
     } catch (error) {
       console.error('Error approving request:', error);
       toast.error('خطأ في اعتماد الطلب');
     }
   };
 
   const handlePost = async (request: TransferRequest) => {
     if (request.status !== 'approved') {
       toast.error('يجب اعتماد الطلب قبل الترحيل');
       return;
     }
 
     try {
       // Create journal entry
       const entryNumber = `TR-${request.request_number}`;
       
       const { data: journalEntry, error: journalError } = await supabase
         .from('journal_entries')
         .insert({
           entry_number: entryNumber,
           date: request.request_date,
           description: `طلب تحويل رقم ${request.request_number}`,
           reference: `transfer_request_${request.id}`,
           created_by: user?.id
         })
         .select()
         .single();
 
       if (journalError) throw journalError;
 
       // Create journal entry lines - each item as debit
       const lines = request.items.map(item => ({
         journal_entry_id: journalEntry.id,
         account_id: item.account_id,
         debit: item.amount,
         credit: 0,
         description: item.description
       }));
 
       // Add credit line (you might want to make this configurable)
       // For now, we'll use a generic cash/bank account or skip if not set
       // The total credit should equal total debit
 
       const { error: linesError } = await supabase
         .from('journal_entry_lines')
         .insert(lines);
 
       if (linesError) throw linesError;
 
       // Update request status
       const { error: updateError } = await supabase
         .from('transfer_requests')
         .update({
           status: 'posted',
           posted_at: new Date().toISOString(),
           posted_by: user?.id,
           journal_entry_id: journalEntry.id
         })
         .eq('id', request.id);
 
       if (updateError) throw updateError;
 
       toast.success(`تم ترحيل الطلب وإنشاء قيد يومية رقم ${entryNumber}`);
       fetchRequests();
     } catch (error) {
       console.error('Error posting request:', error);
       toast.error('خطأ في ترحيل الطلب');
     }
   };
 
   const handleUpdateItemAccount = async (accountId: string) => {
     if (!editingItem) return;
 
     try {
       const { error } = await supabase
         .from('transfer_request_items')
         .update({ account_id: accountId })
         .eq('id', editingItem.itemId);
 
       if (error) throw error;
 
       toast.success('تم تحديث الحساب');
       setShowAccountDialog(false);
       setEditingItem(null);
       fetchRequests();
     } catch (error) {
       console.error('Error updating account:', error);
       toast.error('خطأ في تحديث الحساب');
     }
   };
 
   const handleDeleteRequest = async (id: string) => {
     try {
       const { error } = await supabase
         .from('transfer_requests')
         .delete()
         .eq('id', id);
 
       if (error) throw error;
 
       toast.success('تم حذف الطلب');
       fetchRequests();
     } catch (error) {
       console.error('Error deleting request:', error);
       toast.error('خطأ في حذف الطلب');
     }
   };
 
  const handlePrint = (request: TransferRequest) => {
    setPrintingRequest(request);
    // Use requestAnimationFrame to ensure DOM is updated before printing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        // Clear printing state after print dialog closes
        setTimeout(() => setPrintingRequest(null), 500);
      });
    });
  };
 
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">مسودة</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">معتمد</Badge>;
      case 'posted':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">مرحّل</Badge>;
      default:
        return null;
    }
  };
 
   const getAccountName = (accountId: string | null) => {
     if (!accountId) return 'لم يحدد';
     const account = accounts.find(a => a.id === accountId);
     return account ? `${account.code} - ${account.name_ar}` : 'غير موجود';
   };
 
   const newItemsTotal = newItems.reduce((sum, item) => sum + item.amount, 0);
 
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
                   <p className="text-muted-foreground mt-1">إدارة طلبات التحويل المالية</p>
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
               <Link to="/accounting">
                 <Button variant="outline" size="sm" className="gap-2">
                   <ArrowRight className="h-4 w-4" />
                   العودة للمحاسبة
                 </Button>
               </Link>
             </div>
           </div>
         </div>
       </header>
 
       <main className="container mx-auto px-4 py-6">
         {/* زر إنشاء طلب جديد */}
         {!isCreating && !selectedRequest && (
           <Button onClick={() => setIsCreating(true)} className="mb-6 gap-2" size="lg">
             <Plus className="h-5 w-5" />
             إنشاء طلب تحويل جديد
           </Button>
         )}
 
         {/* نموذج إنشاء طلب جديد */}
         {isCreating && (
           <Card className="mb-8 border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5">
             <CardHeader className="pb-4 border-b border-border/50">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary/10 rounded-lg">
                     <Sparkles className="h-5 w-5 text-primary" />
                   </div>
                   <div>
                     <CardTitle className="text-xl">✨ إنشاء طلب تحويل جديد</CardTitle>
                     <p className="text-sm text-muted-foreground mt-1">
                       أضف بنود التحويل ثم احفظ الطلب
                     </p>
                   </div>
                 </div>
                 <Button variant="ghost" onClick={() => { setIsCreating(false); setNewItems([]); }}>
                   إلغاء
                 </Button>
               </div>
             </CardHeader>
             <CardContent className="pt-6">
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                 <div className="lg:col-span-3 space-y-3">
                   <Label htmlFor="description" className="flex items-center gap-2 text-base font-medium">
                     <Info className="h-4 w-4 text-primary" />
                     وصف التحويل
                   </Label>
                   <Textarea
                     id="description"
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     placeholder="اكتب شرحًا واضحًا ومختصرًا..."
                     rows={2}
                     className="resize-none text-base border-2 focus:border-primary/50 transition-colors"
                   />
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
                 </div>
               </div>
 
               <Button onClick={handleAddItem} variant="outline" className="gap-2 mb-6">
                 <Plus className="h-4 w-4" />
                 إضافة بند
               </Button>
 
               {/* جدول البنود المضافة */}
               {newItems.length > 0 && (
                 <div className="border rounded-lg overflow-hidden mb-6">
                   <Table>
                     <TableHeader>
                       <TableRow className="bg-muted/30">
                         <TableHead className="w-16 text-center">م</TableHead>
                         <TableHead>الوصف</TableHead>
                         <TableHead className="w-32 text-left">المبلغ</TableHead>
                         <TableHead className="w-16 text-center">حذف</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {newItems.map((item, index) => (
                         <TableRow key={index}>
                           <TableCell className="text-center">
                             <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-sm">
                               {item.serial_number}
                             </span>
                           </TableCell>
                           <TableCell className="font-medium">{item.description}</TableCell>
                           <TableCell className="text-left font-mono font-semibold text-primary">
                             {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                           </TableCell>
                           <TableCell className="text-center">
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-8 w-8 text-destructive hover:bg-destructive/10"
                               onClick={() => handleRemoveNewItem(index)}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                   <div className="p-4 bg-gradient-to-l from-primary/10 to-transparent border-t">
                     <div className="flex justify-between items-center">
                       <span className="font-bold text-lg">الإجمالي</span>
                       <span className="font-bold font-mono text-xl text-primary">
                         {newItemsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                       </span>
                     </div>
                   </div>
                 </div>
               )}
 
               <div className="space-y-3 mb-6">
                 <Label>ملاحظات (اختياري)</Label>
                 <Textarea
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                   placeholder="أي ملاحظات إضافية..."
                   rows={2}
                 />
               </div>
 
               <Separator className="my-6" />
 
               <Button onClick={handleSaveRequest} className="gap-2" size="lg" disabled={newItems.length === 0}>
                 <Save className="h-5 w-5" />
                 حفظ طلب التحويل
               </Button>
             </CardContent>
           </Card>
         )}
 
         {/* قائمة الطلبات */}
         {!isCreating && (
           <div className="space-y-4">
             <h2 className="text-xl font-bold flex items-center gap-2">
               <FileDown className="h-5 w-5 text-primary" />
               قائمة طلبات التحويل
             </h2>
 
             {loading ? (
               <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
             ) : requests.length === 0 ? (
               <Card className="border-dashed">
                 <CardContent className="text-center py-12">
                   <SendHorizontal className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                   <p className="text-muted-foreground">لا توجد طلبات تحويل</p>
                   <p className="text-sm text-muted-foreground/70 mt-1">ابدأ بإنشاء طلب جديد</p>
                 </CardContent>
               </Card>
             ) : (
               <div className="grid gap-4">
                 {requests.map((request) => (
                   <Card key={request.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                     <CardHeader className="pb-3">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <div className="p-2.5 bg-primary/10 rounded-xl">
                             <span className="font-bold text-primary">#{request.request_number}</span>
                           </div>
                           <div>
                             <div className="flex items-center gap-2">
                               <span className="font-semibold">طلب تحويل</span>
                               {getStatusBadge(request.status)}
                             </div>
                             <p className="text-sm text-muted-foreground mt-1">
                               {format(new Date(request.request_date), 'yyyy/MM/dd')}
                             </p>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="font-bold text-xl text-primary font-mono">
                             {request.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                           </span>
                           <span className="text-muted-foreground">ريال</span>
                         </div>
                       </div>
                     </CardHeader>
                     <CardContent>
                       {/* جدول البنود */}
                       <div className="border rounded-lg overflow-hidden mb-4">
                         <Table>
                           <TableHeader>
                             <TableRow className="bg-muted/30">
                               <TableHead className="w-12 text-center">م</TableHead>
                               <TableHead>الوصف</TableHead>
                               <TableHead className="w-48">الحساب</TableHead>
                               <TableHead className="w-28 text-left">المبلغ</TableHead>
                               {request.status !== 'posted' && (
                                 <TableHead className="w-16 text-center">تعديل</TableHead>
                               )}
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {request.items.map((item, index) => (
                               <TableRow key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                                 <TableCell className="text-center">
                                   <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                                     {item.serial_number}
                                   </span>
                                 </TableCell>
                                 <TableCell className="font-medium">{item.description}</TableCell>
                                 <TableCell>
                                   <span className={cn(
                                     "text-sm",
                                     item.account_id ? "text-emerald-600 font-medium" : "text-muted-foreground italic"
                                   )}>
                                     {getAccountName(item.account_id)}
                                   </span>
                                 </TableCell>
                                 <TableCell className="text-left font-mono font-semibold text-primary">
                                   {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                 </TableCell>
                                 {request.status !== 'posted' && (
                                   <TableCell className="text-center">
                                     <Button
                                       variant="ghost"
                                       size="icon"
                                       className="h-8 w-8"
                                       onClick={() => {
                                         setEditingItem({
                                           requestId: request.id,
                                           itemId: item.id,
                                           currentAccountId: item.account_id
                                         });
                                         setShowAccountDialog(true);
                                       }}
                                     >
                                       <Edit className="h-4 w-4" />
                                     </Button>
                                   </TableCell>
                                 )}
                               </TableRow>
                             ))}
                           </TableBody>
                         </Table>
                       </div>
 
                       {/* أزرار الإجراءات */}
                       <div className="flex items-center gap-2 flex-wrap">
                         {request.status === 'draft' && (
                           <>
                             <Button
                               onClick={() => handleApprove(request)}
                               className="gap-2"
                               variant="default"
                             >
                               <CheckCircle className="h-4 w-4" />
                               اعتماد
                             </Button>
                             <Button
                               onClick={() => handleDeleteRequest(request.id)}
                               variant="destructive"
                               size="sm"
                               className="gap-2"
                             >
                               <Trash2 className="h-4 w-4" />
                               حذف
                             </Button>
                           </>
                         )}
                         {request.status === 'approved' && (
                           <Button
                             onClick={() => handlePost(request)}
                             className="gap-2 bg-green-600 hover:bg-green-700"
                           >
                             <ArrowUpCircle className="h-4 w-4" />
                             ترحيل لقيود اليومية
                           </Button>
                         )}
                         {request.status === 'posted' && request.journal_entry_id && (
                           <Link to={`/accounting/journal-entries`}>
                             <Button variant="outline" className="gap-2">
                               <FileDown className="h-4 w-4" />
                               عرض القيد
                             </Button>
                           </Link>
                         )}
                        <Button variant="outline" size="sm" onClick={() => handlePrint(request)} className="gap-2">
                           <Printer className="h-4 w-4" />
                           طباعة
                         </Button>
                       </div>
                     </CardContent>
                   </Card>
                 ))}
               </div>
             )}
           </div>
         )}
       </main>
 
       {/* Dialog لاختيار الحساب */}

      {/* Print View */}
      {printingRequest && (
        <>
          {/* Portal-like approach: render at document level for print */}
          <div 
            id="print-wrapper"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 99999,
              pointerEvents: 'none',
            }}
            className="hidden print:block"
          >
            <TransferRequestPrintView 
              request={printingRequest} 
              accounts={accounts}
            />
          </div>
        </>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide all screen elements */
          body > div:not(:has(#print-wrapper)),
          header, main, nav, footer, button,
          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Show print wrapper and content */
          #print-wrapper {
            display: block !important;
            visibility: visible !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 99999 !important;
            pointer-events: auto !important;
            background: white !important;
          }
          
          #print-wrapper #print-content {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 20mm 15mm !important;
            margin: 0 !important;
            background: #FFFFFF !important;
            color: #222222 !important;
            font-family: 'Cairo', 'Noto Naskh Arabic', sans-serif !important;
          }
          
          #print-wrapper #print-content * {
            visibility: visible !important;
          }
          
          /* Table styles */
          #print-wrapper table {
            page-break-inside: avoid !important;
            border-collapse: collapse !important;
          }
          
          #print-wrapper tr {
            page-break-inside: avoid !important;
          }
          
          /* Remove shadows and effects */
          * {
            box-shadow: none !important;
            text-shadow: none !important;
          }
        }
      `}</style>

       <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
         <DialogContent className="max-w-lg" dir="rtl">
           <DialogHeader>
             <DialogTitle>اختيار الحساب</DialogTitle>
           </DialogHeader>
           <div className="py-4">
             <Label className="mb-2 block">الحساب المحاسبي</Label>
             <Select
               value={editingItem?.currentAccountId || ''}
               onValueChange={handleUpdateItemAccount}
             >
               <SelectTrigger>
                 <SelectValue placeholder="اختر الحساب..." />
               </SelectTrigger>
               <SelectContent className="max-h-80">
                 {accounts.map((account) => (
                   <SelectItem key={account.id} value={account.id}>
                     <span className="font-mono text-sm">{account.code}</span>
                     <span className="mx-2">-</span>
                     <span>{account.name_ar}</span>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
         </DialogContent>
       </Dialog>
     </div>
   );
 };
 
 export default TransferRequests;