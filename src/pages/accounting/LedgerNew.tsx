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
import { ArrowRight, Printer, Search, X, Plus, Star, Calendar } from "lucide-react";
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
    const query = debouncedFavoriteSearch.toLowerCase().trim();
    return accounts.filter(account => 
      (account.name_ar.toLowerCase().includes(query) ||
      account.name_en.toLowerCase().includes(query) ||
      account.code.toLowerCase().includes(query)) &&
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
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    return accounts.filter(account => 
      account.name_ar.toLowerCase().includes(query) ||
      account.name_en.toLowerCase().includes(query) ||
      account.code.toLowerCase().includes(query)
    );
  }, [accounts, debouncedSearchQuery]);

  const fetchLedgerEntries = async () => {
    if (!selectedAccount) return;

    setLoading(true);
    try {
      // Build query for journal entry lines
      let linesQuery = supabase
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
        .eq("account_id", selectedAccount);

      // Apply branch filter
      if (selectedBranch !== "all") {
        linesQuery = linesQuery.eq("branch_id", selectedBranch);
      }

      // Apply date filter on journal entries
      if (startDate) {
        linesQuery = linesQuery.gte("journal_entries.date", startDate);
      }
      if (endDate) {
        linesQuery = linesQuery.lte("journal_entries.date", endDate);
      }

      const { data: linesData, error: linesError } = await linesQuery;

      if (linesError) throw linesError;

      // Calculate opening balance (entries before start date)
      let calculatedOpeningBalance = 0;
      if (startDate) {
        let openingQuery = supabase
          .from("journal_entry_lines")
          .select(`
            debit,
            credit,
            journal_entries!inner(date)
          `)
          .eq("account_id", selectedAccount)
          .lt("journal_entries.date", startDate);

        if (selectedBranch !== "all") {
          openingQuery = openingQuery.eq("branch_id", selectedBranch);
        }

        const { data: openingData, error: openingError } = await openingQuery;

        if (!openingError && openingData) {
          calculatedOpeningBalance = openingData.reduce(
            (sum, line) => sum + (line.debit || 0) - (line.credit || 0),
            0
          );
        }
      }
      setOpeningBalance(calculatedOpeningBalance);

      // Transform data to ledger entries with running balance
      const entries: LedgerEntry[] = [];
      let runningBalance = calculatedOpeningBalance;

      // Sort by date first
      const sortedLines = (linesData || []).sort((a: any, b: any) => {
        const dateA = new Date(a.journal_entries.date).getTime();
        const dateB = new Date(b.journal_entries.date).getTime();
        return dateA - dateB;
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
    window.print();
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

  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);
  const closingBalance = ledgerEntries.length > 0 
    ? ledgerEntries[ledgerEntries.length - 1].balance 
    : openingBalance;

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
        <Button onClick={handlePrint} disabled={!selectedAccount || ledgerEntries.length === 0}>
          <Printer className="ml-2" />
          طباعة
        </Button>
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

      {/* Report Header - Visible in both view and print */}
      <div className="mb-6 report-header print:block hidden">
        <h1 className="text-3xl font-bold text-center mb-4">كشف الحساب</h1>
        <div className="text-right space-y-1">
          <p className="text-sm text-muted-foreground">التاريخ: {getGregorianDate()}</p>
          {(startDate || endDate) && (
            <p className="text-sm text-muted-foreground">
              الفترة: {startDate ? `من ${startDate}` : ""} {endDate ? `إلى ${endDate}` : ""}
            </p>
          )}
          {selectedAccountData && (
            <p className="text-base font-medium">
              الحساب: {selectedAccountData.code} - {selectedAccountData.name_ar}
            </p>
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
        <Card className="p-6 print:p-0 print:shadow-none print:border-none">
          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="ledger-table w-full border-collapse">
              <thead>
                <tr className="ledger-table-header">
                  <th className="text-right p-3 border border-border bg-muted/50 font-bold">التاريخ</th>
                  <th className="text-right p-3 border border-border bg-muted/50 font-bold">البيان</th>
                  <th className="text-right p-3 border border-border bg-muted/50 font-bold">القيد</th>
                  <th className="text-center p-3 border border-border bg-muted/50 font-bold">المدين</th>
                  <th className="text-center p-3 border border-border bg-muted/50 font-bold">الدائن</th>
                  <th className="text-center p-3 border border-border bg-muted/50 font-bold">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance */}
                {startDate && openingBalance !== 0 && (
                  <tr className="font-semibold bg-muted/30">
                    <td colSpan={3} className="text-right p-3 border border-border">رصيد أول المدة</td>
                    <td className="text-center p-3 border border-border">-</td>
                    <td className="text-center p-3 border border-border">-</td>
                    <td className="text-center p-3 border border-border">{formatNumber(openingBalance)}</td>
                  </tr>
                )}

                {/* Entries */}
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 border border-border">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 border border-border">
                      لا توجد قيود لهذا الحساب
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="ledger-entry-row">
                      <td className="text-right p-3 border border-border">{entry.entry_date}</td>
                      <td className="text-right p-3 border border-border">{entry.description || "-"}</td>
                      <td className="text-right p-3 border border-border">
                        <button
                          onClick={() => fetchEntryDetails(entry.journal_entry_id)}
                          className="text-primary hover:underline cursor-pointer font-medium print:no-underline print:text-foreground"
                          disabled={loadingEntry}
                        >
                          {entry.reference || "-"}
                        </button>
                      </td>
                      <td className="text-center p-3 border border-border">
                        {entry.debit > 0 ? formatNumber(entry.debit) : "-"}
                      </td>
                      <td className="text-center p-3 border border-border">
                        {entry.credit > 0 ? formatNumber(entry.credit) : "-"}
                      </td>
                      <td className="text-center p-3 border border-border font-medium">{formatNumber(entry.balance)}</td>
                    </tr>
                  ))
                )}

                {/* Totals */}
                {ledgerEntries.length > 0 && (
                  <tr className="font-bold bg-muted ledger-totals-row">
                    <td colSpan={3} className="text-right p-3 border border-border">الإجمالي</td>
                    <td className="text-center p-3 border border-border">{formatNumber(totalDebit)}</td>
                    <td className="text-center p-3 border border-border">{formatNumber(totalCredit)}</td>
                    <td className="text-center p-3 border border-border">{formatNumber(closingBalance)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          /* Page setup */
          @page {
            size: A4 portrait;
            margin: 2cm;
          }
          
          /* Hide everything except report */
          body * {
            visibility: hidden;
          }
          
          .ledger-report-container, .ledger-report-container * {
            visibility: visible;
          }
          
          .ledger-report-container {
            position: absolute;
            right: 0;
            top: 0;
            width: 100%;
            direction: rtl;
            font-family: 'Cairo', 'Arial', sans-serif;
            font-size: 11pt;
            color: #000 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          /* Report header styling for print */
          .report-header {
            page-break-after: avoid;
            margin-bottom: 20px !important;
          }
          
          .report-header h1 {
            font-size: 20pt !important;
            font-weight: bold !important;
            text-align: center !important;
            margin-bottom: 15px !important;
          }
          
          .report-header p {
            font-size: 11pt !important;
            text-align: right !important;
          }
          
          /* Table styling */
          .ledger-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10pt !important;
            margin-top: 15px !important;
          }
          
          .ledger-table th,
          .ledger-table td {
            border: 1px solid #333 !important;
            padding: 8px 10px !important;
            text-align: right !important;
            background-color: transparent !important;
          }
          
          .ledger-table th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
            font-size: 11pt !important;
          }
          
          /* Number columns centered */
          .ledger-table td:nth-child(4),
          .ledger-table td:nth-child(5),
          .ledger-table td:nth-child(6),
          .ledger-table th:nth-child(4),
          .ledger-table th:nth-child(5),
          .ledger-table th:nth-child(6) {
            text-align: center !important;
          }
          
          /* Repeat table header on each page */
          .ledger-table thead {
            display: table-header-group !important;
          }
          
          /* Prevent row breaking across pages */
          .ledger-entry-row {
            page-break-inside: avoid !important;
          }
          
          /* Totals row styling */
          .ledger-totals-row {
            background-color: #e8e8e8 !important;
            font-weight: bold !important;
            page-break-before: avoid !important;
          }
          
          /* Card styling for print */
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-none {
            border: none !important;
          }
          
          /* Page numbering */
          @page {
            @bottom-right {
              content: counter(page) " / " counter(pages);
              font-size: 10pt;
            }
          }
        }
      `}</style>

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
