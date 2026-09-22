import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Eye, Printer, Search, X, Plus, Star, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toHijri } from "hijri-converter";

// Local storage key for favorite accounts
const FAVORITE_ACCOUNTS_KEY = "ledger_favorite_accounts";

// Helper function to format numbers with thousand separators
const formatNumber = (num: number): string => {
  return num.toLocaleString('ar-SA', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىئ]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/\s+/g, " ")
    .trim();

const toDisplayDate = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
};

// Helper function to get current Hijri date
const getHijriDate = (): string => {
  const today = new Date();
  const hijri = toHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());
  return `${hijri.hd}/${hijri.hm}/${hijri.hy} هـ`;
};

// Helper function to get current time
const getCurrentTime = (): string => {
  return new Date().toLocaleTimeString('ar-SA', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Helper function to get current Gregorian date
const getGregorianDate = (): string => {
  return new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Custom hook for debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
}

interface Branch {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
}

interface LedgerEntry {
  id: string;
  journal_entry_id: string;
  entry_date: string;
  description: string | null;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number;
  branch_name?: string;
}

interface JournalEntryDetail {
  id: string;
  entry_number: string;
  date: string;
  description: string | null;
  lines: {
    id: string;
    account_code: string;
    account_name: string;
    description: string | null;
    debit: number;
    credit: number;
    branch_name?: string;
    cost_center_name?: string;
    project_name?: string;
  }[];
}

// Favorite account interface
interface FavoriteAccount {
  id: string;
  code: string;
  name_ar: string;
}

export default function LedgerNew() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [accountSearchQuery, setAccountSearchQuery] = useState<string>("");
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<JournalEntryDetail | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  
  // Favorite accounts state
  const [favoriteAccounts, setFavoriteAccounts] = useState<FavoriteAccount[]>([]);
  const [addFavoritePopoverOpen, setAddFavoritePopoverOpen] = useState(false);
  const [favoriteSearchQuery, setFavoriteSearchQuery] = useState("");
  const debouncedFavoriteSearch = useDebounce(favoriteSearchQuery, 300);
  
  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(accountSearchQuery, 300);

  // Load favorite accounts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(FAVORITE_ACCOUNTS_KEY);
    if (saved) {
      try {
        setFavoriteAccounts(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing favorite accounts:", e);
      }
    }
  }, []);

  // Save favorite accounts to localStorage
  const saveFavoriteAccounts = (favorites: FavoriteAccount[]) => {
    localStorage.setItem(FAVORITE_ACCOUNTS_KEY, JSON.stringify(favorites));
    setFavoriteAccounts(favorites);
  };

  const addFavoriteAccount = (account: Account) => {
    if (favoriteAccounts.some(f => f.id === account.id)) {
      toast.info("الحساب موجود بالفعل في المفضلة");
      return;
    }
    const newFavorite: FavoriteAccount = {
      id: account.id,
      code: account.code,
      name_ar: account.name_ar,
    };
    saveFavoriteAccounts([...favoriteAccounts, newFavorite]);
    setAddFavoritePopoverOpen(false);
    setFavoriteSearchQuery("");
    toast.success("تمت إضافة الحساب للمفضلة");
  };

  const removeFavoriteAccount = (accountId: string) => {
    saveFavoriteAccounts(favoriteAccounts.filter(f => f.id !== accountId));
    toast.success("تمت إزالة الحساب من المفضلة");
  };

  const selectFavoriteAccount = (accountId: string) => {
    setSelectedAccount(accountId);
    setAccountSearchQuery("");
  };

  // Filtered accounts for adding to favorites
  const filteredFavoriteAccounts = useMemo(() => {
    if (!debouncedFavoriteSearch.trim()) return [];
    const query = normalizeText(debouncedFavoriteSearch);
    return accounts.filter(account => 
      (normalizeText(account.name_ar).includes(query) ||
      normalizeText(account.name_en).includes(query) ||
      normalizeText(account.code).includes(query)) &&
      !favoriteAccounts.some(f => f.id === account.id)
    ).slice(0, 10);
  }, [accounts, debouncedFavoriteSearch, favoriteAccounts]);

  useEffect(() => {
    fetchAccounts();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchLedgerEntries();
    }
  }, [selectedAccount, selectedBranch, startDate, endDate]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name_ar, name_en")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast.error("خطأ في جلب الحسابات: " + error.message);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("id, code, name_ar, name_en")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      setBranches(data || []);
    } catch (error: any) {
      toast.error("خطأ في جلب الفروع: " + error.message);
    }
  };

  // Filter accounts based on search query (partial match)
  const filteredAccounts = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return accounts;
    }
    
    const query = normalizeText(debouncedSearchQuery);
    return accounts.filter(account => 
      normalizeText(account.name_ar).includes(query) ||
      normalizeText(account.name_en).includes(query) ||
      normalizeText(account.code).includes(query)
    );
  }, [accounts, debouncedSearchQuery]);

  const fetchLedgerEntries = async () => {
    if (!selectedAccount) return;

    if (startDate && endDate && endDate < startDate) {
      setLedgerEntries([]);
      setOpeningBalance(0);
      toast.error("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
      return;
    }

    setLoading(true);
    try {
      const pageSize = 1000;
      const fetchAllLines = async (openingOnly: boolean) => {
        const allLines: any[] = [];

        for (let from = 0; ; from += pageSize) {
          let query = supabase
            .from("journal_entry_lines")
            .select(`
              id,
              journal_entry_id,
              debit,
              credit,
              description,
              branch_id,
              journal_entries!inner(
                id,
                entry_number,
                date,
                description
              ),
              branches(
                name_ar
              )
            `)
            .eq("account_id", selectedAccount)
            .range(from, from + pageSize - 1);

          if (selectedBranch !== "all") {
            query = query.eq("branch_id", selectedBranch);
          }

          if (openingOnly) {
            query = query.lt("journal_entries.date", startDate);
          } else {
            if (startDate) query = query.gte("journal_entries.date", startDate);
            if (endDate) query = query.lte("journal_entries.date", endDate);
          }

          const { data, error } = await query;
          if (error) throw error;

          const page = data || [];
          allLines.push(...page);
          if (page.length < pageSize) break;
        }

        return allLines;
      };

      const [linesData, openingData] = await Promise.all([
        fetchAllLines(false),
        startDate ? fetchAllLines(true) : Promise.resolve([]),
      ]);

      // Calculate opening balance (entries before start date)
      let calculatedOpeningBalance = 0;
      if (startDate && openingData) {
        calculatedOpeningBalance = openingData.reduce(
          (sum, line) => sum + (Number(line.debit) || 0) - (Number(line.credit) || 0),
          0
        );
      }
      setOpeningBalance(calculatedOpeningBalance);

      // Transform data to ledger entries with running balance
      const entries: LedgerEntry[] = [];
      let runningBalance = calculatedOpeningBalance;

      // Sort by date first
      const sortedLines = (linesData || []).sort((a: any, b: any) => {
        const dateA = new Date(a.journal_entries.date).getTime();
        const dateB = new Date(b.journal_entries.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return String(a.journal_entries.entry_number || "").localeCompare(String(b.journal_entries.entry_number || ""));
      });

      for (const line of sortedLines) {
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        runningBalance += debit - credit;

        entries.push({
          id: line.id,
          journal_entry_id: line.journal_entry_id,
          entry_date: line.journal_entries.date,
          description: line.description || line.journal_entries.description || "",
          reference: line.journal_entries.entry_number,
          debit,
          credit,
          balance: runningBalance,
          branch_name: line.branches?.name_ar || undefined,
        });
      }

      setLedgerEntries(entries);
    } catch (error: any) {
      toast.error("خطأ في جلب قيود كشف الحساب: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!selectedAccountData) {
      toast.info("اختر حساباً أولاً قبل الطباعة");
      return;
    }
    window.print();
  };

  const handlePreviewPrint = () => {
    if (!selectedAccountData) {
      toast.info("اختر حساباً أولاً قبل المعاينة");
      return;
    }
    setPrintPreviewOpen(true);
  };

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId);
    setAccountSearchQuery("");
  };

  const fetchEntryDetails = async (journalEntryId: string) => {
    setLoadingEntry(true);
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select(`
          id,
          entry_number,
          date,
          description,
          journal_entry_lines (
            id,
            debit,
            credit,
            description,
            chart_of_accounts (code, name_ar),
            branches (name_ar),
            cost_centers (name_ar),
            projects (name_ar)
          )
        `)
        .eq("id", journalEntryId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const entryDetail: JournalEntryDetail = {
          id: data.id,
          entry_number: data.entry_number,
          date: data.date,
          description: data.description,
          lines: data.journal_entry_lines.map((line: any) => ({
            id: line.id,
            account_code: line.chart_of_accounts?.code || "",
            account_name: line.chart_of_accounts?.name_ar || "",
            description: line.description,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
            branch_name: line.branches?.name_ar,
            cost_center_name: line.cost_centers?.name_ar,
            project_name: line.projects?.name_ar,
          })),
        };
        setSelectedEntryDetail(entryDetail);
        setEntryDialogOpen(true);
      }
    } catch (error: any) {
      toast.error("خطأ في جلب تفاصيل القيد: " + error.message);
    } finally {
      setLoadingEntry(false);
    }
  };

  const selectedAccountData = accounts.find((acc) => acc.id === selectedAccount);
  const selectedBranchData = branches.find((branch) => branch.id === selectedBranch);
  const periodLabel = startDate || endDate
    ? `${startDate ? `من ${toDisplayDate(startDate)}` : "من البداية"} ${endDate ? `إلى ${toDisplayDate(endDate)}` : "إلى اليوم"}`
    : "كل الفترات";

  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);
  const closingBalance = ledgerEntries.length > 0 
    ? ledgerEntries[ledgerEntries.length - 1].balance 
    : openingBalance;

  const renderLedgerReport = (isPreview = false) => (
    <div className="ledger-print-area">
      <section className={`ledger-print-sheet border border-border bg-card text-card-foreground shadow-xl ${isPreview ? "mx-auto" : ""}`}>
        <div className="ledger-paper-head border-b border-primary/25 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-bold text-primary">دفتر الأستاذ</div>
              <h2 className="mt-1 text-2xl font-black tracking-normal text-foreground">
                {selectedAccountData ? `${selectedAccountData.code} - ${selectedAccountData.name_ar}` : "اختر حساباً"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{selectedAccountData?.name_en || ""}</p>
            </div>
            <div className="text-sm leading-7 text-muted-foreground sm:text-left">
              <div>الفترة: <span className="font-bold text-foreground">{periodLabel}</span></div>
              <div>الفرع: <span className="font-bold text-foreground">{selectedBranchData ? selectedBranchData.name_ar : "جميع الفروع"}</span></div>
              <div>تاريخ الطباعة: <span className="font-bold text-foreground">{getGregorianDate()} • {getHijriDate()}</span></div>
            </div>
          </div>
        </div>

        <div className="ledger-summary-grid my-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold text-muted-foreground">الرصيد الافتتاحي</div>
            <div className="mt-1 text-lg font-black text-foreground">{formatNumber(openingBalance)}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold text-muted-foreground">إجمالي المدين</div>
            <div className="mt-1 text-lg font-black text-primary">{formatNumber(totalDebit)}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold text-muted-foreground">إجمالي الدائن</div>
            <div className="mt-1 text-lg font-black text-destructive">{formatNumber(totalCredit)}</div>
          </div>
          <div className="rounded-lg border border-border bg-primary/10 p-3">
            <div className="text-xs font-semibold text-muted-foreground">الرصيد الختامي</div>
            <div className="mt-1 text-lg font-black text-foreground">{formatNumber(closingBalance)}</div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border ledger-table-wrap">
          <table className="ledger-print-table w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary/10">
                <th className="w-[92px] p-3 text-right font-black">التاريخ</th>
                <th className="w-[118px] p-3 text-right font-black">رقم القيد</th>
                <th className="min-w-[240px] p-3 text-right font-black">البيان</th>
                <th className="w-[110px] p-3 text-right font-black">الفرع</th>
                <th className="w-[112px] p-3 text-center font-black">مدين</th>
                <th className="w-[112px] p-3 text-center font-black">دائن</th>
                <th className="w-[124px] p-3 text-center font-black">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {startDate && (
                <tr className="bg-muted/40 font-bold">
                  <td colSpan={4} className="p-3 text-right">رصيد أول المدة</td>
                  <td className="p-3 text-center">{openingBalance > 0 ? formatNumber(openingBalance) : "-"}</td>
                  <td className="p-3 text-center">{openingBalance < 0 ? formatNumber(Math.abs(openingBalance)) : "-"}</td>
                  <td className="p-3 text-center">{formatNumber(openingBalance)}</td>
                </tr>
              )}

              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">جاري تحميل كشف الحساب...</td>
                </tr>
              ) : ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد حركات على هذا الحساب ضمن الفترة المحددة</td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => (
                  <tr key={entry.id} className="ledger-entry-row border-t border-border">
                    <td className="p-3 text-right whitespace-nowrap">{toDisplayDate(entry.entry_date)}</td>
                    <td className="p-3 text-right">
                      <Button
                        type="button"
                        variant="link"
                        className="ledger-reference-button h-auto p-0 text-sm font-bold"
                        onClick={() => fetchEntryDetails(entry.journal_entry_id)}
                        disabled={loadingEntry || isPreview}
                      >
                        {entry.reference || "-"}
                      </Button>
                    </td>
                    <td className="p-3 text-right leading-6">{entry.description || "-"}</td>
                    <td className="p-3 text-right text-muted-foreground">{entry.branch_name || "-"}</td>
                    <td className="p-3 text-center font-semibold">{entry.debit > 0 ? formatNumber(entry.debit) : "-"}</td>
                    <td className="p-3 text-center font-semibold">{entry.credit > 0 ? formatNumber(entry.credit) : "-"}</td>
                    <td className="p-3 text-center font-black">{formatNumber(entry.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {ledgerEntries.length > 0 && (
              <tfoot>
                <tr className="ledger-totals-row border-t border-primary/30 bg-primary/10 font-black">
                  <td colSpan={4} className="p-3 text-right">الإجمالي</td>
                  <td className="p-3 text-center">{formatNumber(totalDebit)}</td>
                  <td className="p-3 text-center">{formatNumber(totalCredit)}</td>
                  <td className="p-3 text-center">{formatNumber(closingBalance)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );

  return (
    <div className="container mx-auto p-6 print:p-0 ledger-report-container" dir="rtl">
      {/* Navigation Header - Hidden during print */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/accounting")}>
            <ArrowRight className="ml-2" />
            العودة
          </Button>
          <h1 className="text-2xl font-bold">كشف الحساب</h1>
        </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePreviewPrint} disabled={!selectedAccount}>
              <Eye className="ml-2 h-4 w-4" />
              معاينة الطباعة
            </Button>
            <Button onClick={handlePrint} disabled={!selectedAccount}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة A4
            </Button>
          </div>
      </div>

      {/* Date Range Bar - Hidden during print */}
      <div className="flex items-center gap-3 mb-4 print:hidden bg-muted/30 p-3 rounded-lg">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">الفترة:</span>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-40"
            placeholder="من تاريخ"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-40"
            placeholder="إلى تاريخ"
          />
        </div>
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 ml-1" />
            مسح
          </Button>
        )}
      </div>

      {/* Quick Access Favorite Accounts Bar - Hidden during print */}
      <div className="mb-4 print:hidden">
        <div className="flex items-center gap-2 flex-wrap bg-muted/20 p-3 rounded-lg border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-2">
            <Star className="h-4 w-4" />
            <span>انتقال سريع:</span>
          </div>
          
          {favoriteAccounts.map((fav) => (
            <Badge
              key={fav.id}
              variant={selectedAccount === fav.id ? "default" : "secondary"}
              className="cursor-pointer hover:bg-primary/80 transition-colors group py-1.5 px-3"
              onClick={() => selectFavoriteAccount(fav.id)}
            >
              <span className="text-xs">{fav.code} - {fav.name_ar}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFavoriteAccount(fav.id);
                }}
                className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {/* Add Favorite Button */}
          <Popover open={addFavoritePopoverOpen} onOpenChange={setAddFavoritePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 border-dashed">
                <Plus className="h-3 w-3 ml-1" />
                إضافة
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-3">
                <Label className="text-sm font-medium">إضافة حساب للمفضلة</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="ابحث عن حساب..."
                    value={favoriteSearchQuery}
                    onChange={(e) => setFavoriteSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                {favoriteSearchQuery.trim() && (
                  <ScrollArea className="h-48">
                    {filteredFavoriteAccounts.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        لا توجد نتائج
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredFavoriteAccounts.map((account) => (
                          <div
                            key={account.id}
                            className="p-2 rounded-md cursor-pointer hover:bg-muted transition-colors text-sm"
                            onClick={() => addFavoriteAccount(account)}
                          >
                            <span className="font-medium">{account.code}</span>
                            <span className="mx-1">-</span>
                            <span>{account.name_ar}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {favoriteAccounts.length === 0 && (
            <span className="text-xs text-muted-foreground">
              لا توجد حسابات مفضلة. أضف حسابات للانتقال السريع.
            </span>
          )}
        </div>
      </div>

      {/* Filters - Hidden during print */}
      <Card className="p-6 mb-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Account Search */}
          <div className="lg:col-span-2">
            <Label>بحث عن اسم الحساب</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="اكتب للبحث عن الحساب..."
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            
            {/* Search Results */}
            {accountSearchQuery.trim() && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-md bg-background shadow-sm">
                {filteredAccounts.length === 0 ? (
                  <div className="p-3 text-center text-muted-foreground text-sm">
                    لا توجد نتائج
                  </div>
                ) : (
                  filteredAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={`p-3 cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-b-0 ${
                        selectedAccount === account.id ? "bg-muted" : ""
                      }`}
                      onClick={() => handleAccountSelect(account.id)}
                    >
                      <span className="font-medium">{account.code}</span>
                      <span className="mx-2">-</span>
                      <span>{account.name_ar}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Account Select (Alternative) */}
          <div>
            <Label>اختر الحساب</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الحساب" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} - {account.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* Branch Filter */}
        <div className="mt-4 max-w-xs">
          <Label>الفرع</Label>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الفرع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفروع</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.code} - {branch.name_ar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Report Content */}
      {selectedAccount && (
        renderLedgerReport(false)
      )}

      {/* Print Styles */}
      <style>{`
        .ledger-print-sheet {
          width: 100%;
          padding: 1.25rem;
          border-radius: 0.75rem;
        }

        .ledger-print-table th,
        .ledger-print-table td {
          border-inline-end: 1px solid hsl(var(--border));
        }

        .ledger-print-table th:last-child,
        .ledger-print-table td:last-child {
          border-inline-end: 0;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body {
            background: hsl(var(--card)) !important;
          }

          .print\\:hidden,
          [data-sidebar],
          aside,
          nav,
          header,
          .ledger-report-container > *:not(.ledger-print-area),
          .ledger-no-print {
            display: none !important;
          }

          .ledger-report-container {
            display: block !important;
            width: 100%;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            direction: rtl;
            font-family: 'Cairo', 'Arial', sans-serif;
            color: hsl(var(--foreground)) !important;
            background: hsl(var(--card)) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .ledger-print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .ledger-print-sheet {
            display: block !important;
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .ledger-paper-head {
            page-break-after: avoid !important;
            break-after: avoid !important;
            margin-bottom: 10px !important;
            padding-bottom: 8px !important;
          }

          .ledger-summary-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 6px !important;
            margin: 8px 0 10px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .ledger-table-wrap {
            overflow: visible !important;
            border-radius: 0 !important;
          }

          .ledger-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8.8pt !important;
            line-height: 1.35 !important;
          }

          .ledger-print-table th,
          .ledger-print-table td {
            border: 1px solid hsl(var(--border)) !important;
            padding: 5px 6px !important;
            text-align: right !important;
            vertical-align: top !important;
          }

          .ledger-print-table th {
            background-color: hsl(var(--muted)) !important;
            font-weight: bold !important;
          }

          .ledger-print-table td:nth-child(5),
          .ledger-print-table td:nth-child(6),
          .ledger-print-table td:nth-child(7),
          .ledger-print-table th:nth-child(5),
          .ledger-print-table th:nth-child(6),
          .ledger-print-table th:nth-child(7) {
            text-align: center !important;
          }

          .ledger-reference-button {
            display: inline !important;
            color: hsl(var(--foreground)) !important;
            text-decoration: none !important;
          }

          .ledger-print-table thead {
            display: table-header-group !important;
          }

          .ledger-print-table tfoot {
            display: table-footer-group !important;
          }

          .ledger-entry-row {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .ledger-totals-row {
            font-weight: bold !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
        }
      `}</style>

      <Dialog open={printPreviewOpen} onOpenChange={setPrintPreviewOpen}>
        <DialogContent className="max-w-7xl max-h-[94vh] overflow-hidden print:hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>معاينة الطباعة — A4</span>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={!selectedAccount}>
                <Printer className="ml-2 h-4 w-4" />
                طباعة
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[78vh] bg-muted/40 p-4 rounded-lg">
            <div className="min-w-[210mm] pb-6">
              <div className="ledger-preview-sheet mx-auto w-[210mm] min-h-[297mm] bg-card shadow-xl">
                {renderLedgerReport(true)}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Journal Entry Detail Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden print:hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>تفاصيل القيد</span>
              <Button variant="ghost" size="icon" onClick={() => setEntryDialogOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedEntryDetail && (
            <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-100px)]">
              {/* Entry Header Info */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-sm text-muted-foreground">رقم القيد</Label>
                  <p className="font-semibold">{selectedEntryDetail.entry_number}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">التاريخ</Label>
                  <p className="font-semibold">{selectedEntryDetail.date}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">البيان</Label>
                  <p className="font-semibold">{selectedEntryDetail.description || "-"}</p>
                </div>
              </div>

              {/* Entry Lines */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">كود الحساب</TableHead>
                      <TableHead className="text-right">اسم الحساب</TableHead>
                      <TableHead className="text-right">البيان</TableHead>
                      <TableHead className="text-center">المدين</TableHead>
                      <TableHead className="text-center">الدائن</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntryDetail.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono">{line.account_code}</TableCell>
                        <TableCell>{line.account_name}</TableCell>
                        <TableCell>{line.description || "-"}</TableCell>
                        <TableCell className="text-center font-medium">
                          {line.debit > 0 ? formatNumber(line.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {line.credit > 0 ? formatNumber(line.credit) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted font-bold">
                      <TableCell colSpan={3} className="text-right">الإجمالي</TableCell>
                      <TableCell className="text-center">
                        {formatNumber(selectedEntryDetail.lines.reduce((sum, l) => sum + l.debit, 0))}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatNumber(selectedEntryDetail.lines.reduce((sum, l) => sum + l.credit, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
