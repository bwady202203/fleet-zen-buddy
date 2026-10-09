import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, Loader2, Save, Send, Code2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PayrollSyncCard } from "@/components/hr/PayrollSyncCard";

const ORG = "8449f832-4c11-4f27-b650-294106680b15";
const EVENTS = [
  { v: "salary_accrual", l: "إثبات راتب", rule: "مدين: مصروف الرواتب — دائن: حساب الموظف" },
  { v: "salary_payment", l: "صرف راتب", rule: "مدين: حساب الموظف — دائن: البنك" },
  { v: "advance", l: "صرف سلفة", rule: "مدين: حساب الموظف — دائن: البنك" },
  { v: "violation", l: "تسجيل مخالفة", rule: "مدين: حساب الموظف — دائن: حساب المخالفات" },
];
const FIELDS = [
  { k: "employees_parent_account_id", l: "الحساب الرئيسي لحسابات الموظفين" },
  { k: "salary_expense_account_id", l: "حساب مصروف الرواتب" },
  { k: "payment_account_id", l: "حساب الصرف (بنك / صندوق)" },
  { k: "violation_account_id", l: "حساب المخالفات" },
] as const;

type Acc = { id: string; code: string; name_ar: string };

const HrAutoJournal = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; employee_number: string | null }[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ event: "salary_accrual", employee_id: "", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState<"preview" | "post" | null>(null);

  useEffect(() => {
    (async () => {
      const [a, e, s] = await Promise.all([
        supabase.from("chart_of_accounts").select("id, code, name_ar").order("code").limit(5000),
        supabase.from("employees").select("id, name, employee_number").order("name"),
        supabase.from("hr_journal_settings" as any).select("*").eq("organization_id", ORG).maybeSingle(),
      ]);
      setAccounts((a.data as Acc[]) ?? []);
      setEmployees((e.data as any) ?? []);
      setSettings(s.data ?? { organization_id: ORG, auto_post: true });
    })();
  }, []);

  const accLabel = useMemo(() => new Map(accounts.map((a) => [a.id, `${a.code} - ${a.name_ar}`])), [accounts]);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from("hr_journal_settings" as any).upsert({ ...settings, updated_at: new Date().toISOString() });
    setSaving(false);
    toast(error ? { title: "تعذر الحفظ", description: error.message, variant: "destructive" } : { title: "تم حفظ إعدادات الحسابات" });
  };

  const run = async (isPreview: boolean) => {
    if (!form.employee_id || !Number(form.amount)) {
      toast({ title: "اختر الموظف وأدخل المبلغ", variant: "destructive" });
      return;
    }
    setBusy(isPreview ? "preview" : "post");
    const { data, error } = await supabase.rpc("hr_post_journal" as any, {
      p_event: form.event, p_employee_id: form.employee_id, p_amount: Number(form.amount.replace(/,/g, "")),
      p_date: form.date, p_description: form.description || null, p_reference: null, p_preview: isPreview,
    });
    setBusy(null);
    if (error) return toast({ title: "خطأ", description: error.message, variant: "destructive" });
    setPreview(data);
    if (!isPreview) toast({ title: "تم ترحيل القيد", description: (data as any)?.entry_number });
  };

  const fnUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/hr-journal-api`;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-4 px-4 py-5">
          <Link to="/hr" aria-label="رجوع"><ArrowRight className="h-6 w-6" /></Link>
          <div>
            <h1 className="text-2xl font-bold">القيود التلقائية للموارد البشرية</h1>
            <p className="text-sm text-muted-foreground">السلف والمخالفات وإثبات الرواتب وصرفها تُرحَّل تلقائيًا لدفتر اليومية</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto grid gap-4 px-4 py-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">الحسابات المستخدمة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {settings && FIELDS.map((f) => (
              <div key={f.k} className="space-y-1">
                <Label>{f.l}</Label>
                <Select value={settings[f.k] ?? ""} onValueChange={(v) => setSettings({ ...settings, [f.k]: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الحساب">{accLabel.get(settings[f.k])}</SelectValue></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {settings && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">الترحيل التلقائي</p>
                  <p className="text-xs text-muted-foreground">عند اعتماد سلفة أو تسجيل خصم/مخالفة أو إثبات وصرف الرواتب</p>
                </div>
                <Switch checked={settings.auto_post} onCheckedChange={(v) => setSettings({ ...settings, auto_post: v })} />
              </div>
            )}
            <div className="rounded-lg bg-muted p-3 text-xs leading-6">
              {EVENTS.map((e) => <div key={e.v}><b>{e.l}:</b> {e.rule}</div>)}
              <div>يُنشأ لكل موظف حساب خاص به تلقائيًا تحت الحساب الرئيسي عند أول قيد.</div>
            </div>
            <Button onClick={saveSettings} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ الإعدادات
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">معاينة وترحيل قيد</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>نوع العملية</Label>
                <Select value={form.event} onValueChange={(v) => setForm({ ...form, event: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENTS.map((e) => <SelectItem key={e.v} value={e.v}>{e.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>الموظف</Label>
                <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                  <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>المبلغ</Label>
                <Input type="text" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>التاريخ</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>البيان</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => run(true)} disabled={!!busy}>
                {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} معاينة القيد
              </Button>
              <Button className="gap-2" onClick={() => run(false)} disabled={!!busy || preview?.status !== "preview"}>
                {busy === "post" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} ترحيل
              </Button>
            </div>
            {preview?.lines && (
              <div className="overflow-hidden rounded-lg border">
                <div className="bg-muted px-3 py-2 text-sm">
                  {preview.entry_number ? <b>{preview.entry_number} — </b> : null}{preview.description}
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="p-2 text-right">الحساب</th><th className="p-2">مدين</th><th className="p-2">دائن</th></tr></thead>
                  <tbody>
                    {preview.lines.map((l: any, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2">{l.account}</td>
                        <td className="p-2 text-center">{Number(l.debit).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-center">{Number(l.credit).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <PayrollSyncCard />

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Code2 className="h-5 w-5" /> الربط مع برنامج خارجي (API)</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>أرسل طلب POST إلى الرابط التالي مع المفتاح في الترويسة <code>x-api-key</code>. ضع <code>"preview": true</code> للمعاينة فقط دون ترحيل.</p>
            <pre dir="ltr" className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{`POST ${fnUrl}
x-api-key: <HR_API_KEY>
Content-Type: application/json

{
  "event": "salary_accrual | salary_payment | advance | violation",
  "employee_number": "1001",        // or "employee_id": "<uuid>"
  "amount": 3500,
  "date": "2026-10-31",
  "description": "راتب أكتوبر",
  "reference": "EXT-123",            // optional, prevents duplicates
  "preview": true
}`}</pre>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default HrAutoJournal;
