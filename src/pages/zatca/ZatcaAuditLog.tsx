import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ScrollText,
  ArrowRight,
  RefreshCw,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  FileJson,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingCup from "@/components/LoadingCup";

interface SubmissionRow {
  id: string;
  created_at: string;
  invoice_id: string | null;
  submission_type: string;
  environment: string;
  status_code: number | null;
  result: string | null;
  message: string | null;
  zatca_uuid: string | null;
  duration_ms: number | null;
  request_payload: any;
  response_payload: any;
  errors: any;
  warnings: any;
  created_by: string | null;
  invoice?: { invoice_number: string | null } | null;
}

const resultBadge = (r: string | null) => {
  switch (r) {
    case "success":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 ml-1" /> ناجح
        </Badge>
      );
    case "warning":
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 hover:bg-amber-500/20">
          <AlertTriangle className="h-3 w-3 ml-1" /> تحذير
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20">
          <XCircle className="h-3 w-3 ml-1" /> خطأ
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 ml-1" /> معلّق
        </Badge>
      );
  }
};

const typeLabel = (t: string) => {
  const map: Record<string, string> = {
    clearance: "ترحيل (Clearance)",
    reporting: "إبلاغ (Reporting)",
    compliance: "امتثال (Compliance)",
    validation: "تحقّق (Validation)",
  };
  return map[t] || t;
};

const ZatcaAuditLog = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterEnv, setFilterEnv] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<SubmissionRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("zatca_submissions")
        .select("*, invoice:zatca_invoices(invoice_number)")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      setRows((data as any) || []);
    } catch (e: any) {
      toast({
        title: "تعذر تحميل السجل",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterResult !== "all" && r.result !== filterResult) return false;
      if (filterType !== "all" && r.submission_type !== filterType) return false;
      if (filterEnv !== "all" && r.environment !== filterEnv) return false;
      if (startDate && r.created_at < startDate) return false;
      if (endDate && r.created_at > endDate + "T23:59:59") return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [
          r.invoice?.invoice_number,
          r.zatca_uuid,
          r.message,
          r.submission_type,
          r.environment,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filterResult, filterType, filterEnv, startDate, endDate]);

  const stats = useMemo(() => {
    const t = filtered.length;
    const ok = filtered.filter((r) => r.result === "success").length;
    const warn = filtered.filter((r) => r.result === "warning").length;
    const err = filtered.filter((r) => r.result === "error").length;
    const avg =
      t > 0
        ? Math.round(
            filtered.reduce((s, r) => s + (r.duration_ms || 0), 0) / t
          )
        : 0;
    return { t, ok, warn, err, avg };
  }, [filtered]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير" });
      return;
    }
    const headers = [
      "التاريخ",
      "رقم الفاتورة",
      "نوع العملية",
      "البيئة",
      "النتيجة",
      "كود HTTP",
      "ZATCA UUID",
      "المدة (ms)",
      "الرسالة",
    ];
    const lines = filtered.map((r) =>
      [
        new Date(r.created_at).toLocaleString("ar-SA"),
        r.invoice?.invoice_number ?? "",
        typeLabel(r.submission_type),
        r.environment,
        r.result ?? "",
        r.status_code ?? "",
        r.zatca_uuid ?? "",
        r.duration_ms ?? "",
        (r.message ?? "").replace(/[\r\n,]/g, " "),
      ].join(",")
    );
    const csv = "\uFEFF" + [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zatca-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <div className="p-3 rounded-xl bg-pink-500/10">
              <ScrollText className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">سجل التدقيق</h1>
              <p className="text-sm text-muted-foreground">
                Audit Log - سجل كامل وغير قابل للتعديل لعمليات الفوترة
                الإلكترونية
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4 ml-2" /> تحديث
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 ml-2" /> تصدير CSV
            </Button>
            <Button variant="outline" onClick={() => navigate("/zatca")}>
              <ArrowRight className="h-4 w-4 ml-2" /> رجوع
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">إجمالي العمليات</div>
              <div className="text-2xl font-bold mt-1">{stats.t}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">ناجحة</div>
              <div className="text-2xl font-bold mt-1 text-emerald-600">
                {stats.ok}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">تحذيرات</div>
              <div className="text-2xl font-bold mt-1 text-amber-600">
                {stats.warn}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">أخطاء</div>
              <div className="text-2xl font-bold mt-1 text-destructive">
                {stats.err}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">متوسط الزمن</div>
              <div className="text-2xl font-bold mt-1">{stats.avg} ms</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" /> فلترة وبحث
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">بحث</Label>
              <div className="relative">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pr-8"
                  placeholder="رقم فاتورة، UUID، رسالة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">النتيجة</Label>
              <Select value={filterResult} onValueChange={setFilterResult}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="success">ناجح</SelectItem>
                  <SelectItem value="warning">تحذير</SelectItem>
                  <SelectItem value="error">خطأ</SelectItem>
                  <SelectItem value="pending">معلّق</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع العملية</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="clearance">Clearance</SelectItem>
                  <SelectItem value="reporting">Reporting</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="validation">Validation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">من تاريخ</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="md:col-span-6 flex items-center gap-2">
              <Label className="text-xs">البيئة:</Label>
              {["all", "sandbox", "simulation", "production"].map((env) => (
                <Button
                  key={env}
                  size="sm"
                  variant={filterEnv === env ? "default" : "outline"}
                  onClick={() => setFilterEnv(env)}
                >
                  {env === "all" ? "الكل" : env}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ والوقت</TableHead>
                    <TableHead className="text-right">رقم الفاتورة</TableHead>
                    <TableHead className="text-right">العملية</TableHead>
                    <TableHead className="text-right">البيئة</TableHead>
                    <TableHead className="text-right">النتيجة</TableHead>
                    <TableHead className="text-right">HTTP</TableHead>
                    <TableHead className="text-right">المدة</TableHead>
                    <TableHead className="text-right">ZATCA UUID</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                        لا توجد سجلات مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("ar-SA")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.invoice?.invoice_number || "—"}
                        </TableCell>
                        <TableCell>{typeLabel(r.submission_type)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {r.environment}
                          </Badge>
                        </TableCell>
                        <TableCell>{resultBadge(r.result)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.status_code ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.duration_ms ? `${r.duration_ms}ms` : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[140px] truncate" dir="ltr">
                          {r.zatca_uuid || "—"}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detail dialog */}
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" /> تفاصيل العملية
              </DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">التاريخ</div>
                    <div className="font-medium">
                      {new Date(selected.created_at).toLocaleString("ar-SA")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">العملية</div>
                    <div className="font-medium">{typeLabel(selected.submission_type)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">البيئة</div>
                    <div className="font-medium">{selected.environment}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">النتيجة</div>
                    <div>{resultBadge(selected.result)}</div>
                  </div>
                </div>

                {selected.message && (
                  <div className="p-3 rounded-md bg-muted text-sm">
                    <div className="text-xs text-muted-foreground mb-1">الرسالة</div>
                    {selected.message}
                  </div>
                )}

                {selected.errors && (
                  <div>
                    <div className="text-sm font-semibold mb-1 text-destructive">الأخطاء</div>
                    <pre className="bg-destructive/5 border border-destructive/20 p-3 rounded-md text-xs overflow-auto max-h-48" dir="ltr">
{JSON.stringify(selected.errors, null, 2)}
                    </pre>
                  </div>
                )}

                {selected.warnings && (
                  <div>
                    <div className="text-sm font-semibold mb-1 text-amber-600">التحذيرات</div>
                    <pre className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-md text-xs overflow-auto max-h-48" dir="ltr">
{JSON.stringify(selected.warnings, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm font-semibold mb-1">Request</div>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-64" dir="ltr">
{JSON.stringify(selected.request_payload, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-1">Response</div>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-64" dir="ltr">
{JSON.stringify(selected.response_payload, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ZatcaAuditLog;
