import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { round2 } from "@/lib/advances";
import type { PayrollRow } from "./types";

/** آخر يوم في الشهر (YYYY-MM) */
export const monthEndDate = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 0);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${String(d.getDate()).padStart(2, "0")}`;
};

export type PostingType = "salary_accrual" | "salary_payment";

/**
 * إثبات الراتب (دائن) وصرف الراتب بالصافي (مدين) في حركات الموظف.
 * الترحيل غير مكرر: يتم تجاهل الموظفين الذين لديهم نفس نوع الحركة في نفس الشهر.
 */
export const usePayrollPosting = (month: string) => {
  const [posting, setPosting] = useState<PostingType | null>(null);

  const post = useCallback(
    async (type: PostingType, rows: PayrollRow[]) => {
      const employeeIds = rows.map((r) => r.id);
      if (employeeIds.length === 0) return { inserted: 0, skipped: 0, total: 0 };

      setPosting(type);
      try {
        const date = monthEndDate(month);
        const from = `${month}-01`;

        const { data: existing, error: exErr } = await supabase
          .from("employee_transactions")
          .select("employee_id, type, date")
          .in("employee_id", employeeIds)
          .eq("type", type)
          .gte("date", from)
          .lte("date", date);
        if (exErr) throw exErr;

        const done = new Set((existing ?? []).map((t: any) => t.employee_id));
        const pending = rows.filter((r) => !done.has(r.id));

        const label =
          type === "salary_accrual"
            ? `استحقاق راتب شهر ${month}`
            : `صرف راتب شهر ${month} (الصافي)`;

        const payload = pending.map((r) => ({
          employee_id: r.id,
          type,
          date,
          amount:
            type === "salary_accrual"
              ? round2(r.basicSalary + r.allowances + r.additions)
              : round2(r.netSalary),
          description: label,
          remaining_balance: 0,
        }));

        if (payload.length) {
          const { error } = await supabase.from("employee_transactions").insert(payload);
          if (error) throw error;
        }

        return {
          inserted: payload.length,
          skipped: rows.length - payload.length,
          total: round2(payload.reduce((s, p) => s + Number(p.amount || 0), 0)),
        };
      } finally {
        setPosting(null);
      }
    },
    [month]
  );

  return { post, posting };
};
