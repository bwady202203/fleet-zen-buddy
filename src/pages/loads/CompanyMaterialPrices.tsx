import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Save, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PriceRow {
  load_type_id: string;
  load_type_name: string;
  price_id?: string;
  cost_price: string;
  sale_price: string;
}

const num = (v: string) => {
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CompanyMaterialPrices = () => {
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setCompanies(data || []);
    })();
  }, []);

  const loadPrices = async (cid: string) => {
    if (!cid) return;
    setLoading(true);
    try {
      const [typesRes, pricesRes] = await Promise.all([
        supabase.from("load_types").select("id, name").eq("is_active", true).order("name"),
        (supabase as any)
          .from("company_load_type_prices")
          .select("id, load_type_id, cost_price, sale_price, unit_price")
          .eq("company_id", cid),
      ]);
      const prices = (pricesRes.data as any[]) || [];
      setRows(
        (typesRes.data || []).map((t) => {
          const p = prices.find((x) => x.load_type_id === t.id);
          return {
            load_type_id: t.id,
            load_type_name: t.name,
            price_id: p?.id,
            cost_price: p?.cost_price != null ? String(p.cost_price) : "",
            sale_price:
              p?.sale_price != null && Number(p.sale_price) !== 0
                ? String(p.sale_price)
                : p?.unit_price != null
                ? String(p.unit_price)
                : "",
          };
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) loadPrices(companyId);
    else setRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const setField = (id: string, key: "cost_price" | "sale_price", value: string) =>
    setRows((prev) => prev.map((r) => (r.load_type_id === id ? { ...r, [key]: value } : r)));

  const totals = useMemo(
    () => ({
      cost: rows.reduce((s, r) => s + num(r.cost_price), 0),
      sale: rows.reduce((s, r) => s + num(r.sale_price), 0),
    }),
    [rows]
  );

  const saveAll = async () => {
    if (!companyId) return toast.error("اختر العميل أولاً");
    setSaving(true);
    try {
      const { data: orgData } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .limit(1)
        .maybeSingle();

      const filled = rows.filter((r) => r.cost_price.trim() !== "" || r.sale_price.trim() !== "");

      for (const r of filled) {
        const payload = {
          company_id: companyId,
          load_type_id: r.load_type_id,
          cost_price: num(r.cost_price),
          sale_price: num(r.sale_price),
          unit_price: num(r.sale_price),
          is_active: true,
          organization_id: orgData?.organization_id ?? null,
        };
        if (r.price_id) {
          const { error } = await (supabase as any)
            .from("company_load_type_prices")
            .update(payload)
            .eq("id", r.price_id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any)
            .from("company_load_type_prices")
            .insert(payload);
          if (error) throw error;
        }
      }
      toast.success("تم حفظ الأسعار بنجاح");
      loadPrices(companyId);
    } catch (e: any) {
      toast.error("فشل الحفظ: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads/premium-report" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Coins className="h-6 w-6 text-primary" /> أسعار المواد لكل عميل
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                سعر تكلفة الطن وسعر بيع الطن لنفس أنواع المواد المستخدمة في تسجيل الحمولات
              </p>
            </div>
            <Button onClick={saveAll} disabled={saving || !companyId} className="mr-auto gap-2">
              <Save className="h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ الأسعار"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>اختيار العميل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>العميل</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أسعار المواد (ر.س / طن)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {!companyId ? (
              <div className="py-10 text-center text-muted-foreground">اختر العميل لعرض المواد وأسعارها</div>
            ) : loading ? (
              <div className="py-10 text-center text-muted-foreground">جاري التحميل...</div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2">م</th>
                    <th className="border p-2">المادة / نوع الحمولة</th>
                    <th className="border p-2">سعر تكلفة الطن</th>
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
      </main>
    </div>
  );
};

export default CompanyMaterialPrices;
