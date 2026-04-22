import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  FileCheck2,
  Plus,
  Send,
  Eye,
  Trash2,
  Search,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingCup from "@/components/LoadingCup";
import ZATCAQRCode from "@/components/ZATCAQRCode";
import {
  generateZATCAQRBase64,
  formatAmount,
  getISOTimestamp,
} from "@/lib/zatcaQR";

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

interface ZInvoice {
  id: string;
  invoice_uuid: string;
  invoice_number: string;
  invoice_type: "standard" | "simplified";
  invoice_subtype: "invoice" | "credit" | "debit";
  issue_date: string;
  issue_time: string;
  seller_name: string;
  seller_vat: string;
  buyer_name: string | null;
  buyer_vat: string | null;
  subtotal: number;
  tax_amount: number;
  total_with_tax: number;
  items: InvoiceItem[];
  status: string;
  qr_base64: string | null;
  icv: number;
  zatca_uuid: string | null;
  rejection_reason: string | null;
  environment: string;
  notes: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "مسودة", color: "bg-slate-500", icon: Clock },
  ready: { label: "جاهزة", color: "bg-blue-500", icon: FileCheck2 },
  submitted: { label: "تم الإرسال", color: "bg-amber-500", icon: Send },
  cleared: { label: "مُخلصة", color: "bg-emerald-500", icon: ShieldCheck },
  reported: { label: "مُبلَّغ عنها", color: "bg-emerald-500", icon: CheckCircle2 },
  warning: { label: "تحذيرات", color: "bg-amber-500", icon: AlertCircle },
  rejected: { label: "مرفوضة", color: "bg-red-500", icon: AlertCircle },
};

const emptyItem: InvoiceItem = { description: "", quantity: 1, unit_price: 0, tax_rate: 15 };

const ZatcaInvoices = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<ZInvoice[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [zatcaSettings, setZatcaSettings] = useState<any>(null);

  const [openNew, setOpenNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newInv, setNewInv] = useState({
    invoice_type: "standard" as "standard" | "simplified",
    invoice_subtype: "invoice" as "invoice" | "credit" | "debit",
    issue_date: new Date().toISOString().slice(0, 10),
    buyer_name: "",
    buyer_vat: "",
    notes: "",
    items: [{ ...emptyItem }],
  });

  const [previewInv, setPreviewInv] = useState<ZInvoice | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [inv, settings] = await Promise.all([
        supabase
          .from("zatca_invoices")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("zatca_settings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setInvoices((inv.data || []) as any);
      setZatcaSettings(settings.data);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          i.invoice_number.toLowerCase().includes(s) ||
          (i.buyer_name || "").toLowerCase().includes(s) ||
          (i.buyer_vat || "").includes(s)
        );
      }
      return true;
    });
  }, [invoices, statusFilter, search]);

  const stats = useMemo(
    () => ({
      total: invoices.length,
      cleared: invoices.filter((i) => i.status === "cleared" || i.status === "reported").length,
      pending: invoices.filter((i) => i.status === "draft" || i.status === "ready").length,
      rejected: invoices.filter((i) => i.status === "rejected").length,
    }),
    [invoices],
  );

  const calcItem = (it: InvoiceItem) => {
    const sub = it.quantity * it.unit_price;
    const tax = sub * (it.tax_rate / 100);
    return { sub, tax, total: sub + tax };
  };

  const calcTotals = (items: InvoiceItem[]) =>
    items.reduce(
      (acc, it) => {
        const { sub, tax } = calcItem(it);
        acc.subtotal += sub;
        acc.tax += tax;
        acc.total += sub + tax;
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0 },
    );

  const newTotals = calcTotals(newInv.items);

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) =>
    setNewInv((s) => ({
      ...s,
      items: s.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));

  const addItem = () =>
    setNewInv((s) => ({ ...s, items: [...s.items, { ...emptyItem }] }));

  const removeItem = (idx: number) =>
    setNewInv((s) => ({ ...s, items: s.items.filter((_, i) => i !== idx) }));

  const generateInvoiceNumber = () => {
    const prefix = zatcaSettings?.invoice_prefix || "INV";
    const next = (zatcaSettings?.invoice_counter || 0) + 1 + invoices.length;
    return `${prefix}-${new Date().getFullYear()}-${String(next).padStart(6, "0")}`;
  };

  const handleCreate = async () => {
    if (!zatcaSettings?.seller_name_ar || !zatcaSettings?.vat_number) {
      toast({
        title: "بيانات الإعدادات ناقصة",
        description: "يرجى إكمال إعدادات ZATCA أولاً (اسم المنشأة والرقم الضريبي)",
        variant: "destructive",
      });
      return;
    }
    if (newInv.items.length === 0 || newInv.items.some((i) => !i.description.trim())) {
      toast({
        title: "بنود غير صالحة",
        description: "يجب إضافة بند واحد على الأقل بوصف",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const totals = calcTotals(newInv.items);
      const invoiceNumber = generateInvoiceNumber();
      const lastIcv = invoices.length > 0 ? Math.max(...invoices.map((i) => i.icv || 0)) : 0;
      const newIcv = lastIcv + 1;

      const qr = generateZATCAQRBase64({
        sellerName: zatcaSettings.seller_name_ar,
        vatNumber: zatcaSettings.vat_number,
        timestamp: getISOTimestamp(new Date(newInv.issue_date)),
        totalAmount: formatAmount(totals.total),
        vatAmount: formatAmount(totals.tax),
      });

      const { error } = await supabase.from("zatca_invoices").insert({
        invoice_number: invoiceNumber,
        invoice_type: newInv.invoice_type,
        invoice_subtype: newInv.invoice_subtype,
        issue_date: newInv.issue_date,
        issue_time: new Date().toTimeString().slice(0, 8),
        seller_name: zatcaSettings.seller_name_ar,
        seller_vat: zatcaSettings.vat_number,
        seller_crn: zatcaSettings.crn,
        seller_address: {
          street: zatcaSettings.street_name,
          building: zatcaSettings.building_number,
          city: zatcaSettings.city,
          postal_code: zatcaSettings.postal_code,
          district: zatcaSettings.district,
          additional_number: zatcaSettings.additional_number,
          country: zatcaSettings.country_code,
        },
        buyer_name: newInv.buyer_name || null,
        buyer_vat: newInv.buyer_vat || null,
        subtotal: totals.subtotal,
        tax_amount: totals.tax,
        total_with_tax: totals.total,
        items: newInv.items as any,
        notes: newInv.notes || null,
        icv: newIcv,
        qr_base64: qr,
        status: "ready",
        environment: zatcaSettings.environment || "sandbox",
      });

      if (error) throw error;

      toast({ title: "تم إنشاء الفاتورة", description: invoiceNumber });
      setOpenNew(false);
      setNewInv({
        invoice_type: "standard",
        invoice_subtype: "invoice",
        issue_date: new Date().toISOString().slice(0, 10),
        buyer_name: "",
        buyer_vat: "",
        notes: "",
        items: [{ ...emptyItem }],
      });
      loadAll();
    } catch (e: any) {
      toast({ title: "خطأ في الإنشاء", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (inv: ZInvoice) => {
    setSubmittingId(inv.id);
    try {
      const { data, error } = await supabase.functions.invoke("zatca-submit", {
        body: { invoice_id: inv.id },
      });
      if (error) throw error;

      const result = data as any;
      if (result.result === "error") {
        toast({
          title: "فشل الإرسال",
          description: result.message || "رفضت الهيئة الفاتورة",
          variant: "destructive",
        });
      } else if (result.result === "warning") {
        toast({ title: "تم القبول مع تحذيرات", description: result.message });
      } else {
        toast({ title: "نجح الإرسال", description: result.message });
      }
      loadAll();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه الفاتورة؟")) return;
    const { error } = await supabase.from("zatca_invoices").delete().eq("id", id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else {
      toast({ title: "تم الحذف" });
      loadAll();
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
              <FileCheck2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">الفواتير الإلكترونية المعتمدة</h1>
              <p className="text-sm text-muted-foreground">
                ZATCA Approved Invoices — إصدار، تخليص، إرسال
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
            <Button onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4 ml-2" /> فاتورة جديدة
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">إجمالي الفواتير</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">مقبولة من الهيئة</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.cleared}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">بانتظار الإرسال</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">مرفوضة</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-4 flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الفاتورة، اسم المشتري، الرقم الضريبي..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
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
                  <TableHead className="text-right">رقم الفاتورة</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المشتري</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-right">الضريبة</TableHead>
                  <TableHead className="text-right">ICV</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      لا توجد فواتير. اضغط "فاتورة جديدة" للبدء.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => {
                    const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                    const StatusIcon = cfg.icon;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {inv.invoice_type === "standard" ? "ضريبية" : "مبسطة"}
                          </Badge>
                        </TableCell>
                        <TableCell>{inv.issue_date}</TableCell>
                        <TableCell>{inv.buyer_name || "—"}</TableCell>
                        <TableCell className="font-mono">
                          {inv.total_with_tax?.toFixed(2)} ر.س
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {inv.tax_amount?.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{inv.icv}</TableCell>
                        <TableCell>
                          <Badge className={`${cfg.color} text-white gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPreviewInv(inv)}
                              title="عرض"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(inv.status === "ready" ||
                              inv.status === "draft" ||
                              inv.status === "rejected" ||
                              inv.status === "warning") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSubmit(inv)}
                                disabled={submittingId === inv.id}
                                title="إرسال للهيئة"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                {submittingId === inv.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {inv.status === "draft" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(inv.id)}
                                className="text-red-600 hover:text-red-700"
                                title="حذف"
                              >
                                <Trash2 className="h-4 w-4" />
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

      {/* New Invoice Dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة معتمدة جديدة</DialogTitle>
            <DialogDescription>
              ستُولّد QR وUUID وICV تلقائياً وفقاً لمتطلبات الهيئة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>نوع الفاتورة</Label>
                <Select
                  value={newInv.invoice_type}
                  onValueChange={(v: any) => setNewInv((s) => ({ ...s, invoice_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">ضريبية (B2B)</SelectItem>
                    <SelectItem value="simplified">مبسطة (B2C)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>الفئة</Label>
                <Select
                  value={newInv.invoice_subtype}
                  onValueChange={(v: any) => setNewInv((s) => ({ ...s, invoice_subtype: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">فاتورة</SelectItem>
                    <SelectItem value="credit">إشعار دائن</SelectItem>
                    <SelectItem value="debit">إشعار مدين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ الإصدار</Label>
                <Input
                  type="date"
                  value={newInv.issue_date}
                  onChange={(e) => setNewInv((s) => ({ ...s, issue_date: e.target.value }))}
                />
              </div>
            </div>

            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>اسم المشتري</Label>
                <Input
                  value={newInv.buyer_name}
                  onChange={(e) => setNewInv((s) => ({ ...s, buyer_name: e.target.value }))}
                  placeholder="اختياري للمبسطة، مفضل للضريبية"
                />
              </div>
              <div className="space-y-1.5">
                <Label>الرقم الضريبي للمشتري</Label>
                <Input
                  value={newInv.buyer_vat}
                  onChange={(e) => setNewInv((s) => ({ ...s, buyer_vat: e.target.value }))}
                  placeholder="15 رقم"
                  maxLength={15}
                  dir="ltr"
                />
              </div>
            </div>

            <Separator />
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-base">بنود الفاتورة</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-3 w-3 ml-1" /> إضافة بند
                </Button>
              </div>
              <div className="space-y-2">
                {newInv.items.map((it, idx) => {
                  const c = calcItem(it);
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg"
                    >
                      <div className="col-span-12 md:col-span-5">
                        <Label className="text-xs">الوصف</Label>
                        <Input
                          value={it.description}
                          onChange={(e) => updateItem(idx, { description: e.target.value })}
                          placeholder="اسم الصنف/الخدمة"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <Label className="text-xs">الكمية</Label>
                        <Input
                          type="number"
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Label className="text-xs">السعر</Label>
                        <Input
                          type="number"
                          value={it.unit_price}
                          onChange={(e) =>
                            updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="col-span-3 md:col-span-1">
                        <Label className="text-xs">ض %</Label>
                        <Input
                          type="number"
                          value={it.tax_rate}
                          onChange={(e) =>
                            updateItem(idx, { tax_rate: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1 text-xs font-mono pb-2">
                        {c.total.toFixed(2)}
                      </div>
                      <div className="col-span-12 md:col-span-1 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(idx)}
                          disabled={newInv.items.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end mt-3">
                <div className="bg-muted/50 rounded-lg p-3 min-w-[240px] space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المجموع قبل الضريبة:</span>
                    <span className="font-mono">{newTotals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ضريبة القيمة المضافة:</span>
                    <span className="font-mono">{newTotals.tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>الإجمالي:</span>
                    <span className="font-mono text-primary">
                      {newTotals.total.toFixed(2)} ر.س
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea
                value={newInv.notes}
                onChange={(e) => setNewInv((s) => ({ ...s, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "جاري الإنشاء..." : "إنشاء وحفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewInv} onOpenChange={() => setPreviewInv(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {previewInv && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>فاتورة {previewInv.invoice_number}</span>
                  <Badge className={`${STATUS_CONFIG[previewInv.status]?.color} text-white`}>
                    {STATUS_CONFIG[previewInv.status]?.label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  UUID: <span className="font-mono text-xs">{previewInv.invoice_uuid}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">البائع</p>
                    <p className="font-semibold">{previewInv.seller_name}</p>
                    <p className="font-mono text-xs">{previewInv.seller_vat}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">المشتري</p>
                    <p className="font-semibold">{previewInv.buyer_name || "—"}</p>
                    <p className="font-mono text-xs">{previewInv.buyer_vat || ""}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">التاريخ والوقت</p>
                    <p>
                      {previewInv.issue_date} {previewInv.issue_time}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">ICV / البيئة</p>
                    <p>
                      {previewInv.icv} / <Badge variant="outline">{previewInv.environment}</Badge>
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-semibold mb-2">البنود</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الوصف</TableHead>
                        <TableHead className="text-right">الكمية</TableHead>
                        <TableHead className="text-right">السعر</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(previewInv.items || []).map((it, i) => (
                        <TableRow key={i}>
                          <TableCell>{it.description}</TableCell>
                          <TableCell className="font-mono">{it.quantity}</TableCell>
                          <TableCell className="font-mono">{it.unit_price?.toFixed(2)}</TableCell>
                          <TableCell className="font-mono">
                            {(it.quantity * it.unit_price * (1 + it.tax_rate / 100)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-end">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">رمز الاستجابة (ZATCA)</p>
                    <ZATCAQRCode
                      sellerName={previewInv.seller_name}
                      vatNumber={previewInv.seller_vat}
                      totalAmount={previewInv.total_with_tax}
                      vatAmount={previewInv.tax_amount}
                      invoiceDate={previewInv.issue_date}
                      size={140}
                    />
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 min-w-[200px] space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>المجموع:</span>
                      <span className="font-mono">{previewInv.subtotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الضريبة 15%:</span>
                      <span className="font-mono">{previewInv.tax_amount?.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>الإجمالي:</span>
                      <span className="font-mono text-primary">
                        {previewInv.total_with_tax?.toFixed(2)} ر.س
                      </span>
                    </div>
                  </div>
                </div>

                {previewInv.zatca_uuid && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                    <p className="text-emerald-700 font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> مُعتمدة من الهيئة
                    </p>
                    <p className="text-xs font-mono mt-1">UUID: {previewInv.zatca_uuid}</p>
                  </div>
                )}

                {previewInv.rejection_reason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <p className="text-red-700 font-semibold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> مرفوضة
                    </p>
                    <p className="text-xs mt-1">{previewInv.rejection_reason}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                {(previewInv.status === "ready" ||
                  previewInv.status === "rejected" ||
                  previewInv.status === "warning") && (
                  <Button
                    onClick={() => {
                      handleSubmit(previewInv);
                      setPreviewInv(null);
                    }}
                  >
                    <Send className="h-4 w-4 ml-2" /> إرسال للهيئة
                  </Button>
                )}
                <Button variant="outline" onClick={() => setPreviewInv(null)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZatcaInvoices;
