import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/StatsCard";
import { DollarSign, FileText, Receipt, Wallet, BookOpen, ArrowLeft } from "lucide-react";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  date: string;
  customer_supplier: string | null;
  amount: number;
  type: string;
};

type EntryRow = {
  id: string;
  entry_number: string;
  date: string;
  description: string | null;
  amount: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const invoiceTypeText = (type: string) => {
  switch (type) {
    case "sales":
      return "مبيعات";
    case "purchase":
      return "مشتريات";
    case "sales-return":
      return "مرتجع مبيعات";
    case "purchase-return":
      return "مرتجع مشتريات";
    case "load":
      return "حمولات";
    default:
      return type || "-";
  }
};

export const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [custodyBalance, setCustodyBalance] = useState(0);
  const [custodyTransfers, setCustodyTransfers] = useState(0);
  const [custodyExpenses, setCustodyExpenses] = useState(0);
  const [monthEntriesCount, setMonthEntriesCount] = useState(0);
  const [monthInvoicesTotal, setMonthInvoicesTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const [inv, loadInv, je, transfers, expenses, monthJe, monthInv] = await Promise.all([
        supabase.from("invoices").select("id, invoice_number, date, customer_supplier, net_amount, total_amount, type").order("date", { ascending: false }).limit(5),
        supabase.from("load_invoices").select("id, invoice_number, date, total_amount").order("date", { ascending: false }).limit(5),
        supabase.from("journal_entries").select("id, entry_number, date, description").order("date", { ascending: false }).limit(5),
        supabase.from("custody_transfers").select("amount"),
        supabase.from("custody_expenses").select("amount"),
        supabase.from("journal_entries").select("id", { count: "exact", head: true }).gte("date", monthStart),
        supabase.from("invoices").select("net_amount, total_amount").gte("date", monthStart),
      ]);

      const merged: InvoiceRow[] = [
        ...(inv.data || []).map((r: any) => ({
          id: r.id,
          invoice_number: r.invoice_number,
          date: r.date,
          customer_supplier: r.customer_supplier,
          amount: Number(r.net_amount ?? r.total_amount ?? 0),
          type: r.type,
        })),
        ...(loadInv.data || []).map((r: any) => ({
          id: r.id,
          invoice_number: r.invoice_number,
          date: r.date,
          customer_supplier: null,
          amount: Number(r.total_amount ?? 0),
          type: "load",
        })),
      ]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 6);
      setInvoices(merged);

      const entryIds = (je.data || []).map((e: any) => e.id);
      let totals: Record<string, number> = {};
      if (entryIds.length) {
        const { data: lines } = await supabase
          .from("journal_entry_lines")
          .select("journal_entry_id, debit")
          .in("journal_entry_id", entryIds);
        (lines || []).forEach((l: any) => {
          totals[l.journal_entry_id] = (totals[l.journal_entry_id] || 0) + Number(l.debit || 0);
        });
      }
      setEntries(
        (je.data || []).map((e: any) => ({
          id: e.id,
          entry_number: e.entry_number,
          date: e.date,
          description: e.description,
          amount: totals[e.id] || 0,
        }))
      );

      const tSum = (transfers.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const eSum = (expenses.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      setCustodyTransfers(tSum);
      setCustodyExpenses(eSum);
      setCustodyBalance(tSum - eSum);

      setMonthEntriesCount(monthJe.count || 0);
      setMonthInvoicesTotal(
        (monthInv.data || []).reduce((s: number, r: any) => s + Number(r.net_amount ?? r.total_amount ?? 0), 0)
      );
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="رصيد العهد" value={fmt(custodyBalance)} icon={Wallet} description="التحويلات ناقص المصروفات" />
        <StatsCard title="إجمالي العهد المحولة" value={fmt(custodyTransfers)} icon={DollarSign} description="كل الفترات" />
        <StatsCard title="مصروفات العهد" value={fmt(custodyExpenses)} icon={Receipt} description="كل الفترات" />
        <StatsCard title="قيود هذا الشهر" value={String(monthEntriesCount)} icon={BookOpen} description={`فواتير الشهر: ${fmt(monthInvoicesTotal)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              آخر الفواتير
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/accounting/sales-invoice">
                عرض الكل <ArrowLeft className="h-4 w-4 mr-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">جاري التحميل...</p>}
            {!loading && invoices.length === 0 && <p className="text-sm text-muted-foreground">لا توجد فواتير</p>}
            {invoices.map((i) => (
              <div key={`${i.type}-${i.id}`} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{i.invoice_number}</span>
                    <Badge variant="secondary">{invoiceTypeText(i.type)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {i.customer_supplier || "—"} • {i.date}
                  </p>
                </div>
                <span className="font-bold text-primary whitespace-nowrap">{fmt(i.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              آخر القيود
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/accounting/journal-entries">
                عرض الكل <ArrowLeft className="h-4 w-4 mr-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">جاري التحميل...</p>}
            {!loading && entries.length === 0 && <p className="text-sm text-muted-foreground">لا توجد قيود</p>}
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <span className="font-semibold">{e.entry_number}</span>
                  <p className="text-xs text-muted-foreground truncate">
                    {e.description || "—"} • {e.date}
                  </p>
                </div>
                <span className="font-bold text-primary whitespace-nowrap">{fmt(e.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
