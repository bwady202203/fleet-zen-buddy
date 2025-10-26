import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Printer, Eye } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  balance: number;
  type: string;
  level: number;
}

interface Branch {
  id: string;
  code: string;
  name_ar: string;
}

interface LedgerEntry {
  id: string;
  entry_date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function Level4Balances() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchBranches();
    fetchAccounts();
  }, [selectedBranch]);

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from("branches")
      .select("id, code, name_ar")
      .eq("is_active", true)
      .order("code");

    if (error) {
      toast.error("خطأ في جلب الفروع");
      return;
    }

    setBranches(data || []);
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      // Get level 4 accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("is_active", true)
        .order("code");

      if (accountsError) throw accountsError;

      // Filter level 4 accounts
      const level4Accounts = (accountsData || []).filter((acc) => {
        const level = calculateLevel(acc.id, accountsData);
        return level === 4;
      });

      // Calculate balances based on ledger entries
      const accountsWithBalances = await Promise.all(
        level4Accounts.map(async (account) => {
          const balance = await calculateAccountBalance(account.id);
          return { ...account, balance, level: 4 };
        })
      );

      setAccounts(accountsWithBalances);
    } catch (error) {
      toast.error("خطأ في جلب الحسابات");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateLevel = (accountId: string, allAccounts: any[]): number => {
    const account = allAccounts.find((a) => a.id === accountId);
    if (!account || !account.parent_id) return 1;

    let level = 1;
    let currentParentId = account.parent_id;

    while (currentParentId) {
      level++;
      const parent = allAccounts.find((a) => a.id === currentParentId);
      currentParentId = parent?.parent_id;
    }

    return level;
  };

  const calculateAccountBalance = async (accountId: string): Promise<number> => {
    let query = supabase
      .from("ledger_entries")
      .select("balance")
      .eq("account_id", accountId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (selectedBranch !== "all") {
      query = query.eq("branch_id", selectedBranch);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) return 0;

    return data.balance || 0;
  };

  const fetchLedgerForAccount = async (account: Account) => {
    setSelectedAccount(account);
    setLoading(true);

    try {
      let query = supabase
        .from("ledger_entries")
        .select(`
          *,
          branches(name_ar)
        `)
        .eq("account_id", account.id)
        .order("entry_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      if (startDate) {
        query = query.gte("entry_date", startDate);
      }

      if (endDate) {
        query = query.lte("entry_date", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLedgerEntries(data || []);
      setLedgerDialogOpen(true);
    } catch (error) {
      toast.error("خطأ في جلب كشف الحساب");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.name_ar.includes(searchTerm) ||
      account.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.code.includes(searchTerm);

    return matchesSearch;
  });

  const debitAccounts = filteredAccounts.filter((acc) => acc.balance > 0);
  const creditAccounts = filteredAccounts.filter((acc) => acc.balance < 0);
  const zeroAccounts = filteredAccounts.filter((acc) => acc.balance === 0);

  const totalDebit = debitAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalCredit = creditAccounts.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-bold">أرصدة حسابات المستوى الرابع</h1>
          <p className="text-muted-foreground mt-2">
            عرض كافة الأرصدة المدينة والدائنة لحسابات المستوى الرابع
          </p>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="ml-2 h-4 w-4" />
          طباعة
        </Button>
      </div>

      <Card className="p-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">الفرع</label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفروع</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">من تاريخ</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">إلى تاريخ</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">بحث</label>
            <Input
              placeholder="ابحث برقم أو اسم الحساب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : (
        <>
          {/* الأرصدة المدينة */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-primary">
              الأرصدة المدينة ({debitAccounts.length})
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الحساب</TableHead>
                  <TableHead className="text-right">اسم الحساب</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الرصيد المدين</TableHead>
                  <TableHead className="text-center print:hidden">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debitAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.code}</TableCell>
                    <TableCell>{account.name_ar}</TableCell>
                    <TableCell>
                      {account.type === "asset" && "أصول"}
                      {account.type === "liability" && "التزامات"}
                      {account.type === "equity" && "حقوق الملكية"}
                      {account.type === "revenue" && "إيرادات"}
                      {account.type === "expense" && "مصروفات"}
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      {(account.balance || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center print:hidden">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => fetchLedgerForAccount(account)}
                      >
                        <Eye className="h-4 w-4 ml-1" />
                        كشف الحساب
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={3} className="text-left">
                    إجمالي الأرصدة المدينة
                  </TableCell>
                  <TableCell className="text-green-600">
                    {(totalDebit || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="print:hidden"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          {/* الأرصدة الدائنة */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-primary">
              الأرصدة الدائنة ({creditAccounts.length})
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الحساب</TableHead>
                  <TableHead className="text-right">اسم الحساب</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الرصيد الدائن</TableHead>
                  <TableHead className="text-center print:hidden">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.code}</TableCell>
                    <TableCell>{account.name_ar}</TableCell>
                    <TableCell>
                      {account.type === "asset" && "أصول"}
                      {account.type === "liability" && "التزامات"}
                      {account.type === "equity" && "حقوق الملكية"}
                      {account.type === "revenue" && "إيرادات"}
                      {account.type === "expense" && "مصروفات"}
                    </TableCell>
                    <TableCell className="font-bold text-red-600">
                      {Math.abs(account.balance || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center print:hidden">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => fetchLedgerForAccount(account)}
                      >
                        <Eye className="h-4 w-4 ml-1" />
                        كشف الحساب
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={3} className="text-left">
                    إجمالي الأرصدة الدائنة
                  </TableCell>
                  <TableCell className="text-red-600">
                    {(totalCredit || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="print:hidden"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          {/* الأرصدة الصفرية */}
          {zeroAccounts.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 text-muted-foreground">
                حسابات برصيد صفر ({zeroAccounts.length})
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الحساب</TableHead>
                    <TableHead className="text-right">اسم الحساب</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-center print:hidden">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zeroAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.code}</TableCell>
                      <TableCell>{account.name_ar}</TableCell>
                      <TableCell>
                        {account.type === "asset" && "أصول"}
                        {account.type === "liability" && "التزامات"}
                        {account.type === "equity" && "حقوق الملكية"}
                        {account.type === "revenue" && "إيرادات"}
                        {account.type === "expense" && "مصروفات"}
                      </TableCell>
                      <TableCell className="text-center print:hidden">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => fetchLedgerForAccount(account)}
                        >
                          <Eye className="h-4 w-4 ml-1" />
                          كشف الحساب
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Dialog لعرض كشف الحساب */}
      <Dialog open={ledgerDialogOpen} onOpenChange={setLedgerDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              كشف حساب: {selectedAccount?.name_ar} ({selectedAccount?.code})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">البيان</TableHead>
                  <TableHead className="text-right">المرجع</TableHead>
                  <TableHead className="text-right">مدين</TableHead>
                  <TableHead className="text-right">دائن</TableHead>
                  <TableHead className="text-right">الرصيد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      لا توجد قيود
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.entry_date), "dd/MM/yyyy", {
                          locale: ar,
                        })}
                      </TableCell>
                      <TableCell>{entry.description || "-"}</TableCell>
                      <TableCell>{entry.reference || "-"}</TableCell>
                      <TableCell className="text-green-600">
                        {(entry.debit || 0) > 0 ? (entry.debit || 0).toFixed(2) : "-"}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {(entry.credit || 0) > 0 ? (entry.credit || 0).toFixed(2) : "-"}
                      </TableCell>
                      <TableCell className="font-bold">
                        {(entry.balance || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {ledgerEntries.length > 0 && (
              <div className="flex justify-between p-4 bg-muted rounded-lg font-bold">
                <div>عدد القيود: {ledgerEntries.length}</div>
                <div>
                  الرصيد النهائي:{" "}
                  {(ledgerEntries[ledgerEntries.length - 1]?.balance || 0).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
