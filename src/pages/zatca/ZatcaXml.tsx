import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  FileCode2,
  Download,
  Copy,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingCup from "@/components/LoadingCup";
import { buildZatcaInvoiceXml, ZATCA_GENESIS_PIH } from "@/lib/zatcaXml";

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
  seller_crn: string | null;
  seller_address: any;
  buyer_name: string | null;
  buyer_vat: string | null;
  subtotal: number;
  tax_amount: number;
  total_with_tax: number;
  items: any;
  icv: number;
  pih: string | null;
  invoice_hash: string | null;
  xml_content: string | null;
  signed_xml: string | null;
  status: string;
  notes: string | null;
}

const ZatcaXmlPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<ZInvoice[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [xml, setXml] = useState("");
  const [hash, setHash] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCert, setActiveCert] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [inv, cert] = await Promise.all([
      supabase
        .from("zatca_invoices")
        .select(
          "id,invoice_uuid,invoice_number,invoice_type,invoice_subtype,issue_date,issue_time,seller_name,seller_vat,seller_crn,seller_address,buyer_name,buyer_vat,subtotal,tax_amount,total_with_tax,items,icv,pih,invoice_hash,xml_content,signed_xml,status,notes",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("zatca_certificates")
        .select("id,label")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setInvoices((inv.data || []) as any);
    setActiveCert(cert.data ?? null);
    setLoading(false);
  };

  const selected = useMemo(
    () => invoices.find((i) => i.id === selectedId) || null,
    [invoices, selectedId],
  );

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const items = Array.isArray(selected.items) ? selected.items : [];
      const addr = selected.seller_address || {};
      const result = await buildZatcaInvoiceXml({
        invoice_uuid: selected.invoice_uuid,
        invoice_number: selected.invoice_number,
        invoice_type: selected.invoice_type,
        invoice_subtype: selected.invoice_subtype,
        issue_date: selected.issue_date,
        issue_time: selected.issue_time,
        icv: selected.icv,
        pih: selected.pih || ZATCA_GENESIS_PIH,
        seller: {
          name_ar: selected.seller_name,
          vat_number: selected.seller_vat,
          crn: selected.seller_crn || "",
          street_name: addr.street,
          building_number: addr.building,
          plot_identification: addr.plot_identification,
          district: addr.district,
          city: addr.city,
          postal_code: addr.postal_code,
          additional_number: addr.additional_number,
          country_code: addr.country || "SA",
        },
        buyer: selected.buyer_name
          ? {
              name: selected.buyer_name,
              vat_number: selected.buyer_vat || undefined,
              country_code: "SA",
            }
          : null,
        lines: items.map((it: any) => ({
          description: it.description,
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
          tax_rate: Number(it.tax_rate ?? 15),
        })),
        notes: selected.notes,
      });
      setXml(result.xml);
      setHash(result.invoice_hash);
      toast({
        title: "تم توليد XML",
        description: `Hash: ${result.invoice_hash.slice(0, 24)}…`,
      });
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!selected || !xml) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("zatca_invoices")
        .update({ xml_content: xml, invoice_hash: hash })
        .eq("id", selected.id);
      if (error) throw error;
      toast({ title: "تم الحفظ", description: "تم حفظ XML والـ Hash في الفاتورة" });
      loadAll();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!xml || !selected) return;
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.invoice_number}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!xml) return;
    await navigator.clipboard.writeText(xml);
    toast({ title: "تم النسخ" });
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingCup />
      </div>
    );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/10">
              <FileCode2 className="h-6 w-6 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">صيغة XML / UBL 2.1</h1>
              <p className="text-sm text-muted-foreground">
                توليد الفواتير بصيغة UBL 2.1 المعتمدة من هيئة الزكاة (PINT-SA)
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/zatca")}>
            <ArrowRight className="h-4 w-4 ml-2" /> رجوع
          </Button>
        </div>

        {/* Cert status banner */}
        <Card
          className={`mb-4 ${activeCert ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-amber-300 bg-amber-50/40 dark:bg-amber-950/10"}`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            {activeCert ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">الشهادة الفعالة جاهزة للتوقيع</p>
                  <p className="text-muted-foreground">
                    سيتم استخدام: <span className="font-mono">{activeCert.label}</span> لتوقيع الـ XML عند الإرسال للهيئة
                  </p>
                </div>
                <Badge className="bg-emerald-500 text-white">PCSID Active</Badge>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">لا توجد شهادة فعالة</p>
                  <p className="text-muted-foreground">
                    يمكنك توليد ومعاينة XML الآن، لكن لن يتم التوقيع الرقمي قبل رفع شهادة PCSID.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/zatca/certificates")}>
                  رفع شهادة
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Selector + actions */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">اختر فاتورة لتوليد XML</CardTitle>
            <CardDescription>
              يتم توليد XML بنفس البيانات المخزنة في سجل الفواتير المعتمدة
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[280px]">
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر فاتورة..." />
                </SelectTrigger>
                <SelectContent>
                  {invoices.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      لا توجد فواتير. أنشئ فاتورة من شاشة "الفواتير المعتمدة" أولاً.
                    </div>
                  ) : (
                    invoices.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.invoice_number} • {i.issue_date} • {i.total_with_tax?.toFixed(2)} ر.س
                        {i.xml_content && " ✓"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={!selected || generating}>
              {generating ? (
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <FileCode2 className="h-4 w-4 ml-2" />
              )}
              توليد XML
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={!xml || saving}>
              <Save className="h-4 w-4 ml-2" /> حفظ في الفاتورة
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={!xml}>
              <Download className="h-4 w-4 ml-2" /> تحميل
            </Button>
            <Button variant="outline" onClick={handleCopy} disabled={!xml}>
              <Copy className="h-4 w-4 ml-2" /> نسخ
            </Button>
          </CardContent>
        </Card>

        {/* Hash display */}
        {hash && (
          <Card className="mb-4">
            <CardContent className="p-4 flex items-center gap-3 flex-wrap">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Invoice Hash (SHA-256):</span>
              <code className="font-mono text-xs bg-muted px-2 py-1 rounded break-all" dir="ltr">
                {hash}
              </code>
              <Badge variant="outline" className="font-mono" dir="ltr">
                ICV: {selected?.icv}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* XML preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-cyan-600" />
              معاينة XML (UBL 2.1)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {xml ? (
              <pre
                className="text-xs bg-slate-950 text-emerald-300 p-4 rounded-lg overflow-auto max-h-[600px] font-mono leading-relaxed"
                dir="ltr"
              >
                {xml}
              </pre>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {selected
                  ? "اضغط 'توليد XML' لمعاينة المخرجات"
                  : "اختر فاتورة من القائمة أعلاه ثم اضغط 'توليد XML'"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance notes */}
        <Card className="mt-4 bg-muted/30">
          <CardContent className="p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground mb-1">ما يحتويه الـ XML المولّد:</p>
            <p>• ProfileID = reporting:1.0 (متوافق مع PINT-SA)</p>
            <p>
              • InvoiceTypeCode = {selected?.invoice_subtype === "credit" ? "381 (إشعار دائن)" : selected?.invoice_subtype === "debit" ? "383 (إشعار مدين)" : "388 (فاتورة ضريبية)"}{" "}
              • name = {selected?.invoice_type === "standard" ? "0100000 (B2B)" : "0200000 (B2C)"}
            </p>
            <p>• AccountingSupplierParty (بيانات البائع: VAT، CRN، العنوان الكامل)</p>
            <p>• AccountingCustomerParty (بيانات المشتري — للفواتير الضريبية)</p>
            <p>• InvoiceLine لكل بند مع ClassifiedTaxCategory ونسبة 15%</p>
            <p>• ICV (Invoice Counter Value) و PIH (Previous Invoice Hash) للسلسلة المتسلسلة</p>
            <p>• LegalMonetaryTotal: TaxExclusive، TaxInclusive، PayableAmount</p>
            <p className="text-amber-600 dark:text-amber-500 mt-2">
              ⚠ التوقيع الرقمي (XAdES) يُضاف تلقائياً عند الإرسال من شاشة "الإرسال للهيئة" باستخدام المفتاح الخاص للشهادة الفعالة.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ZatcaXmlPage;
