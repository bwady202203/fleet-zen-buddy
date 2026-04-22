import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  KeyRound,
  Plus,
  Trash2,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  Smartphone,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingCup from "@/components/LoadingCup";

interface ZCert {
  id: string;
  certificate_type: "compliance" | "production";
  environment: "sandbox" | "simulation" | "production";
  label: string;
  binary_security_token: string;
  secret: string;
  private_key_pem: string;
  csr_pem: string | null;
  common_name: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const emptyForm: Omit<ZCert, "id" | "created_at"> = {
  certificate_type: "production",
  environment: "production",
  label: "",
  binary_security_token: "",
  secret: "",
  private_key_pem: "",
  csr_pem: "",
  common_name: "",
  valid_from: null,
  valid_to: null,
  is_active: true,
  notes: "",
};

const ENV_LABEL: Record<string, string> = {
  sandbox: "Sandbox (تجريبي)",
  simulation: "Simulation (محاكاة)",
  production: "Production (إنتاج)",
};

const ZatcaCertificates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [certs, setCerts] = useState<ZCert[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });
  const [revealId, setRevealId] = useState<string | null>(null);

  // OTP onboarding state
  const [otp, setOtp] = useState("");
  const [otpEnv, setOtpEnv] = useState<"sandbox" | "simulation" | "production">("sandbox");
  const [otpLabel, setOtpLabel] = useState("EGS-Device-001");
  const [onboarding, setOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState<string>("");

  useEffect(() => {
    load();
  }, []);
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("zatca_certificates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error)
      toast({ title: "خطأ في التحميل", description: error.message, variant: "destructive" });
    setCerts((data || []) as any);
    setLoading(false);
  };

  // Try to extract validity from the BinarySecurityToken (base64-PEM cert)
  const tryParseValidity = (b64: string) => {
    try {
      const decoded = atob(b64.trim().replace(/\s+/g, ""));
      const dateRe = /(\d{12,14})Z/g;
      const matches = [...decoded.matchAll(dateRe)].map((m) => m[1]);
      if (matches.length >= 2) {
        const toDate = (s: string) => {
          const yy = s.length === 12 ? "20" + s.slice(0, 2) : s.slice(0, 4);
          const off = s.length === 12 ? 2 : 4;
          return new Date(
            `${yy}-${s.slice(off, off + 2)}-${s.slice(off + 2, off + 4)}T${s.slice(off + 4, off + 6)}:${s.slice(off + 6, off + 8)}:${s.slice(off + 8, off + 10)}Z`,
          );
        };
        return { from: toDate(matches[0]).toISOString(), to: toDate(matches[1]).toISOString() };
      }
    } catch {}
    return { from: null, to: null };
  };

  const validate = (): string | null => {
    if (!form.label.trim()) return "اسم/تسمية الشهادة مطلوبة";
    if (!form.binary_security_token.trim()) return "BinarySecurityToken مطلوب";
    if (!form.secret.trim()) return "Secret مطلوب";
    if (!form.private_key_pem.trim()) return "المفتاح الخاص (Private Key PEM) مطلوب";
    if (!form.private_key_pem.includes("BEGIN") || !form.private_key_pem.includes("PRIVATE KEY"))
      return "المفتاح الخاص يجب أن يكون بصيغة PEM (BEGIN/END PRIVATE KEY)";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast({ title: "بيانات ناقصة", description: err, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const validity = tryParseValidity(form.binary_security_token);
      // If marking active, deactivate others in the same environment
      if (form.is_active) {
        await supabase
          .from("zatca_certificates")
          .update({ is_active: false })
          .eq("environment", form.environment);
      }
      const { error } = await supabase.from("zatca_certificates").insert({
        ...form,
        csr_pem: form.csr_pem || null,
        common_name: form.common_name || null,
        notes: form.notes || null,
        valid_from: validity.from,
        valid_to: validity.to,
      });
      if (error) throw error;
      toast({
        title: "تم رفع الشهادة",
        description: `${form.label} • ${ENV_LABEL[form.environment]}`,
      });
      setOpenForm(false);
      setForm({ ...emptyForm });
      load();
    } catch (e: any) {
      toast({ title: "خطأ في الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه الشهادة نهائياً؟")) return;
    const { error } = await supabase.from("zatca_certificates").delete().eq("id", id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else {
      toast({ title: "تم الحذف" });
      load();
    }
  };

  const handleToggleActive = async (cert: ZCert) => {
    if (!cert.is_active) {
      await supabase
        .from("zatca_certificates")
        .update({ is_active: false })
        .eq("environment", cert.environment);
    }
    const { error } = await supabase
      .from("zatca_certificates")
      .update({ is_active: !cert.is_active })
      .eq("id", cert.id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else load();
  };

  const handleFile = async (file: File, target: "binary_security_token" | "private_key_pem" | "csr_pem") => {
    const text = await file.text();
    setForm((s) => ({ ...s, [target]: text.trim() }));
    if (target === "binary_security_token") {
      const v = tryParseValidity(text);
      if (v.from && v.to) {
        toast({
          title: "تم استخراج صلاحية الشهادة",
          description: `${new Date(v.from).toLocaleDateString("ar")} → ${new Date(v.to).toLocaleDateString("ar")}`,
        });
      }
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingCup />
      </div>
    );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <KeyRound className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">الشهادات الرقمية (PCSID / CCSID)</h1>
              <p className="text-sm text-muted-foreground">
                ZATCA Digital Certificates — رفع وإدارة شهادات التوقيع
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/zatca")}>
              <ArrowRight className="h-4 w-4 ml-2" /> رجوع
            </Button>
            <Button onClick={() => setOpenForm(true)}>
              <Plus className="h-4 w-4 ml-2" /> رفع شهادة جديدة
            </Button>
          </div>
        </div>

        {/* Security warning */}
        <Card className="mb-4 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                تحذير أمني — مفاتيح خاصة
              </p>
              <p className="text-muted-foreground mt-1 leading-relaxed">
                هذه الشهادات تحتوي على المفتاح الخاص الذي يوقّع جميع فواتيرك الإلكترونية.
                يقتصر الوصول لهذه البيانات على المحاسبين والمدراء فقط، ويتم تشفيرها خلال النقل.
                لا تشاركها مع أي طرف خارج المنشأة.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cards */}
        {certs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <KeyRound className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد شهادات مرفوعة</p>
              <p className="text-sm mt-1">
                اضغط "رفع شهادة جديدة" لرفع PCSID/CCSID المستخرج من بوابة الهيئة
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certs.map((c) => {
              const expired = c.valid_to && new Date(c.valid_to) < new Date();
              const expiringSoon =
                c.valid_to &&
                new Date(c.valid_to).getTime() - Date.now() < 30 * 24 * 3600 * 1000 &&
                !expired;
              return (
                <Card
                  key={c.id}
                  className={`relative ${c.is_active ? "border-emerald-400 shadow-md" : "opacity-80"}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          {c.is_active && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                          <span className="truncate">{c.label}</span>
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 flex flex-wrap gap-1.5">
                          <Badge variant="outline">
                            {c.certificate_type === "production" ? "PCSID" : "CCSID"}
                          </Badge>
                          <Badge variant="secondary">{ENV_LABEL[c.environment]}</Badge>
                          {expired && (
                            <Badge className="bg-red-500 text-white">منتهية</Badge>
                          )}
                          {expiringSoon && (
                            <Badge className="bg-amber-500 text-white">قاربت على الانتهاء</Badge>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={c.is_active}
                          onCheckedChange={() => handleToggleActive(c)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {c.common_name && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">CN:</span>
                        <span className="font-mono truncate" dir="ltr">{c.common_name}</span>
                      </div>
                    )}
                    {c.valid_from && c.valid_to && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">الصلاحية:</span>
                        <span className="font-mono" dir="ltr">
                          {new Date(c.valid_from).toLocaleDateString()} →{" "}
                          {new Date(c.valid_to).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">BinarySecurityToken:</span>
                      <code className="font-mono truncate max-w-[60%]" dir="ltr">
                        {c.binary_security_token.slice(0, 24)}…
                      </code>
                    </div>
                    <div className="flex justify-between gap-2 items-center">
                      <span className="text-muted-foreground">Secret:</span>
                      <div className="flex items-center gap-1">
                        <code className="font-mono" dir="ltr">
                          {revealId === c.id ? c.secret : "••••••••••••"}
                        </code>
                        <button
                          onClick={() => setRevealId(revealId === c.id ? null : c.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {revealId === c.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="pt-2 border-t flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {new Date(c.created_at).toLocaleString("ar")}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              رفع شهادة ZATCA الرقمية
            </DialogTitle>
            <DialogDescription>
              ألصق محتوى الـ BinarySecurityToken والـ Secret الذي حصلت عليه من بوابة الهيئة،
              مع المفتاح الخاص الذي ولّدته محلياً عند إنشاء الـ CSR.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تسمية الشهادة *</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))}
                  placeholder="POS-Riyadh-1"
                />
              </div>
              <div className="space-y-2">
                <Label>الاسم الشائع للجهاز (CN)</Label>
                <Input
                  value={form.common_name || ""}
                  onChange={(e) => setForm((s) => ({ ...s, common_name: e.target.value }))}
                  placeholder="EGS-Device-001"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع الشهادة *</Label>
                <Select
                  value={form.certificate_type}
                  onValueChange={(v: any) => setForm((s) => ({ ...s, certificate_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compliance">CCSID — Compliance (للاختبار)</SelectItem>
                    <SelectItem value="production">PCSID — Production (للإنتاج)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>البيئة *</Label>
                <Select
                  value={form.environment}
                  onValueChange={(v: any) => setForm((s) => ({ ...s, environment: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="simulation">Simulation</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>BinarySecurityToken (Base64) *</Label>
                <label className="text-xs text-primary cursor-pointer hover:underline">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pem,.cer,.crt,.txt,.b64"
                    onChange={(e) =>
                      e.target.files?.[0] && handleFile(e.target.files[0], "binary_security_token")
                    }
                  />
                  رفع ملف
                </label>
              </div>
              <Textarea
                value={form.binary_security_token}
                onChange={(e) =>
                  setForm((s) => ({ ...s, binary_security_token: e.target.value }))
                }
                placeholder="MIIB..."
                className="font-mono text-xs h-24"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>Secret *</Label>
              <Input
                value={form.secret}
                onChange={(e) => setForm((s) => ({ ...s, secret: e.target.value }))}
                placeholder="ZATCA-issued secret"
                className="font-mono"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Private Key (PEM, ECDSA secp256k1) *</Label>
                <label className="text-xs text-primary cursor-pointer hover:underline">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pem,.key,.txt"
                    onChange={(e) =>
                      e.target.files?.[0] && handleFile(e.target.files[0], "private_key_pem")
                    }
                  />
                  رفع ملف
                </label>
              </div>
              <Textarea
                value={form.private_key_pem}
                onChange={(e) => setForm((s) => ({ ...s, private_key_pem: e.target.value }))}
                placeholder={"-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"}
                className="font-mono text-xs h-32"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>CSR (اختياري — للأرشفة)</Label>
                <label className="text-xs text-primary cursor-pointer hover:underline">
                  <input
                    type="file"
                    className="hidden"
                    accept=".csr,.pem,.txt"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "csr_pem")}
                  />
                  رفع ملف
                </label>
              </div>
              <Textarea
                value={form.csr_pem || ""}
                onChange={(e) => setForm((s) => ({ ...s, csr_pem: e.target.value }))}
                placeholder={"-----BEGIN CERTIFICATE REQUEST-----..."}
                className="font-mono text-xs h-20"
                dir="ltr"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label className="cursor-pointer">تفعيل هذه الشهادة كافتراضية لهذه البيئة</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  سيتم إلغاء تفعيل الشهادات الأخرى في نفس البيئة
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((s) => ({ ...s, is_active: v }))}
              />
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={form.notes || ""}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                placeholder="أي ملاحظات داخلية..."
                className="h-16"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenForm(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                "جاري الحفظ..."
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 ml-2" /> حفظ الشهادة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZatcaCertificates;
