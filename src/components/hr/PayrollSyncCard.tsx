import { useState } from "react";
import { CloudDownload, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const STATUS: Record<string, { l: string; v: "default" | "secondary" | "destructive" | "outline" }> = {
  ready: { l: "جاهز للترحيل", v: "default" },
  posted: { l: "تم الترحيل", v: "secondary" },
  posted_before: { l: "مرحّل سابقًا", v: "outline" },
  no_employee: { l: "الموظف غير موجود", v: "destructive" },
  zero: { l: "مبلغ صفر", v: "outline" },
  error: { l: "خطأ", v: "destructive" },
};

export const PayrollSyncCard = () => {
  const { toast } = useToast();
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState<"load" | "post" | null>(null);

  const call = async (post: boolean, refs?: string[]) => {
    setBusy(post ? "post" : "load");
    const [y, m] = from.split("-").map(Number);
    const { data, error } = await supabase.functions.invoke("payroll-sync", {
      body: { from, to, month: m, year: y, post, only_refs: post ? (refs ?? items.filter((i) => i.status === "ready").map((i) => i.ref)) : undefined },
    });
    setBusy(null);
    if (error || data?.error) {
      let msg = data?.message ?? error?.message;
      try { const b = await (error as any)?.context?.json(); msg = b?.message ?? msg; } catch { /* ignore */ }
      return toast({ title: "تعذر الاتصال ببرنامج الرواتب", description: msg, variant: "destructive" });
    }
    setItems(data.items ?? []);
    if (post) toast({ title: "تم ترحيل القيود", description: `${(data.items ?? []).filter((i: any) => i.status === "posted").length} قيد` });
  };

  const [postingRef, setPostingRef] = useState<string | null>(null);
  const postOne = async (ref: string) => {
    setPostingRef(ref);
    await call(true, [ref]);
    setPostingRef(null);
  };

  const ready = items.filter((i) => i.status === "ready");
  const total = ready.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <Card className="lg:col-span-2">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CloudDownload className="h-5 w-5" /> سحب البيانات من برنامج الرواتب</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1"><Label>من تاريخ</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label>إلى تاريخ</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button variant="outline" className="gap-2" onClick={() => call(false)} disabled={!!busy}>
            {busy === "load" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />} جلب ومعاينة
          </Button>
          <Button className="gap-2" onClick={() => call(true)} disabled={!!busy || ready.length === 0}>
            {busy === "post" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} ترحيل الجاهز ({ready.length})
          </Button>
          {ready.length > 0 && <span className="text-sm text-muted-foreground">الإجمالي {total.toLocaleString("en-US", { minimumFractionDigits: 2 })} ر.س</span>}
        </div>
        {items.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="p-2 text-right">النوع</th><th className="p-2 text-right">الموظف</th><th className="p-2">التاريخ</th>
                <th className="p-2">المبلغ</th><th className="p-2 text-right">البيان</th><th className="p-2">الحالة</th><th className="p-2">ترحيل</th>
              </tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.ref} className="border-t">
                    <td className="p-2">{i.label}</td>
                    <td className="p-2">{i.employee_name}<div className="text-xs text-muted-foreground">{i.iqama}</div></td>
                    <td className="p-2 text-center">{i.date}</td>
                    <td className="p-2 text-center">{Number(i.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    <td className="p-2">{i.description}</td>
                    <td className="p-2 text-center">
                      <Badge variant={STATUS[i.status]?.v ?? "outline"}>{STATUS[i.status]?.l ?? i.status}</Badge>
                      {i.entry_number && <div className="text-xs">{i.entry_number}</div>}
                      {i.error && <div className="text-xs text-destructive">{i.error}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
