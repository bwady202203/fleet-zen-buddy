import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  ArrowRight,
  RefreshCw,
  Download,
  TrendingUp,
  Receipt,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Wallet,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingCup from "@/components/LoadingCup";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  invoice_type: string;
  invoice_subtype: string;
  issue_date: string;
  buyer_name: string | null;
  subtotal: number;
  tax_amount: number;
  total_with_tax: number;
  status: string;
  environment: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const periodFilter = (d: string, period: string) => {
  const now = new Date();
  const dt = new Date(d);
  if (period === "all") return true;
  if (period === "month") return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const dq = Math.floor(dt.getMonth() / 3);
    return q === dq && dt.getFullYear() === now.getFullYear();
  }
  if (period === "year") return dt.getFullYear() === now.getFullYear();
  return true;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  ready: "جاهزة",
  submitted: "مُرسلة",
  cleared: "معتمدة",
  reported: "مُبلَّغة",
  rejected: "مرفوضة",
  warning: "تحذير",
};

const STATUS_COLORS: Record<string, string> = {
  cleared: "hsl(142 76% 45%)",
  reported: "hsl(199 89% 48%)",
  submitted: "hsl(217 91% 60%)",
  ready: "hsl(43 96% 56%)",
  draft: "hsl(220 9% 60%)",
  warning: "hsl(38 92% 50%)",
  rejected: "hsl(0 84% 60%)",
};

const ZatcaReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [period, setPeriod] = useState("year");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("zatca_invoices")
        .select(
          "id, invoice_number, invoice_type, invoice_subtype, issue_date, buyer_name, subtotal, tax_amount, total_with_tax, status, environment"
        )
        .order("issue_date", { ascending: false })
        .limit(5000);
      if (error) throw error;
      setInvoices((data as any) || []);
    } catch (e: any) {
      toast({ title: "تعذر تحميل التقارير", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      invoices.filter(
        (i) =>
          periodFilter(i.issue_date, period) &&
          (type === "all" || i.invoice_type === type) &&
          (!search ||
            i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
            (i.buyer_name || "").toLowerCase().includes(search.toLowerCase()))
      ),
    [invoices, period, type, search]
  );

  const kpi = useMemo(() => {
    const total = filtered.length;
    const totalAmount = filtered.reduce((s, i) => s + Number(i.total_with_tax || 0), 0);
    const totalVat = filtered.reduce((s, i) => s + Number(i.tax_amount || 0), 0);
    const cleared = filtered.filter((i) => i.status === "cleared" || i.status === "reported").length;
    const rejected = filtered.filter((i) => i.status === "rejected").length;
    const pending = filtered.filter((i) => ["draft", "ready", "submitted"].includes(i.status)).length;
    const acceptanceRate = total > 0 ? Math.round((cleared / total) * 100) : 0;
    return { total, totalAmount, totalVat, cleared, rejected, pending, acceptanceRate };
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { name: string; total: number; vat: number; count: number }> = {};
    filtered.forEach((i) => {
      const d = new Date(i.issue_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) {
        months[key] = {
          name: d.toLocaleDateString("ar-SA", { month: "short", year: "numeric" }),
          total: 0,
          vat: 0,
          count: 0,
        };
      }
      months[key].total += Number(i.total_with_tax || 0);
      months[key].vat += Number(i.tax_amount || 0);
      months[key].count += 1;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
      .slice(-12);
  }, [filtered]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((i) => (counts[i.status] = (counts[i.status] || 0) + 1));
    return Object.entries(counts).map(([k, v]) => ({
      name: STATUS_LABEL[k] || k,
      value: v,
      color: STATUS_COLORS[k] || "hsl(220 9% 60%)",
    }));
  }, [filtered]);

  const topBuyers = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    filtered.forEach((i) => {
      const name = i.buyer_name || "—";
      if (!map[name]) map[name] = { name, total: 0, count: 0 };
      map[name].total += Number(i.total_with_tax || 0);
      map[name].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filtered]);

  const exportVatReport = () => {
    const headers = ["التاريخ", "رقم الفاتورة", "النوع", "المشتري", "الأساس الضريبي", "ضريبة 15%", "الإجمالي", "الحالة"];
    const lines = filtered.map((i) =>
      [
        i.issue_date,
        i.invoice_number,
        i.invoice_type === "standard" ? "ضريبية" : "مبسطة",
        (i.buyer_name || "").replace(/[\r\n,]/g, " "),
        fmt(Number(i.subtotal)),
        fmt(Number(i.tax_amount)),
        fmt(Number(i.total_with_tax)),
        STATUS_LABEL[i.status] || i.status,
      ].join(",")
    );
    const csv = "\uFEFF" + [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vat-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingCup />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">التقارير الضريبية</h1>
              <p className="text-sm text-muted-foreground">
                Tax Reports Dashboard - تحليل أداء الفواتير وإقرار VAT
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4 ml-2" /> تحديث
            </Button>
            <Button variant="outline" onClick={exportVatReport}>
              <Download className="h-4 w-4 ml-2" /> تصدير VAT
            </Button>
            <Button variant="outline" onClick={() => navigate("/zatca")}>
              <ArrowRight className="h-4 w-4 ml-2" /> رجوع
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">الفترة</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">الشهر الحالي</SelectItem>
                  <SelectItem value="quarter">الربع الحالي</SelectItem>
                  <SelectItem value="year">السنة الحالية</SelectItem>
                  <SelectItem value="all">الكل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع الفاتورة</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="standard">ضريبية (B2B)</SelectItem>
                  <SelectItem value="simplified">مبسطة (B2C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">بحث</Label>
              <Input
                placeholder="رقم الفاتورة أو اسم المشتري..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="border-r-4 border-r-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">إجمالي الفواتير</div>
                  <div className="text-2xl font-bold mt-1">{kpi.total}</div>
                </div>
                <Receipt className="h-8 w-8 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-r-4 border-r-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">إجمالي المبيعات (شامل)</div>
                  <div className="text-xl font-bold mt-1">{fmt(kpi.totalAmount)} <span className="text-xs">ر.س</span></div>
                </div>
                <Wallet className="h-8 w-8 text-emerald-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-r-4 border-r-violet-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">VAT المُحصَّلة 15%</div>
                  <div className="text-xl font-bold mt-1">{fmt(kpi.totalVat)} <span className="text-xs">ر.س</span></div>
                </div>
                <TrendingUp className="h-8 w-8 text-violet-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-r-4 border-r-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">نسبة القبول</div>
                  <div className="text-2xl font-bold mt-1">{kpi.acceptanceRate}%</div>
                </div>
                <CheckCircle2 className="h-8 w-8 text-amber-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status mini cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-3 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <div className="text-xs text-muted-foreground">معتمدة / مُبلَّغة</div>
                <div className="text-lg font-bold text-emerald-700">{kpi.cleared}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-3 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <div className="text-xs text-muted-foreground">معلّقة (لم تُرسل)</div>
                <div className="text-lg font-bold text-amber-700">{kpi.pending}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-3 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <div className="text-xs text-muted-foreground">مرفوضة</div>
                <div className="text-lg font-bold text-destructive">{kpi.rejected}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">المبيعات و VAT شهرياً</CardTitle>
              <CardDescription>آخر 12 شهر</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="total" name="الإجمالي" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vat" name="VAT" fill="hsl(262 83% 58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">توزيع الفواتير حسب الحالة</CardTitle>
              <CardDescription>تحليل سريع</CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 text-sm">لا توجد بيانات</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(e: any) => `${e.name}: ${e.value}`}
                      labelLine={false}
                    >
                      {statusData.map((s, i) => (
                        <Cell key={i} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top buyers */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> أعلى 10 عملاء حسب المبيعات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">المشتري</TableHead>
                  <TableHead className="text-right">عدد الفواتير</TableHead>
                  <TableHead className="text-right">إجمالي المبيعات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topBuyers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      لا توجد بيانات
                    </TableCell>
                  </TableRow>
                ) : (
                  topBuyers.map((b, idx) => (
                    <TableRow key={b.name}>
                      <TableCell className="font-mono">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>{b.count}</TableCell>
                      <TableCell className="font-mono">{fmt(b.total)} ر.س</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* VAT Declaration */}
        <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              ملخص إقرار ضريبة القيمة المضافة (للفترة المختارة)
            </CardTitle>
            <CardDescription>جاهز للتقديم لهيئة الزكاة والضريبة والجمارك</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-card border">
                <div className="text-xs text-muted-foreground">المبيعات الخاضعة (الأساس)</div>
                <div className="text-xl font-bold mt-1">
                  {fmt(filtered.reduce((s, i) => s + Number(i.subtotal || 0), 0))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">ر.س</div>
              </div>
              <div className="p-4 rounded-lg bg-card border">
                <div className="text-xs text-muted-foreground">ضريبة المخرجات (15%)</div>
                <div className="text-xl font-bold mt-1 text-violet-600">{fmt(kpi.totalVat)}</div>
                <div className="text-xs text-muted-foreground mt-1">ر.س</div>
              </div>
              <div className="p-4 rounded-lg bg-card border">
                <div className="text-xs text-muted-foreground">إجمالي المبيعات (شامل)</div>
                <div className="text-xl font-bold mt-1 text-emerald-600">{fmt(kpi.totalAmount)}</div>
                <div className="text-xs text-muted-foreground mt-1">ر.س</div>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-xs text-muted-foreground">صافي الضريبة المستحقة</div>
                <div className="text-xl font-bold mt-1 text-primary">{fmt(kpi.totalVat)}</div>
                <div className="text-xs text-muted-foreground mt-1">ر.س — للسداد للهيئة</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              * هذا ملخص استرشادي. الإقرار الفعلي يتطلب احتساب ضريبة المدخلات (المشتريات)
              لتحديد الصافي القابل للسداد أو الاسترداد.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ZatcaReports;
