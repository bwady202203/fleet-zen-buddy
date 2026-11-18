import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Save, Truck, Plus, UsersRound, Building2, ClipboardList, Eye, Printer, Search, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { emptyTransportLoad, transportLoadFields, transportLoadSchema, type TransportLoadForm } from "@/lib/transportLoads";
import { TransportContactDialog, TransportLocationSelect, useTransportContacts, type ContactKind } from "@/components/loads/TransportContacts";
import { TransportLoadPreview, TransportLoadPrintPortal, type TransportLoad } from "@/components/loads/TransportLoadDocument";

import TransportCommissionRules, { useTransportCommissionRules } from "@/components/loads/TransportCommissionRules";
import { calculateTransportCommission } from "@/lib/transportCommission";
import TransportDriverReport from "@/components/loads/TransportDriverReport";

type View = "register" | "driver" | "supplier" | "loads" | "rules" | "report";
const views = [{ key: "register", label: "تسجيل حمولة نقل", icon: Truck }, { key: "driver", label: "السائقين", icon: UsersRound }, { key: "supplier", label: "الموردين", icon: Building2 }, { key: "loads", label: "سجل الحمولات", icon: ClipboardList }, { key: "rules", label: "شروط العمولات", icon: Calculator }, { key: "report", label: "تقرير السائقين", icon: ClipboardList }] as const;
export default function TransportLoadsRegister() {
  const { user, currentOrganizationId } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TransportLoadForm>({ ...emptyTransportLoad });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<View>("register");
  const [kind, setKind] = useState<ContactKind | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [preview, setPreview] = useState<TransportLoad | null>(null);
  const [savedLoad, setSavedLoad] = useState<TransportLoad | null>(null);
  const [printing, setPrinting] = useState<TransportLoad | null>(null);
  const canView = hasPermission("loads", "view");
  const canCreate = hasPermission("loads", "create");
  const enabled = canView && !permissionsLoading;
  const rules = useTransportCommissionRules(currentOrganizationId, enabled);
  const calculatedCommission = rules.isError || rules.isLoading ? null : calculateTransportCommission(form.delivery_weight, rules.data ?? [], form.from_location, form.to_location);
  const contacts = useTransportContacts(currentOrganizationId, enabled);
  const company = useQuery({ queryKey: ["transport-company", currentOrganizationId], enabled: Boolean(currentOrganizationId && enabled), queryFn: async () => {
    if (!currentOrganizationId) return "";
    const result = await supabase.from("organizations").select("name").eq("id", currentOrganizationId).single();
    if (result.error) throw result.error;
    return result.data.name;
  } });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["transport-loads", currentOrganizationId, user?.id, page],
    enabled: Boolean(currentOrganizationId && enabled),
    queryFn: async () => {
      if (!currentOrganizationId) throw new Error("لم يتم تحديد الشركة");
      const result = await supabase.from("transport_loads").select("*", { count: "exact" }).eq("organization_id", currentOrganizationId).order("created_at", { ascending: false }).order("id", { ascending: false }).range(page * 50, page * 50 + 49);
      if (result.error) throw result.error;
      return { rows: result.data, count: result.count ?? 0 };
    },
  });
  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    const cleanup = () => setPrinting(null);
    window.addEventListener("afterprint", cleanup);
    document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => { if (!cancelled) window.print(); })));
    return () => { cancelled = true; window.removeEventListener("afterprint", cleanup); };
  }, [printing]);
  function print(load: TransportLoad) {
    if (!company.data) { toast({ title: "انتظر تحميل بيانات الشركة ثم أعد المحاولة", variant: "destructive" }); return; }
    setPrinting(load);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !user || !currentOrganizationId || !canCreate) return;
    if (calculatedCommission === null) { setErrors({ commission: "لا يوجد شرط عمولة يغطي هذا الوزن؛ راجع شروط العمولات" }); return; }
    const parsed = transportLoadSchema.safeParse({ ...form, commission: String(calculatedCommission) });
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] = issue.message;
      setErrors(nextErrors);
      document.getElementById(`transport-${parsed.error.issues[0]?.path[0]}`)?.focus();
      return;
    }
    setSaving(true); setErrors({});
    try {
      const { data: saved, error } = await supabase.from("transport_loads").insert({
        supplier_name: parsed.data.supplier_name, commission: parsed.data.commission, delivery_weight: parsed.data.delivery_weight,
        driver_name: parsed.data.driver_name, vehicle_number: parsed.data.vehicle_number, invoice_number: parsed.data.invoice_number,
        delivery_date: parsed.data.delivery_date, loading_date: parsed.data.loading_date,
        from_location: parsed.data.from_location, to_location: parsed.data.to_location, organization_id: currentOrganizationId, created_by: user.id,
      }).select("*").single();
      if (error) throw error;
      setSavedLoad(saved);
      setForm({ ...emptyTransportLoad }); setPage(0);
      await queryClient.invalidateQueries({ queryKey: ["transport-loads"] });
      await queryClient.invalidateQueries({ queryKey: ["transport-driver-report"] });
      setView("loads"); toast({ title: "تم حفظ حمولة النقل" });
    } catch { toast({ title: "تعذر حفظ حمولة النقل", description: "لم يتم حفظ البيانات؛ يرجى المحاولة مرة أخرى.", variant: "destructive" }); }
    finally { setSaving(false); }
  }
  const directory = contacts.data?.filter(row => row.kind === view && row.name.includes(contactSearch.trim())) ?? [];
  return <div className="min-h-screen bg-background" dir="rtl">
    <header className="transport-workspace-header border-b bg-card"><div className="flex w-full items-center gap-3 px-4 py-5 sm:px-6 lg:px-8">
      <Button asChild variant="outline" size="icon"><Link to="/?tab=loads" aria-label="العودة إلى الحمولات"><ArrowRight className="h-5 w-5" /></Link></Button>
      <Truck className="h-6 w-6 text-primary" /><div><h1 className="text-xl font-bold sm:text-2xl">حمولات النقل</h1><p className="mt-1 text-sm text-muted-foreground">{company.data}</p></div>
    </div></header>
    <main className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8">
      {savedLoad && <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 p-4"><span className="font-semibold">تم حفظ حمولة {savedLoad.invoice_number}</span><div className="flex gap-2"><Button variant="outline" size="icon" title="معاينة الحمولة المحفوظة" aria-label="معاينة الحمولة المحفوظة" onClick={() => setPreview(savedLoad)}><Eye className="h-5 w-5" /></Button><Button variant="outline" size="icon" title="طباعة الحمولة المحفوظة" aria-label="طباعة الحمولة المحفوظة" onClick={() => print(savedLoad)}><Printer className="h-5 w-5" /></Button></div></div> }
      {permissionsLoading ? <p className="text-center">جاري التحميل…</p> : !canView ? <p className="text-destructive">لا تملك صلاحية عرض الحمولات</p> : <Tabs dir="rtl" value={view} onValueChange={value => { setView(value as View); setContactSearch(""); }} className="w-full min-w-0">
        <TabsList aria-label="تبويبات حمولات النقل" className="transport-top-tabs grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-3 xl:grid-cols-6">{views.map(item => <TabsTrigger key={item.key} value={item.key} className="transport-top-tab min-h-14 min-w-0 gap-2 rounded-md border px-2 py-3 sm:px-4"><item.icon className="h-5 w-5 shrink-0" /><span className="whitespace-normal text-center leading-5">{item.label}</span></TabsTrigger>)}</TabsList>
        <TabsContent value={view} className="mt-7 min-w-0">
        <section className="transport-workspace-content min-w-0 py-5 sm:py-6">
          {view === "register" && <form onSubmit={save} noValidate className="space-y-6"><div className="transport-section-heading flex items-center gap-3 border-b pb-4"><Truck className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">تسجيل حمولة نقل</h2></div>
            {[
              { title: "بيانات المورد والسائق", keys: ["supplier_name", "driver_name", "vehicle_number", "invoice_number", "from_location", "to_location"] },
              { title: "الوزن والتواريخ والعمولة", keys: ["delivery_weight", "loading_date", "delivery_date", "commission"] },
            ].map(group => <fieldset key={group.title} className="rounded-md border border-primary/20 p-4 sm:p-5"><legend className="px-2 font-bold text-primary">{group.title}</legend><div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">{group.keys.map(key => {
              const field = transportLoadFields.find(item => item.key === key);
              if (!field) return null;
              return <div key={field.key} className="space-y-2">
                <Label htmlFor={`transport-${field.key}`} className="font-semibold">{field.key === "delivery_weight" ? "وزن التسليم (طن)" : field.key === "commission" ? "عمولة السائق (ريال)" : field.label}</Label>
                <div className="flex gap-2">{(field.key === "from_location" || field.key === "to_location") ? <div className="min-w-0 w-full"><TransportLocationSelect id={`transport-${field.key}`} label={field.label} value={form[field.key]} organizationId={currentOrganizationId} userId={user?.id} canCreate={canCreate} disabled={saving} invalid={Boolean(errors[field.key])} onChange={name => { setForm(prev => ({ ...prev, [field.key]: name })); setErrors(prev => ({ ...prev, [field.key]: "", commission: "" })); }} /></div> : <Input id={`transport-${field.key}`} className="transport-white-field min-w-0" type={field.type === "date" ? "date" : "text"} inputMode={field.type === "decimal" ? "decimal" : undefined} dir={field.type !== "text" ? "ltr" : "rtl"} value={field.key === "commission" ? calculatedCommission === null ? "" : String(calculatedCommission) : form[field.key]} readOnly={field.key === "commission"} disabled={saving || !canCreate} aria-invalid={Boolean(errors[field.key])} onChange={event => { setForm(prev => ({ ...prev, [field.key]: event.target.value })); setErrors(prev => ({ ...prev, [field.key]: "", commission: "" })); }} />}
                {(field.key === "supplier_name" || field.key === "driver_name") && <Button type="button" variant="outline" className="h-[46px] w-[46px] shrink-0" size="icon" title={`بحث أو إضافة ${field.label}`} aria-label={`بحث أو إضافة ${field.label}`} disabled={saving || !canCreate} onClick={() => setKind(field.key === "supplier_name" ? "supplier" : "driver")}><Plus className="h-5 w-5" /></Button>}</div>
                {errors[field.key] && <p role="alert" className="text-sm text-destructive">{errors[field.key]}</p>}
                {field.key === "commission" && form.delivery_weight && calculatedCommission === null && !errors.commission && <p className="text-sm text-destructive">{rules.isLoading ? "جاري تحميل شروط العمولة…" : rules.isError ? "تعذر تحميل شروط العمولة" : "لا يوجد شرط يغطي هذا الوزن"}</p>}
              </div>;
            })}</div></fieldset>)}
            <div className="flex justify-end border-t pt-5"><Button type="submit" className="h-11 gap-2 px-6" disabled={saving || !currentOrganizationId || !canCreate || calculatedCommission === null}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "جاري الحفظ" : "حفظ حمولة النقل"}</Button></div>
          </form>}
          {view === "rules" && <TransportCommissionRules organizationId={currentOrganizationId} userId={user?.id} canCreate={canCreate} />}
          {view === "report" && <TransportDriverReport organizationId={currentOrganizationId} />}
          {(view === "driver" || view === "supplier") && <div className="space-y-5"><div className="flex items-center justify-between border-b pb-4"><h2 className="text-xl font-bold">{view === "driver" ? "السائقين" : "الموردين"}</h2><Button className="gap-2" disabled={!canCreate} onClick={() => setKind(view)}><Plus className="h-4 w-4" />إضافة</Button></div><div className="relative"><Search className="absolute right-3 top-4 h-4 w-4 text-muted-foreground" /><Input aria-label="بحث في الأسماء" placeholder="البحث بالاسم" className="transport-white-field pr-9" value={contactSearch} onChange={e => setContactSearch(e.target.value)} /></div>
            {contacts.isLoading ? <p>جاري التحميل…</p> : contacts.isError ? <Button variant="outline" onClick={() => contacts.refetch()}>إعادة المحاولة</Button> : directory.length ? <ul className="divide-y border-y">{directory.map(row => <li key={row.id} className="flex items-center gap-3 py-4">{view === "driver" ? <UsersRound className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-primary" />}<span className="break-words font-semibold">{row.name}</span></li>)}</ul> : <p className="py-10 text-center text-muted-foreground">لا توجد أسماء مسجلة مطابقة</p>}
          </div>}
          {view === "loads" && <div className="space-y-4"><div className="flex justify-between border-b pb-4"><h2 className="text-xl font-bold">سجل الحمولات</h2><span className="text-sm text-muted-foreground">{data?.count ?? 0} حمولة</span></div>
            <div className="overflow-hidden rounded-md border"><Table className="min-w-[1050px]"><TableHeader><TableRow className="bg-muted">{transportLoadFields.map(field => <TableHead key={field.key} className="text-right font-bold text-foreground">{field.label}</TableHead>)}<TableHead className="text-center">المستند</TableHead></TableRow></TableHeader><TableBody>
              {isLoading ? <TableRow><TableCell colSpan={9} className="h-24 text-center">جاري تحميل السجل…</TableCell></TableRow> : isError ? <TableRow><TableCell colSpan={9} className="h-24 text-center"><Button variant="outline" onClick={() => refetch()}>إعادة المحاولة</Button></TableCell></TableRow> : !data?.rows.length ? <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">لا توجد حمولات نقل مسجلة</TableCell></TableRow> : data.rows.map(row => <TableRow key={row.id}>{transportLoadFields.map(field => <TableCell key={field.key} className="text-right tabular-nums"><span dir={field.type !== "text" ? "ltr" : undefined}>{field.type === "date" ? String(row[field.key]).split("-").reverse().join("/") : row[field.key]}</span></TableCell>)}<TableCell><div className="flex gap-1"><Button size="icon" variant="ghost" title="معاينة الحمولة" aria-label={`معاينة حمولة ${row.invoice_number}`} onClick={() => setPreview(row)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="طباعة الحمولة" aria-label={`طباعة حمولة ${row.invoice_number}`} onClick={() => print(row)}><Printer className="h-4 w-4" /></Button></div></TableCell></TableRow>)}
            </TableBody></Table></div>
            {(data?.count ?? 0) > 50 && <div className="flex items-center justify-end gap-3"><Button variant="outline" disabled={page === 0} onClick={() => setPage(prev => prev - 1)}>السابق</Button><span className="text-sm">{page + 1} / {Math.ceil((data?.count ?? 0) / 50)}</span><Button variant="outline" disabled={(page + 1) * 50 >= (data?.count ?? 0)} onClick={() => setPage(prev => prev + 1)}>التالي</Button></div>}
          </div>}
        </section>
        </TabsContent>
      </Tabs>}
    </main>
    {kind && <TransportContactDialog kind={kind} onClose={() => setKind(null)} organizationId={currentOrganizationId} userId={user?.id} canCreate={canCreate} onSelect={view === "register" ? (name, selectedKind) => setForm(prev => ({ ...prev, [selectedKind === "supplier" ? "supplier_name" : "driver_name"]: name })) : undefined} />}
    <Dialog open={Boolean(preview)} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="w-[calc(100%-1rem)] max-w-4xl max-h-[90dvh] overflow-y-auto p-3 sm:p-5" dir="rtl" aria-describedby={undefined}><div className="flex flex-wrap items-center justify-between gap-3 pl-7"><DialogTitle>معاينة حمولة النقل</DialogTitle><Button className="gap-2" disabled={!preview || !company.data} onClick={() => { if (preview) print(preview); }}><Printer className="h-4 w-4" />طباعة A4</Button></div>{preview && <TransportLoadPreview load={preview} company={company.data ?? ""} />}</DialogContent></Dialog>
    {printing && <TransportLoadPrintPortal load={printing} company={company.data ?? ""} />}
  </div>;
}
