import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toHijri } from "hijri-converter";

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

interface JournalEntry {
  id: string;
  entry_number: string;
  date: string;
  description: string | null;
}

interface LedgerEntry {
  id: string;
  entry_date: string;
  description: string | null;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number;
  branch_name?: string;
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
      toast.error("خطأ في جلب قيود دفتر الأستاذ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedAccountData = accounts.find((acc) => acc.id === selectedAccount);

  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);
  const closingBalance = ledgerEntries.length > 0 
    ? ledgerEntries[ledgerEntries.length - 1].balance 
    : openingBalance;

  return (
    <div className="container mx-auto p-6 print:p-0" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/accounting")}>
            <ArrowRight className="ml-2" />
            العودة
          </Button>
          <h1 className="text-3xl font-bold">دفتر الأستاذ</h1>
        </div>
        <Button onClick={handlePrint} disabled={!selectedAccount || ledgerEntries.length === 0}>
          <Printer className="ml-2" />
          طباعة
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>الحساب *</Label>
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

          <div>
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

          <div>
            <Label>من تاريخ</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <Label>إلى تاريخ</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Report Content */}
      {selectedAccount && (
        <Card className="p-6 print:p-0 print:shadow-none print:border-none">
          {/* Print Header */}
          <div className="hidden print:block mb-6 ledger-print-header">
            <div className="flex justify-between items-start text-sm mb-4">
              <div className="text-right">
                <p>{getHijriDate()}</p>
              </div>
              <div className="text-center">
                <p>{getCurrentTime()}</p>
              </div>
              <div className="text-left">
                <p>{getGregorianDate()}</p>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center mb-4">دفتر الأستاذ</h1>
            {selectedAccountData && (
              <p className="text-lg text-center mb-2">
                الحساب: {selectedAccountData.code} - {selectedAccountData.name_ar}
              </p>
            )}
            {(startDate || endDate) && (
              <p className="text-sm text-center text-muted-foreground">
                {startDate && `من ${startDate}`} {endDate && `إلى ${endDate}`}
              </p>
            )}
          </div>

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
                      <td className="text-right p-3 border border-border">{entry.reference || "-"}</td>
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
          
          .container, .container * {
            visibility: visible;
          }
          
          .container {
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
          
          .print\\:block {
            display: block !important;
          }
          
          /* Print header styling */
          .ledger-print-header {
            page-break-after: avoid;
          }
          
          .ledger-print-header h1 {
            font-size: 18pt !important;
            font-weight: bold !important;
            margin-bottom: 10px !important;
          }
          
          .ledger-print-header p {
            font-size: 10pt !important;
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
    </div>
  );
}
