import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Save, Settings2, Plus, Trash2, Wrench, Users, DownloadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PriceRow {
  load_type_id: string;
  load_type_name: string;
  row_id?: string;
  cost_price: string;
  sale_price: string;
}

interface PeriodCost {
  id: string;
  cost_type: "maintenance" | "payroll";
  start_date: string;
  end_date: string;
  amount: number;
  notes: string | null;
}

const num = (v: string) => {
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DEFAULT_TON_COST = "9";

const today = () => new Date().toISOString().slice(0, 10);

const CostSettings = () => {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState<PeriodCost[]>([]);
  const [importing, setImporting] = useState(false);

  const [form, setForm] = useState<Record<"maintenance" | "payroll", { start: string; end: string; amount: string; notes: string }>>({
    maintenance: { start: today(), end: today(), amount: "", notes: "" },
    payroll: { start: today(), end: today(), amount: "", notes: "" },
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: org } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .limit(1)
        .maybeSingle();
      const organizationId = org?.organization_id ?? null;
      setOrgId(organizationId);

      const [typesRes, pricesRes, costsRes] = await Promise.all([
        supabase.from("load_types").select("id, name").eq("is_active", true).order("name"),
        (supabase as any).from("global_material_prices").select("id, load_type_id, cost_price, sale_price"),
        (supabase as any)
          .from("period_cost_entries")
          .select("id, cost_type, start_date, end_date, amount, notes")
          .order("start_date", { ascending: false }),
      ]);

      const prices = (pricesRes.data as any[]) || [];
      setRows(
        (typesRes.data || []).map((t) => {
          const p = prices.find((x) => x.load_type_id === t.id);
          return {
            load_type_id: t.id,
            load_type_name: t.name,
            row_id: p?.id,
            cost_price: p?.cost_price != null && Number(p.cost_price) > 0 ? String(p.cost_price) : DEFAULT_TON_COST,
            sale_price: p?.sale_price != null ? String(p.sale_price) : "",
          };
        })
      );
      setCosts(((costsRes.data as any[]) || []) as PeriodCost[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const setField = (id: string, key: "cost_price" | "sale_price", value: string) =>
    setRows((prev) => prev.map((r) => (r.load_type_id === id ? { ...r, [key]: value } : r)));

  const totals = useMemo(
    () => ({
      cost: rows.reduce((s, r) => s + num(r.cost_price), 0),
      sale: rows.reduce((s, r) => s + num(r.sale_price), 0),
    }),
    [rows]
  );

  const savePrices = async () => {
    setSaving(true);
    try {
      const filled = rows.filter((r) => r.cost_price.trim() !== "" || r.sale_price.trim() !== "");
      for (const r of filled) {
        const payload = {
          organization_id: orgId,
          load_type_id: r.load_type_id,
          cost_price: num(r.cost_price),
          sale_price: num(r.sale_price),
        };
        if (r.row_id) {
          const { error } = await (supabase as any)
            .from("global_material_prices")
            .update(payload)
            .eq("id", r.row_id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any).from("global_material_prices").insert(payload);
          if (error) throw error;
        }
      }
      toast.success("تم حفظ التكلفة الموحدة لكل المواد");
      loadAll();
    } catch (e: any) {
      toast.error("فشل الحفظ: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const importAvgSalePrices = async () => {
    setImporting(true);
    try {
      const { data, error } = await (supabase as any)
        .from("company_load_type_prices")
        .select("load_type_id, sale_price");
      if (error) throw error;
      const byType = new Map<string, { sum: number; count: number }>();
      for (const row of (data as any[]) || []) {
        const price = Number(row.sale_price || 0);
        if (price <= 0) continue;
        const cur = byType.get(row.load_type_id) || { sum: 0, count: 0 };
        cur.sum += price;
        cur.count += 1;
        byType.set(row.load_type_id, cur);
      }
      if (byType.size === 0) {
        toast.error("لا توجد أسعار بيع مسجلة لدى العملاء لاستيرادها");
        return;
      }
      setRows((prev) =>
        prev.map((r) => {
          const agg = byType.get(r.load_type_id);
          if (!agg) return r;
          const avg = Math.round((agg.sum / agg.count) * 100) / 100;
          return { ...r, sale_price: String(avg) };
        })
      );
      toast.success(`تم استيراد متوسط سعر البيع لـ ${byType.size} مادة — راجع القيم ثم اضغط حفظ`);
    } catch (e: any) {
      toast.error("فشل الاستيراد: " + (e?.message || ""));
    } finally {
      setImporting(false);
    }
  };

  const addCost = async (type: "maintenance" | "payroll") => {
    const f = form[type];
    if (!f.start || !f.end) return toast.error("حدد الفترة من تاريخ إلى تاريخ");
    if (num(f.amount) <= 0) return toast.error("أدخل المبلغ");
    const { error } = await (supabase as any).from("period_cost_entries").insert({
      organization_id: orgId,
      cost_type: type,
      start_date: f.start,
      end_date: f.end,
      amount: num(f.amount),
      notes: f.notes || null,
    });
    if (error) return toast.error("فشل الحفظ: " + error.message);
    toast.success("تم الحفظ");
    setForm((p) => ({ ...p, [type]: { ...p[type], amount: "", notes: "" } }));
    loadAll();
  };

  const removeCost = async (id: string) => {
    const { error } = await (supabase as any).from("period_cost_entries").delete().eq("id", id);
    if (error) return toast.error("فشل الحذف: " + error.message);
    toast.success("تم الحذف");
    setCosts((prev) => prev.filter((c) => c.id !== id));
  };

  const renderCostSection = ({
    type,
    title,
    icon: Icon,
  }: {
    type: "maintenance" | "payroll";
    title: string;
    icon: typeof Wrench;
  }) => {
    const list = costs.filter((c) => c.cost_type === type);
    const total = list.reduce((s, c) => s + Number(c.amount || 0), 0);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={form[type].start}
                onChange={(e) => setForm((p) => ({ ...p, [type]: { ...p[type], start: e.target.value } }))}
              />
            </div>
            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={form[type].end}
                onChange={(e) => setForm((p) => ({ ...p, [type]: { ...p[type], end: e.target.value } }))}
              />
            </div>
            <div className="space-y-2">
              <Label>المبلغ (ر.س)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={form[type].amount}
                dir="ltr"
                onChange={(e) => setForm((p) => ({ ...p, [type]: { ...p[type], amount: e.target.value } }))}
                className="text-center"
              />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Input
                value={form[type].notes}
                onChange={(e) => setForm((p) => ({ ...p, [type]: { ...p[type], notes: e.target.value } }))}
                placeholder="اختياري"
              />
            </div>
            <Button onClick={() => addCost(type)} className="gap-2">
              <Plus className="h-4 w-4" /> إضافة
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2">من تاريخ</th>
                  <th className="border p-2">إلى تاريخ</th>
                  <th className="border p-2">المبلغ</th>
                  <th className="border p-2">ملاحظات</th>
                  <th className="border p-2">حذف</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border p-6 text-center text-muted-foreground">
                      لا توجد تكاليف مسجلة
                    </td>
                  </tr>
                ) : (
                  list.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/50">
                      <td className="border p-2 text-center">{c.start_date}</td>
                      <td className="border p-2 text-center">{c.end_date}</td>
                      <td className="border p-2 text-center font-semibold">{fmt(Number(c.amount || 0))}</td>
                      <td className="border p-2">{c.notes || "-"}</td>
                      <td className="border p-2 text-center">
                        <Button variant="ghost" size="icon" onClick={() => removeCost(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {list.length > 0 && (
                <tfoot>
                  <tr className="bg-muted font-bold">
                    <td className="border p-2 text-center" colSpan={2}>
                      الإجمالي
                    </td>
                    <td className="border p-2 text-center">{fmt(total)}</td>
                    <td className="border p-2" colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Settings2 className="h-6 w-6 text-primary" /> إعدادات التكاليف
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                تكلفة موحدة لكل الشركات لأسعار المواد، وتكاليف الصيانة والأجور من تاريخ إلى تاريخ
              </p>
            </div>
            <Link to="/loads/general-cost-report" className="mr-auto">
              <Button variant="outline">التقرير العام للتكاليف</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="materials" className="space-y-6">
          <TabsList>
            <TabsTrigger value="materials">تكلفة المواد الموحدة</TabsTrigger>
            <TabsTrigger value="maintenance">تكلفة الصيانة</TabsTrigger>
            <TabsTrigger value="payroll">الأجور والرواتب</TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>أسعار المواد الموحدة (ر.س / طن) — تكلفة الطن الافتراضية 9 ريال</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={importAvgSalePrices} disabled={importing} className="gap-2">
                    <DownloadCloud className="h-4 w-4" />
                    {importing ? "جاري الاستيراد..." : "استيراد متوسط سعر البيع من العملاء"}
                  </Button>
                  <Button onClick={savePrices} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loading ? (
                  <div className="py-10 text-center text-muted-foreground">جاري التحميل...</div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border p-2">م</th>
                        <th className="border p-2">المادة / نوع الحمولة</th>
                        <th className="border p-2">تكلفة الطن</th>
                        <th className="border p-2">سعر بيع الطن</th>
                        <th className="border p-2">هامش الطن</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="border p-6 text-center text-muted-foreground">
                            لا توجد مواد مسجلة — أضفها من شاشة أنواع الحمولات
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, i) => {
                          const margin = num(r.sale_price) - num(r.cost_price);
                          return (
                            <tr key={r.load_type_id} className="hover:bg-muted/50">
                              <td className="border p-2 text-center">{i + 1}</td>
                              <td className="border p-2 font-medium">{r.load_type_name}</td>
                              <td className="border p-2 w-40">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={r.cost_price}
                                  onChange={(e) => setField(r.load_type_id, "cost_price", e.target.value)}
                                  placeholder="0.00"
                                  dir="ltr"
                                  className="h-9 text-center"
                                />
                              </td>
                              <td className="border p-2 w-40">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={r.sale_price}
                                  onChange={(e) => setField(r.load_type_id, "sale_price", e.target.value)}
                                  placeholder="0.00"
                                  dir="ltr"
                                  className="h-9 text-center"
                                />
                              </td>
                              <td
                                className={`border p-2 text-center font-semibold ${
                                  margin < 0 ? "text-destructive" : "text-primary"
                                }`}
                              >
                                {fmt(margin)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {rows.length > 0 && (
                      <tfoot>
                        <tr className="bg-muted font-bold">
                          <td className="border p-2 text-center" colSpan={2}>
                            الإجمالي
                          </td>
                          <td className="border p-2 text-center">{fmt(totals.cost)}</td>
                          <td className="border p-2 text-center">{fmt(totals.sale)}</td>
                          <td className="border p-2 text-center">{fmt(totals.sale - totals.cost)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            {renderCostSection({ type: "maintenance", title: "تكاليف الصيانة خلال فترة", icon: Wrench })}
          </TabsContent>

          <TabsContent value="payroll">
            {renderCostSection({ type: "payroll", title: "تكاليف الأجور والرواتب خلال فترة", icon: Users })}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CostSettings;
