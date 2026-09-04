import { useCallback, useEffect, useState } from "react";
import { Banknote, Eye, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr, formatMoneySar, round2 } from "@/lib/advances";
import { formatMonthLabel } from "./types";

const DELETE_CODE = "363636";

interface PostingRow {
  id: string;
  employeeName: string;
  type: string;
  date: string;
  amount: number;
  description: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  /** يُستدعى بعد أي حذف لتحديث الشاشة */
  onChanged?: () => void;
}

export const PayrollPostingsDialog = ({ open, onOpenChange, month, onChanged }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<PostingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employee_transactions")
        .select("id, type, date, amount, description, employees(name)")
        .in("type", ["salary_accrual", "salary_payment"])
        .gte("date", `${month}-01`)
        .lte("date", `${month}-31`)
        .order("date", { ascending: true });
      if (error) throw error;
      setRows(
        (data ?? []).map((t: any) => ({
          id: t.id,
          employeeName: t.employees?.name || "-",
          type: t.type,
          date: t.date,
          amount: Number(t.amount || 0),
          description: t.description || "",
        }))
      );
    } catch (e) {
      toast({
        title: "تعذر تحميل حركات الكشف",
        description: e instanceof Error ? e.message : "خطأ غير معروف",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [month, toast]);

  useEffect(() => {
    if (open) {
      setCode("");
      load();
    }
  }, [open, load]);

  const remove = async (ids: string[], scope: string) => {
    if (code !== DELETE_CODE) {
      toast({ title: "أدخل رمز الحذف الصحيح", variant: "destructive" });
      return;
    }
    setDeleting(scope);
    try {
      const { error } = await supabase.from("employee_transactions").delete().in("id", ids);
      if (error) throw error;
      toast({ title: `تم حذف ${ids.length} حركة من الكشف` });
      await load();
      onChanged?.();
    } catch (e) {
      toast({
        title: "تعذر الحذف",
        description: e instanceof Error ? e.message : "خطأ غير معروف",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const accruals = rows.filter((r) => r.type === "salary_accrual");
  const payments = rows.filter((r) => r.type === "salary_payment");
  const sum = (list: PostingRow[]) => round2(list.reduce((s, r) => s + r.amount, 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-4xl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-hr" />
            حركات كشف رواتب {formatMonthLabel(month)}
          </DialogTitle>
          <DialogDescription>
            استحقاق الراتب (دائن) وصرف الراتب بالصافي (مدين) — يمكن حذف الترحيل وإعادته.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">إثبات الراتب (دائن)</div>
            <div className="font-mono text-lg font-bold text-emerald-600" dir="ltr">
              {formatMoneySar(sum(accruals))}
            </div>
            <div className="text-[11px] text-muted-foreground">{accruals.length} حركة</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">صرف الراتب (مدين)</div>
            <div className="font-mono text-lg font-bold text-rose-600" dir="ltr">
              {formatMoneySar(sum(payments))}
            </div>
            <div className="text-[11px] text-muted-foreground">{payments.length} حركة</div>
          </div>
          <div className="flex flex-col justify-center gap-1 rounded-lg border p-3">
            <Label className="text-xs">رمز الحذف</Label>
            <Input
              type="password"
              inputMode="numeric"
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-9 text-center font-mono"
            />
          </div>
        </div>

        <ScrollArea className="h-[320px] rounded-lg border">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 bg-muted/70 text-xs">
              <tr>
                <th className="p-2">التاريخ</th>
                <th className="p-2">الموظف</th>
                <th className="p-2">نوع الحركة</th>
                <th className="p-2">البيان</th>
                <th className="p-2">المبلغ</th>
                <th className="p-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    لا توجد حركات مرحّلة لهذا الشهر
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 font-mono text-xs">{formatDateAr(r.date)}</td>
                  <td className="p-2">{r.employeeName}</td>
                  <td className="p-2">
                    <Badge
                      variant="secondary"
                      className={
                        r.type === "salary_accrual"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }
                    >
                      {r.type === "salary_accrual" ? "إثبات راتب (دائن)" : "صرف راتب (مدين)"}
                    </Badge>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">{r.description}</td>
                  <td className="p-2 font-mono" dir="ltr">
                    {formatMoneySar(r.amount)}
                  </td>
                  <td className="p-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                      disabled={deleting === r.id}
                      onClick={() => remove([r.id], r.id)}
                    >
                      {deleting === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" className="gap-2" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 border-rose-200 text-rose-600"
              disabled={payments.length === 0 || deleting === "payments"}
              onClick={() => remove(payments.map((r) => r.id), "payments")}
            >
              <Banknote className="h-4 w-4" />
              حذف صرف الراتب
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              disabled={rows.length === 0 || deleting === "all"}
              onClick={() => remove(rows.map((r) => r.id), "all")}
            >
              {deleting === "all" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              حذف الكشف بالكامل
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollPostingsDialog;
