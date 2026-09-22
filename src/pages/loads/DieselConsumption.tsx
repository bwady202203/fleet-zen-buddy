import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Check, ChevronsUpDown, Fuel, Printer, Save, Search, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DieselRecord {
  id: string;
  date: string;
  driver_id: string | null;
  liters: number | null;
  amount: number | null;
  notes: string | null;
  drivers?: { name: string } | null;
}

interface LoadRow {
  date: string;
  driver_id: string | null;
  quantity: number | null;
  delivery_from: string | null;
  delivery_to: string | null;
  drivers: { name: string } | null;
}

const normalizePoint = (v?: string | null) =>
  (v || "")
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىئ]/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface DriverOption {
  id: string;
  name: string;
}

const DriverCombobox = ({
  value,
  onChange,
  options,
  placeholder = "اختر السائق",
  includeAll = false,
  allLabel = "كل السائقين",
}: {
  value: string;
  onChange: (v: string) => void;
  options: DriverOption[];
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
}) => {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    (includeAll && value === "all" ? allLabel : options.find((o) => o.id === value)?.name) || placeholder;

  const allItem: DriverOption[] = includeAll ? [{ id: "all", name: allLabel }] : [];
  const items = [...allItem, ...options];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {selectedLabel}
          <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(val, search) => {
            const name = val.split("|")[1] || "";
            const term = normalizePoint(search);
            const target = normalizePoint(name);
            if (!term) return 1;
            return target.includes(term) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="ابحث بالحروف..." />
          <CommandList>
            <CommandEmpty>لا يوجد سائق بهذا الاسم</CommandEmpty>
            <CommandGroup>
              {items.map((item) => {
                const isSelected = value === item.id;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.id}|${item.name}`}
                    onSelect={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                    />
                    {item.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const DieselConsumption = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [records, setRecords] = useState<DieselRecord[]>([]);
  const [loads, setLoads] = useState<LoadRow[]>([]);
  const [distances, setDistances] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState("شركة الحمولات");

  // form
  const [date, setDate] = useState(today);
  const [driverId, setDriverId] = useState("");
  const [liters, setLiters] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // report filters
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [filterDriver, setFilterDriver] = useState("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [driversRes, settingsRes, distRes] = await Promise.all([
        supabase.from("drivers").select("id, name").eq("is_active", true).order("name"),
        supabase.from("company_settings").select("company_name").limit(1).maybeSingle(),
        (supabase as any).from("route_distances").select("from_location, to_location, distance_km"),
      ]);
      setDrivers(driversRes.data || []);
      if (settingsRes.data?.company_name) setCompanyName(settingsRes.data.company_name);
      setDistances(distRes.data || []);
      loadRecords();
      fetchReport();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRecords = async () => {
    const { data } = await (supabase as any)
      .from("diesel_records")
      .select("id, date, driver_id, liters, amount, notes, drivers(name)")
      .order("date", { ascending: false })
      .limit(200);
    setRecords((data as DieselRecord[]) || []);
  };

  const saveRecord = async () => {
    if (!driverId) return toast.error("اختر السائق");
    const l = Number(liters) || 0;
    const a = Number(amount) || 0;
    if (l <= 0 && a <= 0) return toast.error("أدخل كمية الديزل أو المبلغ");
    setSaving(true);
    try {
      const { data: orgData } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .limit(1)
        .maybeSingle();
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("diesel_records").insert({
        date,
        driver_id: driverId,
        liters: l,
        amount: a,
        notes: notes.trim() || null,
        organization_id: orgData?.organization_id ?? null,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
      toast.success("تم تسجيل استهلاك الديزل");
      setLiters("");
      setAmount("");
      setNotes("");
      loadRecords();
      fetchReport();
    } catch (e: any) {
      toast.error(e.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id: string) => {
    const { error } = await (supabase as any).from("diesel_records").delete().eq("id", id);
    if (error) return toast.error("فشل الحذف");
    toast.success("تم الحذف");
    loadRecords();
    fetchReport();
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const all: LoadRow[] = [];
      const pageSize = 1000;
      for (let page = 0; page < 20; page++) {
        const { data, error } = await (supabase as any)
          .from("loads")
          .select("date, driver_id, quantity, delivery_from, delivery_to, drivers(name)")
          .gte("date", fromDate)
          .lte("date", toDate)
          .order("date", { ascending: true })
          .range(page * pageSize, page * pageSize + pageSize - 1);
        if (error) throw error;
        const batch = (data as LoadRow[]) || [];
        all.push(...batch);
        if (batch.length < pageSize) break;
      }
      setLoads(all);
    } catch (e: any) {
      toast.error(e.message || "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const distanceMap = useMemo(() => {
    const map = new Map<string, number>();
    distances.forEach((d) => {
      const a = normalizePoint(d.from_location);
      const b = normalizePoint(d.to_location);
      const km = Number(d.distance_km) || 0;
      map.set(`${a}|${b}`, km);
      if (!map.has(`${b}|${a}`)) map.set(`${b}|${a}`, km);
    });
    return map;
  }, [distances]);

  const distanceFor = (from?: string | null, to?: string | null) =>
    distanceMap.get(`${normalizePoint(from)}|${normalizePoint(to)}`) ?? 0;

  const reportRows = useMemo(() => {
    const map = new Map<
      string,
      { date: string; driverId: string; driver: string; km: number; tons: number; liters: number; amount: number }
    >();
    const keyOf = (d: string, id: string | null) => `${d}|${id || "-"}`;
    const ensure = (d: string, id: string | null, name: string) => {
      const k = keyOf(d, id);
      if (!map.has(k))
        map.set(k, { date: d, driverId: id || "-", driver: name || "—", km: 0, tons: 0, liters: 0, amount: 0 });
      return map.get(k)!;
    };

    loads.forEach((l) => {
      if (filterDriver !== "all" && l.driver_id !== filterDriver) return;
      const row = ensure(l.date, l.driver_id, l.drivers?.name || "—");
      row.km += distanceFor(l.delivery_from, l.delivery_to);
      row.tons += Number(l.quantity) || 0;
    });

    records.forEach((r) => {
      if (r.date < fromDate || r.date > toDate) return;
      if (filterDriver !== "all" && r.driver_id !== filterDriver) return;
      const row = ensure(r.date, r.driver_id, r.drivers?.name || "—");
      row.liters += Number(r.liters) || 0;
      row.amount += Number(r.amount) || 0;
    });

    return Array.from(map.values()).sort(
      (a, b) => a.date.localeCompare(b.date) || a.driver.localeCompare(b.driver)
    );
  }, [loads, records, filterDriver, fromDate, toDate, distanceMap]);

  const totals = useMemo(
    () => ({
      km: reportRows.reduce((s, r) => s + r.km, 0),
      tons: reportRows.reduce((s, r) => s + r.tons, 0),
      liters: reportRows.reduce((s, r) => s + r.liters, 0),
      amount: reportRows.reduce((s, r) => s + r.amount, 0),
    }),
    [reportRows]
  );

  const handlePrint = () => window.print();

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Fuel className="h-8 w-8 text-primary" />
            استهلاك الديزل
          </h1>
          <p className="text-muted-foreground mt-1">
            تسجيل كمية الديزل أو المبلغ لكل سائق، وتقرير بالكيلومترات والأطنان المنقولة
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowRight className="h-4 w-4 ml-2" />
          رجوع
        </Button>
      </div>

      <Tabs defaultValue="entry" dir="rtl">
        <TabsList className="no-print">
          <TabsTrigger value="entry">تسجيل الديزل</TabsTrigger>
          <TabsTrigger value="report">تقرير الاستهلاك</TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="space-y-6">
          <Card className="no-print">
            <CardHeader>
              <CardTitle>تسجيل جديد</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>السائق</Label>
                <DriverCombobox
                  value={driverId}
                  onChange={setDriverId}
                  options={drivers}
                  placeholder="اختر السائق"
                />
              </div>
              <div className="space-y-2">
                <Label>كمية الديزل (لتر)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>المبلغ (ريال)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري" />
              </div>
              <div className="md:col-span-5">
                <Button onClick={saveRecord} disabled={saving} size="lg">
                  <Save className="h-4 w-4 ml-2" />
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="no-print">
            <CardHeader>
              <CardTitle>آخر السجلات</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-muted">
                  <tr>
                    <th className="border p-2">التاريخ</th>
                    <th className="border p-2">السائق</th>
                    <th className="border p-2">اللترات</th>
                    <th className="border p-2">المبلغ</th>
                    <th className="border p-2">ملاحظات</th>
                    <th className="border p-2">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        لا توجد سجلات بعد
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/40">
                        <td className="border p-2 text-center">{r.date}</td>
                        <td className="border p-2 text-center">{r.drivers?.name || "—"}</td>
                        <td className="border p-2 text-center">{fmt(Number(r.liters) || 0)}</td>
                        <td className="border p-2 text-center">{fmt(Number(r.amount) || 0)}</td>
                        <td className="border p-2 text-center">{r.notes || "—"}</td>
                        <td className="border p-2 text-center">
                          <Button variant="ghost" size="icon" onClick={() => deleteRecord(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-6">
          <Card className="no-print">
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end pt-6">
              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>السائق</Label>
                <DriverCombobox
                  value={filterDriver}
                  onChange={setFilterDriver}
                  options={drivers}
                  placeholder="كل السائقين"
                  includeAll
                  allLabel="كل السائقين"
                />
              </div>
              <Button onClick={fetchReport} disabled={loading}>
                <Search className="h-4 w-4 ml-2" />
                {loading ? "جاري التحميل..." : "عرض التقرير"}
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
            </CardContent>
          </Card>

          <div className="print-area bg-card p-6 rounded-lg border">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold">{companyName}</h2>
              <p className="font-semibold">تقرير استهلاك الديزل والكيلومترات</p>
              <p className="text-sm text-muted-foreground">
                من {fromDate} إلى {toDate}
              </p>
            </div>
            <table className="w-full text-sm border">
              <thead className="bg-muted">
                <tr>
                  <th className="border p-2">التاريخ</th>
                  <th className="border p-2">السائق</th>
                  <th className="border p-2">الكيلومترات</th>
                  <th className="border p-2">الأطنان</th>
                  <th className="border p-2">الديزل (لتر)</th>
                  <th className="border p-2">مبلغ الديزل</th>
                  <th className="border p-2">لتر / 100 كم</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      لا توجد بيانات في الفترة المحددة
                    </td>
                  </tr>
                ) : (
                  reportRows.map((r) => (
                    <tr key={`${r.date}-${r.driverId}`} className="hover:bg-muted/40">
                      <td className="border p-2 text-center">{r.date}</td>
                      <td className="border p-2 text-center">{r.driver}</td>
                      <td className="border p-2 text-center">{fmt(r.km)}</td>
                      <td className="border p-2 text-center">{fmt(r.tons)}</td>
                      <td className="border p-2 text-center">{fmt(r.liters)}</td>
                      <td className="border p-2 text-center">{fmt(r.amount)}</td>
                      <td className="border p-2 text-center">
                        {r.km > 0 ? fmt((r.liters / r.km) * 100) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {reportRows.length > 0 && (
                <tfoot className="bg-muted font-bold">
                  <tr>
                    <td className="border p-2 text-center" colSpan={2}>
                      الإجمالي
                    </td>
                    <td className="border p-2 text-center">{fmt(totals.km)}</td>
                    <td className="border p-2 text-center">{fmt(totals.tons)}</td>
                    <td className="border p-2 text-center">{fmt(totals.liters)}</td>
                    <td className="border p-2 text-center">{fmt(totals.amount)}</td>
                    <td className="border p-2 text-center">
                      {totals.km > 0 ? fmt((totals.liters / totals.km) * 100) : "—"}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .no-print { display: none !important; }
          .print-area { position: absolute; inset: 0; border: none !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>
    </div>
  );
};

export default DieselConsumption;
