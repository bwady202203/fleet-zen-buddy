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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Printer, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  level: number;
}

interface Branch {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
}

interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  level: number;
  opening_debit: number;
  opening_credit: number;
  opening_balance: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
  closing_balance: number;
}

interface LedgerEntry {
  entry_date: string;
  description: string;
  reference: string;
  branch_name: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function TrialBalanceNew() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [ledgerPreview, setLedgerPreview] = useState<LedgerEntry[]>([]);
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      calculateTrialBalance();
    }
  }, [selectedBranch, startDate, endDate]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name_ar, name_en, parent_id, level")
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

  const calculateTrialBalance = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const balanceRows: TrialBalanceRow[] = [];

      for (const account of accounts) {
        // Fetch opening balance (before start date)
        let openingQuery = supabase
          .from("journal_entry_lines")
          .select(`
            debit,
            credit,
            journal_entries!inner(date)
          `)
          .eq("account_id", account.id)
          .lt("journal_entries.date", startDate);

        if (selectedBranch !== "all") {
          openingQuery = openingQuery.eq("branch_id", selectedBranch);
        }

        const { data: openingData } = await openingQuery;

        const openingDebit = openingData?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0;
        const openingCredit = openingData?.reduce((sum, line) => sum + (line.credit || 0), 0) || 0;
        const openingBalance = openingDebit - openingCredit;

        // Fetch period movement (between start and end date)
        let periodQuery = supabase
          .from("journal_entry_lines")
          .select(`
            debit,
            credit,
            journal_entries!inner(date)
          `)
          .eq("account_id", account.id)
          .gte("journal_entries.date", startDate)
          .lte("journal_entries.date", endDate);

        if (selectedBranch !== "all") {
          periodQuery = periodQuery.eq("branch_id", selectedBranch);
        }

        const { data: periodData } = await periodQuery;

        const periodDebit = periodData?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0;
        const periodCredit = periodData?.reduce((sum, line) => sum + (line.credit || 0), 0) || 0;

        // Calculate closing balance
        const closingBalance = openingBalance + periodDebit - periodCredit;
        const closingDebit = closingBalance > 0 ? closingBalance : 0;
        const closingCredit = closingBalance < 0 ? Math.abs(closingBalance) : 0;

        // Only include accounts with activity
        if (
          openingDebit !== 0 ||
          openingCredit !== 0 ||
          periodDebit !== 0 ||
          periodCredit !== 0 ||
          closingDebit !== 0 ||
          closingCredit !== 0
        ) {
          balanceRows.push({
            account_id: account.id,
            account_code: account.code,
            account_name: account.name_ar,
            level: account.level || 1,
            opening_debit: openingDebit,
            opening_credit: openingCredit,
            opening_balance: openingBalance,
            period_debit: periodDebit,
            period_credit: periodCredit,
            closing_debit: closingDebit,
            closing_credit: closingCredit,
            closing_balance: closingBalance,
          });
        }
      }

      setTrialBalanceData(balanceRows);
    } catch (error: any) {
      toast.error("خطأ في حساب ميزان المراجعة: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedgerForAccount = async (accountId: string) => {
    try {
      let linesQuery = supabase
        .from("journal_entry_lines")
        .select(`
          id,
          debit,
          credit,
          description,
          journal_entries!inner(
            entry_number,
            date,
            description
          ),
          branches(name_ar)
        `)
        .eq("account_id", accountId)
        .gte("journal_entries.date", startDate)
        .lte("journal_entries.date", endDate);

      if (selectedBranch !== "all") {
        linesQuery = linesQuery.eq("branch_id", selectedBranch);
      }

      const { data: linesData, error } = await linesQuery;

      if (error) throw error;

      // Calculate opening balance
      let openingQuery = supabase
        .from("journal_entry_lines")
        .select(`
          debit,
          credit,
          journal_entries!inner(date)
        `)
        .eq("account_id", accountId)
        .lt("journal_entries.date", startDate);

      if (selectedBranch !== "all") {
        openingQuery = openingQuery.eq("branch_id", selectedBranch);
      }

      const { data: openingData } = await openingQuery;

      let runningBalance = openingData?.reduce(
        (sum, line) => sum + (line.debit || 0) - (line.credit || 0),
        0
      ) || 0;

      // Sort by date
      const sortedLines = (linesData || []).sort((a: any, b: any) => {
        return new Date(a.journal_entries.date).getTime() - new Date(b.journal_entries.date).getTime();
      });

      const entries: LedgerEntry[] = sortedLines.map((line: any) => {
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        runningBalance += debit - credit;

        return {
          entry_date: line.journal_entries.date,
          description: line.description || line.journal_entries.description || "",
          reference: line.journal_entries.entry_number,
          branch_name: line.branches?.name_ar || "-",
          debit,
          credit,
          balance: runningBalance,
        };
      });

      setLedgerPreview(entries);
      setShowLedgerDialog(true);
    } catch (error: any) {
      toast.error("خطأ في جلب دفتر الأستاذ: " + error.message);
    }
  };

  const handleAccountClick = (accountId: string) => {
    setSelectedAccountId(accountId);
    fetchLedgerForAccount(accountId);
  };

  const handlePrint = () => {
    window.print();
  };

  const totals = trialBalanceData.reduce(
    (acc, row) => ({
      opening_debit: acc.opening_debit + row.opening_debit,
      opening_credit: acc.opening_credit + row.opening_credit,
      period_debit: acc.period_debit + row.period_debit,
      period_credit: acc.period_credit + row.period_credit,
      closing_debit: acc.closing_debit + row.closing_debit,
      closing_credit: acc.closing_credit + row.closing_credit,
    }),
    {
      opening_debit: 0,
      opening_credit: 0,
      period_debit: 0,
      period_credit: 0,
      closing_debit: 0,
      closing_credit: 0,
    }
  );

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

  return (
    <div className="container mx-auto p-6 print:p-0" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/accounting")}>
            <ArrowRight className="ml-2" />
            العودة
          </Button>
          <h1 className="text-3xl font-bold">ميزان المراجعة</h1>
        </div>
        <Button
          onClick={handlePrint}
          disabled={!startDate || !endDate || trialBalanceData.length === 0}
        >
          <Printer className="ml-2" />
          طباعة
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Label>من تاريخ *</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <Label>إلى تاريخ *</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Trial Balance Report */}
      {(startDate && endDate) && (
        <Card className="p-6">
          {/* Print Header */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">ميزان المراجعة</h1>
            <p className="text-sm text-muted-foreground">
              من {startDate} إلى {endDate}
            </p>
          </div>

          {/* Trial Balance Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right" rowSpan={2}>
                    رمز الحساب
                  </TableHead>
                  <TableHead className="text-right" rowSpan={2}>
                    اسم الحساب
                  </TableHead>
                  <TableHead className="text-center" colSpan={2}>
                    الرصيد الافتتاحي
                  </TableHead>
                  <TableHead className="text-center" colSpan={2}>
                    الحركة خلال الفترة
                  </TableHead>
                  <TableHead className="text-center" colSpan={2}>
                    الرصيد الختامي
                  </TableHead>
                  <TableHead className="text-center print:hidden" rowSpan={2}>
                    إجراء
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-right">مدين</TableHead>
                  <TableHead className="text-right">دائن</TableHead>
                  <TableHead className="text-right">مدين</TableHead>
                  <TableHead className="text-right">دائن</TableHead>
                  <TableHead className="text-right">مدين</TableHead>
                  <TableHead className="text-right">دائن</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : trialBalanceData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      لا توجد بيانات لهذه الفترة
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {trialBalanceData.map((row) => (
                      <TableRow key={row.account_id}>
                        <TableCell>{row.account_code}</TableCell>
                        <TableCell
                          className="cursor-pointer hover:text-primary hover:underline print:cursor-default print:hover:no-underline"
                          style={{ paddingRight: `${row.level * 20}px` }}
                        >
                          {row.account_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.opening_debit > 0 ? row.opening_debit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.opening_credit > 0 ? row.opening_credit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.period_debit > 0 ? row.period_debit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.period_credit > 0 ? row.period_credit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.closing_debit > 0 ? row.closing_debit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.closing_credit > 0 ? row.closing_credit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-center print:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAccountClick(row.account_id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Totals Row */}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={2}>الإجمالي</TableCell>
                      <TableCell className="text-right">
                        {totals.opening_debit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {totals.opening_credit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {totals.period_debit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {totals.period_credit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {totals.closing_debit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {totals.closing_credit.toFixed(2)}
                      </TableCell>
                      <TableCell className="print:hidden"></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Ledger Preview Dialog */}
      <Dialog open={showLedgerDialog} onOpenChange={setShowLedgerDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              دفتر الأستاذ -{" "}
              {selectedAccount
                ? `${selectedAccount.code} - ${selectedAccount.name_ar}`
                : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">البيان</TableHead>
                  <TableHead className="text-right">المرجع</TableHead>
                  <TableHead className="text-right">الفرع</TableHead>
                  <TableHead className="text-right">مدين</TableHead>
                  <TableHead className="text-right">دائن</TableHead>
                  <TableHead className="text-right">الرصيد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerPreview.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      لا توجد قيود لهذا الحساب
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerPreview.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{entry.entry_date}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{entry.reference}</TableCell>
                      <TableCell>{entry.branch_name}</TableCell>
                      <TableCell>
                        {entry.debit > 0 ? entry.debit.toFixed(2) : "-"}
                      </TableCell>
                      <TableCell>
                        {entry.credit > 0 ? entry.credit.toFixed(2) : "-"}
                      </TableCell>
                      <TableCell>{entry.balance.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .container, .container * {
            visibility: visible;
          }
          .container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:cursor-default {
            cursor: default !important;
          }
          .print\\:hover\\:no-underline:hover {
            text-decoration: none !important;
          }
        }
      `}</style>
    </div>
  );
}
