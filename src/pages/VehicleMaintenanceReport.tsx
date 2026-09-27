import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, Printer, Truck, ClipboardList, CheckCircle2, CalendarDays,
  Hash, Gauge, FileText, Wrench, BadgeCheck, Flag, StickyNote
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type OrderRow = {
  id: string;
  vehicle_id: string;
  description: string | null;
  priority: string;
  status: string;
  cost: number | null;
  created_at: string;
  completed_date: string | null;
};

type VehicleRow = { id: string; model: string | null; license_plate: string | null };
type CostItem = { id: string; item_name: string; quantity: number; unit_price: number; total_price: number };

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "قيد الانتظار", className: "bg-slate-100 text-slate-600 border-slate-200" },
  in_progress: { label: "قيد التنفيذ", className: "bg-sky-50 text-sky-700 border-sky-200" },
  completed: { label: "مكتمل", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "ملغي", className: "bg-red-50 text-red-600 border-red-200" },
};

const priorityLabels: Record<string, { label: string; className: string }> = {
  low: { label: "منخفض", className: "bg-slate-50 text-slate-600 border-slate-200" },
  medium: { label: "متوسط", className: "bg-amber-50 text-amber-700 border-amber-200" },
  high: { label: "عالي", className: "bg-orange-50 text-orange-700 border-orange-200" },
  urgent: { label: "عاجل", className: "bg-red-50 text-red-700 border-red-200" },
};

const fmt = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const VehicleMaintenanceReport = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramId = searchParams.get("order");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [items, setItems] = useState<CostItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async (id: string) => {
    setLoading(true);
    const { data: order } = await supabase
      .from("maintenance_requests")
      .select("id, vehicle_id, description, priority, status, cost, created_at, completed_date")
      .eq("id", id)
      .maybeSingle();
    if (!order) { setLoading(false); return; }
    const [{ data: veh }, { data: its }] = await Promise.all([
      supabase.from("vehicles").select("id, model, license_plate").eq("id", order.vehicle_id).maybeSingle(),
      supabase
        .from("maintenance_cost_items")
        .select("id, item_name, quantity, unit_price, total_price")
        .eq("maintenance_request_id", id)
        .order("created_at", { ascending: true }),
    ]);
    setVehicle(veh || null);
    setItems(its || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      if (paramId) { await loadReport(paramId); return; }
      const { data: list } = await supabase
        .from("maintenance_requests")
        .select("id, vehicle_id, description, priority, status, cost, created_at, completed_date")
        .order("created_at", { ascending: false })
        .limit(200);
      const l = list || [];
      setOrders(l);
      if (l.length > 0) {
        setSearchParams({ order: l[0].id }, { replace: true });
      } else {
        setLoading(false);
      }
    })();
  }, [paramId, loadReport, setSearchParams]);

  const order = orders.find((o) => o.id === paramId) || null;
  const total = (order?.cost ?? items.reduce((s, it) => s + Number(it.total_price || 0), 0)) || 0;
  const st = statusLabels[order?.status || "pending"] || statusLabels.pending;
  const pr = priorityLabels[order?.priority || "medium"] || priorityLabels.medium;
  const reportNo = paramId ? `MR-${paramId.replace(/-/g, "").slice(0, 8).toUpperCase()}` : "—";
  const reportDate = fmtDate(order?.completed_date || order?.created_at || null);

  const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50/80 border border-slate-100 px-4 py-3">
      <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400 mb-0.5">{label}</p>
        <div className="text-sm font-bold text-slate-800 leading-relaxed break-words">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar (screen only) */}
      <div className="print:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="max-w-[960px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="sm" className="rounded-xl text-slate-600">
              <Link to="/maintenance-orders-report"><ArrowRight className="h-4 w-4 ml-1" />العودة</Link>
            </Button>
            {orders.length > 0 && (
              <Select
                value={paramId || undefined}
                onValueChange={(v) => setSearchParams({ order: v })}
              >
                <SelectTrigger className="w-[280px] rounded-xl border-slate-200 bg-white text-sm">
                  <SelectValue placeholder="اختر أمر الصيانة" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {fmtDate(o.created_at)} — أمر صيانة #{o.id.slice(0, 6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button
            onClick={() => window.print()}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Printer className="h-4 w-4 ml-2" />طباعة / PDF
          </Button>
        </div>
      </div>

      {/* Report sheet */}
      <div className="print:max-w-full max-w-[960px] mx-auto px-3 sm:px-4 py-6 print:p-0 print:py-0">
        <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(15,23,42,0.07)] print:shadow-none print:rounded-none border border-slate-200/70 print:border-0 overflow-hidden">
          {/* ===== Report header ===== */}
          <div className="relative bg-gradient-to-l from-emerald-700 via-emerald-600 to-emerald-500 text-white px-6 sm:px-8 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-sm">
                  <Truck className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">تقرير صيانة مركبة</h1>
                  <p className="text-emerald-50/90 text-xs sm:text-sm mt-1">شركة رمال — نظام إدارة الأسطول والمركبات</p>
                </div>
              </div>
              <div className="hidden sm:block text-left" dir="ltr">
                <p className="text-emerald-50/90 text-[11px] font-medium">REPORT NO.</p>
                <p className="font-bold text-sm tracking-wide">{reportNo}</p>
                <p className="text-emerald-50/90 text-[11px] mt-1">{reportDate}</p>
              </div>
            </div>
          </div>

          {/* ===== Vehicle info ===== */}
          <div className="px-5 sm:px-8 py-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-extrabold text-slate-700">بيانات المركبة وأمر الصيانة</h2>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400 text-sm">جارٍ تحميل بيانات أمر الصيانة…</div>
            ) : !order ? (
              <div className="py-16 text-center text-slate-400 text-sm">لا يوجد أمر صيانة لعرضه.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <InfoItem icon={Truck} label="المركبة" value={vehicle?.model || "—"} />
                  <InfoItem icon={Hash} label="رقم اللوحة" value={<span dir="rtl">{vehicle?.license_plate || "—"}</span>} />
                  <InfoItem icon={CalendarDays} label="التاريخ" value={reportDate} />
                  <InfoItem
                    icon={BadgeCheck}
                    label="الحالة"
                    value={
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${st.className}`}>
                        {order.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {st.label}
                      </span>
                    }
                  />
                  <InfoItem
                    icon={Flag}
                    label="الأولوية"
                    value={
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${pr.className}`}>
                        {pr.label}
                      </span>
                    }
                  />
                  <InfoItem icon={Gauge} label="التكلفة المسجلة" value={<span>{fmt(order.cost)} <span className="text-xs font-medium text-slate-400">ر.س</span></span>} />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
                  <p className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />الوصف
                  </p>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
                    {order.description || "—"}
                  </p>
                </div>

                {/* ===== Parts & services table ===== */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-extrabold text-slate-700">قطع الغيار والخدمات المستخدمة</h2>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                    <table className="w-full text-sm">
                      <colgroup>
                        <col className="w-[52%]" />
                        <col className="w-[14%]" />
                        <col className="w-[17%]" />
                        <col className="w-[17%]" />
                      </colgroup>
                      <thead>
                        <tr className="bg-emerald-600/95 text-white">
                          <th className="text-right font-bold px-4 py-3">القطعة</th>
                          <th className="text-center font-bold px-3 py-3">الكمية</th>
                          <th className="text-center font-bold px-3 py-3">السعر</th>
                          <th className="text-center font-bold px-3 py-3">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr className="border-t border-slate-100">
                            <td colSpan={4} className="text-center text-slate-400 py-8">لا توجد قطع غيار أو خدمات مسجلة</td>
                          </tr>
                        ) : (
                          items.map((it, i) => (
                            <tr key={it.id} className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50/60" : "bg-white"}`}>
                              <td className="text-right font-semibold text-slate-700 px-4 py-3">{it.item_name}</td>
                              <td className="text-center text-slate-600 px-3 py-3">{fmt(it.quantity)}</td>
                              <td className="text-center text-slate-600 px-3 py-3">{fmt(it.unit_price)} <span className="text-[10px] text-slate-400">ر.س</span></td>
                              <td className="text-center font-bold text-slate-700 px-3 py-3">{fmt(it.total_price)} <span className="text-[10px] font-normal text-slate-400">ر.س</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Final total card */}
                  <div className="mt-4 rounded-xl bg-gradient-to-l from-emerald-700 to-emerald-500 text-white px-5 py-4 flex items-center justify-between shadow-[0_4px_14px_-4px_rgba(5,150,105,0.45)]">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-5 w-5" />
                      <span className="font-extrabold text-base">الإجمالي النهائي</span>
                    </div>
                    <div className="flex items-baseline gap-2" dir="rtl">
                      <span className="text-2xl font-extrabold tracking-tight">{fmt(total)}</span>
                      <span className="text-sm font-bold text-emerald-50/90">ر.س</span>
                    </div>
                  </div>
                </div>

                {/* ===== Notes ===== */}
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 px-4 py-3 min-h-[72px]">
                  <p className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" />ملاحظات
                  </p>
                  <p className="text-xs text-slate-400">—</p>
                </div>

                {/* ===== Signatures ===== */}
                <div className="grid grid-cols-3 gap-6 sm:gap-10 pt-6 pb-2">
                  {["فني الصيانة", "مسؤول الأسطول", "المدير المختص"].map((role) => (
                    <div key={role} className="text-center">
                      <div className="h-10" />
                      <div className="border-t-2 border-slate-300 mx-4" />
                      <p className="text-[11px] font-bold text-slate-500 mt-2">{role}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">الاسم والتوقيع</p>
                    </div>
                  ))}
                </div>

                <p className="text-center text-[10px] text-slate-300 pb-2">
                  تم إصدار هذا التقرير إلكترونيًا من نظام إدارة أسطول شركة رمال — {reportDate}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleMaintenanceReport;
