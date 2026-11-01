import { useCrusherProgram } from "@/lib/crusherProgram";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Building2, Hash, Plus, Trash2, Truck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const KINDS = [
  { k: "driver", t: "السائقين", icon: Users, name: "اسم السائق", extra: "رقم الجوال / الإقامة" },
  { k: "serial", t: "السريال نمبر", icon: Hash, name: "رقم السريال (8 أرقام)", extra: "ملاحظة" },
  { k: "company", t: "الشركات", icon: Building2, name: "اسم الشركة (العميل)", extra: "الرقم الضريبي" },
  { k: "supplier", t: "الموردين", icon: Truck, name: "اسم المورد", extra: "رقم الجوال" },
] as const;

export default function CrusherData() {
  const prog = useCrusherProgram();
  const [sp, setSp] = useSearchParams();
  const kind = sp.get("tab") || "driver";
  const cfg = KINDS.find((x) => x.k === kind) || KINDS[0];
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState(""); const [extra, setExtra] = useState("");

  useEffect(() => { (async () => {
    const { data: u } = await supabase.auth.getUser(); if (!u.user) return;
    const { data } = await (supabase as any).rpc("get_user_organization", { _user_id: u.user.id }); setOrgId(data);
  })(); }, []);
  const load = async () => {
    const { data } = await (supabase as any).from("crusher_lookups").select("*").eq("kind", cfg.k).eq("program", prog.key).order("created_at", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { load(); setName(""); setExtra(""); }, [cfg.k, prog.key]);

  const add = async () => {
    const n = name.trim(); if (!n || !orgId) return;
    if (cfg.k === "serial" && !/^\d{8}$/.test(n)) { toast.error("السريال يجب أن يكون 8 أرقام"); return; }
    if (rows.some((r) => r.name === n)) { toast.error("موجود مسبقًا"); return; }
    const { error } = await (supabase as any).from("crusher_lookups").insert({ organization_id: orgId, program: prog.key, kind: cfg.k, name: n, extra: extra.trim() || null });
    if (error) toast.error(error.message); else { toast.success("تمت الإضافة"); setName(""); setExtra(""); load(); }
  };
  const del = async (id: string) => {
    if (!confirm("حذف هذا السجل؟")) return;
    const { error } = await (supabase as any).from("crusher_lookups").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={prog.base} className="hover:text-primary"><ArrowRight className="h-6 w-6" /></Link>
          <div><h1 className="text-lg font-bold">بيانات {prog.name}</h1><p className="text-xs text-muted-foreground">السائقين • السريال • الشركات • الموردين</p></div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((x) => (
            <Button key={x.k} variant={x.k === cfg.k ? "default" : "outline"} onClick={() => setSp({ tab: x.k })}><x.icon className="h-4 w-4 ml-1" />{x.t}</Button>))}
        </div>
        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-bold text-primary">إضافة {cfg.t}</h2>
          <div className="grid md:grid-cols-[1fr_1fr_auto] gap-2">
            <Input placeholder={cfg.name} value={name} inputMode={cfg.k === "serial" ? "numeric" : undefined} maxLength={cfg.k === "serial" ? 8 : undefined} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <Input placeholder={cfg.extra} value={extra} onChange={(e) => setExtra(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <Button onClick={add}><Plus className="h-4 w-4 ml-1" />إضافة</Button>
          </div>
        </section>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary/10"><tr><th className="p-2 w-12">#</th><th className="p-2 text-right">{cfg.name}</th><th className="p-2 text-right">{cfg.extra}</th><th className="p-2 w-16"></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">لا توجد بيانات</td></tr>}
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t"><td className="p-2 text-center">{i + 1}</td><td className="p-2 font-semibold">{r.name}</td><td className="p-2">{r.extra || "-"}</td>
                  <td className="p-2 text-center"><button aria-label="حذف" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></button></td></tr>))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
