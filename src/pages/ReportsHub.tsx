import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  FileBarChart,
  Layers,
  Loader2,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Printer } from "lucide-react";
import { GroupReportDocument, GroupReportPrintPortal, groupReportStyles } from "@/components/reports/GroupReportPrint";

// واجهة الربط العامة لبرنامج المجمعة (مفتاح قراءة عام)
const GROUP_API_URL = "https://iaxjpbjmvfizoxdgmqhb.supabase.co/rest/v1";
const GROUP_API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlheGpwYmptdmZpem94ZGdtcWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTkzMTQsImV4cCI6MjA5MTg5NTMxNH0.Er3rje4yyc7lo9zYXfRD6M0Xh4BwpZFZGWbX8G3gkSM";

interface GroupInvoice {
  id: string;
  invoice_number: string;
  total: number;
  discount: number;
  tax_rate: number;
  payment_type: string;
  created_at: string;
  driver_name: string | null;
  plate_number: string | null;
}

interface GroupExpense {
  id: string;
  amount: number;
  description: string | null;
  expense_date: string;
  entry_type: string;
  recipient_name: string | null;
}

const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const paymentLabel = (t: string) =>
  t === "cash" ? "نقدي" : t === "credit" ? "آجل" : t === "network" ? "شبكة" : t;

/** جلب كل الصفوف على دفعات لتجاوز حد 1000 صف */
async function fetchAll<T>(table: string, query: string): Promise<T[]> {
  const pageSize = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(`${GROUP_API_URL}/${table}?${query}`, {
      headers: {
        apikey: GROUP_API_KEY,
        Authorization: `Bearer ${GROUP_API_KEY}`,
        "Range-Unit": "items",
        Range: `${from}-${from + pageSize - 1}`,
      },
    });
    if (!res.ok) throw new Error(`فشل جلب ${table}: ${res.status}`);
    const rows = (await res.json()) as T[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

const GroupReportTab = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState("2026-10-01");
  const [toDate, setToDate] = useState(today);
  const [invoices, setInvoices] = useState<GroupInvoice[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextDay = new Date(toDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().slice(0, 10);
      const [inv, exp] = await Promise.all([
        fetchAll<GroupInvoice>(
          "invoices",
          `select=id,invoice_number,total,discount,tax_rate,payment_type,created_at,driver_name,plate_number&created_at=gte.${fromDate}T00:00:00&created_at=lt.${nextDayStr}T00:00:00&order=created_at.desc`
        ),
        fetchAll<GroupExpense>(
          "expenses",
          `select=id,amount,description,expense_date,entry_type,recipient_name&expense_date=gte.${fromDate}&expense_date=lte.${toDate}&order=expense_date.desc`
        ),
      ]);
      setInvoices(inv);
      setExpenses(exp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر جلب البيانات");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const totalSales = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const net = totalSales - totalExpenses;
  const cashSales = invoices
    .filter((i) => i.payment_type === "cash")
    .reduce((s, i) => s + Number(i.total || 0), 0);
  const creditSales = totalSales - cashSales;

  return (
    <div className="space-y-6">
      <style>{groupReportStyles}</style>
      <GroupReportPrintPortal fromDate={fromDate} toDate={toDate} invoices={invoices} expenses={expenses} />
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[230mm] max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <DialogTitle>معاينة التقرير — A4</DialogTitle>
            <Button size="sm" className="gap-2 ml-8" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> طباعة / تحميل PDF
            </Button>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md">
            <div className="bg-background shadow-lg mx-auto" style={{ width: "210mm", minHeight: "297mm", padding: "14mm" }}>
              <GroupReportDocument fromDate={fromDate} toDate={toDate} invoices={invoices} expenses={expenses} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* فلاتر الفترة */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="group-from">من تاريخ</Label>
            <Input
              id="group-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-to">إلى تاريخ</Label>
            <Input
              id="group-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-44"
            />
          </div>
          <Button onClick={loadReport} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            تحديث التقرير
          </Button>
          <Button variant="outline" className="gap-2" disabled={loading} onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" /> معاينة
          </Button>
          <Button variant="outline" className="gap-2" disabled={loading} onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> تحميل PDF
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            البيانات تُستورد مباشرة من برنامج المجمعة
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive font-medium">{error}</CardContent>
        </Card>
      )}

      {/* بطاقات الملخص */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">عدد الفواتير</p>
              <p className="text-2xl font-bold text-indigo-900">{invoices.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-emerald-900">{formatMoney(totalSales)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
              <p className="text-2xl font-bold text-amber-900">{formatMoney(totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={net >= 0 ? "border-teal-200 bg-gradient-to-br from-teal-50 to-white" : "border-rose-200 bg-gradient-to-br from-rose-50 to-white"}>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl text-white flex items-center justify-center shadow ${net >= 0 ? "bg-teal-600" : "bg-rose-600"}`}>
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">صافي الفترة</p>
              <p className={`text-2xl font-bold ${net >= 0 ? "text-teal-900" : "text-rose-900"}`}>
                {formatMoney(net)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">مبيعات نقدية</span>
            <span className="text-lg font-bold">{formatMoney(cashSales)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">مبيعات أخرى (شبكة/آجل)</span>
            <span className="text-lg font-bold">{formatMoney(creditSales)}</span>
          </CardContent>
        </Card>
      </div>

      {/* جدول الفواتير */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">فواتير المجمعة خلال الفترة</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الفاتورة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">السائق</TableHead>
                  <TableHead className="text-right">اللوحة</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-left">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin inline-block ml-2" />
                      جاري استيراد البيانات...
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      لا توجد فواتير في هذه الفترة
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{formatDateTime(inv.created_at)}</TableCell>
                      <TableCell>{inv.driver_name || "-"}</TableCell>
                      <TableCell>{inv.plate_number || "-"}</TableCell>
                      <TableCell>{paymentLabel(inv.payment_type)}</TableCell>
                      <TableCell className="text-left font-semibold">
                        {formatMoney(Number(inv.total || 0))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* جدول المصروفات */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">مصروفات المجمعة خلال الفترة</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">البيان</TableHead>
                  <TableHead className="text-right">المستلم</TableHead>
                  <TableHead className="text-left">المبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      لا توجد مصروفات في هذه الفترة
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell>{exp.expense_date}</TableCell>
                      <TableCell>{exp.description || "-"}</TableCell>
                      <TableCell>{exp.recipient_name || "-"}</TableCell>
                      <TableCell className="text-left font-semibold text-amber-700">
                        {formatMoney(Number(exp.amount || 0))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const PlaceholderTab = ({ title }: { title: string }) => (
  <Card>
    <CardContent className="py-16 text-center space-y-3">
      <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground/40" />
      <p className="text-lg font-semibold text-muted-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">سيُضاف هذا التقرير قريبًا</p>
    </CardContent>
  </Card>
);

const ReportsHub = () => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="hover:text-primary transition-colors">
            <ArrowRight className="h-6 w-6" />
          </Link>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-600 to-cyan-700 flex items-center justify-center text-white shadow">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">التقارير</h1>
            <p className="text-xs text-muted-foreground">تقارير مجمعة من برامج المنشأة</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="group" dir="rtl" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="group" className="gap-1.5">
              <Layers className="h-4 w-4" />
              تقرير المجمعة
            </TabsTrigger>
            <TabsTrigger value="tab2">التقرير الثاني</TabsTrigger>
            <TabsTrigger value="tab3">التقرير الثالث</TabsTrigger>
            <TabsTrigger value="tab4">التقرير الرابع</TabsTrigger>
          </TabsList>

          <TabsContent value="group" className="mt-6">
            <GroupReportTab />
          </TabsContent>
          <TabsContent value="tab2" className="mt-6">
            <PlaceholderTab title="التقرير الثاني" />
          </TabsContent>
          <TabsContent value="tab3" className="mt-6">
            <PlaceholderTab title="التقرير الثالث" />
          </TabsContent>
          <TabsContent value="tab4" className="mt-6">
            <PlaceholderTab title="التقرير الرابع" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ReportsHub;
