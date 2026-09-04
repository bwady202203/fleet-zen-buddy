import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FilePlus2, Loader2, Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  payrollReferenceFor,
  useApplyPayrollDeductions,
  useDueAdvanceInstallments,
} from "@/hooks/useAdvances";
import { formatDateAr, formatMoneySar } from "@/lib/advances";
import { PayrollEmployee } from "./usePayrollData";
import { formatMonthLabel } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  onMonthChange: (month: string) => void;
  employees: PayrollEmployee[] | undefined;
  /** يُستدعى بعد إنشاء الكشف بقائمة الموظفين المحددين */
  onCreated: (employeeIds: string[], department: string) => void;
}

export const PayrollCreateDialog = ({
  open,
  onOpenChange,
  month,
  onMonthChange,
  employees,
  onCreated,
}: Props) => {
  const { toast } = useToast();
  const [department, setDepartment] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deductAdvances, setDeductAdvances] = useState(true);

  const { data: dueInstallments, isLoading: loadingAdvances } = useDueAdvanceInstallments(month);
  const applyDeductions = useApplyPayrollDeductions();

  const departments = useMemo(
    () => Array.from(new Set((employees ?? []).map((e) => e.department).filter(Boolean))),
    [employees]
  );

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (employees ?? []).filter((e) => {
      if (department !== "all" && e.department !== department) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) || e.employeeNumber.toLowerCase().includes(q)
      );
    });
  }, [employees, department, search]);

  // تحديد كل موظفي القسم افتراضيًا عند الفتح أو تغيير القسم
  useEffect(() => {
    if (!open) return;
    setSelected(Object.fromEntries(scoped.map((e) => [e.id, true])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, department]);

  const advancesByEmployee = useMemo(() => {
    const map = new Map<
      string,
      { amount: number; ids: string[]; details: string[]; deducted: number }
    >();
    for (const inst of dueInstallments ?? []) {
      const cur =
        map.get(inst.employeeId) ?? { amount: 0, ids: [], details: [], deducted: 0 };
      cur.amount += Number(inst.amount || 0);
      if (inst.alreadyDeducted) cur.deducted += Number(inst.amount || 0);
      else cur.ids.push(inst.installmentId);
      cur.details.push(
        `${inst.advanceNumber} — قسط ${inst.installmentNumber} (${formatDateAr(inst.dueDate)})${
          inst.alreadyDeducted ? " — مخصوم" : ""
        }`
      );
      map.set(inst.employeeId, cur);
    }
    return map;
  }, [dueInstallments]);

  const selectedEmployees = useMemo(() => scoped.filter((e) => selected[e.id]), [scoped, selected]);

  const summary = useMemo(() => {
    let salaries = 0;
    let advances = 0;
    let deducted = 0;
    const installmentIds: string[] = [];
    for (const e of selectedEmployees) {
      salaries += e.basicSalary + e.allowances;
      const adv = advancesByEmployee.get(e.id);
      if (adv) {
        advances += adv.amount;
        deducted += adv.deducted;
        installmentIds.push(...adv.ids);
      }
    }
    return { salaries, advances, deducted, installmentIds, net: salaries - advances };
  }, [selectedEmployees, advancesByEmployee]);

  const allSelected = scoped.length > 0 && selectedEmployees.length === scoped.length;

  const handleCreate = async () => {
    if (selectedEmployees.length === 0) {
      toast({ title: "اختر موظفًا واحدًا على الأقل", variant: "destructive" });
      return;
    }
    try {
      if (deductAdvances && summary.installmentIds.length > 0) {
        const res = await applyDeductions.mutateAsync({
          installmentIds: summary.installmentIds,
          payrollReference: payrollReferenceFor(month),
        });
        toast({
          title: "تم إنشاء كشف الرواتب",
          description: `تم خصم ${res.deducted} قسط سلفة بإجمالي ${formatMoneySar(res.total)}`,
        });
      } else {
        toast({
          title: "تم إنشاء كشف الرواتب",
          description:
            summary.deducted > 0
              ? `أقساط السلف لهذا الشهر مخصومة مسبقًا بإجمالي ${formatMoneySar(summary.deducted)}`
              : undefined,
        });
      }
      onCreated(selectedEmployees.map((e) => e.id), department);
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "تعذر إنشاء الكشف",
        description: e instanceof Error ? e.message : "خطأ غير معروف",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-4xl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-hr" />
            إنشاء كشف الرواتب
          </DialogTitle>
          <DialogDescription>
            حدّد الشهر والقسم والموظفين — يتم استدعاء أقساط السلف المستحقة وخصمها من صافي الراتب.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>شهر الكشف</Label>
            <Input type="month" value={month} onChange={(e) => onMonthChange(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>القسم</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأقسام</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>بحث</Label>
            <div className="relative">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pr-8"
                placeholder="اسم أو رقم الموظف"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(v) =>
                setSelected(
                  v ? Object.fromEntries(scoped.map((e) => [e.id, true])) : {}
                )
              }
              id="select-all-payroll"
            />
            <Label htmlFor="select-all-payroll" className="cursor-pointer">
              تحديد الكل ({scoped.length})
            </Label>
          </div>
          <span className="text-muted-foreground">
            المحدد: {selectedEmployees.length} — {formatMonthLabel(month)}
          </span>
        </div>

        <ScrollArea className="h-[300px] rounded-lg border">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 bg-muted/70 text-xs">
              <tr>
                <th className="p-2 w-10"></th>
                <th className="p-2">الموظف</th>
                <th className="p-2">القسم</th>
                <th className="p-2">الراتب + البدلات</th>
                <th className="p-2">أقساط السلف المستحقة</th>
                <th className="p-2">الصافي المتوقع</th>
              </tr>
            </thead>
            <tbody>
              {scoped.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    لا يوجد موظفون مطابقون
                  </td>
                </tr>
              )}
              {scoped.map((e) => {
                const adv = advancesByEmployee.get(e.id);
                const gross = e.basicSalary + e.allowances;
                const advAmount = deductAdvances ? adv?.amount ?? 0 : 0;
                return (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="p-2">
                      <Checkbox
                        checked={Boolean(selected[e.id])}
                        onCheckedChange={(v) =>
                          setSelected((prev) => ({ ...prev, [e.id]: Boolean(v) }))
                        }
                      />
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-muted-foreground">{e.employeeNumber}</div>
                    </td>
                    <td className="p-2 text-muted-foreground">{e.department || "-"}</td>
                    <td className="p-2 font-mono">{formatMoneySar(gross)}</td>
                    <td className="p-2">
                      {adv ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Badge className="gap-1 bg-hr-soft text-hr">
                              <Wallet className="h-3 w-3" />
                              {formatMoneySar(adv.amount)}
                            </Badge>
                            {adv.deducted > 0 && adv.ids.length === 0 && (
                              <Badge variant="secondary" className="text-[10px]">
                                مخصوم في كشف هذا الشهر
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] leading-4 text-muted-foreground">
                            {adv.details.join(" • ")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2 font-mono font-semibold">
                      {formatMoneySar(gross - advAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">عدد الموظفين</div>
            <div className="text-lg font-bold">{selectedEmployees.length}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">الرواتب والبدلات</div>
            <div className="text-lg font-bold">{formatMoneySar(summary.salaries)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">إجمالي السلف المخصومة</div>
            <div className="text-lg font-bold text-hr">
              {formatMoneySar(deductAdvances ? summary.advances : 0)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">صافي الكشف</div>
            <div className="text-lg font-bold">
              {formatMoneySar(deductAdvances ? summary.net : summary.salaries)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="deduct-advances"
              checked={deductAdvances}
              onCheckedChange={(v) => setDeductAdvances(Boolean(v))}
            />
            <Label htmlFor="deduct-advances" className="cursor-pointer text-sm">
              خصم أقساط السلف المستحقة من كشف حساب الموظف
            </Label>
            {loadingAdvances && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button
              className="gap-2"
              onClick={handleCreate}
              disabled={applyDeductions.isPending || selectedEmployees.length === 0}
            >
              {applyDeductions.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              إنشاء الكشف وخصم السلف
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
