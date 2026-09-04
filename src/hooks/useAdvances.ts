import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AdvanceAuditRecord,
  AdvancePaymentRecord,
  AdvanceRecord,
  AdvanceStatus,
  InstallmentRecord,
  buildSchedule,
  round2,
} from "@/lib/advances";

export interface AdvanceEmployee {
  id: string;
  name: string;
  employee_number: string;
  department: string;
  position: string;
  residence_number: string;
  bank_name: string;
  bank_account_number: string;
  basic_salary: number;
}

export const useAdvanceEmployees = () =>
  useQuery({
    queryKey: ["advance-employees"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AdvanceEmployee[]> => {
      const { data, error } = await supabase
        .from("employees")
        .select(
          "id, name, position, department, employee_number, salary, residence_number, bank_name, bank_account_number"
        )
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((e, i) => ({
        id: e.id,
        name: e.name ?? "-",
        employee_number: e.employee_number ?? `EMP-${String(i + 1).padStart(3, "0")}`,
        department: e.department ?? "",
        position: e.position ?? "",
        residence_number: e.residence_number ?? "",
        bank_name: e.bank_name ?? "",
        bank_account_number: e.bank_account_number ?? "",
        basic_salary: Number(e.salary ?? 0),
      }));
    },
  });

export interface AdvanceListFilters {
  search: string;
  status: string;
  department: string;
  advanceType: string;
  month: string;
  page: number;
  pageSize: number;
}

export const useAdvancesList = (filters: AdvanceListFilters) =>
  useQuery({
    queryKey: ["advances", filters],
    staleTime: 30 * 1000,
    queryFn: async () => {
      let query = supabase
        .from("employee_advances")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.department !== "all") query = query.eq("department", filters.department);
      if (filters.advanceType !== "all") query = query.eq("advance_type", filters.advanceType);
      if (filters.month) {
        const [y, m] = filters.month.split("-").map(Number);
        const start = `${filters.month}-01`;
        const end = new Date(y, m, 0).toISOString().split("T")[0];
        query = query.gte("advance_date", start).lte("advance_date", end);
      }
      const q = filters.search.trim();
      if (q) {
        query = query.or(
          `advance_number.ilike.%${q}%,employee_name.ilike.%${q}%,employee_number.ilike.%${q}%`
        );
      }

      const from = filters.page * filters.pageSize;
      query = query.range(from, from + filters.pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdvanceRecord[], total: count ?? 0 };
    },
  });

/** إحصائيات السلف — استعلام خفيف على الأعمدة المطلوبة فقط */
export const useAdvancesStats = () =>
  useQuery({
    queryKey: ["advances-stats"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const [{ data: advances, error }, { data: installments, error: e2 }] = await Promise.all([
        supabase
          .from("employee_advances")
          .select("id, amount, paid_amount, remaining_amount, status, advance_date, department, employee_name"),
        supabase
          .from("advance_installments")
          .select("id, amount, paid_amount, due_date, status"),
      ]);
      if (error) throw error;
      if (e2) throw e2;

      const list = advances ?? [];
      const month = new Date().toISOString().slice(0, 7);
      const today = new Date().toISOString().split("T")[0];

      const active = list.filter((a) => a.status === "approved");
      const completed = list.filter((a) => a.status === "completed");

      const dueThisMonth = (installments ?? [])
        .filter(
          (i) =>
            (i.due_date ?? "").startsWith(month) &&
            ["due", "upcoming", "late"].includes(i.status ?? "")
        )
        .reduce((s, i) => s + (Number(i.amount) - Number(i.paid_amount || 0)), 0);

      const lateCount = (installments ?? []).filter(
        (i) => (i.due_date ?? "") < today && ["due", "upcoming", "late"].includes(i.status ?? "")
      ).length;

      const byMonth = new Map<string, number>();
      const byDepartment = new Map<string, number>();
      const byEmployee = new Map<string, number>();
      for (const a of list) {
        if (a.status === "cancelled" || a.status === "rejected") continue;
        const m = (a.advance_date ?? "").slice(0, 7);
        byMonth.set(m, (byMonth.get(m) ?? 0) + Number(a.amount || 0));
        const d = a.department || "غير محدد";
        byDepartment.set(d, (byDepartment.get(d) ?? 0) + Number(a.amount || 0));
        const e = a.employee_name || "غير محدد";
        byEmployee.set(e, (byEmployee.get(e) ?? 0) + Number(a.amount || 0));
      }

      return {
        totalCount: list.length,
        activeCount: active.length,
        completedCount: completed.length,
        totalAmount: list
          .filter((a) => !["cancelled", "rejected"].includes(a.status ?? ""))
          .reduce((s, a) => s + Number(a.amount || 0), 0),
        totalPaid: list.reduce((s, a) => s + Number(a.paid_amount || 0), 0),
        totalRemaining: active.reduce((s, a) => s + Number(a.remaining_amount || 0), 0),
        dueThisMonth: round2(dueThisMonth),
        lateCount,
        byMonth: Array.from(byMonth.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([k, v]) => ({ label: k, value: round2(v) })),
        byDepartment: Array.from(byDepartment.entries()).map(([k, v]) => ({
          label: k,
          value: round2(v),
        })),
        topEmployees: Array.from(byEmployee.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([k, v]) => ({ label: k, value: round2(v) })),
      };
    },
  });

export const useAdvanceDetails = (advanceId?: string) =>
  useQuery({
    queryKey: ["advance-details", advanceId],
    enabled: !!advanceId,
    queryFn: async () => {
      const [inst, pay, logs] = await Promise.all([
        supabase
          .from("advance_installments")
          .select("*")
          .eq("advance_id", advanceId!)
          .order("installment_number", { ascending: true }),
        supabase
          .from("advance_payments")
          .select("*")
          .eq("advance_id", advanceId!)
          .order("payment_date", { ascending: true }),
        supabase
          .from("advance_audit_logs")
          .select("*")
          .eq("advance_id", advanceId!)
          .order("created_at", { ascending: true }),
      ]);
      if (inst.error) throw inst.error;
      if (pay.error) throw pay.error;
      if (logs.error) throw logs.error;
      return {
        installments: (inst.data ?? []) as unknown as InstallmentRecord[],
        payments: (pay.data ?? []) as unknown as AdvancePaymentRecord[],
        logs: (logs.data ?? []) as unknown as AdvanceAuditRecord[],
      };
    },
  });

const logAudit = async (
  advanceId: string,
  action: string,
  description?: string,
  oldData?: unknown,
  newData?: unknown
) => {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("advance_audit_logs").insert({
    advance_id: advanceId,
    action,
    description: description ?? null,
    old_data: (oldData ?? null) as never,
    new_data: (newData ?? null) as never,
    user_id: auth.user?.id ?? null,
    user_email: auth.user?.email ?? null,
  });
};

export interface CreateAdvanceInput {
  advance_date: string;
  employee: AdvanceEmployee;
  amount: number;
  reason: string;
  advance_type: string;
  installments_count: number;
  installment_amount: number;
  frequency: "monthly" | "weekly" | "semimonthly";
  first_installment_date: string;
  notes: string;
  status: Extract<AdvanceStatus, "draft" | "pending" | "approved">;
}

export const useAdvanceMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["advances"] });
    qc.invalidateQueries({ queryKey: ["advances-stats"] });
    qc.invalidateQueries({ queryKey: ["advance-details"] });
    qc.invalidateQueries({ queryKey: ["due-advance-installments"] });
  };

  const createAdvance = useMutation({
    mutationFn: async (input: CreateAdvanceInput) => {
      const { data: numberData, error: numberError } = await supabase.rpc("next_advance_number");
      if (numberError) throw numberError;
      const { data: auth } = await supabase.auth.getUser();

      const schedule = buildSchedule(
        input.amount,
        input.installments_count,
        input.first_installment_date,
        input.frequency,
        input.installment_amount
      );

      const { data, error } = await supabase
        .from("employee_advances")
        .insert({
          advance_number: (numberData as unknown as string) ?? `ADV-${Date.now()}`,
          advance_date: input.advance_date,
          employee_id: input.employee.id,
          employee_name: input.employee.name,
          employee_number: input.employee.employee_number,
          department: input.employee.department,
          position: input.employee.position,
          residence_number: input.employee.residence_number,
          bank_name: input.employee.bank_name,
          bank_account_number: input.employee.bank_account_number,
          basic_salary: input.employee.basic_salary,
          amount: round2(input.amount),
          reason: input.reason,
          advance_type: input.advance_type,
          installments_count: schedule.length,
          installment_amount: round2(input.installment_amount),
          frequency: input.frequency,
          first_installment_date: input.first_installment_date,
          last_installment_date: schedule[schedule.length - 1]?.due_date ?? input.first_installment_date,
          paid_amount: 0,
          remaining_amount: round2(input.amount),
          status: input.status,
          notes: input.notes,
          created_by: auth.user?.id ?? null,
          approved_at: input.status === "approved" ? new Date().toISOString() : null,
          approved_by: input.status === "approved" ? auth.user?.id ?? null : null,
        })
        .select()
        .single();
      if (error) throw error;

      const today = new Date().toISOString().split("T")[0];
      const { error: instError } = await supabase.from("advance_installments").insert(
        schedule.map((s) => ({
          advance_id: data.id,
          installment_number: s.installment_number,
          due_date: s.due_date,
          amount: s.amount,
          remaining_after: s.remaining_after,
          status: s.due_date <= today ? "due" : "upcoming",
        }))
      );
      if (instError) throw instError;

      await logAudit(data.id, "created", `إنشاء سند سلفة بمبلغ ${round2(input.amount)}`, null, data);
      if (input.status === "approved") await logAudit(data.id, "approved", "اعتماد السلفة عند الإنشاء");
      return data as unknown as AdvanceRecord;
    },
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: async ({
      advance,
      status,
      reason,
    }: {
      advance: AdvanceRecord;
      status: AdvanceStatus;
      reason?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const patch: Record<string, unknown> = { status };
      if (status === "approved") {
        patch.approved_at = new Date().toISOString();
        patch.approved_by = auth.user?.id ?? null;
      }
      if (status === "rejected") patch.rejected_reason = reason ?? null;
      if (status === "cancelled") {
        patch.cancelled_reason = reason ?? null;
        patch.cancelled_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("employee_advances")
        .update(patch)
        .eq("id", advance.id);
      if (error) throw error;

      if (status === "cancelled") {
        await supabase
          .from("advance_installments")
          .update({ status: "cancelled" })
          .eq("advance_id", advance.id)
          .in("status", ["upcoming", "due", "late"]);
      }

      const action =
        status === "approved" ? "approved" : status === "rejected" ? "rejected" : status === "cancelled" ? "cancelled" : "updated";
      await logAudit(advance.id, action, reason, { status: advance.status }, { status });
    },
    onSuccess: invalidate,
  });

  /** تسجيل سداد قسط (خصم راتب أو نقدي) — يمنع الخصم المكرر لنفس كشف الراتب */
  const payInstallment = useMutation({
    mutationFn: async ({
      advance,
      installment,
      amount,
      method,
      payrollReference,
      carryOver,
    }: {
      advance: AdvanceRecord;
      installment: InstallmentRecord;
      amount: number;
      method: "payroll" | "cash" | "bank";
      payrollReference?: string;
      carryOver?: boolean;
    }) => {
      if (installment.payroll_reference && method === "payroll") {
        throw new Error("تم خصم هذا القسط مسبقًا في كشف الراتب " + installment.payroll_reference);
      }
      const pay = round2(Math.min(amount, installment.amount - installment.paid_amount));
      if (pay <= 0) throw new Error("لا يوجد مبلغ متبقٍ لهذا القسط");

      const newPaid = round2(installment.paid_amount + pay);
      const fullyPaid = newPaid >= round2(installment.amount) - 0.001;

      const { error: e1 } = await supabase
        .from("advance_installments")
        .update({
          paid_amount: newPaid,
          status: fullyPaid ? (method === "payroll" ? "deducted" : "paid") : "due",
          payroll_reference: method === "payroll" ? payrollReference ?? null : installment.payroll_reference,
          deducted_at: method === "payroll" ? new Date().toISOString() : installment.deducted_at,
        })
        .eq("id", installment.id);
      if (e1) throw e1;

      const { data: auth } = await supabase.auth.getUser();
      const { error: e2 } = await supabase.from("advance_payments").insert({
        advance_id: advance.id,
        installment_id: installment.id,
        payment_date: new Date().toISOString().split("T")[0],
        amount: pay,
        method,
        payroll_reference: payrollReference ?? null,
        created_by: auth.user?.id ?? null,
      });
      if (e2) throw e2;

      // ترحيل المتبقي للقسط التالي عند الطلب
      if (!fullyPaid && carryOver) {
        const rest = round2(installment.amount - newPaid);
        const { data: next } = await supabase
          .from("advance_installments")
          .select("*")
          .eq("advance_id", advance.id)
          .gt("installment_number", installment.installment_number)
          .in("status", ["upcoming", "due", "late"])
          .order("installment_number", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (next) {
          await supabase
            .from("advance_installments")
            .update({ amount: round2(Number(next.amount) + rest) })
            .eq("id", next.id);
          await supabase
            .from("advance_installments")
            .update({ amount: newPaid, status: method === "payroll" ? "deducted" : "paid" })
            .eq("id", installment.id);
        }
      }

      const totalPaid = round2(advance.paid_amount + pay);
      const remaining = round2(Math.max(0, advance.amount - totalPaid));
      await supabase
        .from("employee_advances")
        .update({
          paid_amount: totalPaid,
          remaining_amount: remaining,
          status: remaining <= 0.001 ? "completed" : advance.status,
        })
        .eq("id", advance.id);

      await logAudit(
        advance.id,
        method === "payroll" ? "payroll_deduction" : "payment",
        `سداد ${pay} للقسط رقم ${installment.installment_number}${
          payrollReference ? ` — كشف ${payrollReference}` : ""
        }`
      );
    },
    onSuccess: invalidate,
  });

  const earlyPayoff = useMutation({
    mutationFn: async ({ advance }: { advance: AdvanceRecord }) => {
      const remaining = round2(advance.amount - advance.paid_amount);
      if (remaining <= 0) throw new Error("السلفة مسددة بالكامل");
      const { data: auth } = await supabase.auth.getUser();

      const { error: e1 } = await supabase.from("advance_payments").insert({
        advance_id: advance.id,
        payment_date: new Date().toISOString().split("T")[0],
        amount: remaining,
        method: "early",
        notes: "سداد مبكر لكامل المبلغ المتبقي",
        created_by: auth.user?.id ?? null,
      });
      if (e1) throw e1;

      await supabase
        .from("advance_installments")
        .update({ status: "cancelled" })
        .eq("advance_id", advance.id)
        .in("status", ["upcoming", "due", "late"]);

      const { error: e2 } = await supabase
        .from("employee_advances")
        .update({ paid_amount: advance.amount, remaining_amount: 0, status: "completed" })
        .eq("id", advance.id);
      if (e2) throw e2;

      await logAudit(advance.id, "early_payoff", `سداد مبكر بمبلغ ${remaining}`);
    },
    onSuccess: invalidate,
  });

  const requestEdit = useMutation({
    mutationFn: async ({ advance, reason }: { advance: AdvanceRecord; reason: string }) => {
      await logAudit(advance.id, "edit_request", reason, advance, null);
    },
    onSuccess: invalidate,
  });

  return { createAdvance, setStatus, payInstallment, earlyPayoff, requestEdit };
};

/** أقساط السلف المستحقة خلال شهر معين — لاستخدامها في كشف الرواتب */
export const useDueAdvanceInstallments = (month: string) =>
  useQuery({
    queryKey: ["due-advance-installments", month],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [y, m] = month.split("-").map(Number);
      const end = new Date(y, m, 0).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("advance_installments")
        .select(
          "id, advance_id, installment_number, due_date, amount, paid_amount, status, payroll_reference, employee_advances!inner(id, employee_id, employee_name, status, advance_number)"
        )
        .lte("due_date", end)
        .in("status", ["upcoming", "due", "late"])
        .eq("employee_advances.status", "approved");
      if (error) throw error;
      return (data ?? []).map((row) => {
        const advance = (row as unknown as { employee_advances: { employee_id: string; employee_name: string; advance_number: string } })
          .employee_advances;
        return {
          installmentId: row.id,
          advanceId: row.advance_id,
          advanceNumber: advance.advance_number,
          employeeId: advance.employee_id,
          employeeName: advance.employee_name,
          installmentNumber: row.installment_number,
          dueDate: row.due_date,
          amount: round2(Number(row.amount) - Number(row.paid_amount || 0)),
        };
      });
    },
  });
