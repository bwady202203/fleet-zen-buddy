import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowRight, Search, Plus, Trash2, Save, Check, ChevronUp, ChevronDown, Hash, HelpCircle, Keyboard, ClipboardPaste, Table, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CustodyNavbar from "@/components/CustodyNavbar";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  level: number;
  type: string;
}

interface EntryLine {
  id: string;
  account_id: string;
  account_name: string;
  account_code: string;
  debit: number;
  credit: number;
  description: string;
  hasTax?: boolean;
  taxLineId?: string;
}

// VAT Purchases Account (ضريبة القيمة المضافة للمشتريات)
const VAT_ACCOUNT_CODE = "110801";
const VAT_RATE = 0.15; // 15% VAT

// Get background color based on account type
const getAccountTypeColor = (type: string, isSelected: boolean, isFocused: boolean): string => {
  if (isSelected) return "ring-2 ring-blue-500 bg-blue-100";
  if (isFocused) return "ring-2 ring-orange-500 bg-orange-100";
  
  // Color coding by account type
  if (type === 'expense') {
    return "bg-rose-50 hover:bg-rose-100 border-rose-200";
  }
  // Custody accounts (assets)
  return "bg-emerald-50 hover:bg-emerald-100 border-emerald-200";
};

// Account Card Component
function AccountCard({
  account,
  index,
  isSelected,
  isInEntry,
  isFocused,
  showNumbers,
  cardNumber,
  onSelect,
}: {
  account: Account;
  index: number;
  isSelected: boolean;
  isInEntry: boolean;
  isFocused: boolean;
  showNumbers: boolean;
  cardNumber: number;
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        "p-2 cursor-pointer transition-all hover:shadow-md text-center relative border",
        getAccountTypeColor(account.type, isSelected, isFocused),
        isInEntry && "border-b-2 border-b-green-500"
      )}
      onClick={onSelect}
    >
      {/* Card Number Badge */}
      {showNumbers && (
        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10">
          {cardNumber}
        </div>
      )}
      <div className="flex flex-col items-center gap-1">
        <div className="font-medium text-xs leading-tight line-clamp-2 text-gray-900">
          {account.name_ar}
        </div>
        <div className="text-xs text-gray-500">{account.code}</div>
      </div>
    </Card>
  );
}

export default function CustodySmartJournal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [entryLines, setEntryLines] = useState<EntryLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entryDescription, setEntryDescription] = useState("");
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [activeField, setActiveField] = useState<'debit' | 'credit' | 'description'>('debit');
  const [focusedAccountIndex, setFocusedAccountIndex] = useState<number>(-1);
  const [isAccountsPanelFocused, setIsAccountsPanelFocused] = useState(false);
  const [showCardNumbers, setShowCardNumbers] = useState(false);
  const [numberInputBuffer, setNumberInputBuffer] = useState("");
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  
  // Excel paste states
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteData, setPasteData] = useState("");
  const [parsedPasteData, setParsedPasteData] = useState<{debit: number; credit: number; description: string}[]>([]);
  
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const accountsPanelRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // Filter accounts by search
  const filteredAccounts = accounts.filter(account => {
    if (searchQuery === "") return true;
    return account.name_ar.includes(searchQuery) || 
           account.code.includes(searchQuery) ||
           account.name_en.toLowerCase().includes(searchQuery.toLowerCase());
  });

  useEffect(() => {
    fetchCustodyAccounts();
    fetchAllAccounts();
  }, []);

  // Handle scroll indicators
  const handleScroll = useCallback(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      setCanScrollUp(scrollTop > 10);
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 10);
    }
  }, []);

  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, filteredAccounts.length]);

  useEffect(() => {
    setTimeout(handleScroll, 100);
  }, [filteredAccounts.length, handleScroll]);

  // Track space key state
  useEffect(() => {
    const handleSpaceDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement).matches('input, textarea')) {
        setIsSpacePressed(true);
      }
    };
    const handleSpaceUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleSpaceDown);
    window.addEventListener('keyup', handleSpaceUp);
    return () => {
      window.removeEventListener('keydown', handleSpaceDown);
      window.removeEventListener('keyup', handleSpaceUp);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Space + Arrow keys for smooth scrolling
      if (isSpacePressed && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isInputField) {
        e.preventDefault();
        const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          const scrollAmount = 150;
          scrollElement.scrollBy({
            top: e.key === 'ArrowDown' ? scrollAmount : -scrollAmount,
            behavior: 'smooth'
          });
        }
        return;
      }

      // Arrow keys for accounts navigation
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isInputField) {
        e.preventDefault();
        
        if (!isAccountsPanelFocused) {
          setIsAccountsPanelFocused(true);
          if (focusedAccountIndex < 0) {
            setFocusedAccountIndex(0);
          }
        }
        
        if (filteredAccounts.length > 0) {
          if (e.key === 'ArrowDown') {
            setFocusedAccountIndex(prev => 
              prev + 4 < filteredAccounts.length ? prev + 4 : prev
            );
          }
          if (e.key === 'ArrowUp') {
            setFocusedAccountIndex(prev => 
              prev >= 4 ? prev - 4 : prev
            );
          }
          if (e.key === 'ArrowRight') {
            setFocusedAccountIndex(prev => 
              prev < filteredAccounts.length - 1 ? prev + 1 : prev
            );
          }
          if (e.key === 'ArrowLeft') {
            setFocusedAccountIndex(prev => 
              prev > 0 ? prev - 1 : prev
            );
          }
        }
        return;
      }

      // Handle Enter and Escape when accounts panel is focused
      if (isAccountsPanelFocused && filteredAccounts.length > 0) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (focusedAccountIndex >= 0 && focusedAccountIndex < filteredAccounts.length) {
            const account = filteredAccounts[focusedAccountIndex];
            handleAccountSelect(account);
            setIsAccountsPanelFocused(false);
          }
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsAccountsPanelFocused(false);
          setFocusedAccountIndex(-1);
        }
        return;
      }

      if (e.key === 'Escape' && activeRowIndex !== null) {
        const newLines = [...entryLines];
        newLines.splice(activeRowIndex, 1);
        setEntryLines(newLines);
        setActiveRowIndex(null);
        e.preventDefault();
      }

      // '+' key - Move to accounts panel
      if ((e.key === '+' || e.key === '=') && !isInputField) {
        e.preventDefault();
        setIsAccountsPanelFocused(true);
        setFocusedAccountIndex(0);
        accountsPanelRef.current?.focus();
      }

      // '#' key - Toggle number mode
      if (e.key === '#' && !isInputField) {
        e.preventDefault();
        setShowCardNumbers(prev => !prev);
        if (!showCardNumbers) {
          setIsAccountsPanelFocused(true);
          toast.info("وضع الأرقام: اضغط على رقم البطاقة للاختيار السريع");
        }
      }

      // Number keys for quick account selection when numbers mode is active
      if (showCardNumbers && !isInputField && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const newBuffer = numberInputBuffer + e.key;
        setNumberInputBuffer(newBuffer);
        
        setTimeout(() => {
          setNumberInputBuffer(prev => {
            if (prev === newBuffer) {
              const cardIndex = parseInt(newBuffer) - 1;
              if (cardIndex >= 0 && cardIndex < filteredAccounts.length) {
                const account = filteredAccounts[cardIndex];
                handleAccountSelect(account, true);
                toast.success(`تم إضافة حساب "${account.name_ar}" - اضغط # للخروج من وضع الأرقام`);
              }
              return "";
            }
            return prev;
          });
        }, 400);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRowIndex, entryLines, isAccountsPanelFocused, focusedAccountIndex, filteredAccounts, showCardNumbers, numberInputBuffer]);

  const fetchCustodyAccounts = async () => {
    try {
      // Find the custody parent account (العهد) by code 1111
      const { data: custodyParent, error: parentError } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("code", "1111")
        .maybeSingle();

      if (parentError) throw parentError;

      // Fetch custody sub-accounts
      let custodyAccounts: Account[] = [];
      if (custodyParent) {
        const { data, error } = await supabase
          .from("chart_of_accounts")
          .select("id, code, name_ar, name_en, level, type")
          .eq("parent_id", custodyParent.id)
          .eq("is_active", true)
          .order("code");

        if (error) throw error;
        custodyAccounts = data || [];
      }

      // Fetch all expense accounts (المصروفات)
      const { data: expenseAccounts, error: expenseError } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name_ar, name_en, level, type")
        .eq("type", "expense")
        .eq("is_active", true)
        .order("code");

      if (expenseError) throw expenseError;

      // Combine both arrays, custody accounts first then expense accounts
      const combinedAccounts = [...custodyAccounts, ...(expenseAccounts || [])];
      setAccounts(combinedAccounts);
    } catch (error: any) {
      toast.error("خطأ في تحميل الحسابات: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name_ar, name_en, level, type")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      setAllAccounts(data || []);
    } catch (error: any) {
      console.error("Error fetching all accounts:", error);
    }
  };

  const handleAccountSelect = (account: Account, skipFocus: boolean = false) => {
    setSelectedAccountId(account.id);
    
    const newLine: EntryLine = {
      id: crypto.randomUUID(),
      account_id: account.id,
      account_name: account.name_ar,
      account_code: account.code,
      debit: 0,
      credit: 0,
      description: ""
    };
    setEntryLines([...entryLines, newLine]);
    setActiveRowIndex(entryLines.length);
    setActiveField('debit');
    
    if (!skipFocus) {
      setTimeout(() => {
        const ref = inputRefs.current[`debit-${newLine.id}`];
        ref?.focus();
        ref?.select();
      }, 50);
    }
  };

  const handleLineChange = (lineId: string, field: 'debit' | 'credit' | 'description', value: string) => {
    setEntryLines(lines => lines.map(line => {
      if (line.id !== lineId) return line;
      
      if (field === 'debit') {
        const numValue = parseFloat(value) || 0;
        return { ...line, debit: numValue, credit: numValue > 0 ? 0 : line.credit };
      }
      if (field === 'credit') {
        const numValue = parseFloat(value) || 0;
        return { ...line, credit: numValue, debit: numValue > 0 ? 0 : line.debit };
      }
      return { ...line, [field]: value };
    }));
  };

  const handleKeyDownInField = (e: React.KeyboardEvent, lineId: string, field: 'debit' | 'credit' | 'description') => {
    const line = entryLines.find(l => l.id === lineId);
    const isTaxLine = lineId.startsWith('tax-');

    // '+' key in debit or credit field - go back to accounts panel
    if ((e.key === '+' || e.key === '=') && (field === 'debit' || field === 'credit')) {
      e.preventDefault();
      setIsAccountsPanelFocused(true);
      setFocusedAccountIndex(0);
      accountsPanelRef.current?.focus();
      return;
    }

    // Handle '*' key in credit field - calculate tax and move to description
    if (e.key === '*' && field === 'credit' && !isTaxLine && line && line.debit > 0) {
      e.preventDefault();
      if (!line.hasTax) {
        toggleLineTax(lineId);
      }
      setTimeout(() => {
        inputRefs.current[`description-${lineId}`]?.focus();
      }, 50);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (field === 'debit') {
        inputRefs.current[`credit-${lineId}`]?.focus();
      } else if (field === 'credit') {
        inputRefs.current[`description-${lineId}`]?.focus();
      } else if (field === 'description') {
        setIsAccountsPanelFocused(true);
        setFocusedAccountIndex(0);
        accountsPanelRef.current?.focus();
      }
    }
    
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      setIsAccountsPanelFocused(true);
      setFocusedAccountIndex(0);
      accountsPanelRef.current?.focus();
    }

    // Shift key in description field - show save confirmation dialog
    if (e.key === 'Shift' && field === 'description') {
      e.preventDefault();
      if (entryLines.length > 0) {
        setShowSaveConfirmDialog(true);
      }
    }
  };

  const removeLine = (lineId: string) => {
    const lineToRemove = entryLines.find(l => l.id === lineId);
    if (lineToRemove?.taxLineId) {
      setEntryLines(lines => lines.filter(line => line.id !== lineId && line.id !== lineToRemove.taxLineId));
    } else {
      setEntryLines(lines => lines.filter(line => line.id !== lineId).map(line => 
        line.taxLineId === lineId ? { ...line, taxLineId: undefined, hasTax: false } : line
      ));
    }
    if (activeRowIndex !== null && activeRowIndex >= entryLines.length - 1) {
      setActiveRowIndex(Math.max(0, entryLines.length - 2));
    }
  };

  // Duplicate a line
  const duplicateLine = (lineId: string) => {
    const lineToDuplicate = entryLines.find(l => l.id === lineId);
    if (!lineToDuplicate) return;
    
    if (lineToDuplicate.id.startsWith('tax-')) {
      toast.error("لا يمكن تكرار سطر الضريبة");
      return;
    }
    
    const lineIndex = entryLines.findIndex(l => l.id === lineId);
    const newLine: EntryLine = {
      ...lineToDuplicate,
      id: `line-${Date.now()}`,
      hasTax: false,
      taxLineId: undefined,
    };
    
    const insertAfterIndex = lineToDuplicate.taxLineId 
      ? entryLines.findIndex(l => l.id === lineToDuplicate.taxLineId) + 1
      : lineIndex + 1;
    
    const newLines = [...entryLines];
    newLines.splice(insertAfterIndex, 0, newLine);
    setEntryLines(newLines);
    
    toast.success("تم تكرار السطر");
  };

  // Toggle tax for a line
  const toggleLineTax = async (lineId: string) => {
    const line = entryLines.find(l => l.id === lineId);
    if (!line) return;

    if (line.hasTax && line.taxLineId) {
      setEntryLines(lines => 
        lines.filter(l => l.id !== line.taxLineId).map(l => 
          l.id === lineId ? { ...l, hasTax: false, taxLineId: undefined } : l
        )
      );
    } else {
      const vatAccount = allAccounts.find(a => a.code === VAT_ACCOUNT_CODE);
      if (!vatAccount) {
        toast.error("لم يتم العثور على حساب ضريبة المشتريات");
        return;
      }

      const baseAmount = line.debit || line.credit;
      const taxAmount = baseAmount * VAT_RATE;
      const taxLineId = `tax-${lineId}-${Date.now()}`;

      const taxLine: EntryLine = {
        id: taxLineId,
        account_id: vatAccount.id,
        account_name: vatAccount.name_ar,
        account_code: vatAccount.code,
        debit: line.debit > 0 ? taxAmount : 0,
        credit: line.credit > 0 ? taxAmount : 0,
        description: `ضريبة - ${line.account_name}`,
        hasTax: false,
      };

      setEntryLines(lines => {
        const lineIndex = lines.findIndex(l => l.id === lineId);
        const newLines = [...lines];
        newLines[lineIndex] = { ...line, hasTax: true, taxLineId };
        newLines.splice(lineIndex + 1, 0, taxLine);
        return newLines;
      });
    }
  };

  const calculateTotals = () => {
    const totalDebit = entryLines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = entryLines.reduce((sum, line) => sum + line.credit, 0);
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  };

  // Parse pasted Excel data
  const handleParsePasteData = (data: string) => {
    setPasteData(data);
    
    if (!data.trim()) {
      setParsedPasteData([]);
      return;
    }

    const lines = data.trim().split('\n');
    const parsed: {debit: number; credit: number; description: string}[] = [];
    
    for (const line of lines) {
      const columns = line.split(/\t|  +/).map(col => col.trim());
      
      if (columns.length >= 2) {
        let debit = 0;
        let credit = 0;
        let description = '';
        
        const firstNum = parseFloat(columns[0].replace(/,/g, ''));
        const secondNum = parseFloat(columns[1].replace(/,/g, ''));
        
        if (!isNaN(firstNum)) {
          debit = firstNum;
        }
        
        if (!isNaN(secondNum)) {
          credit = secondNum;
        }
        
        if (columns.length >= 3) {
          description = columns.slice(2).join(' ').trim();
        }
        
        if (isNaN(secondNum) && !isNaN(firstNum)) {
          debit = firstNum;
          credit = 0;
          description = columns.slice(1).join(' ').trim();
        }
        
        parsed.push({ debit, credit, description });
      } else if (columns.length === 1) {
        const num = parseFloat(columns[0].replace(/,/g, ''));
        if (!isNaN(num)) {
          parsed.push({ debit: num, credit: 0, description: '' });
        }
      }
    }
    
    setParsedPasteData(parsed);
  };

  // Apply pasted data to entry lines
  const handleApplyPasteData = () => {
    if (parsedPasteData.length === 0) {
      toast.error("لا توجد بيانات للصقها");
      return;
    }

    if (entryLines.length === 0) {
      toast.error("يجب إضافة حسابات أولاً قبل لصق البيانات");
      return;
    }

    const updatedLines = [...entryLines];
    const nonTaxLines = updatedLines.filter(l => !l.id.startsWith('tax-'));
    
    parsedPasteData.forEach((pasteRow, index) => {
      if (index < nonTaxLines.length) {
        const lineIndex = updatedLines.findIndex(l => l.id === nonTaxLines[index].id);
        if (lineIndex !== -1) {
          updatedLines[lineIndex] = {
            ...updatedLines[lineIndex],
            debit: pasteRow.debit || updatedLines[lineIndex].debit,
            credit: pasteRow.credit || updatedLines[lineIndex].credit,
            description: pasteRow.description || updatedLines[lineIndex].description,
          };
        }
      }
    });

    setEntryLines(updatedLines);
    setShowPasteDialog(false);
    setPasteData("");
    setParsedPasteData([]);
    toast.success(`تم لصق البيانات على ${Math.min(parsedPasteData.length, nonTaxLines.length)} أسطر`);
  };

  const handleSaveEntry = async () => {
    const { totalDebit, totalCredit, isBalanced } = calculateTotals();
    
    if (entryLines.length === 0) {
      toast.error("يجب إضافة سطر واحد على الأقل");
      return;
    }

    if (!isBalanced) {
      toast.error(`القيد غير متوازن! المدين: ${totalDebit.toLocaleString()} - الدائن: ${totalCredit.toLocaleString()}`);
      return;
    }

    try {
      // Generate entry number
      const year = new Date().getFullYear();
      const { data: lastEntry } = await supabase
        .from("journal_entries")
        .select("entry_number")
        .like("entry_number", `JE-${year}%`)
        .order("entry_number", { ascending: false })
        .limit(1);

      let entryNumber = `JE-${year}000001`;
      if (lastEntry && lastEntry.length > 0) {
        const lastNumber = parseInt(lastEntry[0].entry_number.slice(-6));
        entryNumber = `JE-${year}${String(lastNumber + 1).padStart(6, "0")}`;
      }

      // Generate universal serial for custody smart journal
      const { data: serialData } = await supabase.rpc('generate_universal_serial', { prefix: 'CS' });
      const universalSerial = serialData as string;

      // Create journal entry with custody reference
      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          date: entryDate,
          description: entryDescription || "قيد عهدة ذكي",
          reference: `custody_smart_${Date.now()}`,
          created_by: user?.id,
          universal_serial: universalSerial
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal entry lines
      const lines = entryLines.map(line => ({
        journal_entry_id: journalEntry.id,
        account_id: line.account_id,
        debit: line.debit,
        credit: line.credit,
        description: line.description || entryDescription || "قيد عهدة ذكي"
      }));

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lines);

      if (linesError) throw linesError;

      toast.success(`تم حفظ القيد رقم ${entryNumber} بنجاح`);
      
      // Reset form
      setEntryLines([]);
      setSelectedAccountId(null);
      setActiveRowIndex(null);
      setEntryDescription("");
    } catch (error: any) {
      toast.error("خطأ في حفظ القيد: " + error.message);
    }
  };

  const { totalDebit, totalCredit, isBalanced } = calculateTotals();

  const handleSaveConfirm = () => {
    setShowSaveConfirmDialog(false);
    handleSaveEntry();
  };

  return (
    <>
      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveConfirmDialog} onOpenChange={setShowSaveConfirmDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حفظ القيد</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد حفظ هذا القيد؟
              {!isBalanced && (
                <span className="block mt-2 text-red-500 font-medium">
                  تحذير: القيد غير متوازن! الفرق: {Math.abs(totalDebit - totalCredit).toLocaleString()}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction 
              onClick={handleSaveConfirm}
              disabled={!isBalanced}
              className="bg-blue-500 hover:bg-blue-600"
            >
              نعم، احفظ
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Paste from Excel Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={(open) => {
        setShowPasteDialog(open);
        if (!open) {
          setPasteData("");
          setParsedPasteData([]);
        }
      }}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardPaste className="h-5 w-5" />
              لصق من Excel
            </DialogTitle>
            <DialogDescription>
              انسخ البيانات من Excel (مدين، دائن، وصف) والصقها هنا. سيتم تطبيقها على أسطر القيد الموجودة بالترتيب.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
            <div className="space-y-2">
              <label className="text-sm font-medium">الصق البيانات هنا:</label>
              <textarea
                className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="انسخ من Excel والصق هنا..."
                value={pasteData}
                onChange={(e) => handleParsePasteData(e.target.value)}
                autoFocus
                dir="ltr"
              />
            </div>
            
            {parsedPasteData.length > 0 && (
              <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  معاينة البيانات ({parsedPasteData.length} صف)
                </label>
                <div className="border rounded-lg overflow-auto flex-1 max-h-48">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-right border-b w-8">#</th>
                        <th className="p-2 text-right border-b">الحساب</th>
                        <th className="p-2 text-left border-b w-28">مدين</th>
                        <th className="p-2 text-left border-b w-28">دائن</th>
                        <th className="p-2 text-right border-b">الوصف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPasteData.map((row, index) => {
                        const targetLine = entryLines.filter(l => !l.id.startsWith('tax-'))[index];
                        return (
                          <tr key={index} className={cn("border-b", !targetLine && "bg-red-50 text-red-600")}>
                            <td className="p-2 text-gray-500">{index + 1}</td>
                            <td className="p-2">
                              {targetLine ? (
                                <span className="text-gray-900">{targetLine.account_name}</span>
                              ) : (
                                <span className="text-red-500 text-xs">لا يوجد حساب</span>
                              )}
                            </td>
                            <td className="p-2 text-left font-mono">
                              {row.debit > 0 && <span className="text-green-600">{row.debit.toLocaleString()}</span>}
                            </td>
                            <td className="p-2 text-left font-mono">
                              {row.credit > 0 && <span className="text-red-600">{row.credit.toLocaleString()}</span>}
                            </td>
                            <td className="p-2 text-gray-600 truncate max-w-[200px]">{row.description}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              onClick={handleApplyPasteData}
              disabled={parsedPasteData.length === 0}
              className="gap-2 bg-blue-500 hover:bg-blue-600"
            >
              <Check className="h-4 w-4" />
              تطبيق البيانات
            </Button>
            <Button variant="outline" onClick={() => {
              setShowPasteDialog(false);
              setPasteData("");
              setParsedPasteData([]);
            }}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/custody')} className="gap-2">
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">قيود ذكية - العهد</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Help Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Keyboard className="h-4 w-4" />
                    اختصارات لوحة المفاتيح
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="p-3 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>التنقل بين الحسابات</span>
                      <span className="text-gray-500">الأسهم</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>اختيار الحساب</span>
                      <kbd className="px-2 py-0.5 bg-white rounded border text-xs font-mono">Enter</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>الحقل التالي</span>
                      <kbd className="px-2 py-0.5 bg-white rounded border text-xs font-mono">Enter</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>سطر جديد</span>
                      <kbd className="px-2 py-0.5 bg-white rounded border text-xs font-mono">Shift+Enter</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>احتساب الضريبة</span>
                      <kbd className="px-2 py-0.5 bg-white rounded border text-xs font-mono">*</kbd>
                      <span className="text-gray-500 text-xs">(في حقل الدائن)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>وضع الأرقام</span>
                      <kbd className="px-2 py-0.5 bg-white rounded border text-xs font-mono">#</kbd>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Excel Paste Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setShowPasteDialog(true)}
              >
                <ClipboardPaste className="h-4 w-4" />
                لصق من Excel
              </Button>

              {/* Date */}
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-40"
              />

              {/* Save Button */}
              <Button 
                className="gap-2 bg-blue-500 hover:bg-blue-600"
                onClick={() => setShowSaveConfirmDialog(true)}
                disabled={entryLines.length === 0 || !isBalanced}
              >
                <Save className="h-4 w-4" />
                حفظ القيد
              </Button>
            </div>
          </div>
        </div>

        <CustodyNavbar />

        {/* Main Content */}
        <div className="h-[calc(100vh-140px)]">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Right Panel - Custody Accounts */}
            <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
              <div className="h-full bg-gray-100 p-4 flex flex-col">
                {/* Search and Controls */}
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant={showCardNumbers ? "default" : "outline"}
                    size="icon"
                    onClick={() => setShowCardNumbers(prev => !prev)}
                    title="وضع الأرقام (#)"
                    className={cn(showCardNumbers && "bg-blue-600 hover:bg-blue-700")}
                  >
                    <Hash className="h-4 w-4" />
                  </Button>
                  
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="بحث بالاسم أو الرقم..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10 bg-white"
                    />
                  </div>
                </div>

                {/* Mode Hint */}
                <div className="text-xs mb-2 text-center py-1 rounded text-gray-500">
                  اضغط على الحساب لإضافته للقيد
                </div>

                {/* Accounts List with Scroll Indicators */}
                <div className="relative flex-1">
                  {canScrollUp && (
                    <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pointer-events-none">
                      <div className="bg-gradient-to-b from-white via-white/90 to-transparent w-full py-2 flex justify-center animate-fade-in">
                        <ChevronUp className="h-5 w-5 text-blue-500 animate-bounce" />
                      </div>
                    </div>
                  )}
                  
                  <ScrollArea className="h-full" ref={scrollAreaRef}>
                    <div
                      ref={accountsPanelRef}
                      tabIndex={0}
                      className={cn(
                        "outline-none rounded-lg p-1",
                        isAccountsPanelFocused && "ring-2 ring-blue-500"
                      )}
                      onFocus={() => {
                        setIsAccountsPanelFocused(true);
                        if (focusedAccountIndex < 0) setFocusedAccountIndex(0);
                      }}
                      onBlur={() => {
                        setIsAccountsPanelFocused(false);
                      }}
                    >
                      {loading ? (
                        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
                      ) : filteredAccounts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">لا توجد حسابات عهد</div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {filteredAccounts.map((account, index) => (
                            <AccountCard
                              key={account.id}
                              account={account}
                              index={index}
                              isSelected={selectedAccountId === account.id}
                              isInEntry={entryLines.some(l => l.account_id === account.id)}
                              isFocused={isAccountsPanelFocused && focusedAccountIndex === index}
                              showNumbers={showCardNumbers}
                              cardNumber={index + 1}
                              onSelect={() => handleAccountSelect(account)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  {canScrollDown && (
                    <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center pointer-events-none">
                      <div className="bg-gradient-to-t from-white via-white/90 to-transparent w-full py-2 flex justify-center animate-fade-in">
                        <ChevronDown className="h-5 w-5 text-blue-500 animate-bounce" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle withHandle className="bg-gray-200 hover:bg-blue-400 transition-colors" />

            {/* Left Panel - Entry Lines */}
            <ResizablePanel defaultSize={60} minSize={40} maxSize={75}>
              <div className="h-full bg-white p-6 flex flex-col">
                {/* Entry Description */}
                <div className="mb-4">
                  <Input
                    placeholder="وصف القيد..."
                    value={entryDescription}
                    onChange={(e) => setEntryDescription(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Entry Lines Table */}
                <div className="flex-1 overflow-auto">
                  {entryLines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Plus className="h-12 w-12 mb-4" />
                      <p className="text-lg">اختر حساب من القائمة لبدء القيد</p>
                      <p className="text-sm mt-2">Enter: الحقل التالي | Shift+Enter: سطر جديد</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-right p-3 font-medium text-gray-600 w-8">#</th>
                          <th className="text-right p-3 font-medium text-gray-600">الحساب</th>
                          <th className="text-right p-3 font-medium text-gray-600 w-32">مدين</th>
                          <th className="text-right p-3 font-medium text-gray-600 w-32">دائن</th>
                          <th className="text-right p-3 font-medium text-gray-600 w-20">ضريبة</th>
                          <th className="text-right p-3 font-medium text-gray-600">الوصف</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {entryLines.map((line, index) => {
                          const isTaxLine = line.id.startsWith('tax-');
                          return (
                            <tr
                              key={line.id}
                              className={cn(
                                "border-b transition-colors",
                                activeRowIndex === index ? "bg-blue-50" : "hover:bg-gray-50",
                                isTaxLine && "bg-amber-50/50"
                              )}
                              onClick={() => setActiveRowIndex(index)}
                            >
                              <td className="p-3 text-gray-500">{index + 1}</td>
                              <td className="p-3">
                                <div className={cn("font-medium", isTaxLine && "text-amber-700")}>
                                  {isTaxLine && "↳ "}{line.account_name}
                                </div>
                                <div className="text-sm text-gray-500">{line.account_code}</div>
                              </td>
                              <td className="p-3">
                                <Input
                                  ref={(el) => inputRefs.current[`debit-${line.id}`] = el}
                                  type="number"
                                  value={line.debit || ""}
                                  onChange={(e) => handleLineChange(line.id, 'debit', e.target.value)}
                                  onKeyDown={(e) => handleKeyDownInField(e, line.id, 'debit')}
                                  onFocus={() => {
                                    setActiveRowIndex(index);
                                    setActiveField('debit');
                                  }}
                                  className={cn(
                                    "text-left",
                                    line.debit > 0 && "bg-green-50 border-green-300"
                                  )}
                                  placeholder="0"
                                  disabled={isTaxLine}
                                />
                              </td>
                              <td className="p-3">
                                <Input
                                  ref={(el) => inputRefs.current[`credit-${line.id}`] = el}
                                  type="number"
                                  value={line.credit || ""}
                                  onChange={(e) => handleLineChange(line.id, 'credit', e.target.value)}
                                  onKeyDown={(e) => handleKeyDownInField(e, line.id, 'credit')}
                                  onFocus={() => {
                                    setActiveRowIndex(index);
                                    setActiveField('credit');
                                  }}
                                  className={cn(
                                    "text-left",
                                    line.credit > 0 && "bg-red-50 border-red-300"
                                  )}
                                  placeholder="0"
                                  disabled={isTaxLine}
                                />
                              </td>
                              <td className="p-3 text-center">
                                {!isTaxLine && (line.debit > 0 || line.credit > 0) && (
                                  <Button
                                    variant={line.hasTax ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                      "h-7 text-xs px-2",
                                      line.hasTax 
                                        ? "bg-amber-500 hover:bg-amber-600 text-white" 
                                        : "text-gray-500 hover:text-amber-600"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleLineTax(line.id);
                                    }}
                                  >
                                    {line.hasTax ? "✓ ضريبة" : "بدون"}
                                  </Button>
                                )}
                              </td>
                              <td className="p-3">
                                <Input
                                  ref={(el) => inputRefs.current[`description-${line.id}`] = el}
                                  value={line.description}
                                  onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                                  onKeyDown={(e) => handleKeyDownInField(e, line.id, 'description')}
                                  onFocus={() => {
                                    setActiveRowIndex(index);
                                    setActiveField('description');
                                  }}
                                  placeholder="وصف..."
                                  disabled={isTaxLine}
                                />
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  {!isTaxLine && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                      onClick={() => duplicateLine(line.id)}
                                      title="تكرار السطر"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => removeLine(line.id)}
                                    title="حذف السطر"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {/* Balance Summary Row */}
                        <tr className="bg-gray-100/50">
                          <td colSpan={2} className="p-3 text-left">
                            <span className={cn(
                              "text-sm font-medium",
                              isBalanced ? "text-green-600" : "text-red-500"
                            )}>
                              {isBalanced ? "✓ متوازن" : "✗ غير متوازن"}
                            </span>
                          </td>
                          <td className="p-3 text-left">
                            <span className="text-sm text-gray-400">{totalDebit.toLocaleString()}</span>
                          </td>
                          <td className="p-3 text-left">
                            <span className="text-sm text-gray-400">{totalCredit.toLocaleString()}</span>
                          </td>
                          <td className="p-3"></td>
                          <td className="p-3 text-left">
                            {!isBalanced && (
                              <span className="text-sm text-gray-400">
                                الفرق: {Math.abs(totalDebit - totalCredit).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Totals Footer */}
                {entryLines.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-8">
                        <div>
                          <span className="text-gray-500">مجموع المدين:</span>
                          <span className="font-bold text-lg mr-2 text-green-600">
                            {totalDebit.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">مجموع الدائن:</span>
                          <span className="font-bold text-lg mr-2 text-red-600">
                            {totalCredit.toLocaleString()}
                          </span>
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-sm font-medium",
                          isBalanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {isBalanced ? "✓ متوازن" : `✗ فرق: ${Math.abs(totalDebit - totalCredit).toLocaleString()}`}
                        </div>
                      </div>
                      <Button
                        className="gap-2 bg-blue-500 hover:bg-blue-600"
                        onClick={() => setShowSaveConfirmDialog(true)}
                        disabled={!isBalanced}
                      >
                        <Save className="h-4 w-4" />
                        حفظ القيد
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </>
  );
}
