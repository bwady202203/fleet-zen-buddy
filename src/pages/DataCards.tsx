import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Plus, Save, Trash2, Database } from "lucide-react";

type Row = {
  id: string; category: string; title: string; number: string; secret: string;
  phone: string; notes: string; sort_order: number; _dirty?: boolean; _new?: boolean;
};

export default function DataCards() {
  const { currentOrganizationId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    const { data, error } = await supabase.from("data_cards").select("*")
      .eq("organization_id", currentOrganizationId).order("sort_order");
    if (error) toast.error("تعذر تحميل البيانات (للأدمن فقط)");
    setRows((data as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [currentOrganizationId]);

  const upd = (id: string, k: keyof Row, v: string) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [k]: v, _dirty: true } : x)));

  const save = async (row: Row) => {
    const payload = { category: row.category, title: row.title, number: row.number, secret: row.secret,
      phone: row.phone, notes: row.notes, sort_order: row.sort_order, organization_id: currentOrganizationId! };
    const res = row._new
      ? await supabase.from("data_cards").insert(payload).select().single()
      : await supabase.from("data_cards").update(payload).eq("id", row.id).select().single();
    if (res.error) return toast.error("فشل الحفظ");
    setRows((r) => r.map((x) => (x.id === row.id ? (res.data as Row) : x)));
    toast.success("تم الحفظ");
  };

  const remove = async (row: Row) => {
    if (prompt("أدخل رمز الحذف") !== "363636") return toast.error("رمز غير صحيح");
    if (!row._new) {
      const { error } = await supabase.from("data_cards").delete().eq("id", row.id);
      if (error) return toast.error("فشل الحذف");
    }
    setRows((r) => r.filter((x) => x.id !== row.id));
    toast.success("تم الحذف");
  };

  const add = (category: string) => setRows((r) => [...r, {
    id: crypto.randomUUID(), category, title: "", number: "", secret: "", phone: "", notes: "",
    sort_order: (r[r.length - 1]?.sort_order ?? 0) + 1, _new: true, _dirty: true,
  }]);

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("تم النسخ"); };
  const categories = Array.from(new Set(rows.map((r) => r.category)));
  if (!categories.length) categories.push("عام");

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary text-primary-foreground"><Database className="h-6 w-6" /></div>
        <h1 className="text-2xl font-bold">داتا</h1>
      </div>
      {loading && <p className="text-muted-foreground">جاري التحميل...</p>}
      {categories.map((cat) => (
        <section key={cat} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{cat}</h2>
            <Button size="sm" variant="outline" onClick={() => add(cat)}><Plus className="h-4 w-4 ml-1" />بطاقة</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.filter((r) => r.category === cat).map((r) => (
              <Card key={r.id} className="p-4 space-y-2 border-t-4 border-t-primary">
                <Input value={r.title} placeholder="الاسم" className="font-bold" onChange={(e) => upd(r.id, "title", e.target.value)} />
                <div className="flex gap-1">
                  <Input value={r.number} placeholder="الرقم" dir="ltr" onChange={(e) => upd(r.id, "number", e.target.value)} />
                  <Button size="icon" variant="ghost" onClick={() => copy(r.number)}><Copy className="h-4 w-4" /></Button>
                </div>
                <div className="flex gap-1">
                  <Input value={r.secret} placeholder="كلمة المرور" dir="ltr" type={show[r.id] ? "text" : "password"} onChange={(e) => upd(r.id, "secret", e.target.value)} />
                  <Button size="icon" variant="ghost" onClick={() => setShow((s) => ({ ...s, [r.id]: !s[r.id] }))}>
                    {show[r.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => copy(r.secret)}><Copy className="h-4 w-4" /></Button>
                </div>
                <Input value={r.phone} placeholder="الجوال" dir="ltr" onChange={(e) => upd(r.id, "phone", e.target.value)} />
                <Input value={r.category} placeholder="القسم" onChange={(e) => upd(r.id, "category", e.target.value)} />
                <Textarea value={r.notes} placeholder="ملاحظات" rows={2} onChange={(e) => upd(r.id, "notes", e.target.value)} />
                <div className="flex justify-between">
                  <Button size="sm" disabled={!r._dirty} onClick={() => save(r)}><Save className="h-4 w-4 ml-1" />حفظ</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
      <Button variant="secondary" onClick={() => { const c = prompt("اسم القسم الجديد"); if (c) add(c); }}>
        <Plus className="h-4 w-4 ml-1" />قسم جديد
      </Button>
    </div>
  );
}
