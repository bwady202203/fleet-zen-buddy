import { useCrusherProgram } from "@/lib/crusherProgram";
import { listSammanLookup, saveSammanShipment, getLastSammanSerial, getSammanDriverBySerial } from "@/lib/sammanData";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Factory, FileText, Plus, Scale, Building2, CalendarClock, Hash, Truck, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OptionPickerDialog from "@/components/OptionPickerDialog";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ESTABLISHMENTS = ["soft industrial remal company - 2050147243"];
const MAT_KEY = "crusher_pro_materials";
const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(",", ".")) || 0);
const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);

const Section = ({ title, subtitle, icon: Icon, tone, children, note }: any) => (
  <section className="shipment-panel p-4 md:p-5 space-y-4">
    <div className="flex items-start gap-3">
      <span className={`shipment-chip shipment-chip-${tone}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <h2 className="font-bold text-foreground leading-6">{title}</h2>
        {subtitle && <p className="shipment-subtitle">{subtitle}</p>}
      </div>
    </div>
    {note && (
      <p className="shipment-note">{note}</p>
    )}
    <div className="shipment-body">{children}</div>
  </section>
);

const F = ({ label, required, children }: any) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-semibold text-foreground">
      {label}
      {required && <span className="text-destructive"> *</span>}
    </Label>
    {children}
  </div>
);

const sel = "shipment-field w-full h-10 px-3 text-sm";
const inp = "shipment-field h-10 text-sm";

const Trigger = ({ value, placeholder, onClick }: any) => (
  <button type="button" onClick={onClick} className={`${inp} w-full flex items-center justify-between gap-2 px-3 text-right`}>
    <span className={value ? "truncate text-foreground" : "truncate text-foreground/50"}>{value || placeholder}</span>
    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
  </button>
);

export default function CrusherPro() {
  const prog = useCrusherProgram();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [serials, setSerials] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>(() => JSON.parse(localStorage.getItem(MAT_KEY) || '["بحص","رمل","كسارة"]'));
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [savedSerial, setSavedSerial] = useState<null | { serial: string; prev: string; inv: string }>(null);
  const [picker, setPicker] = useState<null | "material" | "client">(null);
  const empty = { establishment: ESTABLISHMENTS[0], entryDate: today(), entryTime: nowTime(), exitDate: "", exitTime: "", material: "", client: "", km: "0", driver: "", shipment: "", supplier: "", invNo: "", invValue: "", prevSerial: "", emptyW: "", fullW: "" };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof empty) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: org } = await (supabase as any).rpc("get_user_organization", { _user_id: u.user.id });
      setOrgId(org);
      if (prog.key === "samman") {
        const [d, s2, c, sr, m] = await Promise.all(["driver", "supplier", "client", "serial", "material"].map((k) => listSammanLookup(k)));
        const names = (a: any[]) => Array.from(new Set(a.map((x) => x.name).filter(Boolean))) as string[];
        setDrivers(names(d)); setSuppliers(names(s2)); setClients(names(c));
        setSerials(names(sr.filter((x) => x.raw.status === "available"))); if (m.length) setMaterials(names(m));
        return;
      }
      const [d, s, c] = await Promise.all([
        (supabase as any).from("drivers").select("name").eq("is_active", true).order("name"),
        (supabase as any).from("suppliers").select("name"),
        (supabase as any).from("companies").select("name"),
      ]);
      const { data: lk } = await (supabase as any).from("crusher_lookups").select("kind,name").eq("program", prog.key);
      const pick = (k: string) => (lk || []).filter((x: any) => x.kind === k).map((x: any) => x.name);
      const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));
      setDrivers(uniq([...pick("driver"), ...(d.data || []).map((x: any) => x.name)]));
      setSuppliers(uniq([...pick("supplier"), ...(s.data || []).map((x: any) => x.name)]));
      setClients(uniq([...pick("company"), ...(c.data || []).map((x: any) => x.name)]));
      setSerials(pick("serial"));
    })();
  }, []);

  useEffect(() => {
    if (prog.key !== "samman" || !/^\d{8}$/.test(f.prevSerial.trim())) return;
    let live = true;
    getSammanDriverBySerial(f.prevSerial).then((d) => {
      if (!live || !d) return;
      setDrivers((list) => (list.includes(d) ? list : [d, ...list]));
      setF((p) => ({ ...p, driver: d }));
    });
    return () => { live = false; };
  }, [f.prevSerial]);

  const net = useMemo(() => num(f.fullW) - num(f.emptyW), [f.fullW, f.emptyW]);
  const serialOk = /^\d{8}$/.test(f.prevSerial.trim());
  const unlocked = serialOk && !!file;
  const ready = f.invNo.trim() && unlocked;

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
      const payload = {
        organization_id: orgId, program: prog.key, establishment: f.establishment,
        entry_at: new Date(`${f.entryDate}T${f.entryTime || "00:00"}`).toISOString(),
        exit_at: f.exitDate ? new Date(`${f.exitDate}T${f.exitTime || "00:00"}`).toISOString() : null,
        material_type: f.material || null, client_name: f.client || null, kilometers: num(f.km),
        driver_name: f.driver || null, shipment_number: f.shipment || null, supplier_name: f.supplier || null,
        invoice_number: f.invNo.trim(), invoice_value: num(f.invValue), previous_serial: f.prevSerial.trim(),
        invoice_pdf_path: path, empty_weight: num(f.emptyW), full_weight: num(f.fullW),
      };
      let data: any;
      if (prog.key === "samman") { const { data: u } = await supabase.auth.getUser(); data = await saveSammanShipment(orgId, u.user?.id ?? null, payload); }
      else { const r = await (supabase as any).from("crusher_shipments").insert(payload).select("serial_number").single(); if (r.error) throw r.error; data = r.data; }
      toast.success(`تم حفظ الشحنة — السريال الجديد: ${data.serial_number}`);
      setSavedSerial({ serial: data.serial_number, prev: f.prevSerial.trim(), inv: f.invNo.trim() });
      setF({ ...empty, entryDate: today(), entryTime: nowTime(), prevSerial: "" }); setFile(null); setRefresh((x) => x + 1);
    } catch (e: any) { toast.error(e.message || "تعذر الحفظ"); }
    setSaving(false);
  };

  return (
    <div className="shipment-page min-h-screen" dir="rtl">
      <header className="border-b bg-card/90 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/accounting/projects" className="hover:text-primary" aria-label="رجوع"><ArrowRight className="h-6 w-6" /></Link>
            <span className="shipment-chip shipment-chip-blue"><Factory className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-6">{prog.name}</h1>
              <p className="text-xs text-muted-foreground">الرئيسية — تسجيل شحنة</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="shipment-step"><b>1</b> معلومات المؤسسة والمواد</span>
            <span className="shipment-step"><b>2</b> بيانات الفاتورة</span>
            <span className="shipment-step"><b>3</b> بيانات الوزن</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl space-y-5">
        <Section title="معلومات المؤسسة | Company Information" subtitle="الجهة التي تُنسب إليها الشحنة" icon={Building2} tone="blue">
          <F label="اختر المؤسسة | Select Company">
            <select className={sel} value={f.establishment} onChange={set("establishment")}>{ESTABLISHMENTS.map((e) => <option key={e}>{e}</option>)}</select>
          </F>
        </Section>

        <Section title="سريال الفاتورة وملف PDF (إجباري)" subtitle="أدخلهما أولًا لتفعيل باقي الحقول" icon={FileText} tone="amber">
          <div className="grid md:grid-cols-2 gap-4">
            <F label="رقم سريال الفاتورة السابقة" required>
              <Input inputMode="numeric" maxLength={8} className={inp} value={f.prevSerial} onChange={set("prevSerial")} placeholder="8 أرقام" list="crusher-serials" />
              <datalist id="crusher-serials">{serials.map((x) => <option key={x} value={x} />)}</datalist>
              <span className={`shipment-pill ${serialOk ? "shipment-pill-ok" : ""}`}><Hash className="h-3.5 w-3.5" /> {serialOk ? "مكتمل" : "مطلوب (8 أرقام)"}</span>
            </F>
            <F label="ملف PDF الفاتورة" required>
              <label className={`${inp} flex items-center justify-between gap-2 px-3 cursor-pointer`}>
                <span className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">تصفّح</span>
                <span className="truncate text-xs text-foreground/70">{file ? file.name : "اختر ملف PDF"}</span>
                <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => { const x = e.target.files?.[0] || null; if (x && x.type !== "application/pdf" && !x.name.toLowerCase().endsWith(".pdf")) { toast.error("الملف يجب أن يكون PDF"); return; } setFile(x); }} />
              </label>
              <span className={`shipment-pill ${file ? "shipment-pill-ok" : ""}`}><FileText className="h-3.5 w-3.5" /> {file ? "مرفوع" : "مطلوب"}</span>
            </F>
          </div>
          <p className="shipment-subtitle">{serials.length.toLocaleString("en-US")} سريال متاح للاختيار{unlocked ? "" : " — باقي الحقول مقفلة حتى يكتمل السريال والملف"}</p>
        </Section>

        <fieldset disabled={!unlocked} className={`space-y-5 min-w-0 transition-opacity ${unlocked ? "" : "opacity-50 pointer-events-none"}`}>
        <Section title="حركة الشحنة | Shipment Movement" subtitle="أوقات الدخول والخروج والبيانات الميدانية" icon={CalendarClock} tone="blue">
          <div className="grid md:grid-cols-2 gap-4">
            <F label="تاريخ ووقت الدخول | Entry Date & Time">
              <div className="flex gap-2">
                <Input type="date" className={inp} value={f.entryDate} onChange={set("entryDate")} />
                <Input type="time" className={`${inp} w-32`} value={f.entryTime} onChange={set("entryTime")} />
              </div>
            </F>
            <F label="تاريخ ووقت الخروج | Exit Date & Time">
              <div className="flex gap-2">
                <Input type="date" className={inp} value={f.exitDate} onChange={set("exitDate")} />
                <Input type="time" className={`${inp} w-32`} value={f.exitTime} onChange={set("exitTime")} />
              </div>
            </F>
            <F label="نوع المواد | Material Type">
              <div className="flex gap-3">
                <Trigger value={f.material} placeholder="اختر نوع المادة | Select Material Type" onClick={() => setPicker("material")} />
                <Button type="button" size="icon" onClick={addMaterial} aria-label="إضافة نوع مادة" className="h-10 w-10 shrink-0 rounded-[10px]"><Plus className="h-4 w-4" /></Button>
              </div>
            </F>
            <F label="اسم العميل | Client Name">
              <Trigger value={f.client} placeholder="اختر العميل | Select Client" onClick={() => setPicker("client")} />
            </F>
            <F label="عدد الكيلومترات | Kilometers">
              <Input inputMode="decimal" className={inp} value={f.km} onChange={set("km")} />
            </F>
            <F label="اسم السائق | Driver Name">
              <select className={sel} value={f.driver} onChange={set("driver")}>
                <option value="">اختر السائق | Select Driver</option>
                {drivers.map((d) => <option key={d}>{d}</option>)}
              </select>
            </F>
            <F label="رقم الشاحنة | Shipment Number">
              <Input className={inp} value={f.shipment} onChange={set("shipment")} />
            </F>
            <F label="اسم المورد | Supplier Name">
              <select className={sel} value={f.supplier} onChange={set("supplier")}>
                <option value="">اختر المورد | Select Supplier</option>
                {suppliers.map((s) => <option key={s}>{s}</option>)}
              </select>
            </F>
          </div>
        </Section>

        <Section
          title="بيانات الفاتورة (إجباري) | Invoice Data (Required)"
          subtitle="بدونها لا يمكن حفظ الشحنة أو توليد السريال"
          icon={FileText}
          tone="amber"
          note="يجب إدخال رقم الفاتورة ورقم سريال صادر من فاتورة سابقة ورفع ملف PDF. سيتم توليد سريال جديد تلقائيًا للفاتورة الحالية."
        >
          <div className="grid md:grid-cols-2 gap-4">
            <F label="رقم الفاتورة" required>
              <Input className={inp} value={f.invNo} onChange={set("invNo")} placeholder="رقم الفاتورة" />
              <span className={`shipment-pill ${f.invNo.trim() ? "shipment-pill-ok" : ""}`}><Hash className="h-3.5 w-3.5" /> {f.invNo.trim() ? "مكتمل" : "مطلوب"}</span>
            </F>
            <F label="قيمة الفاتورة (ر.س)">
              <Input inputMode="decimal" className={inp} value={f.invValue} onChange={set("invValue")} placeholder="0.00" />
              <span className="shipment-subtitle">القيمة الإجمالية للفاتورة</span>
            </F>
          </div>
        </Section>

        <Section title="بيانات الوزن | Weight Data" subtitle="الوزن الصافي يُحتسب تلقائيًا" icon={Scale} tone="green">
          <div className="grid md:grid-cols-3 gap-4">
            <F label="وزن الشحنة فارغة (كجم)">
              <Input inputMode="decimal" className={inp} value={f.emptyW} onChange={set("emptyW")} placeholder="0.00" />
            </F>
            <F label="الوزن الكامل (كجم)">
              <Input inputMode="decimal" className={inp} value={f.fullW} onChange={set("fullW")} placeholder="0.00" />
            </F>
            <F label="الوزن الصافي (كجم)">
              <div className="shipment-net h-10 flex items-center justify-center font-bold text-foreground tabular-nums">
                {net.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </F>
          </div>
        </Section>
        </fieldset>

        <div className="shipment-panel p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/75">
              <Truck className="h-4 w-4" />
              {ready ? "جميع البيانات الإجبارية مكتملة — يمكنك الحفظ" : "أكمل رقم الفاتورة + سريال سابق (8 أرقام) + رفع PDF"}
            </div>
            <Button className="h-11 min-w-56 px-6 text-base" disabled={!ready || saving} onClick={save}>
              {saving ? "جارٍ الحفظ..." : ready ? "حفظ الشحنة" : "أكمل البيانات الإجبارية"}
            </Button>
          </div>
        </div>
      </main>

      <OptionPickerDialog
        open={picker === "material"}
        onOpenChange={(o) => !o && setPicker(null)}
        title="اختيار نوع المواد"
        subtitle="اختر المادة المطلوبة من البطاقات أو ابحث عنها"
        options={materials}
        value={f.material}
        searchPlaceholder="ابحث عن مادة..."
        emptyHint="لا توجد مادة بهذا الاسم"
        onSelect={(v) => { setF((p) => ({ ...p, material: v })); setPicker(null); }}
      />

      <OptionPickerDialog
        open={picker === "client"}
        onOpenChange={(o) => !o && setPicker(null)}
        title="اختيار العميل"
        subtitle="اختر العميل المطلوب من البطاقات أو ابحث عنه"
        options={clients}
        value={f.client}
        searchPlaceholder="ابحث عن عميل..."
        emptyHint="لا يوجد عميل بهذا الاسم"
        onSelect={(v) => { setF((p) => ({ ...p, client: v })); setPicker(null); }}
      />
      <Dialog open={!!savedSerial} onOpenChange={(o) => !o && setSavedSerial(null)}>
        <DialogContent dir="rtl" className="max-w-sm text-center">
          <DialogHeader><DialogTitle className="text-center">تم حفظ الفاتورة — السريال الجديد</DialogTitle></DialogHeader>
          {savedSerial && (<div className="flex flex-col items-center gap-3">
            <div className="text-4xl font-bold tracking-widest text-foreground">{savedSerial.serial}</div>
            <div className="rounded-lg bg-card p-3 border"><QRCodeSVG value={`INV:${savedSerial.inv}|SN:${savedSerial.serial}|PREV:${savedSerial.prev}`} size={150} /></div>
            <p className="text-sm text-muted-foreground">أدخل هذا الرقم في حقل السريال عند إنشاء الفاتورة التالية (تمت تعبئته تلقائيًا).</p>
            <Button onClick={() => setSavedSerial(null)} className="w-full">متابعة</Button>
          </div>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
