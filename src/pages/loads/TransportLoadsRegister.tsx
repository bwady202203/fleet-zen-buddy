import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Save, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { emptyTransportLoad, transportLoadFields, transportLoadSchema, type TransportLoadForm } from "@/lib/transportLoads";

export default function TransportLoadsRegister() {
  const { user, currentOrganizationId } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TransportLoadForm>({ ...emptyTransportLoad });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const canView = hasPermission("loads", "view");
  const canCreate = hasPermission("loads", "create");
  const queryKey = ["transport-loads", currentOrganizationId, user?.id, page];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    enabled: Boolean(currentOrganizationId && canView && !permissionsLoading),
    queryFn: async () => {
      if (!currentOrganizationId) throw new Error("لم يتم تحديد الشركة");
      const result = await supabase.from("transport_loads").select("*", { count: "exact" })
        .eq("organization_id", currentOrganizationId)
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(page * 50, page * 50 + 49);
      if (result.error) throw result.error;
      return { rows: result.data, count: result.count ?? 0 };
    },
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !user || !currentOrganizationId || !canCreate) return;
    const parsed = transportLoadSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] = issue.message;
      setErrors(nextErrors);
      document.getElementById(`transport-${parsed.error.issues[0]?.path[0]}`)?.focus();
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const { error } = await supabase.from("transport_loads").insert({
        supplier_name: parsed.data.supplier_name,
        commission: parsed.data.commission,
        delivery_weight: parsed.data.delivery_weight,
        driver_name: parsed.data.driver_name,
        vehicle_number: parsed.data.vehicle_number,
        invoice_number: parsed.data.invoice_number,
        delivery_date: parsed.data.delivery_date,
        loading_date: parsed.data.loading_date,
        organization_id: currentOrganizationId, created_by: user.id,
      });
      if (error) throw error;
      setForm({ ...emptyTransportLoad });
      setPage(0);
      await queryClient.invalidateQueries({ queryKey: ["transport-loads"] });
      toast({ title: "تم حفظ حمولة النقل" });
    } catch {
      toast({ title: "تعذر حفظ حمولة النقل", description: "لم يتم حفظ البيانات؛ يرجى المحاولة مرة أخرى.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container flex items-center gap-3 px-4 py-6">
          <Button asChild variant="outline" size="icon"><Link to="/?tab=loads" aria-label="العودة إلى الحمولات"><ArrowRight className="h-5 w-5" /></Link></Button>
          <Truck className="hidden h-7 w-7 text-primary sm:block" />
          <h1 className="text-xl font-bold sm:text-3xl">تسجيل حمولة نقل</h1>
        </div>
      </header>
      <main className="container space-y-8 px-4 py-6">
        {!permissionsLoading && !canView ? <p className="text-destructive">لا تملك صلاحية عرض الحمولات</p> : <>
          <form onSubmit={save} noValidate className="space-y-5 border-b pb-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {transportLoadFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`transport-${field.key}`}>{field.label}</Label>
                  <Input id={`transport-${field.key}`} type={field.type === "date" ? "date" : "text"}
                    inputMode={field.type === "decimal" ? "decimal" : undefined}
                    dir={field.type === "date" || field.type === "decimal" ? "ltr" : "rtl"}
                    value={form[field.key]} disabled={saving || !canCreate}
                    aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `error-${field.key}` : undefined}
                    onChange={(event) => { setForm((prev) => ({ ...prev, [field.key]: event.target.value })); setErrors((prev) => ({ ...prev, [field.key]: "" })); }} />
                  {errors[field.key] && <p id={`error-${field.key}`} role="alert" className="text-sm text-destructive">{errors[field.key]}</p>}
                </div>
              ))}
            </div>
            <Button type="submit" className="gap-2" disabled={saving || !currentOrganizationId || !canCreate}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "جاري الحفظ" : "حفظ حمولة النقل"}
            </Button>
          </form>
          <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">سجل حمولات النقل</h2>
              <span className="text-sm text-muted-foreground">{data?.count ?? 0} حمولة</span>
            </div>
            <div className="overflow-hidden rounded-md border">
              <Table className="min-w-[1000px]">
                <TableHeader><TableRow className="bg-muted">{transportLoadFields.map((field) => <TableHead key={field.key} className="text-right font-bold text-foreground">{field.label}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={8} className="h-24 text-center">جاري تحميل السجل…</TableCell></TableRow>
                    : isError ? <TableRow><TableCell colSpan={8} className="h-24 text-center"><p className="mb-2 text-destructive">تعذر تحميل السجل</p><Button variant="outline" onClick={() => refetch()}>إعادة المحاولة</Button></TableCell></TableRow>
                    : !data?.rows.length ? <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">لا توجد حمولات نقل مسجلة</TableCell></TableRow>
                    : data.rows.map((row) => <TableRow key={row.id} className="even:bg-primary/5">{transportLoadFields.map((field) => <TableCell key={field.key} className="text-right tabular-nums"><span dir={field.type === "date" || field.type === "decimal" ? "ltr" : undefined}>{field.type === "date" ? String(row[field.key]).split("-").reverse().join("/") : row[field.key]}</span></TableCell>)}</TableRow>)}
                </TableBody>
              </Table>
            </div>
            {(data?.count ?? 0) > 50 && <div className="flex items-center justify-end gap-3"><Button variant="outline" disabled={page === 0} onClick={() => setPage((prev) => prev - 1)}>السابق</Button><span className="text-sm">{page + 1} / {Math.ceil((data?.count ?? 0) / 50)}</span><Button variant="outline" disabled={(page + 1) * 50 >= (data?.count ?? 0)} onClick={() => setPage((prev) => prev + 1)}>التالي</Button></div>}
          </section>
        </>}
      </main>
    </div>
  );
}