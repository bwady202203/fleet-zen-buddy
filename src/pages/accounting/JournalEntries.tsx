import { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounting, JournalEntryLine } from "@/contexts/AccountingContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Plus, Printer, Eye, Filter, ClipboardPaste, Save, X, Pencil, FileDown, ChevronDown, ChevronUp } from "lucide-react";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  type: string;
  parent_id: string | null;
  is_active: boolean;
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
  const navigate = useNavigate();
  const location = useLocation();
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
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  
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

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
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
        .order('date', { ascending: false })
        .order('entry_number', { ascending: false });

      if (entriesError) throw entriesError;

      const formattedEntries = entries?.map(entry => ({
        id: entry.id,
        entryNumber: entry.entry_number,
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
  
  const createInitialEmptyLines = () => {
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

  const [formData, setFormData] = useState({
    entryNumber: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
    lines: createInitialEmptyLines() as JournalEntryLine[],
  });

  useEffect(() => {
    if (isNewEntryPage && !formData.entryNumber) {
      generateNextEntryNumber();
    }
  }, [isNewEntryPage]);

  const generateNextEntryNumber = async () => {
    try {
      const currentYear = new Date().getFullYear();
      
      // البحث عن أعلى رقم قيد للسنة الحالية فقط
      const { data, error } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .like('entry_number', `JE-${currentYear}%`)
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

      const newEntryNumber = `JE-${currentYear}${nextNumber.toString().padStart(6, '0')}`;
      setFormData(prev => ({ ...prev, entryNumber: newEntryNumber }));
    } catch (error) {
      console.error('Error generating entry number:', error);
      // في حالة الخطأ، استخدم رقم افتراضي
      const fallbackNumber = `JE-${new Date().getFullYear()}${Date.now().toString().slice(-6)}`;
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
      costCenter: "",
      projectName: "",
    };
    
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, newLine],
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

    // Filter out empty lines
    const validLines = formData.lines.filter(line => line.accountId && (line.debit > 0 || line.credit > 0));

    if (validLines.length === 0) {
      toast({
        title: "تنبيه / Warning",
        description: "يجب إضافة سطر واحد على الأقل / Must add at least one line",
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


  const handleDelete = async (entryId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القيد؟ / Are you sure you want to delete this entry?')) return;
    
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

      // إضافة السطور الجديدة
      const lines = validLines.map((line: any) => ({
        journal_entry_id: editingEntry.id,
        account_id: line.accountId,
        description: line.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
        cost_center_id: line.costCenterId || null,
        project_id: line.projectId || null,
        branch_id: line.branchId || null,
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

  const handleExportToExcel = () => {
    const exportData = filteredEntries.flatMap((entry) => {
      return entry.lines.map((line: any) => ({
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.lines.map((line) => {
                        const searchState = getSearchState(line.id);
                        
                        // البحث في الحسابات - المستوى الرابع فقط
                        const level4Accounts = accounts.filter(acc => calculateLevel(acc) === 4);
                        const filteredAccounts = searchState.accountSearch.length > 0 
                          ? level4Accounts.filter(acc => 
                              acc.code.includes(searchState.accountSearch) || 
                              acc.name_ar.includes(searchState.accountSearch) ||
                              acc.name_en.toLowerCase().includes(searchState.accountSearch.toLowerCase())
                            )
                          : level4Accounts;
                        
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
                                        className="text-sm"
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
                                      type="number"
                                      value={line.debit || ""}
                                      onChange={(e) => {
                                        const debit = parseFloat(e.target.value) || 0;
                                        updateLine(line.id, { debit, credit: 0 });
                                      }}
                                      placeholder="0.00"
                                      className="text-sm"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={line.credit || ""}
                                      onChange={(e) => {
                                        const credit = parseFloat(e.target.value) || 0;
                                        updateLine(line.id, { credit, debit: 0 });
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
          .no-print {
            display: none !important;
          }
        }
        @media screen {
          .print-content {
            display: none;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-background" dir="rtl">
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
              <Button onClick={() => navigate('/accounting/journal-entries/new')}>
                <Plus className="h-4 w-4 ml-2" />
                قيد جديد
              </Button>
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
                      <TableHead className="text-right">رقم القيد</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">البيان</TableHead>
                      <TableHead className="text-right">المدين</TableHead>
                      <TableHead className="text-right">الدائن</TableHead>
                      <TableHead className="text-center no-print">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <>
                        <TableRow key={entry.id} className="hover:bg-muted/50">
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
                          <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                          <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
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
                            <TableCell colSpan={7} className="bg-muted/20 p-0">
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
                      </>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>

        {/* Print Template */}
        {selectedEntry && (
          <div className="print-content">
            <div className="max-w-4xl mx-auto bg-white p-8" dir="rtl">
              <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                <h1 className="text-3xl font-bold mb-2">سند قيد يومية</h1>
                <h2 className="text-xl text-gray-600">Journal Entry Voucher</h2>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded">
                <div>
                  <div className="text-sm text-gray-600">رقم القيد</div>
                  <div className="font-bold text-lg">{selectedEntry.entryNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">التاريخ</div>
                  <div className="font-bold text-lg">
                    {format(new Date(selectedEntry.date), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">البيان / Description</div>
                  <div className="font-bold text-lg">{selectedEntry.description || '-'}</div>
                </div>
              </div>

              <table className="w-full border-collapse border-2 border-gray-800 mb-6">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="border border-gray-800 p-3 text-right">
                      رمز الحساب<br/>Account Code
                    </th>
                    <th className="border border-gray-800 p-3 text-right">
                      اسم الحساب<br/>Account Name
                    </th>
                    <th className="border border-gray-800 p-3 text-right">
                      البيان<br/>Description
                    </th>
                    <th className="border border-gray-800 p-3 text-right">
                      الفرع<br/>Branch
                    </th>
                    <th className="border border-gray-800 p-3 text-right">
                      المدين<br/>Debit
                    </th>
                    <th className="border border-gray-800 p-3 text-right">
                      الدائن<br/>Credit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntry.lines.map((line: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-3">{line.accountCode}</td>
                      <td className="border border-gray-300 p-3">{line.accountName}</td>
                      <td className="border border-gray-300 p-3">{line.description}</td>
                      <td className="border border-gray-300 p-3">{line.branchName || '-'}</td>
                      <td className="border border-gray-300 p-3 text-red-600 font-bold">
                        {line.debit > 0 ? line.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="border border-gray-300 p-3 text-green-600 font-bold">
                        {line.credit > 0 ? line.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold text-lg">
                    <td colSpan={4} className="border border-gray-800 p-3 text-left">
                      الإجمالي / Total
                    </td>
                    <td className="border border-gray-800 p-3 text-red-600">
                      {selectedEntry.totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border border-gray-800 p-3 text-green-600">
                      {selectedEntry.totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-300">
                <div className="text-center">
                  <div className="border-t-2 border-gray-800 pt-2 mt-16">
                    <div className="font-bold">المحاسب</div>
                    <div className="text-sm text-gray-600">Accountant</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-gray-800 pt-2 mt-16">
                    <div className="font-bold">المدير المالي</div>
                    <div className="text-sm text-gray-600">Financial Manager</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-gray-800 pt-2 mt-16">
                    <div className="font-bold">المعتمد</div>
                    <div className="text-sm text-gray-600">Approved By</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center text-sm text-gray-500">
                <div>تاريخ الطباعة: {format(new Date(), 'dd/MM/yyyy')} - {new Date().toLocaleTimeString('en-US')}</div>
                <div>Print Date: {new Date().toLocaleDateString('en-US')} - {new Date().toLocaleTimeString('en-US')}</div>
              </div>
            </div>
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
                <div className="grid grid-cols-3 gap-4 p-4 bg-accent/50 rounded-lg">
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
                          <TableHead className="text-right min-w-[200px]">البيان</TableHead>
                          <TableHead className="text-right min-w-[120px]">المدين</TableHead>
                          <TableHead className="text-right min-w-[120px]">الدائن</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editingEntry.lines.map((line: any) => {
                          const searchState = getSearchState(line.id);
                          const level4Accounts = accounts.filter(acc => calculateLevel(acc) === 4);
                          const filteredAccounts = searchState.accountSearch.length > 0 
                            ? level4Accounts.filter(acc => 
                                acc.code.includes(searchState.accountSearch) || 
                                acc.name_ar.includes(searchState.accountSearch)
                              )
                            : level4Accounts;

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
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={2} className="text-left">
                            الإجمالي / Total
                          </TableCell>
                          <TableCell className="text-red-600">
                            {editingEntry.lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {editingEntry.lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default JournalEntries;
