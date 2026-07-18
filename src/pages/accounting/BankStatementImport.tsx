import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowRight, FileSpreadsheet, Languages, Loader2, Check, X, Copy, Trash2, Search, Save, RefreshCcw, Mic, MicOff, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  level: number;
  type: string;
}

interface BankStatementRow {
  date: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  reference: string;
  selectedAccountId: string | null;
}

// Get background color based on account type
const getAccountTypeColor = (type: string): string => {
  switch (type) {
    case 'asset':
      return "bg-emerald-50 hover:bg-emerald-100 border-emerald-200";
    case 'liability':
      return "bg-rose-50 hover:bg-rose-100 border-rose-200";
    case 'equity':
      return "bg-purple-50 hover:bg-purple-100 border-purple-200";
    case 'revenue':
      return "bg-sky-50 hover:bg-sky-100 border-sky-200";
    case 'expense':
      return "bg-amber-50 hover:bg-amber-100 border-amber-200";
    default:
      return "bg-gray-50 hover:bg-gray-100 border-gray-200";
  }
};

export default function BankStatementImport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankStatementData, setBankStatementData] = useState("");
  const [parsedBankStatements, setParsedBankStatements] = useState<BankStatementRow[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [expandedDescriptionIndex, setExpandedDescriptionIndex] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entryDescription, setEntryDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quickCategory, setQuickCategory] = useState<string>('all');
  const [quickAccountIds, setQuickAccountIds] = useState<string[]>([]);
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const [dragOverRow, setDragOverRow] = useState<number | null>(null);

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("المتصفح لا يدعم البحث الصوتي. استخدم Chrome أو Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      setIsListening(false);
      toast.error("خطأ في الإدخال الصوتي: " + (e.error || ""));
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      setAccountSearch(transcript);
      toast.success(`تم: "${transcript}"`);
    };
    recognition.start();
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name_ar, name_en, level, type")
        .eq("level", 4)
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast.error("خطأ في تحميل الحسابات: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Locale-aware number parsing function
  const parseLocalizedNumber = (value: string, useCommaDecimal?: boolean): number => {
    if (!value || value === "") return 0;

    let str = String(value).trim();

    // Remove currency symbols and whitespace
    str = str.replace(/[¤$\u20AC£¥\s]/g, "");

    // Auto-detect format if not specified
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");

    const isCommaDecimal = useCommaDecimal ?? (lastComma > lastDot);

    if (isCommaDecimal) {
      // Comma as decimal: 1.234,56
      str = str.replace(/\./g, ""); // Remove thousand separators
      str = str.replace(",", "."); // Convert decimal separator
    } else {
      // Dot as decimal: 1,234.56
      str = str.replace(/,/g, ""); // Remove thousand separators
    }

    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to normalize column names for matching
  const normalizeColumnName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[_\s]+/g, " ")
      .trim();
  };

  // Find column index by possible names
  const findColumnIndex = (headers: string[], possibleNames: string[]): number => {
    const normalizedHeaders = headers.map(h => h ? normalizeColumnName(String(h)) : "");
    const normalizedNames = possibleNames.map(normalizeColumnName);

    // Priority 1: Exact match
    for (const name of normalizedNames) {
      const idx = normalizedHeaders.indexOf(name);
      if (idx !== -1) return idx;
    }

    // Priority 2: Contains
    for (const name of normalizedNames) {
      const idx = normalizedHeaders.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }

    return -1;
  };

  const handleParseBankStatement = (text: string) => {
    setBankStatementData(text);
    
    if (!text.trim()) {
      setParsedBankStatements([]);
      return;
    }

    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      setParsedBankStatements([]);
      return;
    }

    // First line might be headers - detect column positions
    const headerLine = lines[0].split('\t');
    
    // Try to find column indices dynamically
    let debitColIndex = findColumnIndex(headerLine, ['مبلغ الخصم', 'خصم', 'debit', 'withdrawal', 'مدين']);
    let creditColIndex = findColumnIndex(headerLine, ['مبلغ الايداع', 'مبلغ الإيداع', 'ايداع', 'إيداع', 'credit', 'deposit', 'دائن']);
    let balanceColIndex = findColumnIndex(headerLine, ['الرصيد', 'رصيد', 'balance']);
    let descColIndex = findColumnIndex(headerLine, ['البيان', 'الوصف', 'تفاصيل', 'description', 'details']);
    let dateColIndex = findColumnIndex(headerLine, ['التاريخ', 'تاريخ', 'date']);

    // Check if first line is a header (has column names, no numbers)
    const firstLineHasNumbers = headerLine.some(cell => parseLocalizedNumber(cell) > 0);
    const startIndex = firstLineHasNumbers ? 0 : 1;

    // If no header detection worked, use fallback positions
    if (debitColIndex === -1 && creditColIndex === -1) {
      // Fallback: assume last 3 columns are debit, credit, balance
      if (headerLine.length >= 3) {
        debitColIndex = headerLine.length - 3;
        creditColIndex = headerLine.length - 2;
        balanceColIndex = headerLine.length - 1;
      }
    }

    const parsed: BankStatementRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split('\t');
      
      if (parts.length >= 2) {
        // Find date
        let date = '';
        if (dateColIndex !== -1 && parts[dateColIndex]) {
          date = parts[dateColIndex].trim();
        } else {
          const dateMatch = line.match(/(\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4})/);
          date = dateMatch ? dateMatch[1] : '';
        }
        
        // Get debit and credit from detected columns
        let debit = 0;
        let credit = 0;
        let balance = 0;

        if (debitColIndex !== -1 && parts[debitColIndex]) {
          debit = parseLocalizedNumber(parts[debitColIndex].trim());
        }
        if (creditColIndex !== -1 && parts[creditColIndex]) {
          credit = parseLocalizedNumber(parts[creditColIndex].trim());
        }
        if (balanceColIndex !== -1 && parts[balanceColIndex]) {
          balance = parseLocalizedNumber(parts[balanceColIndex].trim());
        }

        // Get description
        let description = '';
        if (descColIndex !== -1 && parts[descColIndex]) {
          description = parts[descColIndex].trim();
        } else {
          // Take non-numeric columns as description
          const descParts = parts.filter((p, idx) => 
            idx !== debitColIndex && 
            idx !== creditColIndex && 
            idx !== balanceColIndex &&
            idx !== dateColIndex &&
            parseLocalizedNumber(p) === 0
          );
          description = descParts.join(' ').trim();
        }

        // Extract reference number if present
        const refMatch = line.match(/REF\s*([A-Z0-9]+)/i) || line.match(/(\d{10,})/);
        const reference = refMatch ? refMatch[1] : '';

        if (date || debit > 0 || credit > 0) {
          parsed.push({
            date,
            debit,
            credit,
            balance,
            description,
            reference,
            selectedAccountId: null,
          });
        }
      }
    }

    setParsedBankStatements(parsed);
  };


  const handleTranslateDescriptions = async () => {
    if (parsedBankStatements.length === 0) return;

    setIsTranslating(true);
    try {
      const descriptions = parsedBankStatements.map(r => r.description).filter(d => d.trim());
      
      const response = await supabase.functions.invoke('translate-text', {
        body: { 
          texts: descriptions,
          targetLanguage: 'ar'
        }
      });

      if (response.data?.translations) {
        let translationIndex = 0;
        setParsedBankStatements(prev => prev.map(row => {
          if (row.description.trim()) {
            const translated = response.data.translations[translationIndex] || row.description;
            translationIndex++;
            return { ...row, description: translated };
          }
          return row;
        }));
        toast.success("تم ترجمة التفاصيل بنجاح");
      }
    } catch (error: any) {
      toast.error("خطأ في الترجمة: " + error.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSelectAccount = (rowIndex: number, accountId: string) => {
    setParsedBankStatements(prev => prev.map((row, i) => 
      i === rowIndex ? { ...row, selectedAccountId: accountId } : row
    ));
    setActiveRowIndex(null);
    setAccountSearch("");
  };

  const handleDeleteRow = (index: number) => {
    setParsedBankStatements(prev => prev.filter((_, i) => i !== index));
    if (activeRowIndex === index) {
      setActiveRowIndex(null);
    }
    toast.success("تم حذف السجل");
  };

  const handleCopyAccountToNext = (index: number) => {
    const currentRow = parsedBankStatements[index];
    if (currentRow?.selectedAccountId && index < parsedBankStatements.length - 1) {
      setParsedBankStatements(prev => prev.map((row, i) => 
        i === index + 1 ? { ...row, selectedAccountId: currentRow.selectedAccountId } : row
      ));
      toast.success("تم نسخ الحساب للصف التالي");
    }
  };

  const handleUpdateRow = (index: number, field: 'debit' | 'credit' | 'description', value: string) => {
    setParsedBankStatements(prev => prev.map((row, i) => {
      if (i !== index) return row;
      if (field === 'description') {
        return { ...row, description: value };
      }
      const numValue = parseFloat(value) || 0;
      return { ...row, [field]: numValue };
    }));
  };

  // Riyadh Bank Al-Remal account ID
  const RIYADH_BANK_ACCOUNT_ID = "2edc3d0d-7582-4173-81f2-4b547ad32874";

  const handleCreateMirrorRows = () => {
    if (parsedBankStatements.length === 0) {
      toast.error("لا توجد صفوف لإنشاء صفوف معكوسة");
      return;
    }

    // Create mirror rows with reversed debit/credit and Riyadh Bank account
    const mirrorRows: BankStatementRow[] = parsedBankStatements.map(row => ({
      date: row.date,
      debit: row.credit, // Swap: original credit becomes debit
      credit: row.debit, // Swap: original debit becomes credit
      balance: 0,
      description: row.description,
      reference: row.reference,
      selectedAccountId: RIYADH_BANK_ACCOUNT_ID,
    }));

    // Add mirror rows to the list
    setParsedBankStatements(prev => [...prev, ...mirrorRows]);
    toast.success(`تم إنشاء ${mirrorRows.length} صف معكوس بحساب بنك الرياض الرمال`);
  };

  const filteredAccounts = accountSearch
    ? accounts.filter(a => 
        a.name_ar.includes(accountSearch) || 
        a.code.includes(accountSearch) ||
        a.name_en.toLowerCase().includes(accountSearch.toLowerCase())
      )
    : accounts;

  // Normalize any date string to yyyy-MM-dd; fallback to entryDate
  const normalizeDate = (raw: string): string => {
    if (!raw) return entryDate;
    const s = raw.trim();
    // yyyy-mm-dd or yyyy/mm/dd
    let m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    // dd-mm-yyyy or dd/mm/yyyy
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
    return entryDate;
  };

  const handleSaveAsJournalEntry = async () => {
    const rowsWithAccounts = parsedBankStatements.filter(r => r.selectedAccountId);
    
    if (rowsWithAccounts.length === 0) {
      toast.error("لا توجد عمليات محددة للحفظ - يرجى اختيار حساب لكل عملية");
      return;
    }

    // Group rows by normalized date
    const groups = new Map<string, BankStatementRow[]>();
    for (const row of rowsWithAccounts) {
      const d = normalizeDate(row.date);
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(row);
    }

    // Validate balance per group
    const unbalanced: string[] = [];
    for (const [d, rows] of groups) {
      const td = rows.reduce((s, r) => s + r.debit, 0);
      const tc = rows.reduce((s, r) => s + r.credit, 0);
      if (Math.abs(td - tc) > 0.01) {
        unbalanced.push(`${d} (مدين: ${td.toLocaleString()} | دائن: ${tc.toLocaleString()})`);
      }
    }
    if (unbalanced.length > 0) {
      toast.error(`قيود غير متوازنة في التواريخ التالية: ${unbalanced.join(' ، ')}`);
      return;
    }

    setIsSaving(true);
    try {
      const sortedDates = Array.from(groups.keys()).sort();
      const savedNumbers: string[] = [];

      for (const dateKey of sortedDates) {
        const rows = groups.get(dateKey)!;
        const yearOfEntry = new Date(dateKey).getFullYear();

        // Get next entry number for this year
        const { data: existingEntries } = await supabase
          .from("journal_entries")
          .select("entry_number")
          .like("entry_number", `JE-${yearOfEntry}%`)
          .order("entry_number", { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (existingEntries && existingEntries.length > 0) {
          const lastNumber = parseInt(existingEntries[0].entry_number.slice(-6)) || 0;
          nextNumber = lastNumber + 1;
        }
        const entryNumber = `JE-${yearOfEntry}${nextNumber.toString().padStart(6, '0')}`;

        const { data: journalEntry, error: entryError } = await supabase
          .from("journal_entries")
          .insert({
            entry_number: entryNumber,
            date: dateKey,
            description: entryDescription || `استيراد كشف حساب بنكي - ${dateKey}`,
            reference: "bank_statement_import",
          })
          .select()
          .single();

        if (entryError) throw entryError;

        const lines = rows.map(row => ({
          journal_entry_id: journalEntry.id,
          account_id: row.selectedAccountId,
          debit: row.debit,
          credit: row.credit,
          description: row.description,
        }));

        const { error: linesError } = await supabase
          .from("journal_entry_lines")
          .insert(lines);

        if (linesError) throw linesError;
        savedNumbers.push(entryNumber);
      }

      toast.success(`تم حفظ ${savedNumbers.length} قيد بنجاح (${savedNumbers.join('، ')})`);
      
      // Clear form
      setBankStatementData("");
      setParsedBankStatements([]);
      setEntryDescription("");
      
    } catch (error: any) {
      toast.error("خطأ في حفظ القيد: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalDebit = parsedBankStatements.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = parsedBankStatements.reduce((sum, r) => sum + r.credit, 0);
  const selectedCount = parsedBankStatements.filter(r => r.selectedAccountId).length;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const balanceDifference = totalDebit - totalCredit;

  // Per-date grouping summary (each date = one journal entry)
  const dateGroups = (() => {
    const map = new Map<string, { debit: number; credit: number; count: number; withAccount: number }>();
    for (const r of parsedBankStatements) {
      const d = normalizeDate(r.date);
      const cur = map.get(d) || { debit: 0, credit: 0, count: 0, withAccount: 0 };
      cur.debit += r.debit;
      cur.credit += r.credit;
      cur.count += 1;
      if (r.selectedAccountId) cur.withAccount += 1;
      map.set(d, cur);
    }
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, ...v, balanced: Math.abs(v.debit - v.credit) < 0.01 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/accounting')} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              رجوع
            </Button>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-teal-600" />
              <h1 className="text-xl font-semibold text-gray-900">استيراد كشف حساب بنكي</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-40"
            />
            <Button
              onClick={handleSaveAsJournalEntry}
              disabled={selectedCount === 0 || isSaving}
              className="bg-blue-500 hover:bg-blue-600 gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ {dateGroups.length > 1 ? `${dateGroups.length} قيود` : 'كقيد'} ({selectedCount} عملية)
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Paste Area */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">الصق بيانات كشف الحساب البنكي:</label>
                <span className="text-xs text-muted-foreground font-light">
                  (قم بنسخ الجدول من البنك أو ملف إكسيل ولصقه هنا. يدعم النظام التعرف التلقائي على أعمدة: التاريخ، المدين، الدائن، الوصف، والوصول إلى 10 أعمدة)
                </span>
              </div>
              {parsedBankStatements.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateMirrorRows}
                    className="gap-2 text-teal-600 border-teal-200 hover:bg-teal-50"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    إنشاء صفوف معكوسة (بنك الرياض)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTranslateDescriptions}
                    disabled={isTranslating}
                    className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري الترجمة...
                      </>
                    ) : (
                      <>
                        <Languages className="h-4 w-4" />
                        ترجمة التفاصيل للعربية
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            <textarea
              className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="انسخ بيانات كشف الحساب من البنك والصقها هنا..."
              value={bankStatementData}
              onChange={(e) => handleParseBankStatement(e.target.value)}
              dir="ltr"
            />
          </div>
        </Card>

        {/* Entry Description */}
        {parsedBankStatements.length > 0 && (
          <Card className="p-4">
            <Input
              placeholder="وصف القيد (اختياري)..."
              value={entryDescription}
              onChange={(e) => setEntryDescription(e.target.value)}
              className="text-lg"
            />
          </Card>
        )}

        {/* Per-Date Grouping Summary */}
        {dateGroups.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                ملخص القيود حسب التاريخ ({dateGroups.length} {dateGroups.length > 1 ? 'قيود' : 'قيد'})
              </span>
              <span className="text-xs text-gray-500">سيتم إنشاء قيد مستقل لكل تاريخ، ويجب أن يكون المدين = الدائن لكل تاريخ</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {dateGroups.map(g => (
                <div
                  key={g.date}
                  className={cn(
                    "border rounded-lg p-2 text-xs",
                    g.balanced ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  )}
                >
                  <div className="flex items-center justify-between font-medium mb-1">
                    <span>{g.date}</span>
                    <span className={g.balanced ? "text-green-700" : "text-red-700"}>
                      {g.balanced ? "✓ متوازن" : `✗ فرق ${(g.debit - g.credit).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600">
                    <span>مدين: <span className="font-mono text-red-600">{g.debit.toLocaleString()}</span></span>
                    <span>دائن: <span className="font-mono text-green-600">{g.credit.toLocaleString()}</span></span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {g.count} عملية · محدد {g.withAccount}/{g.count}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}



        {/* Parsed Data Table */}
        {parsedBankStatements.length > 0 && (
          <div className="flex gap-3" dir="rtl">
            {/* Accounts Sidebar */}
            <Card className={cn(
              "self-start sticky top-2 overflow-hidden flex flex-col max-h-[85vh] transition-all duration-300",
              sidebarExpanded ? "w-80" : "w-12"
            )}>
              <div className={cn(
                "border-b bg-blue-50/50 flex items-center transition-all",
                sidebarExpanded ? "p-2 justify-between" : "p-1 justify-center h-12"
              )}>
                {sidebarExpanded && (
                  <div className="text-sm font-semibold text-gray-700">
                    الحسابات ({accounts.length}) — اسحب للإفلات
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setSidebarExpanded(v => !v)}
                  title={sidebarExpanded ? "تصغير" : "توسيع"}
                >
                  {sidebarExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
              </div>
              {sidebarExpanded && (
                <>
                  <div className="p-2 border-b bg-blue-50/50">
                    <Input
                      placeholder="ابحث..."
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="flex flex-wrap gap-1 mt-2">
                      {[
                        { key: 'all', label: 'الكل' },
                        { key: 'asset', label: 'أصول' },
                        { key: 'liability', label: 'خصوم' },
                        { key: 'equity', label: 'حقوق' },
                        { key: 'revenue', label: 'إيرادات' },
                        { key: 'expense', label: 'مصروفات' },
                      ].map(c => (
                        <button
                          key={c.key}
                          onClick={() => setQuickCategory(c.key)}
                          className={cn(
                            "px-2 py-0.5 text-[11px] rounded-full border transition",
                            quickCategory === c.key
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-1.5 grid grid-cols-4 gap-1.5 auto-rows-[76px] content-start">
                    {accounts
                      .filter(a => quickCategory === 'all' || a.type === quickCategory)
                      .filter(a => {
                        const q = sidebarSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (a.name_ar || '').toLowerCase().includes(q) ||
                               (a.code || '').toLowerCase().includes(q);
                      })
                      .map(a => (
                        <div
                          key={a.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/account-id', a.id);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() => {
                            let targetIndex = activeRowIndex;
                            if (targetIndex === null || targetIndex === undefined) {
                              targetIndex = parsedBankStatements.findIndex(r => !r.selectedAccountId);
                            }
                            if (targetIndex === -1 || targetIndex === null) {
                              toast.error("لا يوجد صف متاح للإدراج");
                              return;
                            }
                            handleSelectAccount(targetIndex, a.id);
                            toast.success(`تم إدراج ${a.name_ar}`);
                          }}
                          className={cn(
                            "h-full w-full min-w-0 p-1 text-[10px] rounded border cursor-pointer hover:shadow-md transition flex flex-col items-center justify-center text-center gap-0.5 overflow-hidden",
                            getAccountTypeColor(a.type)
                          )}
                          title={`${a.code} - ${a.name_ar} — انقر للإدراج أو اسحب`}
                        >
                          <span className="leading-tight font-medium text-gray-900 break-words max-h-9 overflow-hidden">{a.name_ar || a.name_en || 'بدون اسم'}</span>
                          <span className="text-[9px] text-gray-600 shrink-0 truncate max-w-full">{a.code}</span>
                        </div>

                      ))}
                  </div>
                </>
              )}
            </Card>

            <Card className="overflow-hidden flex-1 min-w-0">
            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
              <span className="font-medium flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-teal-600" />
                العمليات المكتشفة ({parsedBankStatements.length} عملية)
              </span>
              <div className="flex gap-4 text-sm">
                <span>
                  إجمالي الخصم: <span className="font-mono text-red-600">{totalDebit.toLocaleString()}</span>
                </span>
                <span>
                  إجمالي الإيداع: <span className="font-mono text-green-600">{totalCredit.toLocaleString()}</span>
                </span>
                <span className={cn(
                  "font-medium px-2 py-1 rounded",
                  isBalanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {isBalanced ? "✓ متوازن" : `✗ فرق: ${balanceDifference.toLocaleString()}`}
                </span>
                <span className="text-gray-500">
                  تم اختيار حساب لـ {selectedCount} من {parsedBankStatements.length} عملية
                </span>
              </div>
            </div>

            {/* Info bar */}
            <div className="p-2 bg-blue-50/50 border-b text-xs text-gray-600">
              اسحب أي حساب من اللوحة الجانبية وأفلته على حقل "اختر حساب" في أي صف
            </div>


            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-1.5 text-right border-b w-8">#</th>
                    
                    <th className="p-1.5 text-right border-b w-24">التاريخ</th>
                    <th className="p-1.5 text-left border-b w-24">مدين</th>
                    <th className="p-1.5 text-left border-b w-24">دائن</th>
                    <th className="p-1.5 text-right border-b w-40">التفاصيل</th>
                    <th className="p-1.5 text-right border-b w-52">الحساب</th>
                    <th className="p-1.5 text-center border-b w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedBankStatements.map((row, index) => {
                    const selectedAccount = row.selectedAccountId 
                      ? accounts.find(a => a.id === row.selectedAccountId)
                      : null;
                    
                    return (
                      <tr key={index} className={cn(
                        "border-b hover:bg-gray-50 group",
                        activeRowIndex === index && "bg-blue-50"
                      )}>
                        <td className="p-1.5 text-gray-500 text-xs">{index + 1}</td>
                        <td className="p-1.5 text-xs whitespace-nowrap">{row.date || '-'}</td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            value={row.debit || ""}
                            onChange={(e) => handleUpdateRow(index, 'debit', e.target.value)}
                            className={cn(
                              "h-7 text-left text-xs font-mono px-1",
                              row.debit > 0 && "bg-red-50 border-red-200"
                            )}
                            placeholder="0"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            value={row.credit || ""}
                            onChange={(e) => handleUpdateRow(index, 'credit', e.target.value)}
                            className={cn(
                              "h-7 text-left text-xs font-mono px-1",
                              row.credit > 0 && "bg-green-50 border-green-200"
                            )}
                            placeholder="0"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            value={row.description}
                            onChange={(e) => handleUpdateRow(index, 'description', e.target.value)}
                            className="h-7 text-xs px-1"
                            placeholder="..."
                          />
                        </td>
                        <td
                          className={cn(
                            "p-1.5 relative",
                            dragOverRow === index && "bg-blue-100 ring-2 ring-blue-400"
                          )}
                          onDragOver={(e) => {
                            if (e.dataTransfer.types.includes('text/account-id')) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'copy';
                              if (dragOverRow !== index) setDragOverRow(index);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverRow === index) setDragOverRow(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const accId = e.dataTransfer.getData('text/account-id');
                            setDragOverRow(null);
                            if (accId) {
                              handleSelectAccount(index, accId);
                              const acc = accounts.find(a => a.id === accId);
                              if (acc) toast.success(`تم إدراج: ${acc.name_ar}`);
                            }
                          }}
                        >
                          {activeRowIndex === index ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Input
                                  placeholder="ابحث عن حساب..."
                                  value={accountSearch}
                                  onChange={(e) => setAccountSearch(e.target.value)}
                                  className="h-8 text-xs flex-1"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      setActiveRowIndex(null);
                                      setAccountSearch("");
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant={isListening ? "destructive" : "outline"}
                                  size="sm"
                                  className="h-10 w-10 p-0 shrink-0"
                                  onClick={startVoiceSearch}
                                  title="بحث صوتي"
                                >
                                  {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                                </Button>
                              </div>
                              {filteredAccounts.length > 0 && (
                                <div 
                                  className={cn(
                                    "absolute z-[100] bg-white border rounded-lg shadow-xl max-h-48 overflow-auto w-64 right-3",
                                    index >= parsedBankStatements.length - 5 ? "bottom-full mb-1" : "top-full mt-1"
                                  )}
                                >
                                  {filteredAccounts.slice(0, 20).map(account => (
                                    <button
                                      key={account.id}
                                      className={cn(
                                        "w-full text-right px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between",
                                        getAccountTypeColor(account.type)
                                      )}
                                      onClick={() => handleSelectAccount(index, account.id)}
                                    >
                                      <span>{account.name_ar}</span>
                                      <span className="text-gray-400">{account.code}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button
                                variant={selectedAccount ? "outline" : "ghost"}
                                size="sm"
                                className={cn(
                                  "h-8 text-xs gap-1 flex-1 justify-between",
                                  selectedAccount && "border-green-300 bg-green-50 text-green-700"
                                )}
                                onClick={() => {
                                  setActiveRowIndex(index);
                                  setAccountSearch("");
                                }}
                              >
                                {selectedAccount ? (
                                  <>
                                    <span className="truncate">{selectedAccount.name_ar}</span>
                                    <span className="text-gray-400">{selectedAccount.code}</span>
                                  </>
                                ) : (
                                  <span className="text-gray-400">اختر حساب</span>
                                )}
                              </Button>
                              {selectedAccount && index < parsedBankStatements.length - 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-violet-600 border-violet-200 hover:bg-violet-50"
                                  onClick={() => handleCopyAccountToNext(index)}
                                  title="نسخ الحساب للصف التالي"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteRow(index)}
                            title="حذف السجل"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {parsedBankStatements.length === 0 && !bankStatementData && (
          <Card className="p-12 text-center text-gray-500">
            <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">لا توجد بيانات</h3>
            <p>الصق بيانات كشف الحساب البنكي في المربع أعلاه للبدء</p>
          </Card>
        )}
      </div>
    </div>
  );
}
