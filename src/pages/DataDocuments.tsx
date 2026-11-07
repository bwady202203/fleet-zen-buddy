import { useCallback, useEffect, useRef, useState } from "react";
import { FileImage, Upload, ClipboardPaste, Download, Share2, Save, Trash2, Maximize2, Search, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDeleteConfirmation } from "@/components/DeleteConfirmationDialog";
import DataDocumentPreview from "@/components/documents/DataDocumentPreview";
import { DATA_DOCUMENTS_BUCKET, documentMimeType, documentTitle, downloadDocument } from "@/lib/dataDocuments";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Row = Tables<"data_documents"> & { url: string };
type Pending = { id: string; file: File; title: string; url: string; mimeType: string };
export default function DataDocuments() {
  const { currentOrganizationId, userRole } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const pendingRef = useRef(pending); pendingRef.current = pending;
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<{ title: string; url: string; mime_type: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const { requestDelete, DeleteDialog } = useDeleteConfirmation();
  const load = useCallback(async () => {
    if (!currentOrganizationId || userRole !== "admin") return;
    setLoading(true); setLoadError(false);
    try {
      const documents: Tables<"data_documents">[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("data_documents").select("*").eq("organization_id", currentOrganizationId)
          .order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
        if (error) throw error;
        documents.push(...data);
        if (data.length < 500) break;
      }
      const signed = documents.length ? await supabase.storage.from(DATA_DOCUMENTS_BUCKET).createSignedUrls(documents.map(row => row.file_path), 3600) : null;
      if (signed?.error) throw signed.error;
      setRows(documents.map((row, index) => ({ ...row, url: signed?.data?.[index]?.signedUrl ?? "" })));
    } catch { setLoadError(true); toast.error("تعذر تحميل المستندات"); }
    finally { setLoading(false); }
  }, [currentOrganizationId, userRole]);
  useEffect(() => {
    setRows([]); setTitles({});
    pendingRef.current.forEach(item => URL.revokeObjectURL(item.url)); setPending([]);
    void load();
    const timer = setInterval(() => void load(), 50 * 60 * 1000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => () => pendingRef.current.forEach(item => URL.revokeObjectURL(item.url)), []);
  const addFiles = useCallback((files: File[]) => {
    const accepted: Pending[] = [];
    for (const file of files) {
      const mimeType = documentMimeType(file);
      if (!mimeType) { toast.error("الملفات المقبولة: صور أو PDF"); continue; }
      accepted.push({ id: crypto.randomUUID(), file, title: documentTitle(file.name), mimeType, url: URL.createObjectURL(file) });
    }
    setPending(previous => [...previous, ...accepted]);
  }, []);
  useEffect(() => {
    if (userRole !== "admin" || saving) return;
    const paste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length) { event.preventDefault(); addFiles(files); }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [addFiles, userRole, saving]);
  const pasteClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        const type = item.types.find(type => type.startsWith("image/") || type === "application/pdf");
        if (type) files.push(new File([await item.getType(type)], `مستند-${Date.now()}.${type === "application/pdf" ? "pdf" : type.split("/")[1]}`, { type }));
      }
      if (!files.length) return toast.error("لا توجد صورة أو PDF في الحافظة");
      addFiles(files);
    } catch { toast.error("تعذر قراءة الحافظة؛ استخدم اللصق من لوحة المفاتيح أو اختر ملفًا"); }
  };
  const saveFiles = async () => {
    if (!currentOrganizationId || saving) return;
    if (pending.some(item => !item.title.trim())) return toast.error("أدخل اسمًا لكل مستند");
    setSaving(true);
    try {
      for (const item of pending) {
        const path = `${currentOrganizationId}/${item.id}/${item.id}.${item.mimeType === "application/pdf" ? "pdf" : item.mimeType.split("/")[1]}`;
        const uploaded = await supabase.storage.from(DATA_DOCUMENTS_BUCKET).upload(path, item.file, { contentType: item.mimeType });
        if (uploaded.error) throw uploaded.error;
        const saved = await supabase.from("data_documents").insert({ organization_id: currentOrganizationId, title: item.title.trim(), file_name: item.file.name, file_path: path, mime_type: item.mimeType, file_size: item.file.size }).select().single();
        if (saved.error) { await supabase.storage.from(DATA_DOCUMENTS_BUCKET).remove([path]); throw saved.error; }
        URL.revokeObjectURL(item.url);
        setPending(previous => previous.filter(row => row.id !== item.id));
      }
      toast.success("تم حفظ المستندات"); await load();
    } catch { toast.error("تعذر حفظ بعض المستندات؛ الملفات المتبقية لم تُحفظ"); await load(); }
    finally { setSaving(false); }
  };
  const rename = async (row: Row) => {
    const title = titles[row.id]?.trim();
    if (!title) return toast.error("أدخل اسم المستند");
    setBusy(row.id);
    const { error } = await supabase.from("data_documents").update({ title }).eq("id", row.id).eq("organization_id", currentOrganizationId ?? "");
    setBusy(null);
    if (error) return toast.error("تعذر حفظ الاسم");
    setRows(previous => previous.map(item => item.id === row.id ? { ...item, title } : item));
    setTitles(previous => { const next = { ...previous }; delete next[row.id]; return next; });
    toast.success("تم حفظ الاسم");
  };
  const transfer = async (row: Row, share: boolean) => {
    setBusy(row.id);
    try {
      const { data, error } = await supabase.storage.from(DATA_DOCUMENTS_BUCKET).download(row.file_path);
      if (error) throw error;
      const name = `${row.title}.${row.file_path.split(".").pop()}`;
      const file = new File([data], name, { type: row.mime_type });
      if (share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: row.title });
      else if (share) {
        const signed = await supabase.storage.from(DATA_DOCUMENTS_BUCKET).createSignedUrl(row.file_path, 3600);
        if (signed.error) throw signed.error;
        await navigator.clipboard.writeText(signed.data.signedUrl);
        toast.success("تم نسخ رابط صالح لساعة؛ يمكن لمن لديه الرابط فتح المستند");
      } else downloadDocument(data, name);
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) toast.error(share ? "تعذرت المشاركة" : "تعذر التحميل"); }
    finally { setBusy(null); }
  };
  const remove = (row: Row) => requestDelete(() => {
    void (async () => {
      setBusy(row.id);
      const removed = await supabase.storage.from(DATA_DOCUMENTS_BUCKET).remove([row.file_path]);
      if (removed.error) { setBusy(null); toast.error("تعذر حذف الملف"); return; }
      const { error } = await supabase.from("data_documents").delete().eq("id", row.id).eq("organization_id", currentOrganizationId ?? "");
      setBusy(null);
      if (error) { toast.error("حُذف الملف وتعذر حذف البطاقة؛ أعد المحاولة"); return; }
      setRows(previous => previous.filter(item => item.id !== row.id)); toast.success("تم حذف المستند");
    })();
  }, { title: "حذف المستند", description: `سيتم حذف «${row.title}» نهائيًا.` });
  if (userRole && userRole !== "admin") return <div dir="rtl" className="p-6 text-muted-foreground">المستندات متاحة لمسؤول الشركة فقط.</div>;
  return <div dir="rtl" className="p-4 md:p-6 space-y-6" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!saving) addFiles(Array.from(event.dataTransfer.files)); }}>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><div className="p-2 rounded-md bg-primary text-primary-foreground"><FileImage className="h-6 w-6" /></div><h1 className="text-2xl font-bold">داتا مستندات</h1></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={saving} onClick={() => void pasteClipboard()}><ClipboardPaste className="h-4 w-4 ml-2" />لصق</Button><Button disabled={saving} onClick={() => input.current?.click()}><Upload className="h-4 w-4 ml-2" />إضافة مستندات</Button>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,application/pdf" multiple className="hidden" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      </div>
    </header>
    {pending.length > 0 && <section className="space-y-3 border-b border-border pb-6">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">مستندات جديدة ({pending.length})</h2><Button disabled={saving} onClick={() => void saveFiles()}>{saving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}حفظ المستندات</Button></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{pending.map(item => <Card key={item.id} className="overflow-hidden rounded-lg">
        <DataDocumentPreview url={item.url} mimeType={item.mimeType} title={item.title} />
        <div className="p-3 flex gap-2"><Input aria-label="اسم المستند الجديد" disabled={saving} value={item.title} onChange={event => setPending(previous => previous.map(row => row.id === item.id ? { ...row, title: event.target.value } : row))} /><Button title="إزالة من الملفات الجديدة" aria-label="إزالة من الملفات الجديدة" size="icon" variant="ghost" disabled={saving} onClick={() => { URL.revokeObjectURL(item.url); setPending(previous => previous.filter(row => row.id !== item.id)); }}><X className="h-4 w-4" /></Button></div>
      </Card>)}</div>
    </section>}
    <div className="flex items-center gap-3"><Search className="h-5 w-5 text-muted-foreground shrink-0" /><Input aria-label="البحث باسم المستند" placeholder="البحث باسم المستند" className="max-w-md" value={query} onChange={event => setQuery(event.target.value)} /><span className="text-sm text-muted-foreground whitespace-nowrap">{rows.length} مستند</span></div>
    {loading ? <div className="py-12 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : loadError ? <div className="py-12 text-center space-y-3"><p>تعذر تحميل المستندات</p><Button variant="outline" onClick={() => void load()}>إعادة المحاولة</Button></div> : <>
      {!rows.length && <div className="py-16 text-center text-muted-foreground"><FileImage className="h-12 w-12 mx-auto mb-4" /><p>لا توجد مستندات محفوظة</p></div>}
      {rows.length > 0 && !rows.some(row => row.title.includes(query)) && <p className="text-muted-foreground py-8 text-center">لا توجد نتائج</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.filter(row => row.title.includes(query)).map(row => <Card key={row.id} className="overflow-hidden rounded-lg">
        <DataDocumentPreview url={row.url} mimeType={row.mime_type} title={row.title} />
        <div className="p-3 space-y-3"><div className="flex items-center gap-2"><Input aria-label={`اسم ${row.title}`} value={titles[row.id] ?? row.title} onChange={event => setTitles(previous => ({ ...previous, [row.id]: event.target.value }))} className="font-semibold min-w-0" /><Button size="icon" variant="ghost" title="حفظ الاسم" aria-label={`حفظ اسم ${row.title}`} disabled={busy === row.id || titles[row.id] === undefined || titles[row.id] === row.title} onClick={() => void rename(row)}><Save className="h-4 w-4" /></Button></div>
          <div className="flex flex-wrap justify-between items-center gap-2"><span className="text-xs text-muted-foreground">{row.mime_type === "application/pdf" ? "PDF" : "صورة"} · {(row.file_size / 1024).toLocaleString("ar-SA", { maximumFractionDigits: 0 })} ك.ب</span><div className="flex gap-1">
            <Button size="icon" variant="ghost" title="معاينة" aria-label={`معاينة ${row.title}`} onClick={() => setExpanded(row)}><Maximize2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="مشاركة" aria-label={`مشاركة ${row.title}`} disabled={busy === row.id} onClick={() => void transfer(row, true)}><Share2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="تحميل" aria-label={`تحميل ${row.title}`} disabled={busy === row.id} onClick={() => void transfer(row, false)}><Download className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="حذف" aria-label={`حذف ${row.title}`} className="text-destructive" disabled={busy === row.id} onClick={() => remove(row)}><Trash2 className="h-4 w-4" /></Button>
          </div></div>
        </div>
      </Card>)}</div>
    </>}
    <Dialog open={!!expanded} onOpenChange={open => { if (!open) setExpanded(null); }}><DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-auto"><DialogHeader><DialogTitle>{expanded?.title}</DialogTitle><DialogDescription>معاينة المستند</DialogDescription></DialogHeader>{expanded && <DataDocumentPreview url={expanded.url} mimeType={expanded.mime_type} title={expanded.title} expanded />}</DialogContent></Dialog>
    <DeleteDialog />
  </div>;
}