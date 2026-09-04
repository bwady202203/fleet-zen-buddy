import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  IdCard,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmployeeDetailsDialog } from "@/components/hr/employees/EmployeeDetailsDialog";
import { EmployeeStatementPrintView } from "@/components/hr/employees/EmployeeStatementPrintView";
import { useEmployeeAccount } from "@/hooks/useEmployeeAccount";
import { AddEmployeeDialog, EmployeeFormData, DEPARTMENTS } from "@/components/AddEmployeeDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import LoadingCup from "@/components/LoadingCup";
import { cn } from "@/lib/utils";

interface DbEmployee {
  id: string;
  name: string;
  position: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  residence_number: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  hire_date: string | null;
  salary: number | null;
  housing_allowance: number | null;
  transport_allowance: number | null;
  other_allowances: number | null;
  status: string | null;
}

const useEmployees = () => {
  const { currentOrganizationId } = useAuth();
  return useQuery({
    queryKey: ["employees", currentOrganizationId],
    queryFn: async (): Promise<DbEmployee[]> => {
      let query = supabase.from("employees").select("*").order("created_at", { ascending: false });
      if (currentOrganizationId) query = query.eq("organization_id", currentOrganizationId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as DbEmployee[];
    },
  });
};

const toFormData = (emp: DbEmployee): EmployeeFormData => ({
  id: emp.id,
  name: emp.name ?? "",
  position: emp.position ?? "",
  department: emp.department ?? "",
  phone: emp.phone ?? "",
  email: emp.email ?? "",
  nationalId: emp.national_id ?? "",
  residenceNumber: emp.residence_number ?? "",
  bankName: emp.bank_name ?? "",
  bankAccountNumber: emp.bank_account_number ?? "",
  joinDate: emp.hire_date ?? new Date().toISOString().split("T")[0],
  basicSalary: Number(emp.salary ?? 0),
  housingAllowance: Number(emp.housing_allowance ?? 0),
  transportAllowance: Number(emp.transport_allowance ?? 0),
  otherAllowances: Number(emp.other_allowances ?? 0),
});

const totalOf = (emp: DbEmployee) =>
  Number(emp.salary ?? 0) +
  Number(emp.housing_allowance ?? 0) +
  Number(emp.transport_allowance ?? 0) +
  Number(emp.other_allowances ?? 0);

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

const money = (v: number) => `${v.toLocaleString()} ر.س`;

const Row = ({ icon: Icon, label, value, mono }: { icon: any; label: string; value?: string | null; mono?: boolean }) => (
  <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
    <Icon className="h-4 w-4 shrink-0 text-hr" />
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={cn("mr-auto text-sm font-semibold", mono && "font-mono")} dir={mono ? "ltr" : undefined}>
      {value || "—"}
    </span>
  </div>
);

const Employees = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeFormData | null>(null);
  const [detailsEmployee, setDetailsEmployee] = useState<DbEmployee | null>(null);
  const [statementOpen, setStatementOpen] = useState(false);
  const { data: employees = [], isLoading } = useEmployees();
  const { data: statementAccount } = useEmployeeAccount(detailsEmployee?.id);
  const queryClient = useQueryClient();

  const filtered = useMemo(() => {
    const q = searchQuery.trim();
    return employees.filter((emp) => {
      const matchesQuery =
        !q ||
        (emp.name ?? "").includes(q) ||
        (emp.position ?? "").includes(q) ||
        (emp.department ?? "").includes(q) ||
        (emp.phone ?? "").includes(q) ||
        (emp.national_id ?? "").includes(q) ||
        (emp.residence_number ?? "").includes(q);
      const matchesDept = departmentFilter === "all" || emp.department === departmentFilter;
      const active = (emp.status ?? "active") === "active";
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? active : !active);
      return matchesQuery && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = employees.filter((e) => (e.status ?? "active") === "active").length;
    const payroll = employees.reduce((s, e) => s + totalOf(e), 0);
    const depts = new Set(employees.map((e) => e.department).filter(Boolean)).size;
    return { total: employees.length, active, payroll, depts };
  }, [employees]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف الموظف "${name}"؟`)) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: "تعذر حذف الموظف — قد تكون له سلف أو حركات مرتبطة", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["payroll-employees"] });
    queryClient.invalidateQueries({ queryKey: ["advance-employees"] });
    setDetailsEmployee(null);
    toast({ title: "تم حذف الموظف" });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-hr-surface/70 backdrop-blur">
        <div className="container mx-auto px-4 py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                to="/hr"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-sm transition-colors hover:text-hr"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>
              <div>
                <p className="text-xs font-semibold tracking-wide text-hr">الموارد البشرية</p>
                <h1 className="text-3xl font-bold tracking-tight">بيانات الموظفين</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  سجل موحّد للموظفين يغذّي كشوف الرواتب وسندات السلف تلقائيًا
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="gap-2 rounded-xl bg-hr text-hr-foreground shadow-md transition-transform hover:-translate-y-0.5 hover:bg-hr/90"
                onClick={() => {
                  setEditingEmployee(null);
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                إضافة موظف جديد
              </Button>
              <Button variant="outline" className="gap-2 rounded-xl border-hr/40 text-hr hover:bg-hr/10" asChild>
                <Link to="/hr/bulk-employees">
                  <Upload className="h-4 w-4" />
                  استيراد من إكسل
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "إجمالي الموظفين", value: String(stats.total), icon: Users },
              { label: "موظفون نشطون", value: String(stats.active), icon: IdCard },
              { label: "الأقسام", value: String(stats.depts), icon: Building2 },
              { label: "إجمالي الرواتب", value: money(stats.payroll), icon: Wallet },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-hr/10 text-hr">
                  <s.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className="truncate text-lg font-bold">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search + filters */}
        <div className="mb-7 flex flex-wrap items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم، المسمى، القسم، الهاتف، الهوية..."
              className="h-11 rounded-xl border-transparent bg-muted/60 pr-10 text-right shadow-none focus-visible:border-hr focus-visible:ring-hr/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-11 w-[170px] rounded-xl border-transparent bg-muted/60 shadow-none">
              <SelectValue placeholder="القسم" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">جميع الأقسام</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-[150px] rounded-xl border-transparent bg-muted/60 shadow-none">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">غير نشط</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="h-9 rounded-xl px-3 text-sm">
            {filtered.length} موظف
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <LoadingCup />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-card py-24 text-center shadow-sm">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-hr/10 text-hr">
              <Users className="h-8 w-8" />
            </span>
            <div>
              <p className="text-lg font-bold">لا يوجد موظفون مطابقون</p>
              <p className="text-sm text-muted-foreground">أضف موظفًا جديدًا أو استورد قائمة من إكسل للبدء</p>
            </div>
            <Button
              className="gap-2 rounded-xl bg-hr text-hr-foreground hover:bg-hr/90"
              onClick={() => {
                setEditingEmployee(null);
                setIsAddDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              إضافة موظف جديد
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((employee) => {
              const active = (employee.status ?? "active") === "active";
              return (
                <div
                  key={employee.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailsEmployee(employee)}
                  onKeyDown={(e) => e.key === "Enter" && setDetailsEmployee(employee)}
                  className="group cursor-pointer rounded-3xl bg-card p-5 shadow-sm outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-hr/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-hr to-hr/60 text-lg font-bold text-hr-foreground shadow-md">
                      {initials(employee.name || "؟")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-bold leading-tight">{employee.name}</h3>
                      <p className="truncate text-sm text-muted-foreground">{employee.position || "—"}</p>
                      {employee.department && (
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-hr/10 px-2.5 py-1 text-[11px] font-semibold text-hr">
                          <Building2 className="h-3 w-3" />
                          {employee.department}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        active ? "bg-emerald-500/12 text-emerald-600" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-muted-foreground")} />
                      {active ? "نشط" : "غير نشط"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-muted/40 px-3 py-2">
                      <p className="text-muted-foreground">إجمالي الراتب</p>
                      <p className="mt-0.5 font-mono text-sm font-bold text-hr">{money(totalOf(employee))}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 px-3 py-2">
                      <p className="text-muted-foreground">تاريخ التعيين</p>
                      <p className="mt-0.5 font-mono text-sm font-bold">{employee.hire_date || "—"}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <span className="text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      اضغط لعرض التفاصيل الكاملة
                    </span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg hover:bg-hr/10 hover:text-hr"
                        onClick={() => {
                          setEditingEmployee(toFormData(employee));
                          setIsAddDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(employee.id, employee.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Details dialog */}
      <EmployeeDetailsDialog
        employee={detailsEmployee}
        open={!!detailsEmployee}
        onOpenChange={(o) => !o && setDetailsEmployee(null)}
        onEdit={() => {
          if (!detailsEmployee) return;
          setEditingEmployee(toFormData(detailsEmployee));
          setDetailsEmployee(null);
          setIsAddDialogOpen(true);
        }}
        onPrintStatement={() => setStatementOpen(true)}
      />

      <EmployeeStatementPrintView
        open={statementOpen}
        onOpenChange={setStatementOpen}
        employee={detailsEmployee}
        account={statementAccount ?? null}
      />


      <AddEmployeeDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        employee={editingEmployee}
        onSaved={() => setEditingEmployee(null)}
      />
    </div>
  );
};

export default Employees;
