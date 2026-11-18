import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, UserRound, Building2, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

export type ContactKind = "supplier" | "driver" | "location";
export const contactLabel = (kind: ContactKind) => kind === "supplier" ? "المورد" : kind === "driver" ? "السائق" : "الموقع";
export function useTransportContacts(organizationId: string | null, enabled: boolean) {
  return useQuery({ queryKey: ["transport-contacts", organizationId], enabled: Boolean(organizationId && enabled), queryFn: async () => {
    if (!organizationId) throw new Error("لم يتم تحديد الشركة");
    const rows: Tables<"transport_load_contacts">[] = [];
    for (let start = 0; ; start += 500) {
      const result = await supabase.from("transport_load_contacts").select("*").eq("organization_id", organizationId).order("name").order("id").range(start, start + 499);
      if (result.error) throw result.error;
      rows.push(...result.data);
      if (result.data.length < 500) break;
    }
    return rows;
  } });
}

export function TransportLocationSelect({ id, label, value, onChange, organizationId, userId, canCreate, disabled = false, allLocations = false, invalid = false }: { id: string; label: string; value: string; onChange: (name: string) => void; organizationId: string | null; userId?: string; canCreate: boolean; disabled?: boolean; allLocations?: boolean; invalid?: boolean }) {
  const contacts = useTransportContacts(organizationId, true);
  const [open, setOpen] = useState(false);
  const locations = contacts.data?.filter(row => row.kind === "location") ?? [];
  return <><div className="flex min-w-0 gap-2">
    <select id={id} className="transport-white-field min-w-0 w-full rounded-md border bg-background px-3 text-sm" dir="rtl" value={value} disabled={disabled || !canCreate || contacts.isLoading || contacts.isError} aria-invalid={invalid} onChange={event => onChange(event.target.value)}>
      <option value="">{allLocations ? "كل المواقع" : `اختر ${label}`}</option>
      {value && !locations.some(row => row.name === value) && <option value={value} disabled>{value} (غير مسجل)</option>}
      {locations.map(row => <option key={row.id} value={row.name}>{row.name}</option>)}
    </select>
    <Button type="button" variant="outline" className="h-[46px] w-[46px] shrink-0" size="icon" title={`بحث أو إضافة ${label}`} aria-label={`بحث أو إضافة ${label}`} disabled={disabled || !canCreate} onClick={() => setOpen(true)}><Plus className="h-5 w-5" /></Button>
  </div>{contacts.isError && <Button type="button" variant="link" onClick={() => contacts.refetch()}>إعادة تحميل المواقع</Button>}
  {open && <TransportContactDialog kind="location" organizationId={organizationId} userId={userId} canCreate={canCreate} onClose={() => setOpen(false)} onSelect={name => onChange(name)} />}</>;
}

export function TransportContactDialog({ kind, onClose, onSelect, organizationId, userId, canCreate }: { kind: ContactKind | null; onClose: () => void; onSelect?: (name: string, kind: ContactKind) => void; organizationId: string | null; userId?: string; canCreate: boolean }) {
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const contacts = useTransportContacts(organizationId, Boolean(kind));
  const client = useQueryClient();
  const { toast } = useToast();
  const rows = contacts.data?.filter(row => row.kind === kind && row.name.includes(search.trim())) ?? [];
  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!kind || !organizationId || !userId || !canCreate || !name.trim() || saving) return;
    setSaving(true);
    try {
      const result = await supabase.from("transport_load_contacts").insert({ organization_id: organizationId, created_by: userId, kind, name: name.trim() });
      if (result.error) throw result.error;
      await client.invalidateQueries({ queryKey: ["transport-contacts", organizationId] });
      toast({ title: `تمت إضافة ${contactLabel(kind)}` });
      if (onSelect) { onSelect(name.trim(), kind); onClose(); }
      setName("");
    } catch (error) {
      toast({ title: "تعذرت الإضافة", description: (error as { code?: string }).code === "23505" ? "هذا الاسم مسجل بالفعل" : "يرجى المحاولة مرة أخرى", variant: "destructive" });
    } finally { setSaving(false); }
  }
  return <Dialog open={Boolean(kind)} onOpenChange={open => { if (!open) onClose(); }}><DialogContent dir="rtl" className="max-w-lg w-[calc(100%-2rem)]" aria-describedby={undefined}>
    <DialogTitle className="pl-6 text-right">{kind ? `اختيار أو إضافة ${contactLabel(kind)}` : ""}</DialogTitle>
    <div className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="البحث بالاسم" placeholder="البحث بالاسم" className="pr-9 transport-white-field" value={search} onChange={e => setSearch(e.target.value)} /></div>
    <div className="max-h-60 space-y-1 overflow-y-auto">{contacts.isLoading ? <p className="py-4 text-center">جاري التحميل…</p> : contacts.isError ? <Button variant="outline" onClick={() => contacts.refetch()}>إعادة المحاولة</Button> : rows.length ? rows.map(row => <Button key={row.id} type="button" variant="ghost" className="w-full justify-start gap-2" onClick={() => { if (onSelect && kind) { onSelect(row.name, kind); onClose(); } else { setName(row.name); } }}>{row.kind === "driver" ? <UserRound className="h-4 w-4" /> : row.kind === "location" ? <MapPin className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}{row.name}</Button>) : <p className="py-4 text-center text-muted-foreground">لا توجد أسماء مطابقة</p>}</div>
    {canCreate && <form onSubmit={add} className="space-y-3 border-t pt-4"><Label htmlFor="transport-contact-name">{kind ? `اسم ${contactLabel(kind)} الجديد` : "الاسم"}</Label><Input id="transport-contact-name" className="transport-white-field" value={name} onChange={e => setName(e.target.value)} required /><Button className="gap-2" disabled={saving || !name.trim()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}إضافة</Button></form>}
  </DialogContent></Dialog>;
}