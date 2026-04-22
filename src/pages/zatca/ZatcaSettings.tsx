import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings2, Save, ArrowRight, Building2, MapPin, Hash, Server, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingCup from "@/components/LoadingCup";

interface ZatcaSettings {
  id?: string;
  seller_name_ar: string;
  seller_name_en: string;
  vat_number: string;
  crn: string;
  street_name: string;
  building_number: string;
  plot_identification: string;
  district: string;
  city: string;
  postal_code: string;
  additional_number: string;
  country_code: string;
  logo_url: string;
  invoice_prefix: string;
  invoice_counter: number;
  environment: "sandbox" | "simulation" | "production";
  device_common_name: string;
  device_serial_number: string;
  egs_model: string;
  is_active: boolean;
}

const emptySettings: ZatcaSettings = {
  seller_name_ar: "",
  seller_name_en: "",
  vat_number: "",
  crn: "",
  street_name: "",
  building_number: "",
  plot_identification: "",
  district: "",
  city: "",
  postal_code: "",
  additional_number: "",
  country_code: "SA",
  logo_url: "",
  invoice_prefix: "INV",
  invoice_counter: 0,
  environment: "sandbox",
  device_common_name: "",
  device_serial_number: "",
  egs_model: "",
  is_active: true,
};

const ZatcaSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ZatcaSettings>(emptySettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Try existing zatca_settings first
      const { data: zatca } = await supabase
        .from("zatca_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (zatca) {
        setSettings({ ...emptySettings, ...zatca } as ZatcaSettings);
        return;
      }

      // Fallback: prefill from company_settings
      const { data: company } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (company) {
        setSettings({
          ...emptySettings,
          seller_name_ar: company.company_name || "",
          vat_number: company.tax_number || "",
          crn: company.commercial_registration || "",
          street_name: company.address || "",
        });
      }
    } catch (e: any) {
      toast({ title: "تعذر تحميل الإعدادات", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const validate = (): string | null => {
    if (!settings.seller_name_ar.trim()) return "اسم البائع بالعربي مطلوب";
    if (settings.vat_number && !/^\d{15}$/.test(settings.vat_number))
      return "الرقم الضريبي يجب أن يكون 15 رقم";
    if (settings.postal_code && !/^\d{5}$/.test(settings.postal_code))
      return "الرمز البريدي يجب أن يكون 5 أرقام";
    if (settings.additional_number && !/^\d{4}$/.test(settings.additional_number))
      return "الرمز الإضافي يجب أن يكون 4 أرقام";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast({ title: "بيانات غير صحيحة", description: err, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...settings };
      delete (payload as any).id;

      if (settings.id) {
        const { error } = await supabase
          .from("zatca_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("zatca_settings")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) setSettings({ ...settings, id: data.id });
      }
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات الفوترة الإلكترونية" });
    } catch (e: any) {
      toast({ title: "خطأ في الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof ZatcaSettings>(key: K, value: ZatcaSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingCup />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Settings2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">إعدادات الفوترة الإلكترونية</h1>
              <p className="text-sm text-muted-foreground">
                ZATCA Settings - بيانات المنشأة الضريبية المعتمدة
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/zatca")}>
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
        </div>

        {/* Company identity */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              بيانات المنشأة
            </CardTitle>
            <CardDescription>الاسم القانوني والأرقام الرسمية المسجلة لدى الهيئة</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم المنشأة (عربي) *</Label>
              <Input
                value={settings.seller_name_ar}
                onChange={(e) => update("seller_name_ar", e.target.value)}
                placeholder="شركة الرمال الصناعية"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم المنشأة (إنجليزي)</Label>
              <Input
                value={settings.seller_name_en}
                onChange={(e) => update("seller_name_en", e.target.value)}
                placeholder="Industrial Sands Company"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الرقم الضريبي (VAT) - 15 رقم</Label>
              <Input
                value={settings.vat_number}
                onChange={(e) => update("vat_number", e.target.value)}
                placeholder="300000000000003"
                maxLength={15}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>السجل التجاري (CRN)</Label>
              <Input
                value={settings.crn}
                onChange={(e) => update("crn", e.target.value)}
                placeholder="1010000000"
                dir="ltr"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                رابط شعار المنشأة (للطباعة على الفواتير)
              </Label>
              <Input
                value={settings.logo_url}
                onChange={(e) => update("logo_url", e.target.value)}
                placeholder="https://example.com/logo.png"
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              العنوان التفصيلي
            </CardTitle>
            <CardDescription>الحقول المطلوبة من هيئة الزكاة لإصدار الفواتير المعتمدة</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>اسم الشارع</Label>
              <Input
                value={settings.street_name}
                onChange={(e) => update("street_name", e.target.value)}
                placeholder="شارع الملك فهد"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم المبنى</Label>
              <Input
                value={settings.building_number}
                onChange={(e) => update("building_number", e.target.value)}
                placeholder="1234"
                maxLength={4}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم القطعة</Label>
              <Input
                value={settings.plot_identification}
                onChange={(e) => update("plot_identification", e.target.value)}
                placeholder="2345"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الحي</Label>
              <Input
                value={settings.district}
                onChange={(e) => update("district", e.target.value)}
                placeholder="حي الورود"
              />
            </div>
            <div className="space-y-2">
              <Label>المدينة</Label>
              <Input
                value={settings.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="الرياض"
              />
            </div>
            <div className="space-y-2">
              <Label>الرمز البريدي - 5 أرقام</Label>
              <Input
                value={settings.postal_code}
                onChange={(e) => update("postal_code", e.target.value)}
                placeholder="12345"
                maxLength={5}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الرمز الإضافي - 4 أرقام</Label>
              <Input
                value={settings.additional_number}
                onChange={(e) => update("additional_number", e.target.value)}
                placeholder="6789"
                maxLength={4}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>رمز الدولة</Label>
              <Input
                value={settings.country_code}
                onChange={(e) => update("country_code", e.target.value.toUpperCase())}
                placeholder="SA"
                maxLength={2}
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice numbering */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Hash className="h-5 w-5 text-primary" />
              ترقيم الفواتير
            </CardTitle>
            <CardDescription>
              بادئة الفاتورة وعداد ICV (Invoice Counter Value) المستخدم في توقيع كل فاتورة
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>بادئة الفاتورة</Label>
              <Input
                value={settings.invoice_prefix}
                onChange={(e) => update("invoice_prefix", e.target.value.toUpperCase())}
                placeholder="INV"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>عداد الفواتير الحالي (ICV)</Label>
              <Input
                type="number"
                value={settings.invoice_counter}
                onChange={(e) => update("invoice_counter", parseInt(e.target.value) || 0)}
                placeholder="0"
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* Environment & Device */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5 text-primary" />
              البيئة وإعدادات الجهاز
            </CardTitle>
            <CardDescription>
              يتم استخدام بيئة Sandbox للتطوير، Simulation للاختبار، Production للإصدار الفعلي
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>بيئة التشغيل</Label>
              <Select
                value={settings.environment}
                onValueChange={(v) => update("environment", v as ZatcaSettings["environment"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (تجريبي)</SelectItem>
                  <SelectItem value="simulation">Simulation (محاكاة)</SelectItem>
                  <SelectItem value="production">Production (إنتاج)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>طراز جهاز الفوترة (EGS Model)</Label>
              <Input
                value={settings.egs_model}
                onChange={(e) => update("egs_model", e.target.value)}
                placeholder="POS-Model-X1"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الاسم الشائع للجهاز (Common Name)</Label>
              <Input
                value={settings.device_common_name}
                onChange={(e) => update("device_common_name", e.target.value)}
                placeholder="EGS-Device-001"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الرقم التسلسلي (Serial Number)</Label>
              <Input
                value={settings.device_serial_number}
                onChange={(e) => update("device_serial_number", e.target.value)}
                placeholder="1-Device|2-Serial|3-001"
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        <Separator className="my-4" />

        <div className="flex justify-end gap-2 sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-lg border">
          <Button variant="outline" onClick={loadSettings} disabled={saving}>
            إعادة تحميل
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-32">
            <Save className="h-4 w-4 ml-2" />
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ZatcaSettings;
