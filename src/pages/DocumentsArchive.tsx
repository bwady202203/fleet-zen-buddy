import { ChangeEvent, ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowRight,
  ClipboardPaste,
  Download,
  Eye,
  FileText,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BUCKET = "document-archive";
const MAX_SIZE = 25 * 1024 * 1024;

type ArchivedDocument = {
  id: string;
  title: string;
  description: string | null;
  doc_date: string | null;
  party_name: string | null;
  reference_number: string | null;
  amount: number | null;
  file_path: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
};

type Draft = {
  title: string;
  description: string;
  doc_date: string;
  party_name: string;
  reference_number: string;
  amount: string;
};

const emptyDraft = (): Draft => ({
  title: "",
  description: "",
  doc_date: format(new Date(), "yyyy-MM-dd"),
  party_name: "",
  reference_number: "",
  amount: "",
});

const normalizeArabic = (value: string) =>
  value
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const formatSize = (bytes: number | null) => {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} ميجابايت`;
};

const isPdf = (type: string | null | undefined, name?: string | null) =>
  (type || "").includes("pdf") || (name || "").toLowerCase().endsWith(".pdf");

export default function DocumentsArchive() {
  const { currentOrganizationId, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<ArchivedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const [viewer, setViewer] = useState<{ doc: ArchivedDocument; url: string } | null>(null);
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerLoading, setViewerLoading] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("archived_documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("تعذر تحميل المستندات");
    setDocuments((data as ArchivedDocument[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const attachFile = (incoming: File) => {
    const allowed = incoming.type.startsWith("image/") || isPdf(incoming.type, incoming.name);
    if (!allowed) {
      toast.error("يُسمح بالصور أو ملفات PDF فقط");
      return;
    }
    if (incoming.size > MAX_SIZE) {
      toast.error("حجم الملف يتجاوز 25 ميجابايت");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(incoming);
    setPreviewUrl(URL.createObjectURL(incoming));
    setZoom(1);
    if (!draft.title.trim()) {
      setDraft((prev) => ({ ...prev, title: incoming.name.replace(/\.[^.]+$/, "").slice(0, 120) }));
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const item = Array.from(event.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
    if (!item) return;
    const pasted = item.getAsFile();
    if (!pasted) return;
    event.preventDefault();
    attachFile(new File([pasted], `pasted-${Date.now()}.png`, { type: pasted.type || "image/png" }));
    toast.success("تم لصق الصورة");
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) attachFile(selected);
    event.target.value = "";
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setZoom(1);
  };

  const resetForm = () => {
    clearFile();
    setDraft(emptyDraft());
  };

  const saveDocument = async () => {
    if (!file) {
      toast.error("الصق صورة أو ارفع ملف PDF أولاً");
      return;
    }
    if (!draft.title.trim()) {
      toast.error("اكتب عنوان المستند");
      return;
    }
    setSaving(true);
    const extension = isPdf(file.type, file.name) ? "pdf" : (file.name.split(".").pop() || "png");
    const path = `${currentOrganizationId || "general"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (uploadError) {
      setSaving(false);
      toast.error("تعذر رفع الملف");
      return;
    }
    const { error } = await supabase.from("archived_documents").insert({
      organization_id: currentOrganizationId,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      doc_date: draft.doc_date || null,
      party_name: draft.party_name.trim() || null,
      reference_number: draft.reference_number.trim() || null,
      amount: draft.amount ? Number(draft.amount) : null,
      file_path: path,
      file_name: file.name,
      file_type: file.type || null,
      file_size: file.size,
      created_by: user?.id || null,
    });
    setSaving(false);
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.error("تعذر حفظ المستند");
      return;
    }
    toast.success("تم حفظ المستند في الأرشيف");
    resetForm();
    loadDocuments();
  };

  const openViewer = async (doc: ArchivedDocument) => {
    setViewerLoading(true);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 3600);
    setViewerLoading(false);
    if (error || !data?.signedUrl) {
      toast.error("تعذر فتح الملف");
      return;
    }
    setViewerZoom(1);
    setViewer({ doc, url: data.signedUrl });
  };

  const downloadDocument = async (doc: ArchivedDocument) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 3600, {
      download: doc.file_name || true,
    });
    if (error || !data?.signedUrl) {
      toast.error("تعذر تحميل الملف");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const deleteDocument = async (doc: ArchivedDocument) => {
    if (!window.confirm(`حذف المستند "${doc.title}"؟`)) return;
    const { error } = await supabase.from("archived_documents").delete().eq("id", doc.id);
    if (error) {
      toast.error("تعذر حذف المستند");
      return;
    }
    await supabase.storage.from(BUCKET).remove([doc.file_path]);
    toast.success("تم حذف المستند");
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const filtered = useMemo(() => {
    const term = normalizeArabic(search);
    if (!term) return documents;
    return documents.filter((doc) =>
      normalizeArabic(
        [doc.title, doc.description, doc.party_name, doc.reference_number, doc.file_name, doc.doc_date, doc.amount]
          .filter(Boolean)
          .join(" ")
      ).includes(term)
    );
  }, [documents, search]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary to-primary/70 p-3 shadow-lg">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">أرشيف الفواتير والمستندات</h1>
              <p className="text-sm text-muted-foreground">الصق صورة أو ارفع PDF مع نص للبحث عنه لاحقاً</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline">
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للرئيسية
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto grid gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إضافة مستند جديد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onPaste={handlePaste}
              tabIndex={0}
              className="rounded-xl border-2 border-dashed p-4 text-center outline-none transition-colors focus:border-primary"
            >
              <ClipboardPaste className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold">اضغط هنا ثم Ctrl + V للصق صورة الفاتورة</p>
              <p className="mt-1 text-xs text-muted-foreground">أو ارفع ملف صورة / PDF (حتى 25 ميجابايت)</p>
              <div className="mt-3 flex justify-center gap-2">
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="ml-2 h-4 w-4" />
                  اختيار ملف
                </Button>
                {file && (
                  <Button type="button" variant="outline" onClick={clearFile}>
                    <X className="ml-2 h-4 w-4" />
                    إزالة الملف
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {file && previewUrl && (
              <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {file.name}
                    <span className="mr-2 text-xs font-normal text-muted-foreground">{formatSize(file.size)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="w-14 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
                    <Button size="icon" variant="outline" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="max-h-[520px] overflow-auto rounded-lg bg-card p-2">
                  {isPdf(file.type, file.name) ? (
                    <iframe title="معاينة المستند" src={previewUrl} className="h-[500px] w-full rounded" />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="معاينة المستند قبل الحفظ"
                      style={{ width: `${zoom * 100}%` }}
                      className="mx-auto rounded"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold">عنوان المستند *</label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="مثال: فاتورة كهرباء يناير"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">تاريخ المستند</label>
                <Input
                  type="date"
                  value={draft.doc_date}
                  onChange={(e) => setDraft({ ...draft, doc_date: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">رقم المرجع</label>
                <Input
                  value={draft.reference_number}
                  onChange={(e) => setDraft({ ...draft, reference_number: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">الجهة / المورد</label>
                <Input value={draft.party_name} onChange={(e) => setDraft({ ...draft, party_name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">المبلغ</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value.replace(/[^\d.]/g, "") })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold">نص للبحث / وصف المستند</label>
                <Textarea
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="اكتب أي كلمات تساعدك في العثور على المستند لاحقاً"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveDocument} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}
                حفظ في الأرشيف
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                تفريغ
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">المستندات المحفوظة</CardTitle>
              <Badge variant="secondary">{filtered.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالعنوان أو النص أو الجهة أو رقم المرجع"
                className="pr-9"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">لا توجد مستندات مطابقة</p>
            ) : (
              filtered.map((doc) => (
                <div key={doc.id} className="rounded-xl border p-3 transition-colors hover:border-primary/50">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{doc.title}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {isPdf(doc.file_type, doc.file_name) ? "PDF" : "صورة"}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {doc.doc_date && <span>التاريخ: {doc.doc_date}</span>}
                        {doc.party_name && <span>الجهة: {doc.party_name}</span>}
                        {doc.reference_number && <span>مرجع: {doc.reference_number}</span>}
                        {doc.amount != null && <span>المبلغ: {Number(doc.amount).toLocaleString("en-US")}</span>}
                        <span>{formatSize(doc.file_size)}</span>
                      </div>
                      {doc.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-foreground/80">{doc.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" onClick={() => openViewer(doc)} title="عرض">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => downloadDocument(doc)} title="تحميل">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => deleteDocument(doc)} title="حذف">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
            {viewerLoading && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> جاري فتح الملف...
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!viewer} onOpenChange={(open) => !open && setViewer(null)}>
        <DialogContent className="max-h-[95vh] max-w-6xl overflow-hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3">
              <span>{viewer?.doc.title}</span>
              {viewer && !isPdf(viewer.doc.file_type, viewer.doc.file_name) && (
                <span className="flex items-center gap-1">
                  <Button size="icon" variant="outline" onClick={() => setViewerZoom((z) => Math.max(0.5, z - 0.25))}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="w-14 text-center text-xs font-semibold">{Math.round(viewerZoom * 100)}%</span>
                  <Button size="icon" variant="outline" onClick={() => setViewerZoom((z) => Math.min(4, z + 0.25))}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </span>
              )}
              {viewer && (
                <Button size="sm" variant="secondary" onClick={() => downloadDocument(viewer.doc)}>
                  <Download className="ml-2 h-4 w-4" />
                  تحميل
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewer && (
            <div className="space-y-3">
              {viewer.doc.description && (
                <p className="rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-wrap">{viewer.doc.description}</p>
              )}
              <div className="max-h-[72vh] overflow-auto rounded-lg border bg-muted/20 p-2">
                {isPdf(viewer.doc.file_type, viewer.doc.file_name) ? (
                  <iframe title={viewer.doc.title} src={viewer.url} className="h-[70vh] w-full rounded" />
                ) : (
                  <img
                    src={viewer.url}
                    alt={viewer.doc.title}
                    style={{ width: `${viewerZoom * 100}%` }}
                    className="mx-auto rounded"
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
