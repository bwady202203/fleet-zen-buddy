import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, ExternalLink, Edit, Trash2, Link2, IdCard, Calendar } from "lucide-react";
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
  phone?: string | null;
  iqama_number?: string | null;
  iqama_expiry?: string | null;
  operation_card_expiry?: string | null;
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

export default function AdminPanel() {
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [linkDialog, setLinkDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);
  const [linkForm, setLinkForm] = useState({ title: "", url: "", description: "" });

  const [driverDialog, setDriverDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverForm, setDriverForm] = useState({ iqama_number: "", iqama_expiry: "", operation_card_expiry: "" });

  const load = async () => {
    const [l, d] = await Promise.all([
      (supabase as any).from("useful_links").select("*").order("created_at", { ascending: false }),
      supabase.from("drivers").select("id, name, phone, iqama_number, iqama_expiry, operation_card_expiry").eq("is_active", true).order("name"),
    ]);
    if (!l.error) setLinks(l.data || []);
    if (!d.error) setDrivers((d.data as any) || []);
  };

  useEffect(() => { load(); }, []);

  const openNewLink = () => {
    setEditingLink(null);
    setLinkForm({ title: "", url: "", description: "" });
    setLinkDialog(true);
  };

  const openEditLink = (l: UsefulLink) => {
    setEditingLink(l);
    setLinkForm({ title: l.title, url: l.url, description: l.description || "" });
    setLinkDialog(true);
  };

  const saveLink = async () => {
    if (!linkForm.title.trim() || !linkForm.url.trim()) {
      toast.error("العنوان والرابط مطلوبان");
      return;
    }
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
    toast.success("تم الحذف");
    load();
  };

  const openEditDriver = (d: Driver) => {
    setEditingDriver(d);
    setDriverForm({
      iqama_number: d.iqama_number || "",
      iqama_expiry: d.iqama_expiry || "",
      operation_card_expiry: d.operation_card_expiry || "",
    });
    setDriverDialog(true);
  };

  const saveDriver = async () => {
    if (!editingDriver) return;
    const { error } = await supabase
      .from("drivers")
      .update({
        iqama_number: driverForm.iqama_number.trim() || null,
        iqama_expiry: driverForm.iqama_expiry || null,
        operation_card_expiry: driverForm.operation_card_expiry || null,
      } as any)
      .eq("id", editingDriver.id);
    if (error) { toast.error("فشل الحفظ"); return; }
    toast.success("تم الحفظ");
    setDriverDialog(false);
    load();
  };

  const getExpiryStatus = (expiry?: string | null) => {
    if (!expiry) return { color: "from-slate-400 to-slate-600", label: "غير محدد", days: null };
    const days = differenceInDays(parseISO(expiry), new Date());
    if (days < 0) return { color: "from-red-600 to-red-800", label: `منتهية منذ ${Math.abs(days)} يوم`, days };
    if (days <= 30) return { color: "from-red-500 to-orange-600", label: `${days} يوم متبقي`, days };
    if (days <= 90) return { color: "from-amber-500 to-amber-700", label: `${days} يوم متبقي`, days };
    return { color: "from-emerald-500 to-emerald-700", label: `${days} يوم متبقي`, days };
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
        <TabsContent value="drivers" className="mt-4">
          {drivers.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">لا يوجد سائقون.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {drivers.map((d) => {
                const status = getExpiryStatus(d.iqama_expiry);
                return (
                  <Card key={d.id} className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer" onClick={() => openEditDriver(d)}>
                    <div className={`bg-gradient-to-br ${status.color} p-4 text-white aspect-square flex flex-col justify-between`}>
                      <div>
                        <div className="font-bold text-lg line-clamp-1">{d.name}</div>
                        {d.phone && <div className="text-xs text-white/80">{d.phone}</div>}
                      </div>
                      <div className="space-y-2">
                        <div className="bg-white/20 backdrop-blur rounded-md p-2">
                          <div className="text-[10px] text-white/80 flex items-center gap-1"><IdCard className="h-3 w-3" />رقم الإقامة</div>
                          <div className="font-mono font-bold text-base">{d.iqama_number || "—"}</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur rounded-md p-2">
                          <div className="text-[10px] text-white/80 flex items-center gap-1"><Calendar className="h-3 w-3" />تاريخ الانتهاء</div>
                          <div className="font-mono font-bold text-sm">
                            {d.iqama_expiry ? format(parseISO(d.iqama_expiry), "yyyy/MM/dd") : "—"}
                          </div>
                          <div className="text-[10px] mt-0.5">{status.label}</div>
                        </div>
                      </div>
                    </div>
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
              <Label>رقم الإقامة</Label>
              <Input value={driverForm.iqama_number} onChange={(e) => setDriverForm({ ...driverForm, iqama_number: e.target.value })} inputMode="numeric" />
            </div>
            <div>
              <Label>تاريخ انتهاء الإقامة</Label>
              <Input type="date" value={driverForm.iqama_expiry} onChange={(e) => setDriverForm({ ...driverForm, iqama_expiry: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDriverDialog(false)}>إلغاء</Button>
            <Button onClick={saveDriver}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
