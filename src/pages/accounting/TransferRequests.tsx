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
  import { Plus, Trash2, Printer, FileDown, Calendar, Save, CheckCircle, ArrowUpCircle, Edit, ArrowRight, Sparkles, Info, Wallet, SendHorizontal, Search, XCircle, RotateCcw, Pencil, ZoomIn, ZoomOut } from 'lucide-react';
 import { format } from 'date-fns';
 import { ar } from 'date-fns/locale';
 import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import LoadingCup from '@/components/LoadingCup';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useDeleteConfirmation } from '@/components/DeleteConfirmationDialog';
 import { Badge } from '@/components/ui/badge';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TransferRequestPrintView from '@/components/TransferRequestPrintView';
import { Slider } from '@/components/ui/slider';
 
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
  has_tax?: boolean;
  is_tax_row?: boolean;
  parent_item_id?: string;
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
 const [accountSearch, setAccountSearch] = useState('');
 const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
 
// Edit description dialog state
const [editingDescription, setEditingDescription] = useState<{requestId: string, itemId: string, currentDescription: string} | null>(null);
const [newDescriptionValue, setNewDescriptionValue] = useState('');

// Edit amount dialog state
const [editingItemAmount, setEditingItemAmount] = useState<{requestId: string, itemId: string, currentAmount: number, hasTax: boolean} | null>(null);
const [newAmountValue, setNewAmountValue] = useState('');

// Edit date dialog state
const [editingDate, setEditingDate] = useState<{requestId: string, currentDate: string} | null>(null);
const [newDateValue, setNewDateValue] = useState('');
  const [printScale, setPrintScale] = useState(1);
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  
  // Multi-account selection dialog state
  const [showMultiAccountDialog, setShowMultiAccountDialog] = useState(false);
  const [multiAccountSearch, setMultiAccountSearch] = useState('');
  const [multiSelectedAccounts, setMultiSelectedAccounts] = useState<string[]>([]);
  const [multiAccountMode, setMultiAccountMode] = useState<'new' | 'edit'>('new');
  const [multiAccountLetter, setMultiAccountLetter] = useState<string | null>(null);
  
  // Edit mode state
  const [editingRequest, setEditingRequest] = useState<TransferRequest | null>(null);
  const [editItems, setEditItems] = useState<TransferRequestItem[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const { requestDelete, DeleteDialog } = useDeleteConfirmation();

  // Arabic alphabet for quick navigation
  const arabicLetters = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];

  // Filter accounts based on search and selected letter
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = accountSearch === '' || 
      account.name_ar.includes(accountSearch) || 
      account.code.includes(accountSearch);
    
    const matchesLetter = selectedLetter === null || 
      account.name_ar.startsWith(selectedLetter);
    
    return matchesSearch && matchesLetter;
  });
 
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
       // Fetch all requests and all items in parallel (2 queries instead of N+1)
       const [requestsRes, itemsRes] = await Promise.all([
         supabase
           .from('transfer_requests')
           .select('*')
           .order('request_number', { ascending: false }),
         supabase
           .from('transfer_request_items')
           .select('id, transfer_request_id, serial_number, description, amount, account_id, has_tax, is_tax_row, parent_item_id, created_at')
           .order('serial_number')
       ]);
 
       if (requestsRes.error) throw requestsRes.error;
       if (itemsRes.error) throw itemsRes.error;
 
       // Group items by transfer_request_id
       const itemsByRequestId = new Map<string, TransferRequestItem[]>();
       for (const item of itemsRes.data || []) {
         const requestId = item.transfer_request_id;
         if (!itemsByRequestId.has(requestId)) {
           itemsByRequestId.set(requestId, []);
         }
         itemsByRequestId.get(requestId)!.push({
           id: item.id,
           serial_number: item.serial_number,
           description: item.description,
           amount: item.amount,
           account_id: item.account_id,
           has_tax: item.has_tax || false,
           is_tax_row: item.is_tax_row || false,
           parent_item_id: item.parent_item_id || undefined
         });
       }
 
       const requestsWithItems: TransferRequest[] = (requestsRes.data || []).map(req => ({
         ...req,
         items: itemsByRequestId.get(req.id) || []
       }));
 
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
     const itemToRemove = newItems[index];
     // Also remove tax row if this item has tax
     const updated = newItems.filter((item, i) => {
       if (i === index) return false;
       // Remove tax row associated with this item
       if (item.is_tax_row && item.parent_item_id === `new-${index}`) return false;
       return true;
     }).map((item, i) => ({
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
 
        // Create items - first insert non-tax items to get their IDs
        const nonTaxItems = newItems.filter(item => !item.is_tax_row);
        const taxItems = newItems.filter(item => item.is_tax_row);
        
        // Insert non-tax items first
        const nonTaxItemsToInsert = nonTaxItems.map(item => ({
          transfer_request_id: requestData.id,
          serial_number: item.serial_number,
          description: item.description,
          amount: item.amount,
          account_id: item.account_id || null,
          has_tax: item.has_tax || false,
          is_tax_row: false,
          parent_item_id: null
        }));

        const { data: insertedNonTaxItems, error: nonTaxError } = await supabase
          .from('transfer_request_items')
          .insert(nonTaxItemsToInsert)
          .select();

        if (nonTaxError) throw nonTaxError;

        // Create a mapping from temp parent IDs to real IDs
        const parentIdMapping: Record<string, string> = {};
        nonTaxItems.forEach((item, index) => {
          if (insertedNonTaxItems && insertedNonTaxItems[index]) {
            parentIdMapping[`new-${newItems.indexOf(item)}`] = insertedNonTaxItems[index].id;
          }
        });

        // Insert tax items with correct parent references
        if (taxItems.length > 0) {
          const taxItemsToInsert = taxItems.map(item => ({
            transfer_request_id: requestData.id,
            serial_number: item.serial_number,
            description: item.description,
            amount: item.amount,
            account_id: item.account_id || null,
            has_tax: false,
            is_tax_row: true,
            parent_item_id: item.parent_item_id ? parentIdMapping[item.parent_item_id] || null : null
          }));

          const { error: taxError } = await supabase
            .from('transfer_request_items')
            .insert(taxItemsToInsert);

          if (taxError) throw taxError;
        }
 
        // Items already inserted above
 
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
        
        // Generate universal serial for transfer request
        const { data: serialData } = await supabase.rpc('generate_universal_serial', { prefix: 'TR' });
        const universalSerial = serialData as string;
        
        const { data: journalEntry, error: journalError } = await supabase
          .from('journal_entries')
          .insert({
            entry_number: entryNumber,
            date: request.request_date,
            description: `طلب تحويل رقم ${request.request_number}`,
            reference: `transfer_request_${request.id}`,
            created_by: user?.id,
            universal_serial: universalSerial
          })
          .select()
          .single();
 
       if (journalError) throw journalError;
 
  // حساب بنك الرياض شركة الرمال - الحساب الدائن الافتراضي
        const RIYADH_BANK_ACCOUNT_ID = '2edc3d0d-7582-4173-81f2-4b547ad32874';
        
        // Create journal entry lines - each item as debit with corresponding credit
        const debitLines = request.items.map(item => ({
         journal_entry_id: journalEntry.id,
         account_id: item.account_id,
         debit: item.amount,
         credit: 0,
         description: item.description
       }));
 
        // إضافة سطر دائن لكل بند - حساب بنك الرياض شركة
        const creditLines = request.items.map(item => ({
          journal_entry_id: journalEntry.id,
          account_id: RIYADH_BANK_ACCOUNT_ID,
          debit: 0,
          credit: item.amount,
          description: item.description
        }));

        // دمج جميع الأسطر
        const allLines = [...debitLines, ...creditLines];
 
       const { error: linesError } = await supabase
         .from('journal_entry_lines')
          .insert(allLines);
 
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

  // Toggle tax for saved request items directly
  const handleToggleSavedItemTax = async (request: TransferRequest, item: TransferRequestItem) => {
    if (item.is_tax_row) return; // Don't toggle tax rows themselves

    try {
      if (item.has_tax) {
        // Remove tax - find and delete the tax row
        const taxRow = request.items.find(i => i.is_tax_row && i.parent_item_id === item.id);
        if (taxRow) {
          await supabase
            .from('transfer_request_items')
            .delete()
            .eq('id', taxRow.id);
        }
        
        // Update parent item
        await supabase
          .from('transfer_request_items')
          .update({ has_tax: false })
          .eq('id', item.id);
        
        // Update total amount
        const newTotal = request.total_amount - (taxRow?.amount || 0);
        await supabase
          .from('transfer_requests')
          .update({ total_amount: newTotal })
          .eq('id', request.id);
        
        toast.success('تم إزالة الضريبة');
      } else {
        // Add tax row
        const taxAmount = item.amount * 0.15;
        const maxSerial = Math.max(...request.items.map(i => i.serial_number), 0);
        
        await supabase
          .from('transfer_request_items')
          .insert({
            transfer_request_id: request.id,
            serial_number: maxSerial + 1,
            description: 'ضريبة القيمة المضافة 15%',
            amount: taxAmount,
            account_id: null,
            has_tax: false,
            is_tax_row: true,
            parent_item_id: item.id
          });
        
        // Update parent item
        await supabase
          .from('transfer_request_items')
          .update({ has_tax: true })
          .eq('id', item.id);
        
        // Update total amount
        const newTotal = request.total_amount + taxAmount;
        await supabase
          .from('transfer_requests')
          .update({ total_amount: newTotal })
          .eq('id', request.id);
        
        toast.success('تم إضافة الضريبة 15%');
      }
      
      fetchRequests();
    } catch (error) {
      console.error('Error toggling tax:', error);
      toast.error('خطأ في تحديث الضريبة');
    }
  };

  // Delete saved tax row directly
  const handleDeleteSavedTaxRow = async (request: TransferRequest, taxItem: TransferRequestItem) => {
    if (!taxItem.is_tax_row) return;
    
    try {
      // Find and update parent item
      if (taxItem.parent_item_id) {
        await supabase
          .from('transfer_request_items')
          .update({ has_tax: false })
          .eq('id', taxItem.parent_item_id);
      }
      
      // Delete the tax row
      await supabase
        .from('transfer_request_items')
        .delete()
        .eq('id', taxItem.id);
      
      // Update total amount
      const newTotal = request.total_amount - taxItem.amount;
      await supabase
        .from('transfer_requests')
        .update({ total_amount: newTotal })
        .eq('id', request.id);
      
      toast.success('تم حذف الضريبة');
      fetchRequests();
    } catch (error) {
      console.error('Error deleting tax row:', error);
      toast.error('خطأ في حذف الضريبة');
    }
  };

  // Delete a single saved item from a request
  const handleDeleteSavedItem = async (request: TransferRequest, item: TransferRequestItem) => {
    if (item.is_tax_row) return;
    
    try {
      // If item has tax, delete the tax row first
      if (item.has_tax) {
        const taxRow = request.items.find(i => i.is_tax_row && i.parent_item_id === item.id);
        if (taxRow) {
          await supabase
            .from('transfer_request_items')
            .delete()
            .eq('id', taxRow.id);
        }
      }

      // Delete the item itself
      const { error } = await supabase
        .from('transfer_request_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      // Recalculate total
      const remainingItems = request.items.filter(i => {
        if (i.id === item.id) return false;
        if (i.is_tax_row && i.parent_item_id === item.id) return false;
        return true;
      });

      if (remainingItems.length === 0) {
        // Don't auto-delete the request - require explicit deletion with security code
        toast.info('تم حذف جميع البنود. يمكنك حذف الطلب بالكامل من زر حذف الطلب.');
        fetchRequests();
        return;
      }

      const newTotal = remainingItems.reduce((sum, i) => sum + i.amount, 0);
      await supabase
        .from('transfer_requests')
        .update({ total_amount: newTotal })
        .eq('id', request.id);

      // Renumber remaining items
      const nonTaxItems = remainingItems.filter(i => !i.is_tax_row);
      for (let idx = 0; idx < nonTaxItems.length; idx++) {
        await supabase
          .from('transfer_request_items')
          .update({ serial_number: idx + 1 })
          .eq('id', nonTaxItems[idx].id);
      }

      toast.success('تم حذف البند');
      fetchRequests();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('خطأ في حذف البند');
    }
  };

  // Update saved item description
  const handleUpdateSavedItemDescription = async () => {
    if (!editingDescription) return;
    
    try {
      const { error } = await supabase
        .from('transfer_request_items')
        .update({ description: newDescriptionValue.trim() })
        .eq('id', editingDescription.itemId);
      
      if (error) throw error;
      
      toast.success('تم تحديث البيان');
      setEditingDescription(null);
      setNewDescriptionValue('');
      fetchRequests();
    } catch (error) {
      console.error('Error updating description:', error);
      toast.error('خطأ في تحديث البيان');
    }
  };

  // Update saved item amount
  const handleUpdateSavedItemAmount = async () => {
    if (!editingItemAmount || !newAmountValue) return;
    
    const newAmount = parseFloat(newAmountValue);
    if (isNaN(newAmount) || newAmount <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح');
      return;
    }
    
    try {
      // Get current request
      const currentRequest = requests.find(r => r.id === editingItemAmount.requestId);
      if (!currentRequest) return;

      const oldAmount = editingItemAmount.currentAmount;
      const amountDiff = newAmount - oldAmount;

      // Update the item amount
      const { error } = await supabase
        .from('transfer_request_items')
        .update({ amount: newAmount })
        .eq('id', editingItemAmount.itemId);
      
      if (error) throw error;

      // If item has tax, update the tax row amount too
      if (editingItemAmount.hasTax) {
        const taxRow = currentRequest.items.find(
          i => i.is_tax_row && i.parent_item_id === editingItemAmount.itemId
        );
        if (taxRow) {
          const newTaxAmount = newAmount * 0.15;
          const oldTaxAmount = taxRow.amount;
          const taxDiff = newTaxAmount - oldTaxAmount;

          await supabase
            .from('transfer_request_items')
            .update({ amount: newTaxAmount })
            .eq('id', taxRow.id);

          // Update total with both item and tax changes
          const newTotal = currentRequest.total_amount + amountDiff + taxDiff;
          await supabase
            .from('transfer_requests')
            .update({ total_amount: newTotal })
            .eq('id', editingItemAmount.requestId);
        }
      } else {
        // Update total amount without tax consideration
        const newTotal = currentRequest.total_amount + amountDiff;
        await supabase
          .from('transfer_requests')
          .update({ total_amount: newTotal })
          .eq('id', editingItemAmount.requestId);
      }
      
      toast.success('تم تحديث المبلغ');
      setEditingItemAmount(null);
      setNewAmountValue('');
      fetchRequests();
    } catch (error) {
      console.error('Error updating amount:', error);
      toast.error('خطأ في تحديث المبلغ');
    }
  };

  // Update request date
  const handleUpdateRequestDate = async () => {
    if (!editingDate || !newDateValue) return;
    
    try {
      const { error } = await supabase
        .from('transfer_requests')
        .update({ request_date: newDateValue })
        .eq('id', editingDate.requestId);
      
      if (error) throw error;
      
      toast.success('تم تحديث التاريخ');
      setEditingDate(null);
      setNewDateValue('');
      fetchRequests();
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('خطأ في تحديث التاريخ');
    }
  };
 
   const handleDeleteRequest = async (request: TransferRequest) => {
     try {
       // If posted, delete journal entries first
       if (request.status === 'posted' && request.journal_entry_id) {
         // First, clear the journal_entry_id reference to avoid FK constraint
         const { error: clearRefError } = await supabase
           .from('transfer_requests')
           .update({ journal_entry_id: null })
           .eq('id', request.id);

         if (clearRefError) throw clearRefError;

         // Delete ledger entries first
         await supabase
           .from('ledger_entries')
           .delete()
           .eq('journal_entry_id', request.journal_entry_id);

         // Delete journal entry lines
         await supabase
           .from('journal_entry_lines')
           .delete()
           .eq('journal_entry_id', request.journal_entry_id);

         // Delete journal entry
         const { error: journalDeleteError } = await supabase
           .from('journal_entries')
           .delete()
           .eq('id', request.journal_entry_id);

         if (journalDeleteError) throw journalDeleteError;
       }

       const { error } = await supabase
         .from('transfer_requests')
         .delete()
         .eq('id', request.id);
 
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

  const handleDownloadPDF = async (request: TransferRequest) => {
    setPrintingRequest(request);
    
    // Add class to body for PDF generation styling
    document.body.classList.add('pdf-generating');
    
    // Wait for the component to render
    await new Promise(resolve => setTimeout(resolve, 300));

    const printContent = document.getElementById('print-content');
    if (!printContent) {
      toast.error('خطأ في إنشاء PDF');
      document.body.classList.remove('pdf-generating');
      setPrintingRequest(null);
      return;
    }

    try {
      // Temporarily make visible for capture
      const wrapper = document.getElementById('print-wrapper');
      if (wrapper) {
        wrapper.style.position = 'fixed';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.zIndex = '-1';
        wrapper.style.opacity = '1';
        wrapper.style.display = 'block';
      }

      const pages = printContent.querySelectorAll('.print-page');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#FFFFFF',
          logging: false,
          windowWidth: 794,
          windowHeight: 1123,
        });
        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`طلب-تحويل-${request.request_number}.pdf`);
      
      toast.success('تم تحميل PDF بنجاح');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('خطأ في إنشاء PDF');
    } finally {
      document.body.classList.remove('pdf-generating');
      setPrintingRequest(null);
    }
  };
 
  // Cancel/Revert a request to draft status
  const handleCancelRequest = async (request: TransferRequest) => {
    try {
      // If posted, delete the journal entry first
      if (request.status === 'posted' && request.journal_entry_id) {
        // First, clear the journal_entry_id reference to avoid FK constraint
        const { error: clearRefError } = await supabase
          .from('transfer_requests')
          .update({ journal_entry_id: null })
          .eq('id', request.id);

        if (clearRefError) throw clearRefError;

        // Delete ledger entries first (created by trigger)
        const { error: ledgerDeleteError } = await supabase
          .from('ledger_entries')
          .delete()
          .eq('journal_entry_id', request.journal_entry_id);

        if (ledgerDeleteError) {
          console.error('Error deleting ledger entries:', ledgerDeleteError);
          // Continue even if no ledger entries exist
        }

        // Delete journal entry lines first
        const { error: linesDeleteError } = await supabase
          .from('journal_entry_lines')
          .delete()
          .eq('journal_entry_id', request.journal_entry_id);

        if (linesDeleteError) {
          console.error('Error deleting journal lines:', linesDeleteError);
        }

        // Delete journal entry
        const { error: entryDeleteError } = await supabase
          .from('journal_entries')
          .delete()
          .eq('id', request.journal_entry_id);

        if (entryDeleteError) throw entryDeleteError;
      }

      // Revert request to draft
      const { error } = await supabase
        .from('transfer_requests')
        .update({
          status: 'draft',
          approved_at: null,
          approved_by: null,
          posted_at: null,
          posted_by: null
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('تم إلغاء الطلب وإعادته لحالة المسودة');
      fetchRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('خطأ في إلغاء الطلب');
    }
  };

  // Start editing a request
  const handleStartEdit = (request: TransferRequest) => {
    setEditingRequest(request);
    setEditItems([...request.items]);
    setEditNotes(request.notes || '');
    setEditDescription('');
    setEditAmount('');
  };

  // Add item to edit
  const handleAddEditItem = () => {
    if (!editDescription.trim() || !editAmount) {
      toast.error('الرجاء ملء جميع الحقول');
      return;
    }

    const newItem: TransferRequestItem = {
      id: `temp-${Date.now()}`,
      serial_number: editItems.length + 1,
      description: editDescription.trim(),
      amount: parseFloat(editAmount),
      account_id: null
    };

    setEditItems([...editItems, newItem]);
    setEditDescription('');
    setEditAmount('');
  };

  // Remove item from edit
  const handleRemoveEditItem = (index: number) => {
   const itemToRemove = editItems[index];
   // Also remove tax row if this item has tax
   const updated = editItems.filter((item, i) => {
     if (i === index) return false;
     // Remove tax row associated with this item
     if (item.is_tax_row && item.parent_item_id === itemToRemove.id) return false;
     return true;
   }).map((item, i) => ({
      ...item,
      serial_number: i + 1
    }));
    setEditItems(updated);
  };

  // Save edited request
  const handleSaveEdit = async () => {
    if (!editingRequest || editItems.length === 0) {
      toast.error('الرجاء إضافة عنصر واحد على الأقل');
      return;
    }

    try {
      const totalAmount = editItems.reduce((sum, item) => sum + item.amount, 0);

      // Update the request
      const { error: requestError } = await supabase
        .from('transfer_requests')
        .update({
          total_amount: totalAmount,
          notes: editNotes || null,
          status: 'draft',
          approved_at: null,
          approved_by: null,
          posted_at: null,
          posted_by: null,
          journal_entry_id: null
        })
        .eq('id', editingRequest.id);

      if (requestError) throw requestError;

      // Delete old items
      const { error: deleteError } = await supabase
        .from('transfer_request_items')
        .delete()
        .eq('transfer_request_id', editingRequest.id);

      if (deleteError) throw deleteError;

      // Insert new items - first insert non-tax items
      const nonTaxEditItems = editItems.filter(item => !item.is_tax_row);
      const taxEditItems = editItems.filter(item => item.is_tax_row);
      
      const nonTaxItemsToInsert = nonTaxEditItems.map((item, index) => ({
        transfer_request_id: editingRequest.id,
        serial_number: editItems.indexOf(item) + 1,
        description: item.description,
        amount: item.amount,
        account_id: item.account_id,
        has_tax: item.has_tax || false,
        is_tax_row: false,
        parent_item_id: null
      }));

      const { data: insertedEditItems, error: nonTaxEditError } = await supabase
        .from('transfer_request_items')
        .insert(nonTaxItemsToInsert)
        .select();

      if (nonTaxEditError) throw nonTaxEditError;

      // Create parent ID mapping for edit items
      const editParentIdMapping: Record<string, string> = {};
      nonTaxEditItems.forEach((item, index) => {
        if (insertedEditItems && insertedEditItems[index]) {
          editParentIdMapping[item.id] = insertedEditItems[index].id;
        }
      });

      // Insert tax items
      if (taxEditItems.length > 0) {
        const taxItemsToInsert = taxEditItems.map((item) => ({
          transfer_request_id: editingRequest.id,
          serial_number: editItems.indexOf(item) + 1,
          description: item.description,
          amount: item.amount,
          account_id: item.account_id,
          has_tax: false,
          is_tax_row: true,
          parent_item_id: item.parent_item_id ? editParentIdMapping[item.parent_item_id] || null : null
        }));

        const { error: taxEditError } = await supabase
          .from('transfer_request_items')
          .insert(taxItemsToInsert);

        if (taxEditError) throw taxEditError;
      }

      // Items already inserted above

      // If was posted, delete old journal entry
      if (editingRequest.journal_entry_id) {
        await supabase
          .from('journal_entry_lines')
          .delete()
          .eq('journal_entry_id', editingRequest.journal_entry_id);

        await supabase
          .from('journal_entries')
          .delete()
          .eq('id', editingRequest.journal_entry_id);
      }

      toast.success('تم حفظ التعديلات بنجاح');
      setEditingRequest(null);
      setEditItems([]);
      setEditNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error saving edit:', error);
      toast.error('خطأ في حفظ التعديلات');
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingRequest(null);
    setEditItems([]);
    setEditNotes('');
    setEditDescription('');
    setEditAmount('');
  };

  const editItemsTotal = editItems.reduce((sum, item) => sum + item.amount, 0);

  // VAT Tax Account ID (ضريبة المشتريات - كود 110801)
  const VAT_ACCOUNT_ID = '110801';

  // Toggle tax on new item
  const handleToggleNewItemTax = (index: number) => {
    const item = newItems[index];
    
    if (item.has_tax) {
      // Remove tax - find and remove tax row
      const updated = newItems.filter((i, idx) => {
        if (i.is_tax_row && i.parent_item_id === `new-${index}`) {
          return false;
        }
        return true;
      }).map((i, idx) => {
        if (idx === index || (idx < newItems.length && newItems.findIndex((_, origIdx) => origIdx === index) === idx)) {
          return { ...i, has_tax: false };
        }
        return i;
      });
      
      // Recalculate serial numbers
      const renumbered = updated.map((item, idx) => ({
        ...item,
        serial_number: idx + 1
      }));
      setNewItems(renumbered);
    } else {
      // Add tax row after this item
      const taxAmount = item.amount * 0.15;
      const taxItem: Omit<TransferRequestItem, 'id'> = {
        serial_number: 0, // Will be recalculated
        description: 'ضريبة القيمة المضافة 15%',
        amount: taxAmount,
        account_id: null,
        is_tax_row: true,
        parent_item_id: `new-${index}`
      };
      
      // Mark original item as having tax
      const updatedItems = [...newItems];
      updatedItems[index] = { ...item, has_tax: true };
      
      // Insert tax row after the item
      updatedItems.splice(index + 1, 0, taxItem);
      
      // Recalculate serial numbers
      const renumbered = updatedItems.map((item, idx) => ({
        ...item,
        serial_number: idx + 1
      }));
      setNewItems(renumbered);
    }
  };

  // Toggle tax on edit item
  const handleToggleEditItemTax = (index: number) => {
    const item = editItems[index];
    
    if (item.has_tax) {
      // Remove tax row
      const updated = editItems.filter((i) => {
        if (i.is_tax_row && i.parent_item_id === item.id) {
          return false;
        }
        return true;
      });
      
      // Update original item
      const finalItems = updated.map((i) => {
        if (i.id === item.id) {
          return { ...i, has_tax: false };
        }
        return i;
      });
      
      // Recalculate serial numbers
      const renumbered = finalItems.map((item, idx) => ({
        ...item,
        serial_number: idx + 1
      }));
      setEditItems(renumbered);
    } else {
      // Add tax row
      const taxAmount = item.amount * 0.15;
      const taxItem: TransferRequestItem = {
        id: `tax-${Date.now()}`,
        serial_number: 0,
        description: 'ضريبة القيمة المضافة 15%',
        amount: taxAmount,
        account_id: null,
        is_tax_row: true,
        parent_item_id: item.id
      };
      
      // Mark original item as having tax
      const updatedItems = [...editItems];
      updatedItems[index] = { ...item, has_tax: true };
      
      // Insert tax row after the item
      updatedItems.splice(index + 1, 0, taxItem);
      
      // Recalculate serial numbers
      const renumbered = updatedItems.map((item, idx) => ({
        ...item,
        serial_number: idx + 1
      }));
      setEditItems(renumbered);
    }
  };

  // Handle multi-account selection confirmation - creates rows for each selected account
  const handleConfirmMultiAccountSelection = () => {
    if (multiSelectedAccounts.length === 0) {
      toast.error('الرجاء اختيار حساب واحد على الأقل');
      return;
    }

    const parsedAmount = amount ? parseFloat(amount) : 0;
    const currentDescription = description.trim();

    if (multiAccountMode === 'new') {
      const newAccountItems: Omit<TransferRequestItem, 'id'>[] = multiSelectedAccounts.map((accountId, idx) => {
        const account = accounts.find(a => a.id === accountId);
        return {
          serial_number: newItems.length + idx + 1,
          description: currentDescription || (account ? account.name_ar : ''),
          amount: parsedAmount,
          account_id: accountId,
        };
      });

      const updatedItems = [...newItems, ...newAccountItems].map((item, idx) => ({
        ...item,
        serial_number: idx + 1,
      }));
      setNewItems(updatedItems);
    } else {
      // edit mode
      const newAccountItems: TransferRequestItem[] = multiSelectedAccounts.map((accountId, idx) => {
        const account = accounts.find(a => a.id === accountId);
        return {
          id: `multi-${Date.now()}-${idx}`,
          serial_number: editItems.length + idx + 1,
          description: editDescription.trim() || (account ? account.name_ar : ''),
          amount: editAmount ? parseFloat(editAmount) : 0,
          account_id: accountId,
        };
      });

      const updatedItems = [...editItems, ...newAccountItems].map((item, idx) => ({
        ...item,
        serial_number: idx + 1,
      }));
      setEditItems(updatedItems);
    }

    setShowMultiAccountDialog(false);
    setMultiSelectedAccounts([]);
    setMultiAccountSearch('');
    setDescription('');
    setAmount('');
    toast.success(`تم إضافة ${multiSelectedAccounts.length} بند`);
  };

  const filteredMultiAccounts = accounts.filter(account => {
    const matchesSearch = multiAccountSearch === '' || 
      account.name_ar.includes(multiAccountSearch) || 
      account.code.includes(multiAccountSearch);
    const matchesLetter = multiAccountLetter === null || 
      account.name_ar.startsWith(multiAccountLetter);
    return matchesSearch && matchesLetter;
  });

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
                  <div className="lg:col-span-2 space-y-3">
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
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Plus className="h-4 w-4 text-primary" />
                      اختيار حسابات
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-14 border-2 border-dashed hover:border-primary/50 transition-colors gap-2"
                      onClick={() => {
                        setMultiAccountMode('new');
                        setMultiSelectedAccounts([]);
                        setMultiAccountSearch('');
                        setMultiAccountLetter(null);
                        setShowMultiAccountDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      اختيار حسابات متعددة
                    </Button>
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
                         <TableHead className="w-16 text-center">ضريبة</TableHead>
                         <TableHead className="w-16 text-center">حذف</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {newItems.map((item, index) => (
                         <TableRow key={index} className={item.is_tax_row ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}>
                           <TableCell className="text-center">
                             <span className={cn(
                               "inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm",
                               item.is_tax_row ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300" : "bg-primary/10 text-primary"
                             )}>
                               {item.serial_number}
                             </span>
                           </TableCell>
                            <TableCell className={cn("font-medium", item.is_tax_row && "text-emerald-700 dark:text-emerald-400")}>
                              {item.is_tax_row ? (
                                <>
                                  <span className="ml-2">📋</span>
                                  {item.description}
                                </>
                              ) : (
                                <Input
                                  value={item.description}
                                  onChange={(e) => {
                                    const updated = [...newItems];
                                    updated[index] = { ...updated[index], description: e.target.value };
                                    setNewItems(updated);
                                  }}
                                  className="h-8 text-sm border-transparent hover:border-border focus:border-primary/50"
                                  placeholder="وصف البند..."
                                />
                              )}
                            </TableCell>
                           <TableCell className={cn(
                             "text-left font-mono font-semibold",
                             item.is_tax_row ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                           )}>
                             {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                           </TableCell>
                           <TableCell className="text-center">
                             {!item.is_tax_row && (
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className={cn(
                                   "h-8 w-8 font-bold text-lg",
                                   item.has_tax 
                                     ? "text-emerald-600 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-800" 
                                     : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                                 )}
                                 onClick={() => handleToggleNewItemTax(index)}
                                 title={item.has_tax ? "إزالة الضريبة" : "إضافة ضريبة 15%"}
                               >
                                 ض
                               </Button>
                             )}
                           </TableCell>
                           <TableCell className="text-center">
                             {!item.is_tax_row && (
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-8 w-8 text-destructive hover:bg-destructive/10"
                               onClick={() => handleRemoveNewItem(index)}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                             )}
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
 
          {/* نموذج تعديل طلب */}
          {editingRequest && (
            <Card className="mb-8 border-0 shadow-lg bg-gradient-to-br from-card via-card to-amber-500/5">
              <CardHeader className="pb-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Pencil className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">✏️ تعديل طلب التحويل #{editingRequest.request_number}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        عدّل البنود ثم احفظ التغييرات - سيُعاد الطلب لحالة المسودة
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={handleCancelEdit}>
                    إلغاء التعديل
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                  <div className="lg:col-span-2 space-y-3">
                    <Label htmlFor="editDescription" className="flex items-center gap-2 text-base font-medium">
                      <Info className="h-4 w-4 text-amber-600" />
                      وصف التحويل
                    </Label>
                    <Textarea
                      id="editDescription"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="اكتب شرحًا واضحًا ومختصرًا..."
                      rows={2}
                      className="resize-none text-base border-2 focus:border-amber-500/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Plus className="h-4 w-4 text-amber-600" />
                      اختيار حسابات
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-14 border-2 border-dashed border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors gap-2"
                      onClick={() => {
                        setMultiAccountMode('edit');
                        setMultiSelectedAccounts([]);
                        setMultiAccountSearch('');
                        setMultiAccountLetter(null);
                        setShowMultiAccountDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      اختيار حسابات متعددة
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="editAmountInput" className="flex items-center gap-2 text-base font-medium">
                      <Wallet className="h-4 w-4 text-amber-600" />
                      المبلغ
                    </Label>
                    <Input
                      id="editAmountInput"
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="0.00"
                      className="text-xl font-mono h-14 text-center border-2 focus:border-amber-500/50 transition-colors"
                    />
                  </div>
                </div>

                <Button onClick={handleAddEditItem} variant="outline" className="gap-2 mb-6 border-amber-500/30 hover:bg-amber-500/10">
                  <Plus className="h-4 w-4" />
                  إضافة بند
                </Button>

                {/* جدول البنود */}
                {editItems.length > 0 && (
                  <div className="border rounded-lg overflow-hidden mb-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-amber-500/10">
                          <TableHead className="w-16 text-center">م</TableHead>
                          <TableHead>الوصف</TableHead>
                          <TableHead className="w-48">الحساب</TableHead>
                          <TableHead className="w-32 text-left">المبلغ</TableHead>
                         <TableHead className="w-16 text-center">ضريبة</TableHead>
                          <TableHead className="w-16 text-center">حذف</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editItems.map((item, index) => (
                         <TableRow key={item.id} className={item.is_tax_row ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}>
                            <TableCell className="text-center">
                             <span className={cn(
                               "inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm",
                               item.is_tax_row ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300" : "bg-amber-500/10 text-amber-600"
                             )}>
                                {index + 1}
                              </span>
                            </TableCell>
                           <TableCell className={cn("font-medium", item.is_tax_row && "text-emerald-700 dark:text-emerald-400")}>
                             {item.is_tax_row && <span className="ml-2">📋</span>}
                             {item.description}
                           </TableCell>
                            <TableCell>
                              <span className={cn(
                                "text-sm",
                               item.is_tax_row ? "text-emerald-600 font-medium" :
                               item.account_id ? "text-emerald-600 font-medium" : "text-muted-foreground italic"
                              )}>
                               {item.is_tax_row ? 'ضريبة المشتريات' : getAccountName(item.account_id)}
                              </span>
                            </TableCell>
                           <TableCell className={cn(
                             "text-left font-mono font-semibold",
                             item.is_tax_row ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"
                           )}>
                              {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center">
                             {!item.is_tax_row && (
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className={cn(
                                   "h-8 w-8 font-bold text-lg",
                                   item.has_tax 
                                     ? "text-emerald-600 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-800" 
                                     : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                                 )}
                                 onClick={() => handleToggleEditItemTax(index)}
                                 title={item.has_tax ? "إزالة الضريبة" : "إضافة ضريبة 15%"}
                               >
                                 ض
                               </Button>
                             )}
                           </TableCell>
                           <TableCell className="text-center">
                             {!item.is_tax_row && (
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                 onClick={() => handleRemoveEditItem(index)}
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="p-4 bg-gradient-to-l from-amber-500/10 to-transparent border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">الإجمالي</span>
                        <span className="font-bold font-mono text-xl text-amber-600">
                          {editItemsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <Label>ملاحظات (اختياري)</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية..."
                    rows={2}
                  />
                </div>

                <Separator className="my-6" />

                <div className="flex gap-3">
                  <Button onClick={handleSaveEdit} className="gap-2 bg-amber-600 hover:bg-amber-700" size="lg" disabled={editItems.length === 0}>
                    <Save className="h-5 w-5" />
                    حفظ التعديلات
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="lg">
                    إلغاء
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

         {/* قائمة الطلبات */}
          {!isCreating && !editingRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileDown className="h-5 w-5 text-primary" />
                  قائمة طلبات التحويل
                </h2>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث في وصف البنود..."
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    className="pr-9"
                  />
                  {requestSearchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setRequestSearchQuery('')}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
  
               {loading ? (
                 <LoadingCup text="جاري تحميل الطلبات..." />
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
                  {requests.filter(req => {
                    if (!requestSearchQuery.trim()) return true;
                    const query = requestSearchQuery.trim().toLowerCase();
                    return req.items.some(item => item.description.toLowerCase().includes(query)) ||
                           (req.notes && req.notes.toLowerCase().includes(query)) ||
                           String(req.request_number).includes(query);
                  }).map((request) => (
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
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(request.request_date), 'yyyy/MM/dd')}
                                </p>
                                {request.status !== 'posted' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-50 hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingDate({
                                        requestId: request.id,
                                        currentDate: request.request_date
                                      });
                                      setNewDateValue(request.request_date.split('T')[0]);
                                    }}
                                    title="تعديل التاريخ"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
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
                                <>
                                  <TableHead className="w-16 text-center">ضريبة</TableHead>
                                  <TableHead className="w-16 text-center">تعديل</TableHead>
                                  <TableHead className="w-16 text-center">حذف</TableHead>
                                </>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {request.items.map((item, index) => (
                              <TableRow key={item.id} className={cn(
                                item.is_tax_row ? 'bg-emerald-50 dark:bg-emerald-900/20' : (index % 2 === 0 ? 'bg-background' : 'bg-muted/10')
                              )}>
                                <TableCell className="text-center">
                                  <span className={cn(
                                    "inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs",
                                    item.is_tax_row ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300" : "bg-primary/10 text-primary"
                                  )}>
                                    {item.serial_number}
                                  </span>
                                </TableCell>
                                <TableCell className={cn("font-medium", item.is_tax_row && "text-emerald-700 dark:text-emerald-400")}>
                                  <div className="flex items-center gap-2">
                                    {item.is_tax_row && <span>📋</span>}
                                    <span>{item.description}</span>
                                    {!item.is_tax_row && request.status !== 'posted' && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-50 hover:opacity-100"
                                        onClick={() => {
                                          setEditingDescription({
                                            requestId: request.id,
                                            itemId: item.id,
                                            currentDescription: item.description
                                          });
                                          setNewDescriptionValue(item.description);
                                        }}
                                        title="تعديل البيان"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className={cn(
                                    "text-sm",
                                    item.is_tax_row ? "text-emerald-600 font-medium" :
                                    item.account_id ? "text-emerald-600 font-medium" : "text-muted-foreground italic"
                                  )}>
                                    {item.is_tax_row ? 'ضريبة المشتريات' : getAccountName(item.account_id)}
                                  </span>
                                </TableCell>
                                <TableCell className={cn(
                                  "text-left font-mono font-semibold",
                                  item.is_tax_row ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                                )}>
                                  <div className="flex items-center gap-1 justify-start">
                                    <span>{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    {!item.is_tax_row && request.status !== 'posted' && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-50 hover:opacity-100"
                                        onClick={() => {
                                          setEditingItemAmount({
                                            requestId: request.id,
                                            itemId: item.id,
                                            currentAmount: item.amount,
                                            hasTax: item.has_tax || false
                                          });
                                          setNewAmountValue(item.amount.toString());
                                        }}
                                        title="تعديل المبلغ"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                {request.status !== 'posted' && (
                                  <>
                                    <TableCell className="text-center">
                                      {!item.is_tax_row && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className={cn(
                                            "h-8 w-8 font-bold text-lg",
                                            item.has_tax 
                                              ? "text-emerald-600 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-800" 
                                              : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                                          )}
                                          onClick={() => handleToggleSavedItemTax(request, item)}
                                          title={item.has_tax ? "إزالة الضريبة" : "إضافة ضريبة 15%"}
                                        >
                                          ض
                                        </Button>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {!item.is_tax_row ? (
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
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => handleDeleteSavedTaxRow(request, item)}
                                          title="حذف الضريبة"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {!item.is_tax_row && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                          onClick={() => requestDelete(
                                            () => handleDeleteSavedItem(request, item),
                                            { title: 'حذف البند', description: `هل أنت متأكد من حذف البند "${item.description}"؟` }
                                          )}
                                          title="حذف البند"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </>
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
                                onClick={() => handleStartEdit(request)}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                              >
                                <Pencil className="h-4 w-4" />
                                تعديل
                              </Button>
                           </>
                         )}
                         {request.status === 'approved' && (
                            <>
                              <Button
                                onClick={() => handlePost(request)}
                                className="gap-2 bg-green-600 hover:bg-green-700"
                              >
                                <ArrowUpCircle className="h-4 w-4" />
                                ترحيل لقيود اليومية
                              </Button>
                              <Button
                                onClick={() => handleStartEdit(request)}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                              >
                                <Pencil className="h-4 w-4" />
                                تعديل
                              </Button>
                              <Button
                                onClick={() => handleCancelRequest(request)}
                                variant="outline"
                                size="sm"
                                className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                              >
                                <RotateCcw className="h-4 w-4" />
                                إعادة لمسودة
                              </Button>
                            </>
                         )}
                         {request.status === 'posted' && (
                            <>
                              {request.journal_entry_id && (
                                <Link to={`/accounting/journal-entries`}>
                                  <Button variant="outline" className="gap-2">
                                    <FileDown className="h-4 w-4" />
                                    عرض القيد
                                  </Button>
                                </Link>
                              )}
                              <Button
                                onClick={() => handleStartEdit(request)}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                              >
                                <Pencil className="h-4 w-4" />
                                تعديل
                              </Button>
                              <Button
                                onClick={() => handleCancelRequest(request)}
                                variant="outline"
                                size="sm"
                                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                              >
                                <XCircle className="h-4 w-4" />
                                إلغاء الترحيل
                              </Button>
                            </>
                         )}
                         <Button
                           onClick={() => requestDelete(
                             () => handleDeleteRequest(request),
                             { title: 'حذف طلب التحويل', description: `هل أنت متأكد من حذف طلب التحويل رقم ${request.request_number}؟ سيتم حذف جميع البنود والقيود المحاسبية المرتبطة.` }
                           )}
                           variant="destructive"
                           size="sm"
                           className="gap-2"
                         >
                           <Trash2 className="h-4 w-4" />
                           حذف
                         </Button>
                         <Button variant="outline" size="sm" onClick={() => handlePrint(request)} className="gap-2">
                            <Printer className="h-4 w-4" />
                            طباعة
                          </Button>
                         <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(request)} className="gap-2">
                           <FileDown className="h-4 w-4" />
                           تحميل PDF
                         </Button>
                       </div>
                       {/* أداة التحكم بحجم المعاينة */}
                       <div className="flex items-center gap-3 mt-3 p-3 bg-muted/50 rounded-lg border">
                         <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                         <Slider
                           value={[printScale * 100]}
                           onValueChange={(val) => setPrintScale(val[0] / 100)}
                           min={70}
                           max={130}
                           step={5}
                           className="w-40"
                         />
                         <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                         <span className="text-xs text-muted-foreground font-medium min-w-[3rem] text-center">
                           {Math.round(printScale * 100)}%
                         </span>
                         {printScale !== 1 && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => setPrintScale(1)}
                             className="h-6 px-2 text-xs"
                           >
                             إعادة ضبط
                           </Button>
                         )}
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
              overflow: 'hidden',
              background: 'white',
            }}
            className="hidden print:block"
          >
            <TransferRequestPrintView 
              request={printingRequest} 
              accounts={accounts}
              scale={printScale}
            />
          </div>
        </>
      )}

      {/* Print Styles */}
      <style>{`
        /* PDF Generation Mode */
        .pdf-generating #print-wrapper {
          display: block !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 210mm !important;
          height: 297mm !important;
          z-index: -1 !important;
          opacity: 1 !important;
          pointer-events: none !important;
          background: white !important;
        }
        
        .pdf-generating #print-wrapper #print-content {
          display: flex !important;
          flex-direction: column !important;
          width: 210mm !important;
          height: 297mm !important;
          padding: 20mm 15mm !important;
          box-sizing: border-box !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide everything by default */
          body * {
            visibility: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          /* Reset body containers to not take space */
          body, #root, #root > * {
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          /* Show print wrapper and contents */
          #print-wrapper,
          #print-wrapper * {
            visibility: visible !important;
            height: auto !important;
            overflow: visible !important;
            margin: unset !important;
            padding: unset !important;
          }

          #print-wrapper {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            z-index: 99999 !important;
            background: white !important;
          }
          
          #print-wrapper #print-content {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            width: 210mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            color: #222222 !important;
            font-family: 'Cairo', 'Noto Naskh Arabic', sans-serif !important;
            overflow: visible !important;
          }
          
          #print-wrapper #print-content * {
            visibility: visible !important;
          }

          #print-wrapper .print-page {
            width: 210mm !important;
            height: 297mm !important;
            padding: 15mm !important;
            page-break-after: always !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          #print-wrapper .print-page:last-child {
            page-break-after: auto !important;
          }
          
          /* Table styles */
          #print-wrapper table {
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

        /* Hide print wrapper on screen unless printing */
        #print-wrapper:not(.printing-active) {
          display: none;
        }
        
        /* Show for PDF generation */
        .pdf-generating #print-wrapper {
          display: block !important;
          position: fixed !important;
          top: -9999px !important;
          left: -9999px !important;
        }
      `}</style>

       <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
         <DialogContent className="max-w-5xl max-h-[90vh]" dir="rtl">
           <DialogHeader>
             <DialogTitle className="text-xl flex items-center gap-2">
               <Wallet className="h-5 w-5 text-primary" />
               اختيار الحساب المحاسبي
             </DialogTitle>
           </DialogHeader>
           <div className="py-4">
             {/* Search Input */}
             <div className="relative mb-4">
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
               <Input
                 placeholder="ابحث بالاسم أو الكود..."
                 value={accountSearch}
                 onChange={(e) => {
                   setAccountSearch(e.target.value);
                   setSelectedLetter(null);
                 }}
                 className="pr-10 text-lg h-12"
                 autoFocus
               />
             </div>
             
             <div className="flex gap-3">
               {/* Arabic Letters Sidebar */}
               <div className="flex flex-col gap-1 bg-muted/50 rounded-lg p-2 max-h-[55vh] overflow-y-auto">
                 <button
                   onClick={() => {
                     setSelectedLetter(null);
                     setAccountSearch('');
                   }}
                   className={cn(
                     "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                     selectedLetter === null && accountSearch === ''
                       ? "bg-primary text-primary-foreground"
                       : "hover:bg-primary/20 text-muted-foreground"
                   )}
                 >
                   الكل
                 </button>
                 {arabicLetters.map((letter) => (
                   <button
                     key={letter}
                     onClick={() => {
                       setSelectedLetter(letter);
                       setAccountSearch('');
                     }}
                     className={cn(
                       "w-8 h-8 rounded-lg text-base font-bold transition-all",
                       selectedLetter === letter
                         ? "bg-primary text-primary-foreground"
                         : "hover:bg-primary/20 text-foreground"
                     )}
                   >
                     {letter}
                   </button>
                 ))}
               </div>
               
               {/* Accounts Grid */}
               <div className="flex-1 max-h-[55vh] overflow-y-auto pr-2">
                 <p className="text-sm text-muted-foreground mb-3">
                   {filteredAccounts.length} حساب من أصل {accounts.length}
                 </p>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                   {filteredAccounts.map((account) => (
                     <div
                       key={account.id}
                       onClick={() => handleUpdateItemAccount(account.id)}
                       className={cn(
                         "p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                         "hover:border-primary hover:bg-primary/5 hover:shadow-md",
                         "flex flex-col items-center justify-center text-center gap-2 min-h-[100px]",
                         editingItem?.currentAccountId === account.id
                           ? "border-primary bg-primary/10 shadow-md"
                           : "border-border bg-card"
                       )}
                     >
                       <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                         {account.code}
                       </span>
                       <span className="text-sm font-medium leading-tight">
                         {account.name_ar}
                       </span>
                       <span className="text-xs text-muted-foreground">
                         {account.type === 'asset' && 'أصول'}
                         {account.type === 'liability' && 'خصوم'}
                         {account.type === 'equity' && 'حقوق ملكية'}
                         {account.type === 'revenue' && 'إيرادات'}
                         {account.type === 'expense' && 'مصروفات'}
                       </span>
                     </div>
                   ))}
                   {filteredAccounts.length === 0 && (
                     <div className="col-span-full text-center py-12 text-muted-foreground">
                       لا توجد حسابات مطابقة للبحث
                     </div>
                   )}
                 </div>
               </div>
               </div>
             </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => {
               setShowAccountDialog(false);
               setAccountSearch('');
               setSelectedLetter(null);
             }}>
               إلغاء
             </Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Multi-Account Selection Dialog */}
      <Dialog open={showMultiAccountDialog} onOpenChange={setShowMultiAccountDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              اختيار حسابات متعددة
              {multiSelectedAccounts.length > 0 && (
                <Badge className="mr-2">{multiSelectedAccounts.length} محدد</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو الكود..."
                value={multiAccountSearch}
                onChange={(e) => {
                  setMultiAccountSearch(e.target.value);
                  setMultiAccountLetter(null);
                }}
                className="pr-10 text-lg h-12"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 bg-muted/50 rounded-lg p-2 max-h-[55vh] overflow-y-auto">
                <button
                  onClick={() => {
                    setMultiAccountLetter(null);
                    setMultiAccountSearch('');
                  }}
                  className={cn(
                    "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                    multiAccountLetter === null && multiAccountSearch === ''
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-primary/20 text-muted-foreground"
                  )}
                >
                  الكل
                </button>
                {arabicLetters.map((letter) => (
                  <button
                    key={letter}
                    onClick={() => {
                      setMultiAccountLetter(letter);
                      setMultiAccountSearch('');
                    }}
                    className={cn(
                      "w-8 h-8 rounded-lg text-base font-bold transition-all",
                      multiAccountLetter === letter
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-primary/20 text-foreground"
                    )}
                  >
                    {letter}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 max-h-[55vh] overflow-y-auto pr-2">
                <p className="text-sm text-muted-foreground mb-3">
                  {filteredMultiAccounts.length} حساب من أصل {accounts.length} — اضغط لتحديد أو إلغاء التحديد
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredMultiAccounts.map((account) => {
                    const isSelected = multiSelectedAccounts.includes(account.id);
                    return (
                      <div
                        key={account.id}
                        onClick={() => {
                          setMultiSelectedAccounts(prev =>
                            isSelected
                              ? prev.filter(id => id !== account.id)
                              : [...prev, account.id]
                          );
                        }}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                          "hover:shadow-md",
                          "flex flex-col items-center justify-center text-center gap-2 min-h-[100px] relative",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border bg-card hover:border-primary hover:bg-primary/5"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                        <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                          {account.code}
                        </span>
                        <span className="text-sm font-medium leading-tight">
                          {account.name_ar}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {account.type === 'asset' && 'أصول'}
                          {account.type === 'liability' && 'خصوم'}
                          {account.type === 'equity' && 'حقوق ملكية'}
                          {account.type === 'revenue' && 'إيرادات'}
                          {account.type === 'expense' && 'مصروفات'}
                        </span>
                      </div>
                    );
                  })}
                  {filteredMultiAccounts.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      لا توجد حسابات مطابقة للبحث
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setShowMultiAccountDialog(false);
              setMultiSelectedAccounts([]);
              setMultiAccountSearch('');
              setMultiAccountLetter(null);
            }}>
              إلغاء
            </Button>
            <Button 
              onClick={handleConfirmMultiAccountSelection} 
              disabled={multiSelectedAccounts.length === 0}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              تأكيد ({multiSelectedAccounts.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Description Dialog */}
      <Dialog open={!!editingDescription} onOpenChange={(open) => {
        if (!open) {
          setEditingDescription(null);
          setNewDescriptionValue('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل البيان</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newDescription">البيان</Label>
              <Textarea
                id="newDescription"
                value={newDescriptionValue}
                onChange={(e) => setNewDescriptionValue(e.target.value)}
                placeholder="أدخل البيان الجديد..."
                className="min-h-[100px]"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setEditingDescription(null);
              setNewDescriptionValue('');
            }}>
              إلغاء
            </Button>
            <Button 
              onClick={handleUpdateSavedItemDescription}
              disabled={!newDescriptionValue.trim()}
            >
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Amount Dialog */}
      <Dialog open={!!editingItemAmount} onOpenChange={(open) => {
        if (!open) {
          setEditingItemAmount(null);
          setNewAmountValue('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              تعديل المبلغ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newAmount">المبلغ الجديد</Label>
              <Input
                id="newAmount"
                type="number"
                step="0.01"
                value={newAmountValue}
                onChange={(e) => setNewAmountValue(e.target.value)}
                placeholder="0.00"
                className="text-xl font-mono h-14 text-center"
                autoFocus
              />
            </div>
            {editingItemAmount?.hasTax && (
              <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20">
                <Info className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                  سيتم تحديث مبلغ الضريبة تلقائياً (15%)
                  <br />
                  <span className="font-mono font-bold">
                    الضريبة الجديدة: {(parseFloat(newAmountValue || '0') * 0.15).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setEditingItemAmount(null);
              setNewAmountValue('');
            }}>
              إلغاء
            </Button>
            <Button 
              onClick={handleUpdateSavedItemAmount}
              disabled={!newAmountValue || parseFloat(newAmountValue) <= 0}
            >
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Date Dialog */}
      <Dialog open={!!editingDate} onOpenChange={(open) => {
        if (!open) {
          setEditingDate(null);
          setNewDateValue('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              تعديل تاريخ الطلب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newDate">التاريخ الجديد</Label>
              <Input
                id="newDate"
                type="date"
                value={newDateValue}
                onChange={(e) => setNewDateValue(e.target.value)}
                className="text-lg h-12"
                autoFocus
              />
            </div>
            {newDateValue && (
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <span className="text-muted-foreground">التاريخ المحدد: </span>
                <span className="font-bold text-primary">
                  {format(new Date(newDateValue), 'yyyy/MM/dd', { locale: ar })}
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setEditingDate(null);
              setNewDateValue('');
            }}>
              إلغاء
            </Button>
            <Button 
              onClick={handleUpdateRequestDate}
              disabled={!newDateValue}
            >
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteDialog />
    </div>
  );
};
 
 export default TransferRequests;