import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, ExternalLink, Edit, Trash2, Link2, IdCard, Calendar, Search, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";

interface UsefulLink {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  color?: string | null;
}

interface Driver {
  id: string;
  name: string;
  name_ar?: string | null;
  phone?: string | null;
  iqama_number?: string | null;
  iqama_expiry?: string | null;
  operation_card_number?: string | null;
  operation_card_expiry?: string | null;
  medical_insurance_expiry?: string | null;
  establishment_name?: string | null;
  vehicle_number?: string | null;
}


const PALETTE = [
  "from-blue-500 to-blue-700",
  "from-emerald-500 to-emerald-700",
  "from-amber-500 to-amber-700",
  "from-rose-500 to-rose-700",
  "from-violet-500 to-violet-700",
  "from-cyan-500 to-cyan-700",
  "from-fuchsia-500 to-fuchsia-700",
  "from-orange-500 to-orange-700",
];

// Parse various date formats (yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy, yyyy/mm/dd) to ISO
function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // ISO
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  // dd/mm/yyyy or dd-mm-yyyy
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // Excel serial number
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (n > 20000 && n < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

export default function AdminPanel() {
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [linkDialog, setLinkDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);
  const [linkForm, setLinkForm] = useState({ title: "", url: "", description: "" });

  const [driverDialog, setDriverDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverForm, setDriverForm] = useState({ name_ar: "", iqama_number: "", iqama_expiry: "", operation_card_number: "", operation_card_expiry: "" });

  const [search, setSearch] = useState("");
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = async () => {
    const [l, d] = await Promise.all([
      (supabase as any).from("useful_links").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("drivers").select("id, name, name_ar, phone, iqama_number, iqama_expiry, operation_card_number, operation_card_expiry, medical_insurance_expiry, establishment_name, vehicle_number").eq("is_active", true).order("name"),
    ]);
    if (!l.error) setLinks(l.data || []);
    if (!d.error) setDrivers((d.data as any) || []);
  };

  useEffect(() => { load(); }, []);

  const filteredDrivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      (d.name || "").toLowerCase().includes(q) ||
      (d.name_ar || "").toLowerCase().includes(q) ||
      (d.iqama_number || "").toLowerCase().includes(q) ||
      (d.operation_card_number || "").toLowerCase().includes(q)
    );
  }, [drivers, search]);

  const openNewLink = () => { setEditingLink(null); setLinkForm({ title: "", url: "", description: "" }); setLinkDialog(true); };
  const openEditLink = (l: UsefulLink) => { setEditingLink(l); setLinkForm({ title: l.title, url: l.url, description: l.description || "" }); setLinkDialog(true); };

  const saveLink = async () => {
    if (!linkForm.title.trim() || !linkForm.url.trim()) { toast.error("العنوان والرابط مطلوبان"); return; }
    let url = linkForm.url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const payload = { title: linkForm.title.trim(), url, description: linkForm.description.trim() || null };
    const res = editingLink
      ? await (supabase as any).from("useful_links").update(payload).eq("id", editingLink.id)
      : await (supabase as any).from("useful_links").insert(payload);
    if (res.error) { toast.error("فشل الحفظ: " + res.error.message); return; }
    toast.success("تم الحفظ");
    setLinkDialog(false);
    load();
  };

  const deleteLink = async (id: string) => {
    if (!confirm("حذف الرابط؟")) return;
    const { error } = await (supabase as any).from("useful_links").delete().eq("id", id);
    if (error) { toast.error("فشل الحذف"); return; }
    toast.success("تم الحذف"); load();
  };

  const openEditDriver = (d: Driver) => {
    setEditingDriver(d);
    setDriverForm({
      name_ar: d.name_ar || "",
      iqama_number: d.iqama_number || "",
      iqama_expiry: d.iqama_expiry || "",
      operation_card_number: d.operation_card_number || "",
      operation_card_expiry: d.operation_card_expiry || "",
    });
    setDriverDialog(true);
  };

  const saveDriver = async () => {
    if (!editingDriver) return;
    const { error } = await (supabase as any).from("drivers").update({
      name_ar: driverForm.name_ar.trim() || null,
      iqama_number: driverForm.iqama_number.trim() || null,
      iqama_expiry: driverForm.iqama_expiry || null,
      operation_card_number: driverForm.operation_card_number.trim() || null,
      operation_card_expiry: driverForm.operation_card_expiry || null,
    }).eq("id", editingDriver.id);
    if (error) { toast.error("فشل الحفظ"); return; }
    toast.success("تم الحفظ"); setDriverDialog(false); load();
  };

  const clearDriverCard = async (d: Driver) => {
    if (!confirm(`حذف بيانات بطاقة السائق "${d.name}"؟\nسيتم مسح رقم الإقامة وتواريخ الانتهاء وبطاقة التشغيل.`)) return;
    const { error } = await (supabase as any).from("drivers").update({
      iqama_number: null, iqama_expiry: null, operation_card_number: null, operation_card_expiry: null,
    }).eq("id", d.id);
    if (error) { toast.error("فشل الحذف: " + error.message); return; }
    toast.success("تم حذف بيانات البطاقة"); load();
  };

  const applyBulk = async () => {
    const text = bulkText.trim();
    if (!text) { toast.error("ألصق بيانات من Excel أولاً"); return; }
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return;
    setBulkBusy(true);
    let updated = 0, notFound = 0, failed = 0;
    const notFoundNames: string[] = [];

    // Build name lookup
    const byName = new Map<string, Driver>();
    drivers.forEach((d) => byName.set((d.name || "").trim().toLowerCase(), d));

    for (const raw of lines) {
      const cols = raw.split(/\t|,/).map((c) => c.trim());
      // Skip header row
      if (/اسم|name/i.test(cols[0] || "") && updated === 0 && notFound === 0) continue;
      const [name, iqama, iqamaExp, cardNo, cardExp] = cols;
      if (!name) continue;
      const driver = byName.get(name.toLowerCase());
      if (!driver) { notFound++; notFoundNames.push(name); continue; }
      const payload: any = {};
      if (iqama !== undefined && iqama !== "") payload.iqama_number = iqama;
      if (iqamaExp) { const p = parseDate(iqamaExp); if (p) payload.iqama_expiry = p; }
      if (cardNo !== undefined && cardNo !== "") payload.operation_card_number = cardNo;
      if (cardExp) { const p = parseDate(cardExp); if (p) payload.operation_card_expiry = p; }
      if (Object.keys(payload).length === 0) continue;
      const { error } = await (supabase as any).from("drivers").update(payload).eq("id", driver.id);
      if (error) failed++; else updated++;
    }
    setBulkBusy(false);
    toast.success(`تم تحديث ${updated} سائق${notFound ? ` • ${notFound} غير موجود` : ""}${failed ? ` • ${failed} فشل` : ""}`);
    if (notFoundNames.length) console.warn("Drivers not found:", notFoundNames);
    setBulkDialog(false); setBulkText(""); load();
  };

  const getExpiryStatus = (expiry?: string | null) => {
    if (!expiry) return { tone: "none" as const, label: "غير محدد", days: null as number | null };
    const days = differenceInDays(parseISO(expiry), new Date());
    if (days < 0) return { tone: "expired" as const, label: `منتهية منذ ${Math.abs(days)} يوم`, days };
    if (days <= 7) return { tone: "warn" as const, label: `${days} يوم متبقي`, days };
    return { tone: "ok" as const, label: `${days} يوم متبقي`, days };
  };

  const cardGradient = (...statuses: { tone: "none" | "ok" | "warn" | "expired" }[]) => {
    if (statuses.some((s) => s.tone === "expired"))
      return "bg-red-600";
    if (statuses.some((s) => s.tone === "warn"))
      return "bg-amber-500";
    return "bg-blue-400";
  };

  const updateDriverField = async (id: string, field: keyof Driver, value: string | null) => {
    const current = drivers.find((x) => x.id === id);
    if (current && (current as any)[field] === (value ?? null)) return;
    setDrivers((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
    const { error } = await (supabase as any).from("drivers").update({ [field]: value }).eq("id", id);
    if (error) { toast.error("فشل الحفظ: " + error.message); load(); return; }
    toast.success("تم الحفظ", { duration: 1200 });
  };

  return (
    <div dir="rtl" className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الشاشة الإدارية</h1>
      </div>

      <Tabs defaultValue="links" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="links" className="gap-2"><Link2 className="h-4 w-4" />الروابط الهامة</TabsTrigger>
          <TabsTrigger value="drivers" className="gap-2"><IdCard className="h-4 w-4" />بطاقات تشغيل السائقين</TabsTrigger>
        </TabsList>

        {/* Links Tab */}
        <TabsContent value="links" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={openNewLink} className="gap-2"><Plus className="h-4 w-4" />إضافة رابط</Button>
          </div>
          {links.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">لا توجد روابط بعد. ابدأ بإضافة رابط جديد.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {links.map((link, idx) => {
                const gradient = PALETTE[idx % PALETTE.length];
                return (
                  <Card key={link.id} className="group relative overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="block">
                      <div className={`bg-gradient-to-br ${gradient} aspect-square flex flex-col items-center justify-center p-4 text-white`}>
                        <ExternalLink className="h-10 w-10 mb-3 opacity-90" />
                        <div className="font-bold text-center text-base line-clamp-2">{link.title}</div>
                        {link.description && (
                          <div className="text-xs text-white/80 text-center mt-1 line-clamp-2">{link.description}</div>
                        )}
                      </div>
                    </a>
                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="secondary" className="h-7 w-7" onClick={(e) => { e.preventDefault(); openEditLink(link); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-7 w-7" onClick={(e) => { e.preventDefault(); deleteLink(link.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو رقم الإقامة أو رقم بطاقة التشغيل..."
                className="pr-9"
              />
            </div>
            <Button onClick={() => { setBulkText(""); setBulkDialog(true); }} variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />تحديث جماعي (لصق من Excel)
            </Button>
            <div className="text-sm text-muted-foreground whitespace-nowrap px-2">
              {filteredDrivers.length} / {drivers.length}
            </div>
          </div>

          {filteredDrivers.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {drivers.length === 0 ? "لا يوجد سائقون." : "لا توجد نتائج للبحث."}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredDrivers.map((d) => {
                const iqamaStatus = getExpiryStatus(d.iqama_expiry);
                const cardStatus = getExpiryStatus(d.operation_card_expiry);
                const medicalStatus = getExpiryStatus(d.medical_insurance_expiry);
                const gradient = cardGradient(iqamaStatus, cardStatus, medicalStatus);

                const fieldCls = "w-full bg-white/15 hover:bg-white/25 focus:bg-white/30 border border-white/20 rounded px-2 py-1 text-white placeholder-white/50 font-mono font-bold text-sm outline-none transition";
                return (
                  <Card key={d.id} className="group relative overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className={`${gradient} p-4 text-white relative`}>
                      <div className="relative">
                        <div className="mb-3 pr-8">
                          <input
                            defaultValue={d.name_ar || ""}
                            placeholder={d.name}
                            dir="rtl"
                            className="w-full bg-transparent border-b border-white/30 focus:border-white outline-none font-bold text-lg placeholder-white/60"
                            onBlur={(e) => updateDriverField(d.id, "name_ar", e.target.value.trim() || null)}
                          />
                          <div className="text-xs text-white/70 line-clamp-1 mt-0.5" dir="ltr">{d.name}{d.phone ? ` • ${d.phone}` : ""}</div>
                        </div>
                        <div className="space-y-2">
                          <div className="bg-white/10 backdrop-blur rounded-md p-2 space-y-1">
                            <div className="text-[10px] text-white/80 flex items-center gap-1"><IdCard className="h-3 w-3" />رقم الإقامة</div>
                            <input
                              defaultValue={d.iqama_number || ""}
                              dir="ltr"
                              inputMode="numeric"
                              className={fieldCls}
                              onBlur={(e) => updateDriverField(d.id, "iqama_number", e.target.value.trim() || null)}
                            />
                          </div>
                          <div className="bg-white/10 backdrop-blur rounded-md p-2 space-y-1">
                            <div className="text-[10px] text-white/80 flex items-center gap-1"><Calendar className="h-3 w-3" />انتهاء الإقامة</div>
                            <input
                              type="date"
                              defaultValue={d.iqama_expiry || ""}
                              className={fieldCls}
                              onBlur={(e) => updateDriverField(d.id, "iqama_expiry", e.target.value || null)}
                            />
                            <div className="text-[10px]">{iqamaStatus.label}</div>
                          </div>
                          <div className="bg-white/10 backdrop-blur rounded-md p-2 space-y-1">
                            <div className="text-[10px] text-white/80 flex items-center gap-1"><IdCard className="h-3 w-3" />رقم بطاقة التشغيل</div>
                            <input
                              defaultValue={d.operation_card_number || ""}
                              dir="ltr"
                              inputMode="numeric"
                              className={fieldCls}
                              onBlur={(e) => updateDriverField(d.id, "operation_card_number", e.target.value.trim() || null)}
                            />
                          </div>
                          <div className="bg-white/10 backdrop-blur rounded-md p-2 space-y-1">
                            <div className="text-[10px] text-white/80 flex items-center gap-1"><Calendar className="h-3 w-3" />انتهاء بطاقة التشغيل</div>
                            <input
                              type="date"
                              defaultValue={d.operation_card_expiry || ""}
                              className={fieldCls}
                              onBlur={(e) => updateDriverField(d.id, "operation_card_expiry", e.target.value || null)}
                            />
                            <div className="text-[10px]">{cardStatus.label}</div>
                          </div>
                          <div className="bg-white/10 backdrop-blur rounded-md p-2 space-y-1">
                            <div className="text-[10px] text-white/80 flex items-center gap-1"><Calendar className="h-3 w-3" />انتهاء التأمين الطبي</div>
                            <input
                              type="date"
                              defaultValue={d.medical_insurance_expiry || ""}
                              className={fieldCls}
                              onBlur={(e) => updateDriverField(d.id, "medical_insurance_expiry", e.target.value || null)}
                            />
                            <div className="text-[10px]">{medicalStatus.label}</div>
                          </div>
                          <div className="bg-white/10 backdrop-blur rounded-md p-2 space-y-1">
                            <div className="text-[10px] text-white/80 flex items-center gap-1"><IdCard className="h-3 w-3" />اسم المنشأة</div>
                            <input
                              defaultValue={d.establishment_name || ""}
                              dir="rtl"
                              className={fieldCls}
                              onBlur={(e) => updateDriverField(d.id, "establishment_name", e.target.value.trim() || null)}
                            />
                          </div>
                          <div className="bg-white/10 backdrop-blur rounded-md p-2 space-y-1">
                            <div className="text-[10px] text-white/80 flex items-center gap-1"><IdCard className="h-3 w-3" />رقم السيارة</div>
                            <input
                              defaultValue={d.vehicle_number || ""}
                              dir="ltr"
                              className={fieldCls}
                              onBlur={(e) => updateDriverField(d.id, "vehicle_number", e.target.value.trim() || null)}
                            />
                          </div>

                        </div>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={(e) => { e.stopPropagation(); clearDriverCard(d); }}
                      title="حذف بيانات البطاقة"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>


      {/* Link dialog */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingLink ? "تعديل الرابط" : "إضافة رابط"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>العنوان</Label>
              <Input value={linkForm.title} onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })} />
            </div>
            <div>
              <Label>الرابط (URL)</Label>
              <Input value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="https://example.com" dir="ltr" />
            </div>
            <div>
              <Label>وصف مختصر (اختياري)</Label>
              <Textarea value={linkForm.description} onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(false)}>إلغاء</Button>
            <Button onClick={saveLink}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Driver dialog */}
      <Dialog open={driverDialog} onOpenChange={setDriverDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>بطاقة تشغيل: {editingDriver?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اسم السائق بالعربية</Label>
              <Input value={driverForm.name_ar} onChange={(e) => setDriverForm({ ...driverForm, name_ar: e.target.value })} dir="rtl" placeholder="مثال: محمد علي" />
            </div>
            <div>
              <Label>رقم الإقامة</Label>
              <Input value={driverForm.iqama_number} onChange={(e) => setDriverForm({ ...driverForm, iqama_number: e.target.value })} inputMode="numeric" />
            </div>
            <div>
              <Label>تاريخ انتهاء الإقامة</Label>
              <Input type="date" value={driverForm.iqama_expiry} onChange={(e) => setDriverForm({ ...driverForm, iqama_expiry: e.target.value })} />
            </div>
            <div>
              <Label>رقم بطاقة التشغيل</Label>
              <Input value={driverForm.operation_card_number} onChange={(e) => setDriverForm({ ...driverForm, operation_card_number: e.target.value })} inputMode="numeric" />
            </div>
            <div>
              <Label>تاريخ انتهاء بطاقة التشغيل</Label>
              <Input type="date" value={driverForm.operation_card_expiry} onChange={(e) => setDriverForm({ ...driverForm, operation_card_expiry: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDriverDialog(false)}>إلغاء</Button>
            <Button onClick={saveDriver}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk paste dialog */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تحديث جماعي للسائقين من Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md space-y-1">
              <div className="font-semibold">طريقة الاستخدام:</div>
              <div>انسخ الأعمدة من Excel بالترتيب التالي ثم الصقها في الأسفل:</div>
              <div className="font-mono text-xs bg-background p-2 rounded">
                اسم السائق | رقم الإقامة | تاريخ انتهاء الإقامة | رقم بطاقة التشغيل | تاريخ انتهاء بطاقة التشغيل
              </div>
              <div className="text-xs">• يتم المطابقة بالاسم تماماً كما هو مسجل في النظام.</div>
              <div className="text-xs">• صيغ التاريخ المقبولة: yyyy-mm-dd أو dd/mm/yyyy أو رقم Excel.</div>
              <div className="text-xs">• الأعمدة الفارغة لن يتم تحديثها.</div>
            </div>
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={12}
              dir="ltr"
              placeholder={"محمد علي\t2123456789\t2026-12-31\t9876\t2027-06-30\nأحمد سالم\t2234567890\t30/06/2026\t8765\t15/08/2026"}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(false)} disabled={bulkBusy}>إلغاء</Button>
            <Button onClick={applyBulk} disabled={bulkBusy}>
              {bulkBusy ? "جاري التحديث..." : "تطبيق التحديث"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
