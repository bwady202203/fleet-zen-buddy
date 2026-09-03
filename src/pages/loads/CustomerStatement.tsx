import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Printer, Plus, FileSpreadsheet, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StatementRow {
  serial: number;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CustomerStatement = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [paySaving, setPaySaving] = useState(false);
  const [payForm, setPayForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    description: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (data) setCompanies(data);
    })();
  }, []);

  useEffect(() => {
    if (companyId) loadStatement(companyId);
    else {
      setInvoices([]);
      setReceipts([]);
    }
  }, [companyId]);

  const loadStatement = async (id: string) => {
    setLoading(true);
    const [inv, rec] = await Promise.all([
      supabase
        .from("load_invoices")
        .select("id, invoice_number, date, total_amount, notes")
        .eq("company_id", id)
        .order("date", { ascending: true }),
      supabase
        .from("payment_receipts")
        .select("id, receipt_number, date, amount, description")
        .eq("company_id", id)
        .order("date", { ascending: true }),
    ]);
    setInvoices(inv.data || []);
    setReceipts(rec.data || []);
    setLoading(false);
  };

  const company = companies.find((c) => c.id === companyId);
  const openingBalanceBase = Number(company?.opening_balance || 0);

  const { rows, openingBalance, totalDebit, totalCredit, closingBalance } = useMemo(() => {
    const all = [
      ...invoices.map((i) => ({
        date: i.date as string,
        description: "فاتورة مبيعات",
        reference: i.invoice_number as string,
        debit: Number(i.total_amount || 0),
        credit: 0,
      })),
      ...receipts.map((r) => ({
        date: r.date as string,
        description: r.description || "سند قبض",
        reference: r.receipt_number as string,
        debit: 0,
        credit: Number(r.amount || 0),
      })),
    ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    let opening = openingBalanceBase;
    const inRange: typeof all = [];
    for (const item of all) {
      if (fromDate && item.date < fromDate) {
        opening += item.debit - item.credit;
        continue;
      }
      if (toDate && item.date > toDate) continue;
      inRange.push(item);
    }

    let running = opening;
    const built: StatementRow[] = inRange.map((item, idx) => {
      running += item.debit - item.credit;
      return { serial: idx + 1, ...item, balance: running };
    });

    return {
      rows: built,
      openingBalance: opening,
      totalDebit: built.reduce((s, r) => s + r.debit, 0),
      totalCredit: built.reduce((s, r) => s + r.credit, 0),
      closingBalance: running,
    };
  }, [invoices, receipts, fromDate, toDate, openingBalanceBase]);

  const savePayment = async () => {
    if (!companyId || !payForm.amount) {
      toast({ title: "أدخل العميل والمبلغ", variant: "destructive" });
      return;
    }
    setPaySaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("payment_receipts").insert({
        receipt_number: `REC-${Date.now()}`,
        date: payForm.date,
        company_id: companyId,
        amount: parseFloat(payForm.amount),
        description: payForm.description || "دفعة من العميل",
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "تم تسجيل الدفعة بنجاح" });
      setPayOpen(false);
      setPayForm({ date: new Date().toISOString().split("T")[0], amount: "", description: "" });
      loadStatement(companyId);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setPaySaving(false);
    }
  };

  const exportExcel = () => {
    const header = ["م", "التاريخ", "البيان", "المرجع", "مدين", "دائن", "الرصيد"];
    const lines = [
      header.join(","),
      ["", fromDate || "", "الرصيد الافتتاحي", "", "", "", openingBalance.toFixed(2)].join(","),
      ...rows.map((r) =>
        [r.serial, r.date, `"${r.description}"`, r.reference, r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2)].join(",")
      ),
      ["", "", "الإجمالي", "", totalDebit.toFixed(2), totalCredit.toFixed(2), closingBalance.toFixed(2)].join(","),
    ];
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `كشف-حساب-${company?.name || ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const todayStr = new Date().toLocaleDateString("en-GB");

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #statement-a4, #statement-a4 * { visibility: visible !important; }
          #statement-a4 {
            position: absolute; inset: 0; margin: 0 !important;
            width: 210mm; min-height: 297mm; box-shadow: none !important;
            border: none !important; padding: 12mm 10mm !important;
          }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 0; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <header className="border-b bg-card no-print">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/loads" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">كشف حساب عميل</h1>
              <p className="text-muted-foreground text-sm mt-1">
                الرصيد الافتتاحي والفواتير والدفعات
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setPayOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> تسجيل دفعة
            </Button>
            <Button variant="outline" onClick={exportExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> تصدير
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> طباعة
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="no-print">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">بيانات الكشف</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>العميل</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* A4 Statement */}
        <div className="flex justify-center">
          <div
            id="statement-a4"
            className="bg-white text-black mx-auto shadow-lg border"
            style={{ width: "210mm", minHeight: "297mm", padding: "12mm 10mm", fontFamily: "Cairo, sans-serif" }}
          >
            <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
              <h2 className="text-2xl font-extrabold tracking-wide">كشف حساب عميل</h2>
              <p className="text-xs text-slate-600 mt-1">Customer Account Statement</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px] mb-4">
              <div className="border border-slate-300 rounded p-2">
                <span className="font-bold">العميل: </span>
                {company?.name || "—"}
              </div>
              <div className="border border-slate-300 rounded p-2">
                <span className="font-bold">الرقم الضريبي: </span>
                {company?.tax_number || "—"}
              </div>
              <div className="border border-slate-300 rounded p-2">
                <span className="font-bold">الفترة: </span>
                {fromDate || "البداية"} — {toDate || "حتى الآن"}
              </div>
              <div className="border border-slate-300 rounded p-2">
                <span className="font-bold">تاريخ الطباعة: </span>
                {todayStr}
              </div>
            </div>

            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-400 py-1.5 w-[8%]">م</th>
                  <th className="border border-slate-400 py-1.5 w-[14%]">التاريخ</th>
                  <th className="border border-slate-400 py-1.5">البيان</th>
                  <th className="border border-slate-400 py-1.5 w-[16%]">المرجع</th>
                  <th className="border border-slate-400 py-1.5 w-[13%]">مدين</th>
                  <th className="border border-slate-400 py-1.5 w-[13%]">دائن</th>
                  <th className="border border-slate-400 py-1.5 w-[14%]">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-amber-50 font-bold">
                  <td className="border border-slate-300 text-center py-1">—</td>
                  <td className="border border-slate-300 text-center py-1">{fromDate || "—"}</td>
                  <td className="border border-slate-300 px-2 py-1">الرصيد الافتتاحي</td>
                  <td className="border border-slate-300 text-center py-1">—</td>
                  <td className="border border-slate-300 text-center py-1">—</td>
                  <td className="border border-slate-300 text-center py-1">—</td>
                  <td className="border border-slate-300 text-center py-1">{fmt(openingBalance)}</td>
                </tr>
                {rows.map((r) => (
                  <tr key={`${r.reference}-${r.serial}`} className="even:bg-slate-50">
                    <td className="border border-slate-300 text-center py-1">{r.serial}</td>
                    <td className="border border-slate-300 text-center py-1">{r.date}</td>
                    <td className="border border-slate-300 px-2 py-1">{r.description}</td>
                    <td className="border border-slate-300 text-center py-1">{r.reference}</td>
                    <td className="border border-slate-300 text-center py-1">{r.debit ? fmt(r.debit) : "—"}</td>
                    <td className="border border-slate-300 text-center py-1">{r.credit ? fmt(r.credit) : "—"}</td>
                    <td className="border border-slate-300 text-center py-1 font-semibold">{fmt(r.balance)}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={7} className="border border-slate-300 text-center py-6 text-slate-500">
                      {loading ? "جاري التحميل..." : "لا توجد حركات في الفترة المحددة"}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-200 font-bold">
                  <td className="border border-slate-400 text-center py-1.5" colSpan={4}>الإجمالي</td>
                  <td className="border border-slate-400 text-center py-1.5">{fmt(totalDebit)}</td>
                  <td className="border border-slate-400 text-center py-1.5">{fmt(totalCredit)}</td>
                  <td className="border border-slate-400 text-center py-1.5">{fmt(closingBalance)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-4 flex justify-end">
              <div className="border-2 border-slate-800 rounded px-4 py-2 text-sm font-bold">
                الرصيد الختامي: {fmt(closingBalance)} ر.س
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-8 text-[12px] text-center">
              <div className="border-t border-slate-400 pt-1">المحاسب</div>
              <div className="border-t border-slate-400 pt-1">المدير المالي</div>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة من العميل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>العميل</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>المبلغ</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>البيان</Label>
              <Textarea
                value={payForm.description}
                onChange={(e) => setPayForm({ ...payForm, description: e.target.value })}
                placeholder="دفعة من العميل"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={savePayment} disabled={paySaving} className="gap-2">
              <Save className="h-4 w-4" /> حفظ الدفعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerStatement;
