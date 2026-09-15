import { ChangeEvent, ClipboardEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ClipboardPaste,
  Download,
  Eye,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BUCKET = "document-archive";
const MAX_SIZE = 25 * 1024 * 1024;

export type EntityDocument = {
  id: string;
  title: string;
  description: string | null;
  doc_date: string | null;
  reference_number: string | null;
  file_path: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
};

const isPdf = (type: string | null | undefined, name?: string | null) =>
  (type || "").includes("pdf") || (name || "").toLowerCase().endsWith(".pdf");

const formatSize = (bytes: number | null) => {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} ميجابايت`;
};

interface EntityDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityId: string | null;
  /** رقم القيد أو السند */
  referenceNumber?: string | null;
  entityDate?: string | null;
  title?: string;
  subtitle?: string;
  onCountChange?: (count: number) => void;
}

export default function EntityDocumentsDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  referenceNumber,
  entityDate,
  title = "مستندات القيد",
  subtitle,
  onCountChange,
}: EntityDocumentsDialogProps) {
  const { currentOrganizationId, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<EntityDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [docTitle, setDocTitle] = useState("");
  const [notes, setNotes] = useState("");

  const [viewer, setViewer] = useState<{ doc: EntityDocument; url: string } | null>(null);
  const [viewerZoom, setViewerZoom] = useState(1);

  const loadDocuments = async () => {
    if (!entityId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("archived_documents")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("تعذر تحميل المستندات");
      return;
    }
    const rows = (data as unknown as EntityDocument[]) || [];
    setDocuments(rows);
    onCountChange?.(rows.length);
  };

  useEffect(() => {
    if (open) {
      setDocTitle(referenceNumber ? `مستند ${referenceNumber}` : "");
      setNotes("");
      clearFile();
      loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entityId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const attachFile = (incoming: File) => {
    if (!incoming.type.startsWith("image/") && !isPdf(incoming.type, incoming.name)) {
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
    if (!docTitle.trim()) setDocTitle(incoming.name.replace(/\.[^.]+$/, "").slice(0, 120));
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

  function clearFile() {
    setFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setZoom(1);
  }

  const saveDocument = async () => {
    if (!entityId) return;
    if (!file) {
      toast.error("الصق صورة أو ارفع ملف PDF أولاً");
      return;
    }
    setSaving(true);
    const extension = isPdf(file.type, file.name) ? "pdf" : (file.name.split(".").pop() || "png");
    const path = `${currentOrganizationId || "general"}/${entityType}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${extension}`;
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
      entity_type: entityType,
      entity_id: entityId,
      title: docTitle.trim() || file.name,
      description: notes.trim() || null,
      doc_date: entityDate || format(new Date(), "yyyy-MM-dd"),
      reference_number: referenceNumber || null,
      file_path: path,
      file_name: file.name,
      file_type: file.type || null,
      file_size: file.size,
      created_by: user?.id || null,
    } as never);
    setSaving(false);
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.error("تعذر حفظ المستند");
      return;
    }
    toast.success("تم حفظ المستند وربطه");
    clearFile();
    setNotes("");
    setDocTitle(referenceNumber ? `مستند ${referenceNumber}` : "");
    loadDocuments();
  };

  const openViewer = async (doc: EntityDocument) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("تعذر فتح الملف");
      return;
    }
    setViewerZoom(1);
    setViewer({ doc, url: data.signedUrl });
  };

  const downloadDocument = async (doc: EntityDocument) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 3600, {
      download: doc.file_name || true,
    });
    if (error || !data?.signedUrl) {
      toast.error("تعذر تحميل الملف");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const deleteDocument = async (doc: EntityDocument) => {
    if (!window.confirm(`حذف المستند "${doc.title}"؟`)) return;
    const { error } = await supabase.from("archived_documents").delete().eq("id", doc.id);
    if (error) {
      toast.error("تعذر حذف المستند");
      return;
    }
    await supabase.storage.from(BUCKET).remove([doc.file_path]);
    toast.success("تم حذف المستند");
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== doc.id);
      onCountChange?.(next.length);
      return next;
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {title}
              {referenceNumber && <Badge variant="secondary">{referenceNumber}</Badge>}
            </DialogTitle>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </DialogHeader>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Upload side */}
            <div className="space-y-3">
              <div
                onPaste={handlePaste}
                tabIndex={0}
                className="rounded-xl border-2 border-dashed p-4 text-center outline-none transition-colors focus:border-primary"
              >
                <ClipboardPaste className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-semibold">اضغط هنا ثم Ctrl + V للصق صورة المستند</p>
                <p className="mt-1 text-xs text-muted-foreground">أو ارفع ملف صورة / PDF (حتى 25 ميجابايت)</p>
                <div className="mt-3 flex justify-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="ml-2 h-4 w-4" />
                    اختيار ملف
                  </Button>
                  {file && (
                    <Button type="button" variant="ghost" onClick={clearFile}>
                      <X className="ml-2 h-4 w-4" />
                      إزالة
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

              {previewUrl && (
                <div className="rounded-lg border bg-muted/30 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {file?.name} — {formatSize(file?.size ?? null)}
                    </span>
                    {!isPdf(file?.type, file?.name) && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="outline" onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}>
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => setZoom((z) => Math.min(4, z + 0.2))}>
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="max-h-[320px] overflow-auto rounded bg-background">
                    {isPdf(file?.type, file?.name) ? (
                      <iframe title="preview" src={previewUrl} className="h-[320px] w-full" />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="معاينة المستند"
                        style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                        className="mx-auto"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">عنوان المستند</Label>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="مثال: فاتورة المورد" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">نص للبحث / ملاحظات</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <Button onClick={saveDocument} disabled={saving || !file} className="w-full">
                {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}
                حفظ المستند
              </Button>
            </div>

            {/* List side */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">المستندات المرفقة</h3>
                <Badge variant="outline">{documents.length}</Badge>
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">لا توجد مستندات مرفقة</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatSize(doc.file_size)} — {format(new Date(doc.created_at), "dd/MM/yyyy")}
                          </p>
                          {doc.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.description}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button size="icon" variant="ghost" title="عرض" onClick={() => openViewer(doc)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="تحميل" onClick={() => downloadDocument(doc)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="حذف"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => deleteDocument(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {viewer?.doc.title}
              {viewer && !isPdf(viewer.doc.file_type, viewer.doc.file_name) && (
                <span className="flex gap-1">
                  <Button size="icon" variant="outline" onClick={() => setViewerZoom((z) => Math.max(0.4, z - 0.2))}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setViewerZoom((z) => Math.min(4, z + 0.2))}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewer &&
            (isPdf(viewer.doc.file_type, viewer.doc.file_name) ? (
              <iframe title={viewer.doc.title} src={viewer.url} className="h-[75vh] w-full rounded border" />
            ) : (
              <div className="max-h-[75vh] overflow-auto rounded border bg-muted/20">
                <img
                  src={viewer.url}
                  alt={viewer.doc.title}
                  style={{ transform: `scale(${viewerZoom})`, transformOrigin: "top center" }}
                  className="mx-auto"
                />
              </div>
            ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
