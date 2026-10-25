import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Copy, FileWarning, Loader2, ExternalLink } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface LookupResult { headers: string[]; rows: string[][]; total: number; count: number; residenceNumber: string; updatedAt: string; source: string }
const number = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 });

export default function EmployeeViolations() {
  const { userRole } = useAuth();
  const [residence, setResidence] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  async function search(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try {
      const { data, error: requestError } = await supabase.functions.invoke("employee-violations", { body: { residenceNumber: residence.trim() } });
      if (requestError) {
        if (requestError instanceof FunctionsHttpError) {
          const details = await requestError.context.json();
          throw new Error(details.error ?? "تعذر قراءة الشيت");
        }
        throw requestError;
      }
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر إتمام البحث"); }
    finally { setLoading(false); }
  }
  if (userRole !== "admin") return <div className="p-8 text-center text-muted-foreground">هذه الصفحة متاحة للمسؤول صاحب اتصال الشيت فقط.</div>;
  const driverIndex = result?.headers.indexOf("اسم السائق") ?? -1;
  const driverName = result?.rows[0]?.[driverIndex];
  return <main className="container mx-auto max-w-6xl px-4 py-6 space-y-6" dir="rtl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/hr" aria-label="رجوع للموارد البشرية"><ArrowRight className="h-5 w-5" /></Link></Button>
        <div><h1 className="text-2xl font-bold">مخالفات الموظفين</h1><p className="text-sm text-muted-foreground mt-1">جدول المخالفات · Google Sheets</p></div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/hr/employee-violations`); toast({ title: "تم نسخ رابط الصفحة" }); } catch { toast({ title: "تعذر نسخ الرابط", variant: "destructive" }); } }}><Copy className="h-4 w-4 ml-2" />نسخ الرابط</Button>
        <Button variant="outline" size="icon" asChild><a href="https://docs.google.com/spreadsheets/d/1IPhZ2--0wjGZcZfqXoOlYJZytPR6J-CwLoOQTzwb2_o/edit" target="_blank" rel="noopener noreferrer" aria-label="فتح الشيت"><ExternalLink className="h-4 w-4" /></a></Button>
      </div>
    </header>
    <form onSubmit={search} className="max-w-xl space-y-3">
      <Label htmlFor="residence-lookup">رقم الإقامة</Label>
      <div className="flex gap-2">
        <Input id="residence-lookup" type="text" inputMode="numeric" maxLength={10} value={residence} onChange={e => { setResidence(e.target.value); setResult(null); setError(""); }} placeholder="رقم الإقامة" dir="ltr" className="min-w-0 text-right" required />
        <Button type="submit" disabled={loading || !residence.trim()} className="gap-2 shrink-0">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}بحث</Button>
      </div>
    </form>
    {error && <p role="alert" className="border border-destructive/30 bg-destructive/10 p-4 rounded-md text-destructive">{error}</p>}
    {result && <section className="space-y-5" aria-live="polite">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y py-5">
        <div><p className="text-sm text-muted-foreground">الموظف</p><p className="text-lg font-bold mt-1">{driverName || "—"}</p><p className="text-sm mt-1" dir="ltr">{result.residenceNumber}</p></div>
        <div><p className="text-sm text-muted-foreground">عدد المخالفات</p><p className="text-2xl font-bold mt-1">{number.format(result.count)}</p></div>
        <div><p className="text-sm text-muted-foreground">إجمالي المخالفات</p><p className="text-2xl font-bold text-destructive mt-1">{number.format(result.total)} <span className="text-sm">ر.س</span></p></div>
      </div>
      {result.count === 0 ? <div className="py-12 text-center text-muted-foreground"><FileWarning className="h-9 w-9 mx-auto mb-3" />لا توجد مخالفات مسجلة لهذا الرقم في الشيت.</div> : <div className="overflow-x-auto border rounded-md"><table className="w-full text-sm"><thead className="bg-muted"><tr>{result.headers.map((header, i) => <th key={i} className="text-right px-4 py-3 whitespace-nowrap">{header}</th>)}</tr></thead><tbody>{result.rows.map((row, i) => <tr key={i} className="border-t">{row.map((cell, j) => <td key={j} className={result.headers[j] === "شرح المخالفة" ? "px-4 py-3 min-w-64 max-w-sm break-words" : "px-4 py-3 whitespace-nowrap"}>{cell || "—"}</td>)}</tr>)}</tbody></table></div>}
      <p className="text-xs text-muted-foreground">آخر قراءة للشيت: {new Date(result.updatedAt).toLocaleString("ar-SA")}</p>
    </section>}
  </main>;
}