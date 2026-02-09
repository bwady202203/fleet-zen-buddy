import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowRight, FileSpreadsheet, Languages, Loader2, Check, X, Copy, Trash2, Search, Save } from "lucide-react";
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

  const handleParseBankStatement = (text: string) => {
    setBankStatementData(text);
    
    if (!text.trim()) {
      setParsedBankStatements([]);
      return;
    }

    const lines = text.split('\n').filter(line => line.trim());
    const parsed: BankStatementRow[] = [];

    for (const line of lines) {
      // Try to parse each line
      const parts = line.split('\t');
      
      if (parts.length >= 2) {
        // Find date pattern (DD/MM/YYYY or YYYY-MM-DD or similar)
        const dateMatch = line.match(/(\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4})/);
        const date = dateMatch ? dateMatch[1] : '';
        
        // Find numeric values (potential amounts) - supports both comma and dot as decimal
        const numberMatches = line.match(/[\d.,]+/g) || [];
        const validNumbers: number[] = [];
        
        for (const match of numberMatches) {
          // Skip if it looks like a date part
          if (match.match(/^\d{1,4}$/) && dateMatch && dateMatch[0].includes(match)) {
            continue;
          }
          const num = parseLocalizedNumber(match);
          if (num > 0 && num < 1000000000) {
            validNumbers.push(num);
          }
        }
        
        // Determine debit/credit based on position or context
        let debit = 0;
        let credit = 0;
        let balance = 0;

        if (validNumbers.length >= 3) {
          // Assume: debit, credit, balance
          debit = validNumbers[0] || 0;
          credit = validNumbers[1] || 0;
          balance = validNumbers[2] || 0;
        } else if (validNumbers.length === 2) {
          // Assume: amount, balance
          if (line.toLowerCase().includes('credit') || line.includes('إيداع') || line.includes('CR')) {
            credit = validNumbers[0];
          } else {
            debit = validNumbers[0];
          }
          balance = validNumbers[1];
        } else if (validNumbers.length === 1) {
          // Single amount - check context
          if (line.toLowerCase().includes('credit') || line.includes('إيداع') || line.includes('CR')) {
            credit = validNumbers[0];
          } else {
            debit = validNumbers[0];
          }
        }

        // Extract reference number if present
        const refMatch = line.match(/REF\s*([A-Z0-9]+)/i) || line.match(/(\d{10,})/);
        const reference = refMatch ? refMatch[1] : '';

        // Description is the remaining text
        let description = line
          .replace(dateMatch?.[0] || '', '')
          .replace(/[\d.,]+/g, '')
          .replace(/REF\s*[A-Z0-9]+/gi, '')
          .replace(/\t+/g, ' ')
          .trim();

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

  const filteredAccounts = accountSearch
    ? accounts.filter(a => 
        a.name_ar.includes(accountSearch) || 
        a.code.includes(accountSearch) ||
        a.name_en.toLowerCase().includes(accountSearch.toLowerCase())
      )
    : accounts;

  const handleSaveAsJournalEntry = async () => {
    const rowsWithAccounts = parsedBankStatements.filter(r => r.selectedAccountId);
    
    if (rowsWithAccounts.length === 0) {
      toast.error("لا توجد عمليات محددة للحفظ");
      return;
    }

    setIsSaving(true);
    try {
      // Get next entry number
      const currentYear = new Date().getFullYear();
      const { data: existingEntries } = await supabase
        .from("journal_entries")
        .select("entry_number")
        .like("entry_number", `JE-${currentYear}%`)
        .order("entry_number", { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (existingEntries && existingEntries.length > 0) {
        const lastNumber = parseInt(existingEntries[0].entry_number.slice(-6)) || 0;
        nextNumber = lastNumber + 1;
      }
      const entryNumber = `JE-${currentYear}${nextNumber.toString().padStart(6, '0')}`;

      // Create journal entry
      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          date: entryDate,
          description: entryDescription || "استيراد كشف حساب بنكي",
          reference: "bank_statement_import",
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal entry lines
      const lines = rowsWithAccounts.map(row => ({
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

      toast.success(`تم حفظ القيد رقم ${entryNumber} بنجاح`);
      
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
              حفظ كقيد ({selectedCount} عملية)
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
              <label className="text-sm font-medium">الصق بيانات كشف الحساب البنكي:</label>
              {parsedBankStatements.length > 0 && (
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

        {/* Parsed Data Table */}
        {parsedBankStatements.length > 0 && (
          <Card className="overflow-hidden">
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
                <span className="text-gray-500">
                  تم اختيار حساب لـ {selectedCount} من {parsedBankStatements.length} عملية
                </span>
              </div>
            </div>
            
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-3 text-right border-b w-10">#</th>
                    <th className="p-3 text-right border-b w-28">التاريخ</th>
                    <th className="p-3 text-left border-b w-32">مدين (خصم)</th>
                    <th className="p-3 text-left border-b w-32">دائن (إيداع)</th>
                    <th className="p-3 text-right border-b">التفاصيل</th>
                    <th className="p-3 text-right border-b w-56">الحساب</th>
                    <th className="p-3 text-center border-b w-12"></th>
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
                        <td className="p-3 text-gray-500">{index + 1}</td>
                        <td className="p-3 text-xs">{row.date || '-'}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={row.debit || ""}
                            onChange={(e) => handleUpdateRow(index, 'debit', e.target.value)}
                            className={cn(
                              "h-8 text-left text-xs font-mono",
                              row.debit > 0 && "bg-red-50 border-red-200"
                            )}
                            placeholder="0"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={row.credit || ""}
                            onChange={(e) => handleUpdateRow(index, 'credit', e.target.value)}
                            className={cn(
                              "h-8 text-left text-xs font-mono",
                              row.credit > 0 && "bg-green-50 border-green-200"
                            )}
                            placeholder="0"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={row.description}
                            onChange={(e) => handleUpdateRow(index, 'description', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="الوصف..."
                          />
                        </td>
                        <td className="p-3 relative">
                          {activeRowIndex === index ? (
                            <div className="space-y-1">
                              <Input
                                placeholder="ابحث عن حساب..."
                                value={accountSearch}
                                onChange={(e) => setAccountSearch(e.target.value)}
                                className="h-8 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setActiveRowIndex(null);
                                    setAccountSearch("");
                                  }
                                }}
                              />
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
