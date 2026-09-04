import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { usePermissions } from "@/contexts/PermissionsContext";
import {
  ADVANCE_STATUS_CLASSES,
  ADVANCE_STATUS_LABELS,
  ADVANCE_TYPE_LABELS,
  AdvanceRecord,
  AdvanceStatus,
  InstallmentRecord,
  formatDateAr,
  formatMoneySar,
} from "@/lib/advances";
import {
  useAdvanceEmployees,
  useAdvanceMutations,
  useAdvancesList,
  useAdvancesStats,
} from "@/hooks/useAdvances";
import { supabase } from "@/integrations/supabase/client";
import AdvanceFormDialog from "@/components/hr/advances/AdvanceFormDialog";
import AdvanceDetailsDialog from "@/components/hr/advances/AdvanceDetailsDialog";
import AdvanceVoucherPreview from "@/components/hr/advances/AdvanceVoucherPreview";

const PAGE_SIZE = 15;

const useDebounced = (value: string, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useMemo(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const Advances = () => {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("hr", "create");
  const canApprove = hasPermission("hr", "edit");
  const canCancel = hasPermission("hr", "delete");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [department, setDepartment] = useState("all");
  const [advanceType, setAdvanceType] = useState("all");
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<AdvanceRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [preview, setPreview] = useState<{
    advance: AdvanceRecord;
    installments: InstallmentRecord[];
  } | null>(null);

  // debounce بسيط للبحث
  useMemo(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const filters = {
    search: debouncedSearch,
    status,
    department,
    advanceType,
    month,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isFetching } = useAdvancesList(filters);
  const { data: stats } = useAdvancesStats();
  const { data: employees } = useAdvanceEmployees();
  const { createAdvance } = useAdvanceMutations();

  const departments = useMemo(
    () => Array.from(new Set((employees ?? []).map((e) => e.department).filter(Boolean))),
    [employees]
  );

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const openPreview = async (advance: AdvanceRecord) => {
    const { data: inst } = await supabase
      .from("advance_installments")
      .select("*")
      .eq("advance_id", advance.id)
      .order("installment_number", { ascending: true });
    setPreview({ advance, installments: (inst ?? []) as unknown as InstallmentRecord[] });
  };

  const statCards = [
    { label: "إجمالي السلف", value: String(stats?.totalCount ?? 0), hint: formatMoneySar(stats?.totalAmount ?? 0) },
    { label: "السلف النشطة", value: String(stats?.activeCount ?? 0), hint: "قيد السداد" },
    { label: "السلف المسددة", value: String(stats?.completedCount ?? 0), hint: formatMoneySar(stats?.totalPaid ?? 0) },
    { label: "إجمالي المتبقي", value: formatMoneySar(stats?.totalRemaining ?? 0), hint: "على الموظفين" },
    { label: "أقساط هذا الشهر", value: formatMoneySar(stats?.dueThisMonth ?? 0), hint: "مستحقة للخصم" },
    { label: "أقساط متأخرة", value: String(stats?.lateCount ?? 0), hint: "تجاوزت الاستحقاق" },
  ];

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/hr" className="text-sky-700 transition-colors hover:text-sky-900">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-sky-900 md:text-3xl">سندات السلف</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  إدارة سلف الموظفين ومتابعة الأقساط والخصومات
                </p>
              </div>
            </div>
            {canCreate && (
              <Button className="gap-2 bg-sky-600 hover:bg-sky-700" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> سند سلفة جديد
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-5 px-4 py-6">
        {/* الإحصائيات السريعة */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map((c) => (
            <Card key={c.label} className="border-sky-100 bg-white">
              <CardContent className="p-4">
                <div className="text-xs text-sky-700">{c.label}</div>
                <div className="mt-1 text-lg font-bold text-slate-800">{c.value}</div>
                <div className="text-[11px] text-muted-foreground">{c.hint}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* البحث والفلاتر */}
        <Card className="border-sky-100">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث برقم السند أو اسم الموظف أو رقم الموظف..."
                className="pr-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Input
              type="month"
              className="w-[160px]"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(0);
              }}
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {(Object.keys(ADVANCE_STATUS_LABELS) as AdvanceStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {ADVANCE_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={department}
              onValueChange={(v) => {
                setDepartment(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأقسام</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={advanceType}
              onValueChange={(v) => {
                setAdvanceType(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="نوع السلفة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                {Object.entries(ADVANCE_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setDepartment("all");
                setAdvanceType("all");
                setMonth("");
                setPage(0);
              }}
            >
              إعادة تعيين
            </Button>
          </CardContent>
        </Card>

        {/* قائمة السندات */}
        <Card className="border-sky-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-sky-900">
              <FileText className="h-4 w-4" /> سجل السلف
              <span className="text-xs font-normal text-muted-foreground">
                ({data?.total ?? 0} سند)
              </span>
            </CardTitle>
            {isFetching && !isLoading ? (
              <span className="text-xs text-muted-foreground">جارٍ التحديث...</span>
            ) : null}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : (data?.rows.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <Wallet className="h-10 w-10 text-sky-300" />
                <div className="font-semibold text-slate-700">لا توجد سندات سلف</div>
                <p className="max-w-sm text-sm text-muted-foreground">
                  ابدأ بإنشاء سند سلفة جديد، وسيتم توليد جدول الأقساط تلقائيًا وربطه بكشف الرواتب بعد
                  الاعتماد.
                </p>
                {canCreate && (
                  <Button className="gap-2 bg-sky-600 hover:bg-sky-700" onClick={() => setFormOpen(true)}>
                    <Plus className="h-4 w-4" /> سند سلفة جديد
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-sky-100">
                  <table className="w-full text-sm">
                    <thead className="bg-sky-50/70 text-sky-900">
                      <tr>
                        <th className="px-3 py-2 text-right">رقم السند</th>
                        <th className="px-3 py-2 text-right">التاريخ</th>
                        <th className="px-3 py-2 text-right">الموظف</th>
                        <th className="px-3 py-2 text-right">القسم</th>
                        <th className="px-3 py-2 text-right">النوع</th>
                        <th className="px-3 py-2 text-right">المبلغ</th>
                        <th className="px-3 py-2 text-right">القسط</th>
                        <th className="px-3 py-2 text-right">المسدد</th>
                        <th className="px-3 py-2 text-right">المتبقي</th>
                        <th className="px-3 py-2 text-right">الحالة</th>
                        <th className="px-3 py-2 text-right">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data!.rows.map((a) => (
                        <tr
                          key={a.id}
                          className="cursor-pointer border-t border-sky-50 transition-colors hover:bg-sky-50/40"
                          onClick={() => {
                            setSelected(a);
                            setDetailsOpen(true);
                          }}
                        >
                          <td className="px-3 py-2 font-medium text-sky-800">{a.advance_number}</td>
                          <td className="px-3 py-2">{formatDateAr(a.advance_date)}</td>
                          <td className="px-3 py-2">{a.employee_name}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{a.department || "-"}</td>
                          <td className="px-3 py-2 text-xs">
                            {ADVANCE_TYPE_LABELS[a.advance_type] ?? a.advance_type}
                          </td>
                          <td className="px-3 py-2">{formatMoneySar(a.amount)}</td>
                          <td className="px-3 py-2">{formatMoneySar(a.installment_amount)}</td>
                          <td className="px-3 py-2">{formatMoneySar(a.paid_amount)}</td>
                          <td className="px-3 py-2 font-semibold">{formatMoneySar(a.remaining_amount)}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={ADVANCE_STATUS_CLASSES[a.status]}>
                              {ADVANCE_STATUS_LABELS[a.status]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 border-sky-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPreview(a);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" /> معاينة
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    صفحة {page + 1} من {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* لوحة تقارير السلف */}
        <Card className="border-sky-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-sky-900">
              <BarChart3 className="h-4 w-4" /> تقارير وإحصائيات السلف
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {[
              { title: "أكثر الموظفين حصولًا على سلف", rows: stats?.topEmployees ?? [] },
              { title: "إجمالي السلف حسب الشهر", rows: stats?.byMonth ?? [] },
              { title: "إجمالي السلف حسب القسم", rows: stats?.byDepartment ?? [] },
            ].map((block) => (
              <div key={block.title} className="rounded-lg border border-sky-100 p-3">
                <div className="mb-2 text-sm font-semibold text-sky-900">{block.title}</div>
                {block.rows.length === 0 ? (
                  <div className="text-xs text-muted-foreground">لا توجد بيانات</div>
                ) : (
                  <div className="space-y-1.5">
                    {block.rows.map((r) => (
                      <div key={r.label} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{r.label}</span>
                        <span className="font-semibold text-slate-800">{formatMoneySar(r.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      <AdvanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={createAdvance.isPending}
        canApprove={canApprove}
        onSubmit={async (input) => {
          try {
            const created = await createAdvance.mutateAsync(input);
            toast({ title: `تم إنشاء السند ${created.advance_number}` });
            setFormOpen(false);
            openPreview(created);
          } catch (e) {
            toast({
              title: "فشل إنشاء السند",
              description: e instanceof Error ? e.message : undefined,
              variant: "destructive",
            });
          }
        }}
      />

      <AdvanceDetailsDialog
        advance={selected}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onPreview={(advance, installments) => setPreview({ advance, installments })}
        permissions={{ canApprove, canCancel, canPay: canApprove, canEdit: canApprove }}
      />

      <AdvanceVoucherPreview
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        advance={preview?.advance ?? null}
        installments={preview?.installments ?? []}
      />
    </div>
  );
};

export default Advances;
