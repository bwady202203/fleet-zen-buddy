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
  entry_date: string;
  description: string | null;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number;
  branch?: {
    name_ar: string;
  };
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
      let query = supabase
        .from("ledger_entries")
        .select(`
          id,
          entry_date,
          description,
          reference,
          debit,
          credit,
          balance,
          branch:branches(name_ar)
        `)
        .eq("account_id", selectedAccount)
        .order("entry_date", { ascending: true })
        .order("created_at", { ascending: true });

      // Apply branch filter
      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      // Apply date filter
      if (startDate) {
        query = query.gte("entry_date", startDate);
      }
      if (endDate) {
        query = query.lte("entry_date", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate opening balance (entries before start date)
      if (startDate) {
        let openingQuery = supabase
          .from("ledger_entries")
          .select("balance")
          .eq("account_id", selectedAccount)
          .lt("entry_date", startDate)
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1);

        if (selectedBranch !== "all") {
          openingQuery = openingQuery.eq("branch_id", selectedBranch);
        }

        const { data: openingData, error: openingError } = await openingQuery;

        if (!openingError && openingData && openingData.length > 0) {
          setOpeningBalance(openingData[0].balance);
        } else {
          setOpeningBalance(0);
        }
      } else {
        setOpeningBalance(0);
      }

      setLedgerEntries(data || []);
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
        <Card className="p-6">
          {/* Print Header */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">دفتر الأستاذ</h1>
            {selectedAccountData && (
              <p className="text-lg">
                الحساب: {selectedAccountData.code} - {selectedAccountData.name_ar}
              </p>
            )}
            {startDate && endDate && (
              <p className="text-sm text-muted-foreground">
                من {startDate} إلى {endDate}
              </p>
            )}
          </div>

          {/* Ledger Table */}
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
                {/* Opening Balance */}
                {startDate && openingBalance !== 0 && (
                  <TableRow className="font-semibold bg-muted/50">
                    <TableCell colSpan={4}>رصيد أول المدة</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell>{openingBalance.toFixed(2)}</TableCell>
                  </TableRow>
                )}

                {/* Entries */}
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : ledgerEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      لا توجد قيود لهذا الحساب
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.entry_date}</TableCell>
                      <TableCell>{entry.description || "-"}</TableCell>
                      <TableCell>{entry.reference || "-"}</TableCell>
                      <TableCell>
                        {entry.branch?.name_ar || "-"}
                      </TableCell>
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

                {/* Totals */}
                {ledgerEntries.length > 0 && (
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={4}>الإجمالي</TableCell>
                    <TableCell>{totalDebit.toFixed(2)}</TableCell>
                    <TableCell>{totalCredit.toFixed(2)}</TableCell>
                    <TableCell>{closingBalance.toFixed(2)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

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
        }
      `}</style>
    </div>
  );
}
