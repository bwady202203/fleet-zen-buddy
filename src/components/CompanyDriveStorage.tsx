import { useEffect, useRef, useState } from "react";
import { Cloud, Download, Loader2, RefreshCw, Upload } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type DriveFile = { id: string; name: string; size?: string; modifiedTime: string };
type DriveResult = { files: DriveFile[]; quota?: { limit?: string; usage?: string } };
const gb = (value?: string) => (Number(value || 0) / 1024 ** 3).toFixed(2);

export default function CompanyDriveStorage() {
  const [result, setResult] = useState<DriveResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const invoke = async (body: Record<string, string> | FormData) => {
    const response = await supabase.functions.invoke("company-drive", { body });
    if (response.error) {
      const details = response.error instanceof FunctionsHttpError ? await response.error.context.text() : response.error.message;
      try { const parsed = JSON.parse(details); throw new Error(parsed.details || parsed.error || details); }
      catch (failure) { if (failure instanceof SyntaxError) throw new Error(details); throw failure; }
    }
    return response.data;
  };
  const refresh = async () => {
    setBusy(true); setError("");
    try { setResult(await invoke({ action: "list" })); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر الاتصال بجوجل درايف"); }
    finally { setBusy(false); }
  };
  useEffect(() => { void refresh(); }, []);
  const upload = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) { toast.error("حجم الملف يتجاوز 25 ميجابايت"); return; }
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      await invoke(form);
      toast.success("تم حفظ الملف في جوجل درايف");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر رفع الملف"); }
    finally { setBusy(false); }
  };
  const download = async (file: DriveFile) => {
    setBusy(true);
    try {
      const blob = await invoke({ action: "download", fileId: file.id });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = file.name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast.error(e instanceof Error ? e.message : "تعذر تحميل الملف"); }
    finally { setBusy(false); }
  };
  return <section className="border-b bg-muted/20" dir="rtl">
    <div className="container mx-auto space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Cloud className="h-5 w-5 text-primary" /><h2 className="font-bold">ملفات الشركة في جوجل درايف</h2>
          {result?.quota && <span className="text-xs text-muted-foreground">المستخدم {gb(result.quota.usage)} من {gb(result.quota.limit)} جيجابايت</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" title="تحديث الملفات" aria-label="تحديث ملفات درايف" onClick={refresh} disabled={busy}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => input.current?.click()} disabled={busy || !result}>{busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}رفع إلى جوجل درايف</Button>
          <input ref={input} type="file" className="hidden" aria-label="ملف جوجل درايف" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} />
        </div>
      </div>
      {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
      {result && result.files.length === 0 && <p className="text-sm text-muted-foreground">لا توجد ملفات محفوظة في مجلد البرنامج بعد.</p>}
      <div className="max-h-64 overflow-y-auto divide-y">
        {result?.files.map(file => <div key={file.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0"><p className="break-words text-sm font-medium">{file.name}</p><span className="text-xs text-muted-foreground">{new Date(file.modifiedTime).toLocaleDateString("ar-SA", { calendar: "gregory" })} · {(Number(file.size || 0) / 1024 ** 2).toFixed(2)} ميجابايت</span></div>
          <Button variant="outline" size="icon" title="تحميل الملف" aria-label={`تحميل ${file.name}`} disabled={busy} onClick={() => download(file)}><Download className="h-4 w-4" /></Button>
        </div>)}
      </div>
    </div>
  </section>;
}