import React, { useState, useEffect, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounting, JournalEntryLine } from "@/contexts/AccountingContext";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, Plus, Printer, Eye, Filter, ClipboardPaste, Save, X, Pencil, FileDown, ChevronDown, ChevronUp, Trash2, BookOpen, RefreshCw, Wrench } from "lucide-react";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useDeleteConfirmation } from "@/components/DeleteConfirmationDialog";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  type: string;
  parent_id: string | null;
  is_active: boolean;
  level?: number;
}

interface CostCenter {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface Project {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}


const JournalEntries = () => {
  const { 
    journalEntries, 
    addJournalEntry, 
    getNextEntryNumber
  } = useAccounting();
  const { toast } = useToast();
  const { requestDelete, DeleteDialog } = useDeleteConfirmation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const entryIdFromUrl = searchParams.get('id');
  const isNewEntryPage = location.pathname === '/accounting/journal-entries/new';
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [displayedEntries, setDisplayedEntries] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [openingEntryDialogOpen, setOpeningEntryDialogOpen] = useState(false);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const [openingEntryData, setOpeningEntryData] = useState<{
    entryNumber: string;
    date: string;
    description: string;
    lines: JournalEntryLine[];
  }>({
    entryNumber: "",
    date: new Date().toISOString().split('T')[0],
    description: "قيد افتتاحي - الأرصدة الافتتاحية",
    lines: [],
  });
  
  const [inlineDateEditId, setInlineDateEditId] = useState<string | null>(null);
  const [inlineDateValue, setInlineDateValue] = useState<string>("");
  const [isSavingInlineDate, setIsSavingInlineDate] = useState(false);

  const handleInlineDateSave = async (entryId: string) => {
    if (!inlineDateValue) return;
    setIsSavingInlineDate(true);
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({ date: inlineDateValue })
        .eq('id', entryId);
      if (error) throw error;
      toast({ title: "تم تحديث التاريخ بنجاح" });
      setInlineDateEditId(null);
      fetchJournalEntries();
    } catch (error) {
      console.error('Error updating date:', error);
      toast({ title: "خطأ", description: "فشل في تحديث التاريخ", variant: "destructive" });
    } finally {
      setIsSavingInlineDate(false);
    }
  };

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  const createInitialEmptyLines = () => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `line-${Date.now()}-${i}`,
      accountId: "",
      accountCode: "",
      accountName: "",
      description: "",
      debit: 0,
      credit: 0,
      debitText: "",
      creditText: "",
      costCenter: "",
      projectName: "",
    }));
  };

  
  useEffect(() => {
    fetchAccounts();
    fetchCostCenters();
    fetchProjects();
    fetchBranches();
    fetchJournalEntries();
    
    // Realtime subscription for journal entries
    const channel = supabase
      .channel('journal_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journal_entries'
        },
        () => {
          console.log('Journal entry changed, refreshing...');
          fetchJournalEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Open entry details when id is provided in URL
  useEffect(() => {
    if (entryIdFromUrl && displayedEntries.length > 0) {
      const entry = displayedEntries.find(e => e.id === entryIdFromUrl);
      if (entry) {
        // Use same logic as handleViewDetails to properly set up the dialog
        setSelectedEntry(entry);
        setEditingEntry({
          id: entry.id,
          entryNumber: entry.entryNumber,
          date: entry.date,
          description: entry.description,
          organizationId: entry.organizationId,
          organizationName: entry.organizationName,
          lines: entry.lines.map((line: any) => ({
            id: line.id,
            accountId: line.accountId,
            accountCode: line.accountCode,
            accountName: line.accountName,
            description: line.description,
            debit: line.debit,
            credit: line.credit,
            costCenterId: line.costCenterId,
            costCenterName: line.costCenterName,
            projectId: line.projectId,
            projectName: line.projectName,
            branchId: line.branchId,
            branchName: line.branchName,
          })),
        });
        setDetailDialogOpen(true);
        // Clear the id from URL after opening
        setSearchParams({});
      }
    }
  }, [entryIdFromUrl, displayedEntries, setSearchParams]);

  // Initialize opening entry lines after mount
  useEffect(() => {
    if (openingEntryData.lines.length === 0) {
      const initialLines = Array.from({ length: 6 }, (_, i) => ({
        id: `line-${Date.now()}-${i}`,
        accountId: "",
        accountCode: "",
        accountName: "",
        description: "",
        debit: 0,
        credit: 0,
        debitText: "",
        creditText: "",
        costCenter: "",
        projectName: "",
      }));
      setOpeningEntryData(prev => ({
        ...prev,
        lines: initialLines as JournalEntryLine[],
      }));
    }
  }, [openingEntryData.lines.length]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      
      console.log('📊 جميع الحسابات المجلوبة:', data?.length);
      console.log('📊 حسابات المستوى 4:', data?.filter(acc => acc.level === 4).length);
      console.log('📊 حسابات تحت العملاء (1112):', data?.filter(acc => acc.code?.startsWith('1112') && acc.level === 4));
      
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الحسابات",
        variant: "destructive",
      });
    }
  };

  const fetchCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      setCostCenters(data || []);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    }
  };

  const fetchJournalEntries = async () => {
    try {
      const { data: entries, error: entriesError } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_of_accounts (code, name_ar),
            cost_centers (code, name_ar),
            projects (code, name_ar),
            branches (code, name_ar)
          )
        `)
        .order('created_at', { ascending: false })
        .order('entry_number', { ascending: false })
        .limit(5000);

      if (entriesError) throw entriesError;

      const formattedEntries = entries?.map(entry => ({
        id: entry.id,
        entryNumber: entry.entry_number,
        universalSerial: entry.universal_serial,
        date: entry.date,
        description: entry.description,
        lines: entry.journal_entry_lines.map((line: any) => ({
          id: line.id,
          accountId: line.account_id,
          accountCode: line.chart_of_accounts.code,
          accountName: line.chart_of_accounts.name_ar,
          costCenterId: line.cost_center_id,
          costCenterCode: line.cost_centers?.code,
          costCenterName: line.cost_centers?.name_ar,
          projectId: line.project_id,
          projectCode: line.projects?.code,
          projectName: line.projects?.name_ar,
          branchId: line.branch_id,
          branchCode: line.branches?.code,
          branchName: line.branches?.name_ar,
          description: line.description,
          debit: Number(line.debit),
          credit: Number(line.credit),
        })),
        totalDebit: entry.journal_entry_lines.reduce((sum: number, line: any) => sum + Number(line.debit), 0),
        totalCredit: entry.journal_entry_lines.reduce((sum: number, line: any) => sum + Number(line.credit), 0),
      })) || [];

      setDisplayedEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const calculateLevel = (account: Account): number => {
    if (!account.parent_id) return 1;
    const parent = accounts.find(a => a.id === account.parent_id);
    if (!parent) return 1;
    return calculateLevel(parent) + 1;
  };
  
  const [formData, setFormData] = useState({
    entryNumber: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
    lines: createInitialEmptyLines() as JournalEntryLine[],
  });

  useEffect(() => {
    if (isNewEntryPage) {
      generateNextEntryNumber();
    }
  }, [isNewEntryPage, formData.date]);

  const generateNextEntryNumber = async () => {
    try {
      // استخدام سنة تاريخ القيد المختار وليس السنة الحالية
      const entryYear = formData.date ? new Date(formData.date).getFullYear() : new Date().getFullYear();
      
      // البحث عن أعلى رقم قيد لسنة القيد المحدد
      const { data, error } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .like('entry_number', `JE-${entryYear}%`)
        .order('entry_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      
      if (data && data.length > 0) {
        const lastEntry = data[0].entry_number;
        // استخراج الرقم التسلسلي من نهاية رقم القيد بعد السنة
        // مثال: JE-2025000007 -> نستخرج 7
        const match = lastEntry.match(/JE-\d{4}(\d{6})$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const newEntryNumber = `JE-${entryYear}${nextNumber.toString().padStart(6, '0')}`;
      setFormData(prev => ({ ...prev, entryNumber: newEntryNumber }));
    } catch (error) {
      console.error('Error generating entry number:', error);
      const entryYear = formData.date ? new Date(formData.date).getFullYear() : new Date().getFullYear();
      const fallbackNumber = `JE-${entryYear}${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, entryNumber: fallbackNumber }));
    }
  };

  const [searchStates, setSearchStates] = useState<{
    [key: string]: {
      accountSearch: string;
      showAccountSearch: boolean;
      costCenterSearch: string;
      showCostCenterSearch: boolean;
      projectSearch: string;
      showProjectSearch: boolean;
      branchSearch: string;
      showBranchSearch: boolean;
      selectedAccountIndex: number;
      selectedCostCenterIndex: number;
      selectedProjectIndex: number;
    };
  }>({});

  const getSearchState = (lineId: string) => {
    return searchStates[lineId] || {
      accountSearch: "",
      showAccountSearch: false,
      costCenterSearch: "",
      showCostCenterSearch: false,
      projectSearch: "",
      showProjectSearch: false,
      branchSearch: "",
      showBranchSearch: false,
      selectedAccountIndex: -1,
      selectedCostCenterIndex: -1,
      selectedProjectIndex: -1,
    };
  };

  const updateSearchState = (lineId: string, updates: Partial<typeof searchStates[string]>) => {
    setSearchStates(prev => ({
      ...prev,
      [lineId]: {
        ...getSearchState(lineId),
        ...updates,
      },
    }));
  };

  const updateLine = (lineId: string, updates: Partial<JournalEntryLine>) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map(line => 
        line.id === lineId ? { ...line, ...updates } : line
      ),
    }));
  };

  // دالة لتحويل الأرقام العربية إلى إنجليزية
  const convertArabicToEnglishNumbers = (str: string): string => {
    if (!str) return str;
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    let result = str;
    for (let i = 0; i < arabicNumbers.length; i++) {
      result = result.replace(new RegExp(arabicNumbers[i], 'g'), englishNumbers[i]);
    }
    return result;
  };

  // دالة للتحقق من وجود رقم الحساب
  const validateAccountCode = (accountCode: string): boolean => {
    if (!accountCode) return true; // فارغ مقبول
    const normalizedCode = convertArabicToEnglishNumbers(accountCode.trim());
    return accounts.some(acc => acc.code === normalizedCode);
  };

  const handlePasteFromExcel = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split('\n').filter(row => row.trim());
      
      if (rows.length === 0) {
        toast({
          title: "تنبيه / Warning",
          description: "لا توجد بيانات للصق / No data to paste",
          variant: "destructive",
        });
        return;
      }

      const newLines: JournalEntryLine[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].split('\t');
        if (cells.length < 2) continue;

        // البحث عن الحساب بالكود (مع دعم الأرقام العربية)
        const accountCode = convertArabicToEnglishNumbers(cells[0]?.trim() || "");
        const account = accounts.find(acc => acc.code === accountCode);
        
        // تحويل الأرقام العربية في المدين والدائن
        const debitStr = convertArabicToEnglishNumbers(cells[2]?.trim() || "0");
        const creditStr = convertArabicToEnglishNumbers(cells[3]?.trim() || "0");
        
        newLines.push({
          id: `line-${Date.now()}-${i}`,
          accountId: account?.id || "",
          accountCode: account?.code || accountCode,
          accountName: account?.name_ar || "",
          description: cells[1]?.trim() || "",
          debit: parseFloat(debitStr) || 0,
          credit: parseFloat(creditStr) || 0,
          costCenter: cells[4]?.trim() || "",
          projectName: cells[5]?.trim() || "",
        });
      }

      if (newLines.length > 0) {
        setFormData(prev => ({
          ...prev,
          lines: newLines,
        }));
        
        toast({
          title: "تم اللصق بنجاح / Pasted Successfully",
          description: `تم لصق ${newLines.length} سطر / ${newLines.length} rows pasted`,
        });
      }
    } catch (error) {
      console.error('Paste error:', error);
      toast({
        title: "خطأ / Error",
        description: "فشل اللصق من الحافظة / Failed to paste from clipboard",
        variant: "destructive",
      });
    }
  };

  const addEmptyLine = () => {
    const newLine: JournalEntryLine = {
      id: `line-${Date.now()}`,
      accountId: "",
      accountCode: "",
      accountName: "",
      description: "",
      debit: 0,
      credit: 0,
      debitText: "",
      creditText: "",
      costCenter: "",
      projectName: "",
    };
    
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, newLine],
    }));
  };

  const deleteLine = (lineId: string) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter(line => line.id !== lineId),
    }));
  };

  const totalDebit = formData.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = formData.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = async () => {
    // منع الحفظ المتعدد
    if (isSaving) {
      console.log('جاري الحفظ بالفعل، تجاهل المحاولة الجديدة');
      return;
    }

    console.log('📝 جميع السطور قبل الفلترة:', formData.lines);
    
    // Filter out empty lines
    const validLines = formData.lines.filter(line => {
      const hasAccount = !!line.accountId;
      const hasAmount = (line.debit > 0 || line.credit > 0);
      console.log('فحص السطر:', { 
        accountId: line.accountId, 
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: line.debit, 
        credit: line.credit,
        hasAccount,
        hasAmount,
        isValid: hasAccount && hasAmount
      });
      return hasAccount && hasAmount;
    });

    console.log('✅ السطور الصالحة بعد الفلترة:', validLines.length);

    if (validLines.length === 0) {
      toast({
        title: "تنبيه / Warning",
        description: "يجب إضافة سطر واحد على الأقل مع تعبئة الحساب والمبلغ / Must add at least one line with account and amount",
        variant: "destructive",
      });
      return;
    }

    const validTotalDebit = validLines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const validTotalCredit = validLines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (validTotalDebit !== validTotalCredit) {
      toast({
        title: "خطأ",
        description: "القيد غير متوازن. يجب أن يكون مجموع المدين مساوياً لمجموع الدائن",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('بدء حفظ القيد...', { validLines: validLines.length });

      // استخدام database function لتوليد رقم فريد والحفظ بشكل آمن
      const { data: journalEntry, error: entryError } = await supabase
        .rpc('create_journal_entry_with_number', {
          p_date: formData.date,
          p_description: formData.description
        })
        .single();

      if (entryError) {
        console.error('❌ خطأ في حفظ القيد:', entryError);
        throw entryError;
      }

      if (!journalEntry) {
        throw new Error('فشل في إنشاء القيد');
      }

      console.log('✅ تم حفظ القيد بنجاح:', journalEntry);

      // حفظ سطور القيد
      const lines = validLines.map(line => ({
        journal_entry_id: journalEntry.id,
        account_id: line.accountId,
        description: line.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
        cost_center_id: line.costCenterId || null,
        project_id: line.projectId || null,
        branch_id: selectedBranch || null,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        console.error('❌ خطأ في حفظ السطور، جاري حذف القيد:', linesError);
        // حذف القيد في حالة فشل حفظ السطور
        await supabase
          .from('journal_entries')
          .delete()
          .eq('id', journalEntry.id);
        throw linesError;
      }

      console.log('✅ تم حفظ جميع السطور بنجاح');


      toast({
        title: "تم الحفظ بنجاح / Saved Successfully",
        description: `تم حفظ القيد رقم ${journalEntry.entry_number} / Entry #${journalEntry.entry_number} saved`,
      });

      // التنقل أولاً ثم إعادة التعيين
      navigate('/accounting/journal-entries');
      setTimeout(() => {
        resetForm();
      }, 100);
    } catch (error: any) {
      console.error('❌ خطأ نهائي في حفظ القيد:', error);
      toast({
        title: "خطأ / Error",
        description: error?.message || "فشل في حفظ القيد / Failed to save entry",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const createEmptyLines = () => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `line-${Date.now()}-${i}`,
      accountId: "",
      accountCode: "",
      accountName: "",
      description: "",
      debit: 0,
      credit: 0,
      costCenter: "",
      projectName: "",
    }));
  };

  const resetForm = () => {
    setFormData({
      entryNumber: "",
      date: new Date().toISOString().split('T')[0],
      description: "",
      lines: createEmptyLines(),
    });
    setSearchStates({});
  };

  const handlePrintEntry = (entry: any) => {
    setSelectedEntry(entry);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePreview = (entry: any) => {
    setSelectedEntry(entry);
    setPreviewDialogOpen(true);
  };


  const handleDelete = (entryId: string) => {
    requestDelete(
      async () => {
        try {
          const { error } = await supabase
            .from('journal_entries')
            .delete()
            .eq('id', entryId);

          if (error) throw error;

          toast({
            title: "تم الحذف بنجاح / Deleted Successfully",
            description: "تم حذف القيد بنجاح / Entry deleted successfully",
          });

          fetchJournalEntries();
        } catch (error) {
          console.error('Error deleting entry:', error);
          toast({
            title: "خطأ / Error",
            description: "فشل في حذف القيد / Failed to delete entry",
            variant: "destructive",
          });
        }
      },
      {
        title: "حذف قيد اليومية",
        description: "هل أنت متأكد من حذف هذا القيد؟ سيتم حذف جميع البيانات المرتبطة به.",
      }
    );
  };

  const filteredEntries = displayedEntries.filter(entry => {
    if (filterDate && entry.date !== filterDate) return false;
    if (filterAccount && !entry.lines.some((line: any) => 
      line.accountCode.includes(filterAccount) || line.accountName.includes(filterAccount)
    )) return false;
    return true;
  });

  const toggleEntryExpand = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const expandAllEntries = () => {
    const allEntryIds = new Set(filteredEntries.map(entry => entry.id));
    setExpandedEntries(allEntryIds);
  };

  const collapseAllEntries = () => {
    setExpandedEntries(new Set());
  };

  const toggleAllEntries = () => {
    if (expandedEntries.size === filteredEntries.length) {
      collapseAllEntries();
    } else {
      expandAllEntries();
    }
  };

  const handleViewDetails = (entry: any) => {
    setSelectedEntry(entry);
    setEditingEntry({
      id: entry.id,
      entryNumber: entry.entryNumber,
      date: entry.date,
      description: entry.description,
      organizationId: entry.organizationId,
      organizationName: entry.organizationName,
      lines: entry.lines.map((line: any) => ({
        id: line.id,
        accountId: line.accountId,
        accountCode: line.accountCode,
        accountName: line.accountName,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        costCenterId: line.costCenterId,
        costCenterName: line.costCenterName,
        projectId: line.projectId,
        projectName: line.projectName,
        branchId: line.branchId,
        branchName: line.branchName,
      })),
    });
    setDetailDialogOpen(true);
  };

  const handleEdit = (entry: any) => {
    setFormData({
      entryNumber: entry.entryNumber,
      date: entry.date,
      description: entry.description,
      lines: entry.lines.map((line: any) => ({
        id: `line-${Date.now()}-${Math.random()}`,
        accountId: line.accountId,
        accountCode: line.accountCode,
        accountName: line.accountName,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        costCenter: "",
        projectName: "",
      })),
    });
    navigate('/accounting/journal-entries/new');
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    const validLines = editingEntry.lines.filter((line: any) => line.accountId && (line.debit > 0 || line.credit > 0));
    const validTotalDebit = validLines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
    const validTotalCredit = validLines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);

    if (validTotalDebit !== validTotalCredit) {
      toast({
        title: "خطأ",
        description: "القيد غير متوازن. يجب أن يكون مجموع المدين مساوياً لمجموع الدائن",
        variant: "destructive",
      });
      return;
    }

    try {
      // تحديث القيد الرئيسي
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update({
          date: editingEntry.date,
          description: editingEntry.description,
        })
        .eq('id', editingEntry.id);

      if (updateError) throw updateError;

      // حذف السطور القديمة
      const { error: deleteError } = await supabase
        .from('journal_entry_lines')
        .delete()
        .eq('journal_entry_id', editingEntry.id);

      if (deleteError) throw deleteError;

      // إضافة السطور الجديدة مع الفرع المحدد
      const lines = validLines.map((line: any) => ({
        journal_entry_id: editingEntry.id,
        account_id: line.accountId,
        description: line.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
        cost_center_id: line.costCenterId || null,
        project_id: line.projectId || null,
        branch_id: selectedBranch || line.branchId || null,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) throw linesError;

      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث القيد بنجاح",
      });

      setDetailDialogOpen(false);
      fetchJournalEntries();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث القيد",
        variant: "destructive",
      });
    }
  };

  const [isRebuildingEntries, setIsRebuildingEntries] = useState(false);

  // إعادة بناء سطور القيود الناقصة من مصروفات العهد
  const handleRebuildMissingEntryLines = async () => {
    setIsRebuildingEntries(true);
    try {
      // جلب جميع القيود وجميع السطور للمقارنة المحلية
      const { data: allEntries, error: entriesError } = await supabase
        .from('journal_entries')
        .select('id, entry_number, date, description, reference')
        .like('reference', 'custody_daily_%')
        .order('created_at', { ascending: false });
      
      if (entriesError) throw entriesError;

      const { data: allLines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select('journal_entry_id');
      
      if (linesError) throw linesError;

      // البحث عن القيود التي ليس لها سطور
      const lineEntryIds = new Set(allLines?.map(l => l.journal_entry_id) || []);
      const missingEntries = allEntries?.filter(e => !lineEntryIds.has(e.id)) || [];

      if (missingEntries.length === 0) {
        toast({
          title: "لا توجد قيود ناقصة",
          description: "جميع القيود لديها سطور مسجلة",
        });
        setIsRebuildingEntries(false);
        return;
      }

      console.log(`Found ${missingEntries.length} entries without lines`);

      let rebuiltCount = 0;

      for (const entry of missingEntries) {
        // البحث عن مصروفات العهد المرتبطة بهذا القيد من خلال التاريخ والمرجع
        const referenceMatch = entry.reference?.match(/custody_daily_([^_]+)_(\d{4}-\d{2}-\d{2})/);
        
        if (referenceMatch) {
          const representativeId = referenceMatch[1];
          const expenseDate = referenceMatch[2];
          
          // جلب مصروفات العهد لهذا المندوب وهذا التاريخ
          const { data: custodyExpenses, error: expensesError } = await supabase
            .from('custody_expenses')
            .select(`
              id,
              amount,
              expense_type,
              description,
              chart_of_accounts!custody_expenses_expense_type_fkey(id, name_ar)
            `)
            .eq('representative_id', representativeId)
            .eq('expense_date', expenseDate);

          if (expensesError) {
            console.error('Error fetching custody expenses:', expensesError);
            continue;
          }

          if (!custodyExpenses || custodyExpenses.length === 0) {
            console.log(`No custody expenses found for entry ${entry.entry_number}`);
            continue;
          }

          // جلب معلومات المندوب
          const { data: repAccount } = await supabase
            .from('chart_of_accounts')
            .select('id, name_ar')
            .eq('id', representativeId)
            .single();

          if (!repAccount) {
            console.log(`Representative account not found for ${representativeId}`);
            continue;
          }

          // جلب حساب الضريبة
          const { data: taxAccounts } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('code', '110801')
            .limit(1);
          const taxAccountId = taxAccounts?.[0]?.id;

          // حساب المجموعات
          let totalAmount = 0;
          let totalTax = 0;
          const expenseLines: any[] = [];

          for (const expense of custodyExpenses) {
            const expenseAccount = expense.chart_of_accounts as any;
            const amount = Number(expense.amount);
            
            // افتراض أن المبلغ يشمل الضريبة (15%)
            const baseAmount = amount / 1.15;
            const taxAmount = amount - baseAmount;
            
            expenseLines.push({
              journal_entry_id: entry.id,
              account_id: expense.expense_type,
              debit: baseAmount,
              credit: 0,
              description: expense.description || expenseAccount?.name_ar || ''
            });

            if (taxAccountId && taxAmount > 0.01) {
              totalTax += taxAmount;
            }

            totalAmount += amount;
          }

          // إضافة سطر الضريبة إن وجد
          if (taxAccountId && totalTax > 0.01) {
            expenseLines.push({
              journal_entry_id: entry.id,
              account_id: taxAccountId,
              debit: totalTax,
              credit: 0,
              description: 'ضريبة القيمة المضافة 15%'
            });
          }

          // إضافة سطر الدائن (المندوب)
          expenseLines.push({
            journal_entry_id: entry.id,
            account_id: repAccount.id,
            debit: 0,
            credit: totalAmount,
            description: `مصروفات ${repAccount.name_ar}`
          });

          // إدراج السطور
          const { error: insertError } = await supabase
            .from('journal_entry_lines')
            .insert(expenseLines);

          if (insertError) {
            console.error(`Error inserting lines for entry ${entry.entry_number}:`, insertError);
          } else {
            rebuiltCount++;
            console.log(`✅ Rebuilt entry ${entry.entry_number} with ${expenseLines.length} lines`);
          }
        }
      }

      toast({
        title: "تم إعادة بناء القيود",
        description: `تم إعادة بناء ${rebuiltCount} من أصل ${missingEntries.length} قيد ناقص`,
      });

      // تحديث قائمة القيود
      fetchJournalEntries();
    } catch (error) {
      console.error('Error rebuilding entry lines:', error);
      toast({
        title: "خطأ",
        description: "فشل في إعادة بناء سطور القيود",
        variant: "destructive",
      });
    } finally {
      setIsRebuildingEntries(false);
    }
  };

  // تحديث أرصدة الحسابات من قيود اليومية
  const handleRefreshBalances = async () => {
    setIsRefreshingBalances(true);
    try {
      // 1. Get all accounts
      const { data: allAccounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name_ar, balance');
      
      if (accountsError) throw accountsError;

      // 2. Calculate totals from journal entry lines
      const { data: journalLines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select('account_id, debit, credit');
      
      if (linesError) throw linesError;

      // 3. Group by account and calculate net balance
      const accountTotals: Record<string, { debit: number; credit: number }> = {};
      
      journalLines?.forEach(line => {
        if (!accountTotals[line.account_id]) {
          accountTotals[line.account_id] = { debit: 0, credit: 0 };
        }
        accountTotals[line.account_id].debit += Number(line.debit || 0);
        accountTotals[line.account_id].credit += Number(line.credit || 0);
      });

      // 4. Update each account's balance
      let updatedCount = 0;
      for (const accountId of Object.keys(accountTotals)) {
        const totals = accountTotals[accountId];
        const newBalance = totals.debit - totals.credit;
        
        const { error: updateError } = await supabase
          .from('chart_of_accounts')
          .update({ balance: newBalance })
          .eq('id', accountId);
        
        if (updateError) {
          console.error(`Error updating account ${accountId}:`, updateError);
        } else {
          updatedCount++;
        }
      }

      // 5. Reset balance to 0 for accounts with no journal entries
      const accountsWithEntries = new Set(Object.keys(accountTotals));
      const accountsToReset = allAccounts?.filter(acc => !accountsWithEntries.has(acc.id) && acc.balance !== 0) || [];
      
      for (const account of accountsToReset) {
        await supabase
          .from('chart_of_accounts')
          .update({ balance: 0 })
          .eq('id', account.id);
      }

      toast({
        title: "تم تحديث الأرصدة بنجاح",
        description: `تم تحديث ${updatedCount} حساب من قيود اليومية`,
      });

      // Refresh accounts list
      fetchAccounts();
    } catch (error) {
      console.error('Error refreshing balances:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث الأرصدة",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingBalances(false);
    }
  };

  const handleExportToExcel = () => {
    const exportData = filteredEntries.flatMap((entry) => {
      return entry.lines.map((line: any) => ({
        'المسلسل': entry.universalSerial || '',
        'رقم القيد': entry.entryNumber,
        'التاريخ': format(new Date(entry.date), 'dd/MM/yyyy'),
        'البيان العام': entry.description,
        'رمز الحساب': line.accountCode,
        'اسم الحساب': line.accountName,
        'البيان التفصيلي': line.description,
        'مركز التكلفة': line.costCenterName || '-',
        'المشروع': line.projectName || '-',
        'الفرع': line.branchName || '-',
        'المدين': line.debit,
        'الدائن': line.credit,
      }));
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قيود اليومية');
    
    // تنسيق الأعمدة
    const wscols = [
      { wch: 15 }, // رقم القيد
      { wch: 12 }, // التاريخ
      { wch: 25 }, // البيان العام
      { wch: 12 }, // رمز الحساب
      { wch: 30 }, // اسم الحساب
      { wch: 25 }, // البيان التفصيلي
      { wch: 20 }, // مركز التكلفة
      { wch: 20 }, // المشروع
      { wch: 20 }, // الفرع
      { wch: 12 }, // المدين
      { wch: 12 }, // الدائن
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `قيود_اليومية_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "تم التصدير بنجاح",
      description: "تم تصدير القيود إلى ملف Excel",
    });
  };

  const deleteEditingLine = (lineId: string) => {
    if (!editingEntry) return;
    setEditingEntry({
      ...editingEntry,
      lines: editingEntry.lines.filter((line: any) => line.id !== lineId),
    });
  };

  const updateEditingLine = (lineId: string, updates: Partial<any>) => {
    setEditingEntry((prev: any) => ({
      ...prev,
      lines: prev.lines.map((line: any) => 
        line.id === lineId ? { ...line, ...updates } : line
      ),
    }));
  };

  const addEditingLine = () => {
    setEditingEntry((prev: any) => ({
      ...prev,
      lines: [...prev.lines, {
        id: `line-${Date.now()}`,
        accountId: "",
        accountCode: "",
        accountName: "",
        description: "",
        debit: 0,
        credit: 0,
        costCenter: "",
        projectName: "",
      }],
    }));
  };


  if (isNewEntryPage) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/accounting/journal-entries" className="hover:text-primary transition-colors">
                  <ArrowRight className="h-6 w-6" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-center">سند قيد يومية / Journal Entry Voucher</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4 p-4 bg-accent/50 rounded-lg">
              <div>
                <Label className="text-sm">الفرع</Label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">اختر الفرع</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.code} - {branch.name_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm">رقم القيد</Label>
                <Input 
                  value={formData.entryNumber} 
                  onChange={(e) => setFormData({ ...formData, entryNumber: e.target.value })}
                  className="bg-background" 
                  placeholder="رقم القيد"
                />
              </div>
              <div>
                <Label className="text-sm">التاريخ</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm">البيان العام</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="بيان القيد"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>بنود القيد</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePasteFromExcel}>
                      <ClipboardPaste className="h-4 w-4 ml-2" />
                      لصق من Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={addEmptyLine}>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة سطر
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right min-w-[250px]">الحساب</TableHead>
                        <TableHead className="text-right min-w-[200px]">البيان</TableHead>
                        <TableHead className="text-right min-w-[120px]">المدين</TableHead>
                        <TableHead className="text-right min-w-[120px]">الدائن</TableHead>
                        <TableHead className="text-right min-w-[180px]">مركز التكلفة</TableHead>
                        <TableHead className="text-right min-w-[180px]">المشروع</TableHead>
                        <TableHead className="text-right w-[80px]">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.lines.map((line) => {
                        const searchState = getSearchState(line.id);
                        
                        // عرض جميع الحسابات النشطة بدون تصفية حسب المستوى
                        const filteredAccounts = searchState.accountSearch.length > 0
                          ? accounts.filter(acc => 
                              acc.code.includes(searchState.accountSearch) || 
                              acc.name_ar.includes(searchState.accountSearch) ||
                              acc.name_en.toLowerCase().includes(searchState.accountSearch.toLowerCase())
                            )
                          : accounts;
                        
                        // تحسين البحث في مراكز التكلفة - يظهر النتائج فوراً من أول حرف
                        const filteredCostCenters = searchState.costCenterSearch 
                          ? costCenters.filter(cc =>
                              cc.code.includes(searchState.costCenterSearch) ||
                              cc.name_ar.includes(searchState.costCenterSearch) ||
                              cc.name_en.toLowerCase().includes(searchState.costCenterSearch.toLowerCase())
                            )
                          : costCenters; // إظهار الكل عند الفوكس بدون بحث
                        
                        // تحسين البحث في المشاريع - يظهر النتائج فوراً من أول حرف
                        const filteredProjects = searchState.projectSearch
                          ? projects.filter(prj =>
                              prj.code.includes(searchState.projectSearch) ||
                              prj.name_ar.includes(searchState.projectSearch) ||
                              prj.name_en.toLowerCase().includes(searchState.projectSearch.toLowerCase())
                            )
                          : projects; // إظهار الكل عند الفوكس بدون بحث

                        const isAccountInvalid = line.accountCode && !line.accountId;

                        return (
                          <TableRow key={line.id}>
                            <TableCell>
                                    <div className="relative">
                                      <Input
                                        value={searchState.accountSearch || (line.accountCode ? `${line.accountCode} - ${line.accountName}` : "")}
                                        onChange={(e) => {
                                          updateSearchState(line.id, {
                                            accountSearch: e.target.value,
                                            showAccountSearch: true,
                                            selectedAccountIndex: -1,
                                          });
                                        }}
                                        onKeyDown={(e) => {
                                          if (!searchState.showAccountSearch || filteredAccounts.length === 0) return;
                                          
                                          if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            const newIndex = searchState.selectedAccountIndex < filteredAccounts.length - 1 
                                              ? searchState.selectedAccountIndex + 1 
                                              : 0;
                                            updateSearchState(line.id, { selectedAccountIndex: newIndex });
                                          } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            const newIndex = searchState.selectedAccountIndex > 0 
                                              ? searchState.selectedAccountIndex - 1 
                                              : filteredAccounts.length - 1;
                                            updateSearchState(line.id, { selectedAccountIndex: newIndex });
                                          } else if (e.key === 'Enter' && searchState.selectedAccountIndex >= 0) {
                                            e.preventDefault();
                                            const selectedAccount = filteredAccounts[searchState.selectedAccountIndex];
                                            updateLine(line.id, {
                                              accountId: selectedAccount.id,
                                              accountCode: selectedAccount.code,
                                              accountName: selectedAccount.name_ar,
                                            });
                                            updateSearchState(line.id, {
                                              accountSearch: "",
                                              showAccountSearch: false,
                                              selectedAccountIndex: -1,
                                            });
                                          }
                                        }}
                                        placeholder="ابحث بالرمز أو الاسم..."
                                        onFocus={() => updateSearchState(line.id, { showAccountSearch: true })}
                                        onBlur={() => setTimeout(() => updateSearchState(line.id, { showAccountSearch: false }), 200)}
                                        className={`text-sm ${isAccountInvalid ? 'border-red-500 bg-red-50' : ''}`}
                                      />
                                      {searchState.showAccountSearch && filteredAccounts.length > 0 && (
                                        <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-card shadow-lg border">
                                          <CardContent className="p-2">
                                            {filteredAccounts.map((acc, index) => (
                                              <div
                                                key={acc.id}
                                                className={`p-2 hover:bg-accent cursor-pointer rounded text-sm ${
                                                  index === searchState.selectedAccountIndex ? 'bg-accent' : ''
                                                }`}
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  updateLine(line.id, {
                                                    accountId: acc.id,
                                                    accountCode: acc.code,
                                                    accountName: acc.name_ar,
                                                  });
                                                  updateSearchState(line.id, {
                                                    accountSearch: "",
                                                    showAccountSearch: false,
                                                    selectedAccountIndex: -1,
                                                  });
                                                }}
                                              >
                                                <div className="font-medium">{acc.code} - {acc.name_ar}</div>
                                              </div>
                                            ))}
                                          </CardContent>
                                        </Card>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={line.description}
                                      onChange={(e) => updateLine(line.id, { description: e.target.value })}
                                      placeholder="البيان"
                                      className="text-sm"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={(line as any).debitText !== undefined ? (line as any).debitText : (line.debit > 0 ? line.debit.toString() : "")}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // السماح بالأرقام والنقطة فقط
                                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                          updateLine(line.id, { 
                                            debitText: value,
                                            debit: value === "" || value === "." ? 0 : parseFloat(value) || 0, 
                                            credit: 0,
                                            creditText: ""
                                          } as any);
                                        }
                                      }}
                                      placeholder="0.00"
                                      className="text-sm"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={(line as any).creditText !== undefined ? (line as any).creditText : (line.credit > 0 ? line.credit.toString() : "")}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // السماح بالأرقام والنقطة فقط
                                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                          updateLine(line.id, { 
                                            creditText: value,
                                            credit: value === "" || value === "." ? 0 : parseFloat(value) || 0, 
                                            debit: 0,
                                            debitText: ""
                                          } as any);
                                        }
                                      }}
                                      placeholder="0.00"
                                      className="text-sm"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="relative">
                                      <Input
                                        value={searchState.costCenterSearch || (line.costCenter ? `${line.costCenter}` : "")}
                                        onChange={(e) => {
                                          updateSearchState(line.id, {
                                            costCenterSearch: e.target.value,
                                            showCostCenterSearch: true,
                                            selectedCostCenterIndex: -1,
                                          });
                                        }}
                                        onKeyDown={(e) => {
                                          if (!searchState.showCostCenterSearch || filteredCostCenters.length === 0) return;
                                          
                                          if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            const newIndex = searchState.selectedCostCenterIndex < filteredCostCenters.length - 1 
                                              ? searchState.selectedCostCenterIndex + 1 
                                              : 0;
                                            updateSearchState(line.id, { selectedCostCenterIndex: newIndex });
                                          } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            const newIndex = searchState.selectedCostCenterIndex > 0 
                                              ? searchState.selectedCostCenterIndex - 1 
                                              : filteredCostCenters.length - 1;
                                            updateSearchState(line.id, { selectedCostCenterIndex: newIndex });
                                          } else if (e.key === 'Enter' && searchState.selectedCostCenterIndex >= 0) {
                                            e.preventDefault();
                                            const selectedCostCenter = filteredCostCenters[searchState.selectedCostCenterIndex];
                                            updateLine(line.id, { 
                                              costCenter: selectedCostCenter.code,
                                              costCenterId: selectedCostCenter.id 
                                            });
                                            updateSearchState(line.id, {
                                              costCenterSearch: "",
                                              showCostCenterSearch: false,
                                              selectedCostCenterIndex: -1,
                                            });
                                          }
                                        }}
                                        placeholder="مركز التكلفة"
                                        onFocus={() => updateSearchState(line.id, { showCostCenterSearch: true })}
                                        onBlur={() => setTimeout(() => updateSearchState(line.id, { showCostCenterSearch: false }), 200)}
                                        className="text-sm"
                                      />
                                      {searchState.showCostCenterSearch && filteredCostCenters.length > 0 && (
                                        <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-card shadow-lg border">
                                          <CardContent className="p-2">
                                            {filteredCostCenters.map((cc, index) => (
                                              <div
                                                key={cc.id}
                                                className={`p-2 hover:bg-accent cursor-pointer rounded text-sm ${
                                                  index === searchState.selectedCostCenterIndex ? 'bg-accent' : ''
                                                }`}
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  updateLine(line.id, { 
                                                    costCenter: cc.code,
                                                    costCenterId: cc.id 
                                                  });
                                                  updateSearchState(line.id, {
                                                    costCenterSearch: "",
                                                    showCostCenterSearch: false,
                                                    selectedCostCenterIndex: -1,
                                                  });
                                                }}
                                              >
                                                <div className="font-medium">{cc.code} - {cc.name_ar}</div>
                                              </div>
                                            ))}
                                          </CardContent>
                                        </Card>
                                      )}
                                      {isAccountInvalid && (
                                        <p className="text-xs text-red-500 mt-1">رقم الحساب غير موجود</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="relative">
                                      <Input
                                        value={searchState.projectSearch || (line.projectName ? `${line.projectName}` : "")}
                                        onChange={(e) => {
                                          updateSearchState(line.id, {
                                            projectSearch: e.target.value,
                                            showProjectSearch: true,
                                            selectedProjectIndex: -1,
                                          });
                                        }}
                                        onKeyDown={(e) => {
                                          if (!searchState.showProjectSearch || filteredProjects.length === 0) return;
                                          
                                          if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            const newIndex = searchState.selectedProjectIndex < filteredProjects.length - 1 
                                              ? searchState.selectedProjectIndex + 1 
                                              : 0;
                                            updateSearchState(line.id, { selectedProjectIndex: newIndex });
                                          } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            const newIndex = searchState.selectedProjectIndex > 0 
                                              ? searchState.selectedProjectIndex - 1 
                                              : filteredProjects.length - 1;
                                            updateSearchState(line.id, { selectedProjectIndex: newIndex });
                                          } else if (e.key === 'Enter' && searchState.selectedProjectIndex >= 0) {
                                            e.preventDefault();
                                            const selectedProject = filteredProjects[searchState.selectedProjectIndex];
                                            updateLine(line.id, { 
                                              projectName: selectedProject.code,
                                              projectId: selectedProject.id 
                                            });
                                            updateSearchState(line.id, {
                                              projectSearch: "",
                                              showProjectSearch: false,
                                              selectedProjectIndex: -1,
                                            });
                                          }
                                        }}
                                        placeholder="المشروع"
                                        onFocus={() => updateSearchState(line.id, { showProjectSearch: true })}
                                        onBlur={() => setTimeout(() => updateSearchState(line.id, { showProjectSearch: false }), 200)}
                                        className="text-sm"
                                      />
                                      {searchState.showProjectSearch && filteredProjects.length > 0 && (
                                        <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-card shadow-lg border">
                                          <CardContent className="p-2">
                                            {filteredProjects.map((prj, index) => (
                                              <div
                                                key={prj.id}
                                                className={`p-2 hover:bg-accent cursor-pointer rounded text-sm ${
                                                  index === searchState.selectedProjectIndex ? 'bg-accent' : ''
                                                }`}
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  updateLine(line.id, { 
                                                    projectName: prj.code,
                                                    projectId: prj.id 
                                                  });
                                                  updateSearchState(line.id, {
                                                    projectSearch: "",
                                                    showProjectSearch: false,
                                                    selectedProjectIndex: -1,
                                                  });
                                                }}
                                              >
                                                <div className="font-medium">{prj.code} - {prj.name_ar}</div>
                                              </div>
                                            ))}
                                          </CardContent>
                                        </Card>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteLine(line.id)}
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell colSpan={2} className="text-left">
                                الإجمالي / Total
                              </TableCell>
                              <TableCell className="text-red-600">
                                {totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-green-600">
                                {totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell colSpan={2}>
                                {isBalanced ? (
                                  <span className="text-green-600">✓ متوازن</span>
                                ) : totalDebit > 0 || totalCredit > 0 ? (
                                  <span className="text-red-600">✗ غير متوازن</span>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-4">
                    <Button 
                      onClick={handleSubmit} 
                      className="flex-1" 
                      disabled={!isBalanced || isSaving}
                    >
                      {isSaving ? (
                        <>جاري الحفظ... / Saving...</>
                      ) : (
                        <>
                          <Save className="h-4 w-4 ml-2" />
                          حفظ القيد / Save Entry
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/accounting/journal-entries')} className="flex-1">
                      <X className="h-4 w-4 ml-2" />
                      إلغاء / Cancel
                    </Button>
                  </div>
                </div>
              </main>
            </div>
          );
        }

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
          }
          .no-print, .screen-only-content {
            display: none !important;
          }
        }
        @media screen {
          .print-content {
            display: none;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-background screen-only-content" dir="rtl">
        <header className="border-b bg-card no-print">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/accounting" className="hover:text-primary transition-colors">
                  <ArrowRight className="h-6 w-6" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold">القيود اليومية</h1>
                  <p className="text-muted-foreground mt-1">
                    تسجيل ومتابعة القيود المحاسبية اليومية
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  onClick={handleRebuildMissingEntryLines}
                  disabled={isRebuildingEntries}
                  title="إعادة بناء سطور القيود الناقصة من مصروفات العهد"
                >
                  <Wrench className={cn("h-4 w-4 ml-2", isRebuildingEntries && "animate-spin")} />
                  إصلاح قيود العهد
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleRefreshBalances}
                  disabled={isRefreshingBalances}
                >
                  <RefreshCw className={cn("h-4 w-4 ml-2", isRefreshingBalances && "animate-spin")} />
                  تحديث الأرصدة
                </Button>
                <Button onClick={() => navigate('/accounting/journal-entries/new')}>
                  <Plus className="h-4 w-4 ml-2" />
                  قيد جديد
                </Button>
                <Button variant="outline" onClick={() => {
                  setOpeningEntryDialogOpen(true);
                  generateNextEntryNumber();
                }}>
                  <BookOpen className="h-4 w-4 ml-2" />
                  قيد افتتاحي
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card className="mb-6 no-print">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  تصفية القيود / Filter Entries
                </CardTitle>
                <Button variant="outline" onClick={handleExportToExcel}>
                  <FileDown className="h-4 w-4 ml-2" />
                  تصدير إلى Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>التاريخ / Date</Label>
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>الحساب / Account</Label>
                  <Input
                    value={filterAccount}
                    onChange={(e) => setFilterAccount(e.target.value)}
                    placeholder="ابحث عن حساب... / Search account..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>سجل القيود اليومية / Journal Entries Register</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleAllEntries}
                  className="gap-2"
                >
                  {expandedEntries.size === filteredEntries.length ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      طي الكل / Collapse All
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      عرض الكل تفصيلياً / Expand All
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    لا توجد قيود حالياً / No entries found
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right w-12"></TableHead>
                      <TableHead className="text-right">م</TableHead>
                      <TableHead className="text-right">المسلسل</TableHead>
                      <TableHead className="text-right">رقم القيد</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">البيان</TableHead>
                      <TableHead className="text-right">المدين</TableHead>
                      <TableHead className="text-right">الدائن</TableHead>
                      <TableHead className="text-center no-print">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry, index) => (
                      <Fragment key={entry.id}>
                        <TableRow className="hover:bg-muted/50">
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleEntryExpand(entry.id)}
                              className="h-8 w-8"
                            >
                              {expandedEntries.has(entry.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{filteredEntries.length - index}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{entry.universalSerial || '—'}</TableCell>
                          <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                          <TableCell>
                            <Popover
                              open={inlineDateEditId === entry.id}
                              onOpenChange={(open) => {
                                if (open) {
                                  setInlineDateEditId(entry.id);
                                  setInlineDateValue(entry.date);
                                } else {
                                  setInlineDateEditId(null);
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="text-right hover:bg-muted/60 px-2 py-1 rounded transition-colors cursor-pointer underline-offset-4 hover:underline"
                                  title="انقر لتعديل التاريخ"
                                >
                                  {format(new Date(entry.date), 'dd/MM/yyyy')}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-3 space-y-2" align="start">
                                <Label className="text-xs">تعديل تاريخ القيد</Label>
                                <Input
                                  type="date"
                                  value={inlineDateValue}
                                  onChange={(e) => setInlineDateValue(e.target.value)}
                                  className="h-9"
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setInlineDateEditId(null)}
                                  >
                                    إلغاء
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleInlineDateSave(entry.id)}
                                    disabled={isSavingInlineDate || !inlineDateValue || inlineDateValue === entry.date}
                                  >
                                    حفظ
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell className="text-red-600 font-bold">
                            {entry.totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-green-600 font-bold">
                            {entry.totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center no-print">
                            <div className="flex gap-2 justify-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetails(entry)}
                                title="تعديل / Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePrintEntry(entry)}
                                title="طباعة / Print"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(entry.id)}
                                title="حذف / Delete"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedEntries.has(entry.id) && (
                          <TableRow key={`${entry.id}-details`}>
                            <TableCell colSpan={8} className="bg-muted/20 p-0">
                              <div className="p-4">
                                <div className="bg-card rounded-lg border">
                                  <div className="p-3 bg-muted/50 border-b">
                                    <h4 className="font-semibold text-sm">تفاصيل سطور القيد</h4>
                                  </div>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-right">رمز الحساب</TableHead>
                                        <TableHead className="text-right">اسم الحساب</TableHead>
                                        <TableHead className="text-right">البيان</TableHead>
                                        <TableHead className="text-right">مركز التكلفة</TableHead>
                                        <TableHead className="text-right">المشروع</TableHead>
                                        <TableHead className="text-right">الفرع</TableHead>
                                        <TableHead className="text-right">المدين</TableHead>
                                        <TableHead className="text-right">الدائن</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {entry.lines.map((line: any, idx: number) => (
                                        <TableRow key={idx}>
                                          <TableCell className="font-mono text-sm">{line.accountCode}</TableCell>
                                          <TableCell>{line.accountName}</TableCell>
                                          <TableCell className="text-muted-foreground">{line.description}</TableCell>
                                          <TableCell className="text-muted-foreground">{line.costCenterName || '-'}</TableCell>
                                          <TableCell className="text-muted-foreground">{line.projectName || '-'}</TableCell>
                                          <TableCell className="text-muted-foreground">{line.branchName || '-'}</TableCell>
                                          <TableCell className="text-red-600 font-semibold">
                                            {line.debit > 0 ? line.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                                          </TableCell>
                                          <TableCell className="text-green-600 font-semibold">
                                            {line.credit > 0 ? line.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Opening Entry Dialog */}
      <Dialog open={openingEntryDialogOpen} onOpenChange={setOpeningEntryDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl">قيد افتتاحي - الأرصدة الافتتاحية</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>رقم القيد</Label>
                <Input value={formData.entryNumber} disabled className="bg-muted" />
              </div>
              <div>
                <Label>التاريخ</Label>
                <Input type="date" value={openingEntryData.date} onChange={(e) => setOpeningEntryData(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              <div>
                <Label>البيان</Label>
                <Input value={openingEntryData.description} onChange={(e) => setOpeningEntryData(prev => ({ ...prev, description: e.target.value }))} />
              </div>
            </div>

            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-center w-[250px]">رمز الحساب</TableHead>
                    <TableHead className="text-center w-[250px]">اسم الحساب</TableHead>
                    <TableHead className="text-center w-[200px]">البيان</TableHead>
                    <TableHead className="text-center w-[120px]">مدين</TableHead>
                    <TableHead className="text-center w-[120px]">دائن</TableHead>
                    <TableHead className="text-center w-[80px]">حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openingEntryData.lines.map((line) => {
                    const lineSearchState = getSearchState(line.id);
                    
                    // عرض جميع الحسابات النشطة بدون تصفية حسب المستوى
                    const filteredAccounts = lineSearchState.accountSearch 
                      ? accounts.filter(acc => {
                          const searchLower = lineSearchState.accountSearch.toLowerCase();
                          return acc.code.toLowerCase().includes(searchLower) || 
                                 acc.name_ar.toLowerCase().includes(searchLower) ||
                                 acc.name_en.toLowerCase().includes(searchLower);
                        })
                      : accounts; // عرض الكل عند الفوكس

                    return (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="relative">
                            <Input 
                              value={lineSearchState.accountSearch || (line.accountCode ? `${line.accountCode} - ${line.accountName}` : "")} 
                              onChange={(e) => updateSearchState(line.id, { accountSearch: e.target.value, showAccountSearch: true })} 
                              onFocus={() => updateSearchState(line.id, { showAccountSearch: true })} 
                              onBlur={() => setTimeout(() => updateSearchState(line.id, { showAccountSearch: false }), 200)}
                              placeholder="ابحث بالرمز أو الاسم..." 
                              className="text-sm"
                            />
                            {lineSearchState.showAccountSearch && filteredAccounts.length > 0 && (
                              <Card className="absolute z-50 mt-1 w-[500px] bg-card border shadow-lg max-h-[300px] overflow-y-auto">
                                <CardContent className="p-2">
                                  {filteredAccounts.map((account) => (
                                    <div 
                                      key={account.id} 
                                      className="p-2 cursor-pointer hover:bg-accent rounded text-sm"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setOpeningEntryData(prev => ({
                                          ...prev, 
                                          lines: prev.lines.map(l => l.id === line.id 
                                            ? { ...l, accountId: account.id, accountCode: account.code, accountName: account.name_ar } 
                                            : l
                                          )
                                        }));
                                        updateSearchState(line.id, {accountSearch: "", showAccountSearch: false});
                                      }}
                                    >
                                      <div className="font-medium">{account.code} - {account.name_ar}</div>
                                    </div>
                                  ))}
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{line.accountName}</TableCell>
                        <TableCell><Input value={line.description} onChange={(e) => setOpeningEntryData(prev => ({...prev, lines: prev.lines.map(l => l.id === line.id ? { ...l, description: e.target.value } : l)}))} placeholder="البيان" /></TableCell>
                        <TableCell><Input type="number" value={line.debit || ""} onChange={(e) => setOpeningEntryData(prev => ({...prev, lines: prev.lines.map(l => l.id === line.id ? { ...l, debit: parseFloat(e.target.value) || 0 } : l)}))} className="text-center" /></TableCell>
                        <TableCell><Input type="number" value={line.credit || ""} onChange={(e) => setOpeningEntryData(prev => ({...prev, lines: prev.lines.map(l => l.id === line.id ? { ...l, credit: parseFloat(e.target.value) || 0 } : l)}))} className="text-center" /></TableCell>
                        <TableCell className="text-center"><Button variant="ghost" size="sm" onClick={() => setOpeningEntryData(prev => ({...prev, lines: prev.lines.filter(l => l.id !== line.id)}))}><X className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setOpeningEntryData(prev => ({...prev, lines: [...prev.lines, {id: `line-${Date.now()}`, accountId: "", accountCode: "", accountName: "", description: "", debit: 0, credit: 0, debitText: "", creditText: "", costCenter: "", projectName: ""}]}))}>
                <Plus className="h-4 w-4 ml-2" />إضافة سطر
              </Button>
              <div className="flex gap-4 text-lg font-semibold">
                <div>مدين: {openingEntryData.lines.reduce((s, l) => s + (l.debit || 0), 0).toFixed(2)}</div>
                <div>دائن: {openingEntryData.lines.reduce((s, l) => s + (l.credit || 0), 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {setOpeningEntryDialogOpen(false); setOpeningEntryData({entryNumber: "", date: new Date().toISOString().split('T')[0], description: "قيد افتتاحي - الأرصدة الافتتاحية", lines: createInitialEmptyLines() as JournalEntryLine[]});}}>إلغاء</Button>
              <Button onClick={async () => {
                const validLines = openingEntryData.lines.filter(line => line.accountId && (line.debit > 0 || line.credit > 0));
                if (validLines.length === 0 || validLines.reduce((s,l) => s + l.debit, 0) !== validLines.reduce((s,l) => s + l.credit, 0)) {
                  toast({title: "تنبيه", description: "القيد غير متوازن", variant: "destructive"});
                  return;
                }
                try {
                  setIsSaving(true);
                  const { data: { user } } = await supabase.auth.getUser();
                   const { data: openingSerialData } = await supabase.rpc('generate_universal_serial', { prefix: 'JE' });
                   const { data: entryData, error: entryError } = await supabase.from('journal_entries').insert({entry_number: formData.entryNumber, date: openingEntryData.date, description: openingEntryData.description, reference: 'opening_entry', created_by: user?.id, universal_serial: openingSerialData as string}).select().single();
                  if (entryError) throw entryError;
                  const { error: linesError } = await supabase.from('journal_entry_lines').insert(validLines.map(line => ({journal_entry_id: entryData.id, account_id: line.accountId, debit: line.debit || 0, credit: line.credit || 0, description: line.description || openingEntryData.description})));
                  if (linesError) throw linesError;
                  toast({title: "تم الحفظ بنجاح"});
                  setOpeningEntryDialogOpen(false);
                  fetchJournalEntries();
                } catch (error) {
                  toast({title: "خطأ", description: "فشل في حفظ القيد", variant: "destructive"});
                } finally {
                  setIsSaving(false);
                }
              }} disabled={isSaving}>
                <Save className="h-4 w-4 ml-2" />{isSaving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Template */}
      {selectedEntry && (
          <div className="print-content">
            {(() => {
              const LINES_PER_PAGE = 15;
              const lines = selectedEntry.lines;
              const totalPages = Math.ceil(lines.length / LINES_PER_PAGE);
              const pages = [];

              for (let pageNum = 0; pageNum < totalPages; pageNum++) {
                const startIdx = pageNum * LINES_PER_PAGE;
                const endIdx = Math.min(startIdx + LINES_PER_PAGE, lines.length);
                const pageLines = lines.slice(startIdx, endIdx);
                
                // حساب المجاميع لكل صفحة
                const pageDebit = pageLines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
                const pageCredit = pageLines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);

                pages.push(
                  <div key={pageNum} className="max-w-4xl mx-auto bg-white p-8 page-break" dir="rtl">
                    {/* رأس الصفحة */}
                    <div className="text-center mb-6 border-b-2 border-gray-400 pb-4">
                      <h1 className="text-3xl font-bold mb-2 text-gray-800">سند قيد يومية</h1>
                      <h2 className="text-xl text-gray-600">Journal Entry Voucher</h2>
                    </div>

                    {/* معلومات القيد */}
                    <div className="grid grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded">
                      <div>
                        <div className="text-sm text-gray-600">المسلسل</div>
                        <div className="font-bold text-lg text-blue-800 font-mono">{selectedEntry.universalSerial || '—'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">رقم القيد</div>
                        <div className="font-bold text-lg text-gray-800">{selectedEntry.entryNumber}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">التاريخ</div>
                        <div className="font-bold text-lg text-gray-800">
                          {format(new Date(selectedEntry.date), 'dd/MM/yyyy')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">البيان / Description</div>
                        <div className="font-bold text-lg text-gray-800">{selectedEntry.description || '-'}</div>
                      </div>
                    </div>

                    {/* جدول السطور */}
                    <table className="w-full border-collapse border border-gray-400 mb-4">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-400">
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            رمز الحساب<br/>Account Code
                          </th>
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            اسم الحساب<br/>Account Name
                          </th>
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            البيان<br/>Description
                          </th>
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            الفرع<br/>Branch
                          </th>
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            المدين<br/>Debit
                          </th>
                          <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold text-sm">
                            الدائن<br/>Credit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageLines.map((line: any, index: number) => (
                          <tr key={startIdx + index} className="bg-white">
                            <td className="border border-gray-300 p-2 text-gray-800 text-sm">{line.accountCode}</td>
                            <td className="border border-gray-300 p-2 text-gray-800 text-sm">{line.accountName}</td>
                            <td className="border border-gray-300 p-2 text-gray-800 text-sm">{line.description}</td>
                            <td className="border border-gray-300 p-2 text-gray-800 text-sm">{line.branchName || '-'}</td>
                            <td className="border border-gray-300 p-2 text-red-600 font-bold text-sm">
                              {line.debit > 0 ? line.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                            </td>
                            <td className="border border-gray-300 p-2 text-green-600 font-bold text-sm">
                              {line.credit > 0 ? line.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                            </td>
                          </tr>
                        ))}
                        
                        {/* مجموع الصفحة */}
                        <tr className="bg-gray-50 font-bold border-t-2 border-gray-400">
                          <td colSpan={4} className="border border-gray-400 p-2 text-left text-gray-800 text-sm">
                            مجموع الصفحة / Page Total
                          </td>
                          <td className="border border-gray-400 p-2 text-red-600 text-sm">
                            {pageDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="border border-gray-400 p-2 text-green-600 text-sm">
                            {pageCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* المجموع الكلي في الصفحة الأخيرة فقط */}
                        {pageNum === totalPages - 1 && (
                          <tr className="bg-gray-100 font-bold text-lg border-t-2 border-gray-400">
                            <td colSpan={4} className="border border-gray-400 p-3 text-left text-gray-800">
                              الإجمالي الكلي / Grand Total
                            </td>
                            <td className="border border-gray-400 p-3 text-red-600">
                              {selectedEntry.totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="border border-gray-400 p-3 text-green-600">
                              {selectedEntry.totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* التوقيعات في الصفحة الأخيرة فقط */}
                    {pageNum === totalPages - 1 && (
                      <div className="grid grid-cols-3 gap-8 mt-8 pt-6 border-t border-gray-400">
                        <div className="text-center">
                          <div className="border-t border-gray-400 pt-2 mt-12">
                            <div className="font-bold text-gray-800">المحاسب</div>
                            <div className="text-sm text-gray-600">Accountant</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="border-t border-gray-400 pt-2 mt-12">
                            <div className="font-bold text-gray-800">المدير المالي</div>
                            <div className="text-sm text-gray-600">Financial Manager</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="border-t border-gray-400 pt-2 mt-12">
                            <div className="font-bold text-gray-800">المعتمد</div>
                            <div className="text-sm text-gray-600">Approved By</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* تذييل الصفحة */}
                    <div className="mt-6 flex justify-between text-sm text-gray-500 border-t border-gray-300 pt-3">
                      <div>صفحة {pageNum + 1} من {totalPages} | Page {pageNum + 1} of {totalPages}</div>
                      <div>
                        تاريخ الطباعة: {format(new Date(), 'dd/MM/yyyy')} | Print Date: {new Date().toLocaleDateString('en-US')}
                      </div>
                    </div>
                  </div>
                );
              }

              return <>{pages}</>;
            })()}
          </div>
        )}

        {/* Detailed View & Edit Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>عرض تفصيلي للقيد</span>
                <Button onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ التعديلات
                </Button>
              </DialogTitle>
            </DialogHeader>
            {editingEntry && (
              <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)] px-2">
                <div className="grid grid-cols-4 gap-4 p-4 bg-accent/50 rounded-lg">
                  <div>
                    <Label className="text-sm">رقم القيد</Label>
                    <Input 
                      value={editingEntry.entryNumber} 
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">التاريخ / Date</Label>
                    <Input
                      type="date"
                      value={editingEntry.date}
                      onChange={(e) => setEditingEntry({...editingEntry, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">الفرع / Branch</Label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">اختر الفرع</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.code} - {branch.name_ar}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm">البيان / Description</Label>
                    <Input
                      value={editingEntry.description}
                      onChange={(e) => setEditingEntry({...editingEntry, description: e.target.value})}
                      placeholder="بيان القيد"
                    />
                  </div>
                </div>

                <div className="border rounded-lg">
                  <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                    <h3 className="font-semibold">سطور القيد</h3>
                    <Button variant="outline" size="sm" onClick={addEditingLine}>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة سطر
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right min-w-[250px]">الحساب</TableHead>
                          <TableHead className="text-right min-w-[150px]">الفرع</TableHead>
                          <TableHead className="text-right min-w-[150px]">مركز التكلفة</TableHead>
                          <TableHead className="text-right min-w-[150px]">المشروع</TableHead>
                          <TableHead className="text-right min-w-[200px]">البيان</TableHead>
                          <TableHead className="text-right min-w-[120px]">المدين</TableHead>
                          <TableHead className="text-right min-w-[120px]">الدائن</TableHead>
                          <TableHead className="text-right w-[60px]">حذف</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editingEntry.lines.map((line: any) => {
                          const searchState = getSearchState(line.id);
                          
                          // عرض جميع الحسابات النشطة بدون تصفية حسب المستوى
                          const filteredAccounts = searchState.accountSearch.length > 0
                            ? accounts.filter(acc => 
                                acc.code.includes(searchState.accountSearch) || 
                                acc.name_ar.includes(searchState.accountSearch)
                              )
                            : accounts;

                          const filteredBranches = searchState.branchSearch?.length > 0
                            ? branches.filter(b => b.code.includes(searchState.branchSearch) || b.name_ar.includes(searchState.branchSearch))
                            : branches;

                          const filteredCostCenters = searchState.costCenterSearch?.length > 0
                            ? costCenters.filter(cc => cc.code.includes(searchState.costCenterSearch) || cc.name_ar.includes(searchState.costCenterSearch))
                            : costCenters;

                          const filteredProjects = searchState.projectSearch?.length > 0
                            ? projects.filter(p => p.code.includes(searchState.projectSearch) || p.name_ar.includes(searchState.projectSearch))
                            : projects;

                          return (
                            <TableRow key={line.id}>
                              <TableCell>
                                <div className="relative">
                                  <Input
                                    value={searchState.accountSearch || (line.accountCode ? `${line.accountCode} - ${line.accountName}` : "")}
                                    onChange={(e) => {
                                      updateSearchState(line.id, {
                                        accountSearch: e.target.value,
                                        showAccountSearch: true,
                                      });
                                    }}
                                    placeholder="ابحث بالرمز أو الاسم..."
                                    onFocus={() => updateSearchState(line.id, { showAccountSearch: true })}
                                    onBlur={() => setTimeout(() => updateSearchState(line.id, { showAccountSearch: false }), 200)}
                                  />
                                  {searchState.showAccountSearch && filteredAccounts.length > 0 && (
                                    <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-card shadow-lg border">
                                      <CardContent className="p-2">
                                        {filteredAccounts.map(acc => (
                                          <div
                                            key={acc.id}
                                            className="p-2 hover:bg-accent cursor-pointer rounded text-sm"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              updateEditingLine(line.id, {
                                                accountId: acc.id,
                                                accountCode: acc.code,
                                                accountName: acc.name_ar,
                                              });
                                              updateSearchState(line.id, {
                                                accountSearch: "",
                                                showAccountSearch: false,
                                              });
                                            }}
                                          >
                                            <div className="font-medium">{acc.code} - {acc.name_ar}</div>
                                          </div>
                                        ))}
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="relative">
                                  <Input
                                    value={searchState.branchSearch || (line.branchName ? `${line.branchName}` : "")}
                                    onChange={(e) => {
                                      updateSearchState(line.id, {
                                        branchSearch: e.target.value,
                                        showBranchSearch: true,
                                      });
                                    }}
                                    placeholder="ابحث عن الفرع..."
                                    onFocus={() => updateSearchState(line.id, { showBranchSearch: true })}
                                    onBlur={() => setTimeout(() => updateSearchState(line.id, { showBranchSearch: false }), 200)}
                                  />
                                  {searchState.showBranchSearch && filteredBranches.length > 0 && (
                                    <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-card shadow-lg border">
                                      <CardContent className="p-2">
                                        {filteredBranches.map(branch => (
                                          <div
                                            key={branch.id}
                                            className="p-2 hover:bg-accent cursor-pointer rounded text-sm"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              updateEditingLine(line.id, {
                                                branchId: branch.id,
                                                branchName: branch.name_ar,
                                              });
                                              updateSearchState(line.id, {
                                                branchSearch: "",
                                                showBranchSearch: false,
                                              });
                                            }}
                                          >
                                            <div className="font-medium">{branch.name_ar}</div>
                                          </div>
                                        ))}
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="relative">
                                  <Input
                                    value={searchState.costCenterSearch || (line.costCenterName ? `${line.costCenterName}` : "")}
                                    onChange={(e) => {
                                      updateSearchState(line.id, {
                                        costCenterSearch: e.target.value,
                                        showCostCenterSearch: true,
                                      });
                                    }}
                                    placeholder="ابحث عن مركز التكلفة..."
                                    onFocus={() => updateSearchState(line.id, { showCostCenterSearch: true })}
                                    onBlur={() => setTimeout(() => updateSearchState(line.id, { showCostCenterSearch: false }), 200)}
                                  />
                                  {searchState.showCostCenterSearch && filteredCostCenters.length > 0 && (
                                    <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-card shadow-lg border">
                                      <CardContent className="p-2">
                                        {filteredCostCenters.map(cc => (
                                          <div
                                            key={cc.id}
                                            className="p-2 hover:bg-accent cursor-pointer rounded text-sm"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              updateEditingLine(line.id, {
                                                costCenterId: cc.id,
                                                costCenterName: cc.name_ar,
                                              });
                                              updateSearchState(line.id, {
                                                costCenterSearch: "",
                                                showCostCenterSearch: false,
                                              });
                                            }}
                                          >
                                            <div className="font-medium">{cc.name_ar}</div>
                                          </div>
                                        ))}
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="relative">
                                  <Input
                                    value={searchState.projectSearch || (line.projectName ? `${line.projectName}` : "")}
                                    onChange={(e) => {
                                      updateSearchState(line.id, {
                                        projectSearch: e.target.value,
                                        showProjectSearch: true,
                                      });
                                    }}
                                    placeholder="ابحث عن المشروع..."
                                    onFocus={() => updateSearchState(line.id, { showProjectSearch: true })}
                                    onBlur={() => setTimeout(() => updateSearchState(line.id, { showProjectSearch: false }), 200)}
                                  />
                                  {searchState.showProjectSearch && filteredProjects.length > 0 && (
                                    <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-card shadow-lg border">
                                      <CardContent className="p-2">
                                        {filteredProjects.map(project => (
                                          <div
                                            key={project.id}
                                            className="p-2 hover:bg-accent cursor-pointer rounded text-sm"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              updateEditingLine(line.id, {
                                                projectId: project.id,
                                                projectName: project.name_ar,
                                              });
                                              updateSearchState(line.id, {
                                                projectSearch: "",
                                                showProjectSearch: false,
                                              });
                                            }}
                                          >
                                            <div className="font-medium">{project.name_ar}</div>
                                          </div>
                                        ))}
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={line.description}
                                  onChange={(e) => updateEditingLine(line.id, { description: e.target.value })}
                                  placeholder="البيان"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={line.debit || ""}
                                  onChange={(e) => {
                                    const debit = parseFloat(e.target.value) || 0;
                                    updateEditingLine(line.id, { debit, credit: 0 });
                                  }}
                                  placeholder="0.00"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={line.credit || ""}
                                  onChange={(e) => {
                                    const credit = parseFloat(e.target.value) || 0;
                                    updateEditingLine(line.id, { credit, debit: 0 });
                                  }}
                                  placeholder="0.00"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteEditingLine(line.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={5} className="text-left">
                            الإجمالي / Total
                          </TableCell>
                          <TableCell className="text-red-600">
                            {editingEntry.lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {editingEntry.lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <DeleteDialog />
      </>
    );
  };

export default JournalEntries;
