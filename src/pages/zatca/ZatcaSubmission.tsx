import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingCup from "@/components/LoadingCup";

interface Submission {
  id: string;
  invoice_id: string;
  submission_type: string;
  environment: string;
  request_payload: any;
  response_payload: any;
  status_code: number | null;
  result: string | null;
  message: string | null;
  warnings: any;
  errors: any;
  zatca_uuid: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface InvoiceSlim {
  id: string;
  invoice_number: string;
  status: string;
  invoice_type: string;
  total_with_tax: number;
}

const RESULT_CFG: Record<string, { label: string; color: string; icon: any }> = {
  success: { label: "ناجح", color: "bg-emerald-500", icon: CheckCircle2 },
  warning: { label: "تحذير", color: "bg-amber-500", icon: AlertTriangle },
  error: { label: "خطأ", color: "bg-red-500", icon: AlertCircle },
  pending: { label: "قيد الانتظار", color: "bg-slate-500", icon: Clock },
};

const ZatcaSubmission = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [invoices, setInvoices] = useState<Record<string, InvoiceSlim>>({});
  const [resultFilter, setResultFilter] = useState("all");
  const [envFilter, setEnvFilter] = useState("all");
  const [batchRunning, setBatchRunning] = useState(false);
  const [detail, setDetail] = useState<Submission | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [subs, invs] = await Promise.all([
        supabase
          .from("zatca_submissions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("zatca_invoices")
          .select("id, invoice_number, status, invoice_type, total_with_tax"),
      ]);
      setSubmissions((subs.data || []) as any);
      const map: Record<string, InvoiceSlim> = {};
      (invs.data || []).forEach((i: any) => (map[i.id] = i));
      setInvoices(map);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (resultFilter !== "all" && s.result !== resultFilter) return false;
      if (envFilter !== "all" && s.environment !== envFilter) return false;
      return true;
    });
  }, [submissions, resultFilter, envFilter]);

  const stats = useMemo(() => {
    return {
      total: submissions.length,
      success: submissions.filter((s) => s.result === "success").length,
      warning: submissions.filter((s) => s.result === "warning").length,
      error: submissions.filter((s) => s.result === "error").length,
      avgLatency: submissions.length
        ? Math.round(
            submissions.reduce((a, s) => a + (s.duration_ms || 0), 0) / submissions.length,
          )
        : 0,
    };
  }, [submissions]);

  const handleBatchSend = async () => {
    // Send all "ready" or "rejected" invoices
    const { data: pending } = await supabase
      .from("zatca_invoices")
      .select("id, invoice_number")
      .in("status", ["ready", "rejected", "warning"]);

    if (!pending || pending.length === 0) {
      toast({ title: "لا توجد فواتير جاهزة للإرسال" });
      return;
    }

    if (!confirm(`إرسال ${pending.length} فاتورة دفعة واحدة للهيئة؟`)) return;

    setBatchRunning(true);
    let success = 0,
      failed = 0;
    for (const inv of pending) {
      try {
        const { data } = await supabase.functions.invoke("zatca-submit", {
          body: { invoice_id: inv.id },
        });
        if ((data as any)?.result === "error") failed++;
        else success++;
      } catch {
        failed++;
      }
    }
    toast({
      title: "اكتمل الإرسال الجماعي",
      description: `نجح: ${success} — فشل: ${failed}`,
    });
    setBatchRunning(false);
    loadAll();
  };

  const handleRetry = async (sub: Submission) => {
    try {
      await supabase.functions.invoke("zatca-submit", {
        body: { invoice_id: sub.invoice_id, submission_type: sub.submission_type },
      });
      toast({ title: "تمت إعادة الإرسال" });
      loadAll();
    } catch (e: any) {
      toast({ title: "فشل", description: e.message, variant: "destructive" });
    }
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
            <div className="p-3 rounded-xl bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">الإرسال لهيئة الزكاة</h1>
              <p className="text-sm text-muted-foreground">
                ZATCA Submission — Clearance &amp; Reporting Logs
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadAll}>
              <RefreshCw className="h-4 w-4 ml-2" /> تحديث
            </Button>
            <Button variant="outline" onClick={() => navigate("/zatca")}>
              <ArrowRight className="h-4 w-4 ml-2" /> رجوع
            </Button>
            <Button onClick={handleBatchSend} disabled={batchRunning}>
              <Send className="h-4 w-4 ml-2" />
              {batchRunning ? "جاري الإرسال..." : "إرسال جماعي للجاهزة"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">إجمالي الإرسالات</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">ناجحة</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.success}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">تحذيرات</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{stats.warning}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">أخطاء</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{stats.error}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">متوسط الزمن</p>
              <p className="text-2xl font-bold mt-1">{stats.avgLatency}ms</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-4 flex gap-3 flex-wrap items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="النتيجة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل النتائج</SelectItem>
                <SelectItem value="success">ناجحة</SelectItem>
                <SelectItem value="warning">تحذيرات</SelectItem>
                <SelectItem value="error">أخطاء</SelectItem>
              </SelectContent>
            </Select>
            <Select value={envFilter} onValueChange={setEnvFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="البيئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل البيئات</SelectItem>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="simulation">Simulation</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">رقم الفاتورة</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">المسار</TableHead>
                  <TableHead className="text-right">البيئة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الزمن</TableHead>
                  <TableHead className="text-right">الرسالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      لا يوجد سجل إرسالات بعد. اضغط "إرسال جماعي" لبدء الإرسال.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => {
                    const inv = invoices[s.invoice_id];
                    const cfg = RESULT_CFG[s.result || "pending"] || RESULT_CFG.pending;
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(s.created_at).toLocaleString("ar-SA")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {inv?.invoice_number || "—"}
                        </TableCell>
                        <TableCell>
                          {inv && (
                            <Badge variant="outline" className="text-xs">
                              {inv.invoice_type === "standard" ? "ضريبية" : "مبسطة"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {s.submission_type === "clearance"
                              ? "تخليص"
                              : s.submission_type === "reporting"
                              ? "تبليغ"
                              : s.submission_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{s.environment}</TableCell>
                        <TableCell>
                          <Badge className={`${cfg.color} text-white gap-1`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {s.duration_ms}ms
                        </TableCell>
                        <TableCell className="text-xs max-w-[280px] truncate">
                          {s.message}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setDetail(s)}>
                              تفاصيل
                            </Button>
                            {s.result === "error" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRetry(s)}
                                className="text-blue-600"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>تفاصيل الإرسال</DialogTitle>
                <DialogDescription>
                  {new Date(detail.created_at).toLocaleString("ar-SA")} —{" "}
                  {detail.submission_type} — {detail.environment}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded">
                    <p className="text-xs text-muted-foreground">رمز الحالة</p>
                    <p className="font-mono font-bold">{detail.status_code}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded">
                    <p className="text-xs text-muted-foreground">UUID من الهيئة</p>
                    <p className="font-mono text-xs break-all">{detail.zatca_uuid || "—"}</p>
                  </div>
                </div>

                {detail.errors && detail.errors.length > 0 && (
                  <div>
                    <p className="font-semibold text-red-600 mb-2">الأخطاء</p>
                    <div className="space-y-1">
                      {detail.errors.map((e: any, i: number) => (
                        <div
                          key={i}
                          className="p-2 bg-red-50 border border-red-200 rounded text-xs"
                        >
                          <span className="font-mono font-bold">{e.code}:</span> {e.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.warnings && detail.warnings.length > 0 && (
                  <div>
                    <p className="font-semibold text-amber-600 mb-2">التحذيرات</p>
                    <div className="space-y-1">
                      {detail.warnings.map((w: any, i: number) => (
                        <div
                          key={i}
                          className="p-2 bg-amber-50 border border-amber-200 rounded text-xs"
                        >
                          <span className="font-mono font-bold">{w.code}:</span> {w.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="font-semibold mb-2">Request Payload</p>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded text-xs overflow-x-auto" dir="ltr">
                    {JSON.stringify(detail.request_payload, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="font-semibold mb-2">Response Payload</p>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded text-xs overflow-x-auto max-h-[300px]" dir="ltr">
                    {JSON.stringify(detail.response_payload, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZatcaSubmission;
