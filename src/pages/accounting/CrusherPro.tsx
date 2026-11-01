import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Factory, FileText, Plus, Scale, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ESTABLISHMENTS = ["soft industrial remal company - 2050147220"];
const MAT_KEY = "crusher_pro_materials";
const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(",", ".")) || 0);
const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);

const Section = ({ title, icon: Icon, tone, children, note }: any) => (
  <section className={`rounded-xl border p-4 md:p-5 space-y-4 ${tone}`}>
    <h2 className="flex items-center gap-2 font-bold text-primary"><Icon className="h-5 w-5" />{title}</h2>
    {note && <p className="text-xs text-muted-foreground">{note}</p>}
    {children}
  </section>
);
const F = ({ label, children }: any) => (<div className="space-y-1.5"><Label className="text-sm font-semibold">{label}</Label>{children}</div>);
const sel = "w-full h-10 rounded-md border border-input bg-background px-3 text-sm";

export default function CrusherPro() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>(() => JSON.parse(localStorage.getItem(MAT_KEY) || '["بحص","رمل","كسارة"]'));
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const empty = { establishment: ESTABLISHMENTS[0], entryDate: today(), entryTime: nowTime(), exitDate: "", exitTime: "", material: "", client: "", km: "0", driver: "", shipment: "", supplier: "", invNo: "", invValue: "", prevSerial: "", emptyW: "", fullW: "" };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof empty) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: org } = await (supabase as any).rpc("get_user_organization", { _user_id: u.user.id });
      setOrgId(org);
      const [d, s, c] = await Promise.all([
        (supabase as any).from("drivers").select("name").eq("is_active", true).order("name"),
        (supabase as any).from("suppliers").select("name"),
        (supabase as any).from("companies").select("name"),
      ]);
      setDrivers((d.data || []).map((x: any) => x.name).filter(Boolean));
      setSuppliers((s.data || []).map((x: any) => x.name).filter(Boolean));
      setClients((c.data || []).map((x: any) => x.name).filter(Boolean));
    })();
  }, []);

  const net = useMemo(() => num(f.fullW) - num(f.emptyW), [f.fullW, f.emptyW]);
  const ready = f.invNo.trim() && /^\d{8}$/.test(f.prevSerial.trim()) && file;

  const addMaterial = () => {
    const m = prompt("اسم نوع المادة الجديد")?.trim();
    if (!m) return;
    const next = Array.from(new Set([...materials, m]));
    setMaterials(next); localStorage.setItem(MAT_KEY, JSON.stringify(next));
    setF((p) => ({ ...p, material: m }));
  };

  const save = async () => {
    if (!ready || !orgId || !file) return;
    setSaving(true);
    try {
      const path = `${orgId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("crusher-invoices").upload(path, file, { contentType: "application/pdf" });
      if (up.error) throw up.error;
      const { data, error } = await (supabase as any).from("crusher_shipments").insert({
        organization_id: orgId, establishment: f.establishment,
        entry_at: new Date(`${f.entryDate}T${f.entryTime || "00:00"}`).toISOString(),
        exit_at: f.exitDate ? new Date(`${f.exitDate}T${f.exitTime || "00:00"}`).toISOString() : null,
        material_type: f.material || null, client_name: f.client || null, kilometers: num(f.km),
        driver_name: f.driver || null, shipment_number: f.shipment || null, supplier_name: f.supplier || null,
        invoice_number: f.invNo.trim(), invoice_value: num(f.invValue), previous_serial: f.prevSerial.trim(),
        invoice_pdf_path: path, empty_weight: num(f.emptyW), full_weight: num(f.fullW),
      }).select("serial_number").single();
      if (error) throw error;
      toast.success(`تم حفظ الشحنة — السريال الجديد: ${data.serial_number}`);
      setF({ ...empty, entryDate: today(), entryTime: nowTime() }); setFile(null);
    } catch (e: any) { toast.error(e.message || "تعذر الحفظ"); }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/accounting/projects" className="hover:text-primary"><ArrowRight className="h-6 w-6" /></Link>
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><Factory className="h-5 w-5" /></div>
          <div><h1 className="text-lg font-bold">برنامج كسارة مطور</h1><p className="text-xs text-muted-foreground">الرئيسية — تسجيل شحنة</p></div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 max-w-5xl space-y-5">
        <Section title="معلومات المؤسسة | Company Information" icon={Building2} tone="bg-primary/5">
          <F label="اختر المؤسسة | Select Company">
            <select className={sel} value={f.establishment} onChange={set("establishment")}>{ESTABLISHMENTS.map((e) => <option key={e}>{e}</option>)}</select>
          </F>
        </Section>

        <div className="grid md:grid-cols-2 gap-4">
          <F label="تاريخ ووقت الدخول | Entry Date & Time"><div className="flex gap-2"><Input type="date" value={f.entryDate} onChange={set("entryDate")} /><Input type="time" className="w-32" value={f.entryTime} onChange={set("entryTime")} /></div></F>
          <F label="تاريخ ووقت الخروج | Exit Date & Time"><div className="flex gap-2"><Input type="date" value={f.exitDate} onChange={set("exitDate")} /><Input type="time" className="w-32" value={f.exitTime} onChange={set("exitTime")} /></div></F>
          <F label="نوع المواد | Material Type"><div className="flex gap-2">
            <select className={sel} value={f.material} onChange={set("material")}><option value="">اختر نوع المادة | Select Material Type</option>{materials.map((m) => <option key={m}>{m}</option>)}</select>
            <Button type="button" size="icon" onClick={addMaterial} aria-label="إضافة نوع مادة"><Plus className="h-4 w-4" /></Button></div></F>
          <F label="اسم العميل | Client Name"><select className={sel} value={f.client} onChange={set("client")}><option value="">اختر العميل | Select Client</option>{clients.map((c) => <option key={c}>{c}</option>)}</select></F>
          <F label="عدد الكيلومترات | Kilometers"><Input inputMode="decimal" value={f.km} onChange={set("km")} /></F>
          <F label="اسم السائق | Driver Name"><select className={sel} value={f.driver} onChange={set("driver")}><option value="">اختر السائق | Select Driver</option>{drivers.map((d) => <option key={d}>{d}</option>)}</select></F>
          <F label="رقم الشاحنة | Shipment Number"><Input value={f.shipment} onChange={set("shipment")} /></F>
          <F label="اسم المورد | Supplier Name"><select className={sel} value={f.supplier} onChange={set("supplier")}><option value="">اختر المورد | Select Supplier</option>{suppliers.map((s) => <option key={s}>{s}</option>)}</select></F>
        </div>

        <Section title="بيانات الفاتورة (إجباري) | Invoice Data (Required)" icon={FileText} tone="bg-accent/30" note="يجب إدخال رقم الفاتورة ورقم سريال صادر من فاتورة سابقة ورفع ملف PDF. سيتم توليد سريال جديد تلقائيًا للفاتورة الحالية.">
          <div className="grid md:grid-cols-4 gap-4">
            <F label="رقم الفاتورة *"><Input value={f.invNo} onChange={set("invNo")} placeholder="رقم الفاتورة" /></F>
            <F label="قيمة الفاتورة (ر.س)"><Input inputMode="decimal" value={f.invValue} onChange={set("invValue")} placeholder="0.00" /></F>
            <F label="رقم سريال الفاتورة السابقة *"><Input inputMode="numeric" maxLength={8} value={f.prevSerial} onChange={set("prevSerial")} placeholder="8 أرقام" /></F>
            <F label="ملف PDF الفاتورة *"><Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></F>
          </div>
        </Section>

        <Section title="بيانات الوزن | Weight Data" icon={Scale} tone="bg-primary/5">
          <div className="grid md:grid-cols-3 gap-4">
            <F label="وزن الشحنة فارغة (كجم)"><Input inputMode="decimal" value={f.emptyW} onChange={set("emptyW")} /></F>
            <F label="الوزن الكامل (كجم)"><Input inputMode="decimal" value={f.fullW} onChange={set("fullW")} /></F>
            <F label="الوزن الصافي (كجم)"><div className="h-10 rounded-md bg-muted flex items-center justify-center font-bold text-primary">{net.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div></F>
          </div>
        </Section>

        <Button className="w-full h-12 text-base" disabled={!ready || saving} onClick={save}>
          {saving ? "جارٍ الحفظ..." : ready ? "حفظ الشحنة" : "يجب إدخال رقم الفاتورة + سريال سابق + رفع PDF"}
        </Button>
      </main>
    </div>
  );
}
