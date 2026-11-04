import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Truck,
  Users,
  Hash,
  Building2,
  PackageOpen,
  Scale,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const numberFormat = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 });

const bigCards = [
  {
    title: "شحنة جديدة",
    description: "تسجيل شحنة في برنامج الصمان",
    icon: Truck,
    path: "/samman/new",
    gradient: "from-yellow-500 to-amber-700",
  },
  {
    title: "عرض الشحنات",
    description: "كل الشحنات مع الفواتير وملفات PDF",
    icon: ClipboardList,
    path: "/samman/shipments",
    gradient: "from-sky-500 to-blue-700",
  },
];

const dataCards = [
  { title: "السائقين", icon: Users, path: "/samman/data?tab=driver" },
  { title: "السريال نمبر", icon: Hash, path: "/samman/data?tab=serial" },
  { title: "الشركات", icon: Building2, path: "/samman/data?tab=company" },
  { title: "الموردين", icon: PackageOpen, path: "/samman/data?tab=supplier" },
];

const SammanDashboard = () => {
  const { currentOrganizationId } = useAuth();
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [todayWeight, setTodayWeight] = useState<number | null>(null);

  useEffect(() => {
    if (!currentOrganizationId) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("samman_shipments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", currentOrganizationId)
        .gte("entry_date", start.toISOString())
        .lte("entry_date", end.toISOString());

      const { data } = await supabase
        .from("samman_shipments")
        .select("net_weight")
        .eq("organization_id", currentOrganizationId)
        .gte("entry_date", start.toISOString())
        .lte("entry_date", end.toISOString());

      if (cancelled) return;
      setTodayCount(count ?? 0);
      setTodayWeight((data ?? []).reduce((sum, row) => sum + Number(row.net_weight ?? 0), 0));
    })();

    return () => {
      cancelled = true;
    };
  }, [currentOrganizationId]);

  const today = new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5" dir="rtl">
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-l from-amber-500 via-amber-600 to-yellow-700 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-100">برنامج الصمان</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">لوحة الصمان</h1>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
              <CalendarDays className="h-4 w-4" />
              <span>{today}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="flex items-center gap-2 text-xs font-bold text-amber-100">
                <ClipboardList className="h-4 w-4" /> شحنات اليوم
              </p>
              <p className="mt-1 text-2xl font-extrabold">
                {todayCount === null ? "…" : numberFormat.format(todayCount)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="flex items-center gap-2 text-xs font-bold text-amber-100">
                <Scale className="h-4 w-4" /> وزن اليوم (كجم)
              </p>
              <p className="mt-1 text-2xl font-extrabold">
                {todayWeight === null ? "…" : numberFormat.format(todayWeight)}
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {bigCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.path}
                to={card.path}
                className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="h-7 w-7" />
                </span>
                <h2 className="mt-4 text-xl font-extrabold text-foreground">{card.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
              </Link>
            );
          })}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-extrabold text-foreground">بيانات الكسارة</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {dataCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.path}
                  to={card.path}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-3 py-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold text-foreground">{card.title}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SammanDashboard;
