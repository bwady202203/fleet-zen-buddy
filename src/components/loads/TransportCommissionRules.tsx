import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Save, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { transportCommissionSchema } from "@/lib/transportCommission";
import type { Tables } from "@/integrations/supabase/types";
import { TransportLocationSelect } from "@/components/loads/TransportContacts";

const emptyRuleForm = { min_weight: "", max_weight: "", amount: "", from_location: "", to_location: "" };
const ruleFields = [
  { key: "from_location", label: "من موقع (اختياري)", decimal: false },
  { key: "to_location", label: "إلى موقع (اختياري)", decimal: false },
  { key: "min_weight", label: "من وزن (طن) — شامل", decimal: true },
  { key: "max_weight", label: "إلى أقل من وزن (طن) — غير شامل", decimal: true },
  { key: "amount", label: "عمولة السائق (ريال)", decimal: true },
] as const;

export function useTransportCommissionRules(organizationId: string | null, enabled: boolean) {
  return useQuery({ queryKey: ["transport-commission-rules", organizationId], enabled: Boolean(organizationId && enabled), queryFn: async () => {
    if (!organizationId) throw new Error("لم يتم تحديد الشركة");
    const rows: Tables<"transport_commission_rules">[] = [];
    for (let start = 0; ; start += 500) {
      const result = await supabase.from("transport_commission_rules").select("*").eq("organization_id", organizationId).order("min_weight").order("id").range(start, start + 499);
      if (result.error) throw result.error;
      rows.push(...result.data);
      if (result.data.length < 500) break;
    }
    return rows;
  } });
}

export default function TransportCommissionRules({ organizationId, userId, canCreate }: { organizationId: string | null; userId?: string; canCreate: boolean }) {
  const rules = useTransportCommissionRules(organizationId, true);
  const [form, setForm] = useState({ ...emptyRuleForm });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const client = useQueryClient();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!organizationId || !userId || !canCreate || saving) return;
    const parsed = transportCommissionSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "راجع القيم"); return; }
    const rule = parsed.data;
    const sameRoute = (other: Tables<"transport_commission_rules">) => (other.from_location ?? "") === (rule.from_location ?? "") && (other.to_location ?? "") === (rule.to_location ?? "");
    if (rules.data?.some(other => other.id !== editing && sameRoute(other) && rule.min_weight < (other.max_weight ?? Infinity) && other.min_weight < (rule.max_weight ?? Infinity))) { setError("هذه الشريحة تتداخل مع شرط مسجل لنفس المسار"); return; }
    setSaving(true); setError("");
    try {
      const payload = { min_weight: rule.min_weight, max_weight: rule.max_weight, amount: rule.amount, from_location: rule.from_location, to_location: rule.to_location };
      const result = editing ? await supabase.from("transport_commission_rules").update(payload).eq("id", editing).eq("organization_id", organizationId).select("id").single() : await supabase.from("transport_commission_rules").insert({ ...payload, organization_id: organizationId, created_by: userId }).select("id").single();
      if (result.error) throw result.error;
      await client.invalidateQueries({ queryKey: ["transport-commission-rules", organizationId] });
      setForm({ ...emptyRuleForm }); setEditing(null);
      toast({ title: "تم حفظ شرط العمولة" });
    } catch { setError("تعذر الحفظ؛ تأكد من عدم تداخل الشرائح وأعد المحاولة"); } finally { setSaving(false); }
  }

  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"><h2 className="text-xl font-bold">شروط العمولات</h2><Button type="button" variant="outline" className="gap-2" disabled={!canCreate || saving} onClick={() => { setEditing(null); setForm({ ...emptyRuleForm }); setError(""); document.getElementById("rule-from_location")?.focus(); }}><Plus className="h-4 w-4" />إضافة شرط آخر</Button></div>
    <form onSubmit={save} className="space-y-4"><fieldset className="rounded-md border p-4 sm:p-5" disabled={!canCreate || saving}><legend className="px-2 font-bold">{editing ? "تعديل شرط العمولة" : "تسجيل شرط عمولة"}</legend><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{ruleFields.map(field => <div key={field.key} className="min-w-0 space-y-2"><Label htmlFor={`rule-${field.key}`}>{field.label}</Label>{field.key === "from_location" || field.key === "to_location" ? <TransportLocationSelect id={`rule-${field.key}`} label={field.key === "from_location" ? "من موقع" : "إلى موقع"} value={form[field.key]} onChange={name => setForm(prev => ({ ...prev, [field.key]: name }))} organizationId={organizationId} userId={userId} canCreate={canCreate} disabled={saving} allLocations /> : <Input className="transport-white-field" id={`rule-${field.key}`} type="text" inputMode="decimal" dir="ltr" value={form[field.key]} placeholder={field.key === "max_weight" ? "بدون حد أعلى" : undefined} onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))} />}</div>)}</div><div className="mt-5 flex gap-2"><Button className="gap-2" disabled={saving || rules.isLoading || rules.isError}><Save className="h-4 w-4" />حفظ الشرط</Button>{editing && <Button type="button" variant="outline" size="icon" aria-label="إلغاء التعديل" onClick={() => { setEditing(null); setForm({ ...emptyRuleForm }); }}><X className="h-4 w-4" /></Button>}</div></fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>
    {rules.isLoading ? <p>جاري التحميل…</p> : rules.isError ? <Button variant="outline" onClick={() => rules.refetch()}>إعادة المحاولة</Button> : !rules.data?.length ? <p className="py-8 text-center text-muted-foreground">لا توجد شروط عمولة مسجلة</p> : <div className="divide-y border-y">{rules.data.map(rule => <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><span>{rule.from_location || rule.to_location ? `من ${rule.from_location ?? "أي موقع"} إلى ${rule.to_location ?? "أي موقع"} • ` : ""}من {rule.min_weight} طن {rule.max_weight === null ? "فأكثر" : `إلى أقل من ${rule.max_weight} طن`}</span><div className="flex items-center gap-3"><strong className="text-primary">{rule.amount.toLocaleString("en-US")} ريال</strong><Button size="icon" variant="outline" disabled={!canCreate} title="تعديل الشرط" aria-label={`تعديل شرط ${rule.min_weight}`} onClick={() => { setEditing(rule.id); setForm({ min_weight: String(rule.min_weight), max_weight: rule.max_weight === null ? "" : String(rule.max_weight), amount: String(rule.amount), from_location: rule.from_location ?? "", to_location: rule.to_location ?? "" }); }}><Pencil className="h-4 w-4" /></Button></div></div>)}</div>}
  </div>;
}
