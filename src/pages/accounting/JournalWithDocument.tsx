import { ChangeEvent, ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { z } from "zod";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardPaste,
  FileImage,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DOCUMENT_BUCKET = "journal-documents";
const DEFAULT_BANK_ACCOUNT_ID = "2edc3d0d-7582-4173-81f2-4b547ad32874";
const DEBIT_ACCOUNT_NAME = "مؤسسة حاتم لافي بن نوار الدعاني للمقاولات";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const extractedSchema = z.object({
  reference_number: z.string().nullable().optional(),
  doc_date: z.string().nullable().optional(),
  amount: z.coerce.number().finite().nonnegative().nullable().optional(),
  beneficiary_name: z.string().nullable().optional(),
  sender_name: z.string().nullable().optional(),
  account_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type Account = { id: string; code: string; name_ar: string; name_en: string | null; type: string; level: number };
type DocumentRow = {
  id: string;
  journal_entry_id: string | null;
  reference_number: string | null;
  doc_date: string | null;
  amount: number;
  beneficiary_name: string | null;
  sender_name: string | null;
  account_number: string | null;
  notes: string | null;
  image_path: string | null;
  debit_account_id: string | null;
  credit_account_id: string | null;
  created_at: string;
  image_url?: string | null;
};
type Draft = {
  reference_number: string;
  doc_date: string;
  amount: string;
  beneficiary_name: string;
  sender_name: string;
  account_number: string;
  notes: string;
};

const emptyDraft = (): Draft => ({
  reference_number: "",
  doc_date: format(new Date(), "yyyy-MM-dd"),
  amount: "",
  beneficiary_name: "",
  sender_name: "",
  account_number: "",
  notes: "",
});

const cleanText = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 500) : "");
const normalizeArabic = (value: string) => value.replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();

export default function JournalWithDocument() {
  const { currentOrganizationId, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creditAccountId, setCreditAccountId] = useState(() => localStorage.getItem(LINKED_ACCOUNT_KEY) || DEFAULT_BANK_ACCOUNT_ID);
  const [linkedAccountId, setLinkedAccountId] = useState<string | null>(() => localStorage.getItem(LINKED_ACCOUNT_KEY));
  const [quickAccountIds, setQuickAccountIds] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(QUICK_ACCOUNTS_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter((v) => typeof v === "string").slice(0, MAX_QUICK_ACCOUNTS) : [];
    } catch {
      return [];
    }
  });
  const [pickerMode, setPickerMode] = useState<"credit" | "linked" | "quick">("credit");
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");

  const [isReading, setIsReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const db = supabase as any;
  const debitAccount = useMemo(
    () => accounts.find((account) => normalizeArabic(account.name_ar) === normalizeArabic(DEBIT_ACCOUNT_NAME)),
    [accounts],
  );
  const creditAccount = useMemo(() => accounts.find((account) => account.id === creditAccountId), [accounts, creditAccountId]);
  const filteredAccounts = useMemo(() => {
    const term = normalizeArabic(accountSearch.toLowerCase());
    return accounts.filter((account) => !term || normalizeArabic(`${account.code} ${account.name_ar} ${account.name_en || ""}`.toLowerCase()).includes(term));
  }, [accounts, accountSearch]);
  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((document) =>
      [document.reference_number, document.doc_date, document.beneficiary_name, document.sender_name, document.account_number, document.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [documents, search]);

  useEffect(() => {
    void loadPage();
  }, [currentOrganizationId]);

  const loadPage = async () => {
    setLoading(true);
    try {
      const [accountsResult, documentsResult] = await Promise.all([
        db.from("chart_of_accounts").select("id, code, name_ar, name_en, type, level").eq("is_active", true).eq("level", 4).order("code"),
        db.from("journal_documents").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      if (accountsResult.error) throw accountsResult.error;
      if (documentsResult.error) throw documentsResult.error;
      setAccounts(accountsResult.data || []);
      const rows = (documentsResult.data || []) as DocumentRow[];
      const withUrls = await Promise.all(rows.map(async (row) => {
        if (!row.image_path) return row;
        const { data } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(row.image_path, 3600);
        return { ...row, image_url: data?.signedUrl || null };
      }));
      setDocuments(withUrls);
    } catch (error) {
      toast.error(`تعذر تحميل قيود المستندات: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const setFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة فقط");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("حجم الصورة يجب ألا يتجاوز 10 ميجابايت");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"));
    if (file) {
      event.preventDefault();
      setFile(file);
      toast.success("تم لصق صورة المستند، اضغط قراءة المستند");
    }
  };

  const readDocument = async () => {
    if (!imageFile || !imagePreview) {
      toast.error("الصق صورة المستند أو اخترها أولاً");
      return;
    }
    setIsReading(true);
    try {
      const { data, error } = await supabase.functions.invoke("read-bank-document", { body: { imageBase64: imagePreview } });
      if (error) throw error;
      const parsed = extractedSchema.safeParse(data?.data || {});
      if (!parsed.success) throw new Error("تعذر التحقق من البيانات المقروءة");
      const value = parsed.data;
      setDraft((current) => ({
        ...current,
        reference_number: cleanText(value.reference_number),
        doc_date: cleanText(value.doc_date) || current.doc_date,
        amount: value.amount === null || value.amount === undefined ? current.amount : String(value.amount),
        beneficiary_name: cleanText(value.beneficiary_name),
        sender_name: cleanText(value.sender_name),
        account_number: cleanText(value.account_number),
        notes: cleanText(value.notes),
      }));
      toast.success("تمت قراءة بيانات المستند، راجعها قبل الحفظ");
    } catch (error) {
      toast.error(`تعذر قراءة المستند: ${(error as Error).message}`);
    } finally {
      setIsReading(false);
    }
  };

  const createEntryNumber = async (date: string) => {
    const { data, error } = await db.rpc("create_journal_entry_with_number", { p_date: date, p_description: `قيد يومية مع المستند - ${draft.reference_number || "تحويل بنكي"}` });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.id || !result?.entry_number) throw new Error("تعذر إنشاء رقم القيد");
    return result as { id: string; entry_number: string };
  };

  const saveDocument = async () => {
    const amount = Number(draft.amount.replace(/,/g, ""));
    if (!debitAccount) {
      toast.error(`لم يتم العثور على الحساب المدين: ${DEBIT_ACCOUNT_NAME}`);
      return;
    }
    if (!creditAccount) {
      toast.error("اختر الحساب الدائن");
      return;
    }
    if (!draft.doc_date || !/^\d{4}-\d{2}-\d{2}$/.test(draft.doc_date)) {
      toast.error("أدخل تاريخاً صحيحاً بصيغة yyyy-mm-dd");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("أدخل مبلغاً أكبر من صفر");
      return;
    }
    if (!imageFile) {
      toast.error("أرفق صورة المستند قبل الحفظ");
      return;
    }

    setIsSaving(true);
    let journalEntryId: string | null = null;
    let uploadedPath: string | null = null;
    try {
      const entry = await createEntryNumber(draft.doc_date);
      journalEntryId = entry.id;
      const { error: linesError } = await db.from("journal_entry_lines").insert([
        { journal_entry_id: entry.id, account_id: debitAccount.id, debit: amount, credit: 0, description: draft.beneficiary_name || DEBIT_ACCOUNT_NAME },
        { journal_entry_id: entry.id, account_id: creditAccount.id, debit: 0, credit: amount, description: draft.sender_name || "تحويل بنكي" },
      ]);
      if (linesError) throw linesError;

      const extension = imageFile.name.split(".").pop()?.toLowerCase() || "png";
      uploadedPath = `${currentOrganizationId || "shared"}/${user?.id || "user"}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(uploadedPath, imageFile, { contentType: imageFile.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: documentError } = await db.from("journal_documents").insert({
        organization_id: currentOrganizationId,
        journal_entry_id: journalEntryId,
        reference_number: draft.reference_number || null,
        doc_date: draft.doc_date,
        amount,
        beneficiary_name: draft.beneficiary_name || null,
        sender_name: draft.sender_name || null,
        account_number: draft.account_number || null,
        notes: draft.notes || null,
        image_path: uploadedPath,
        debit_account_id: debitAccount.id,
        credit_account_id: creditAccount.id,
        created_by: user?.id || null,
        extracted_data: draft,
      });
      if (documentError) throw documentError;

      toast.success(`تم حفظ ${entry.entry_number} مع المستند بنجاح`);
      setDraft(emptyDraft());
      setImageFile(null);
      setImagePreview(null);
      await loadPage();
    } catch (error) {
      if (uploadedPath) await supabase.storage.from(DOCUMENT_BUCKET).remove([uploadedPath]);
      if (journalEntryId) await db.from("journal_entries").delete().eq("id", journalEntryId);
      toast.error(`تعذر حفظ القيد: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDocument = async (document: DocumentRow) => {
    if (!window.confirm("هل تريد حذف المستند والقيد المرتبط به؟")) return;
    try {
      if (document.image_path) await supabase.storage.from(DOCUMENT_BUCKET).remove([document.image_path]);
      const { error } = await db.from("journal_documents").delete().eq("id", document.id);
      if (error) throw error;
      if (document.journal_entry_id) await db.from("journal_entries").delete().eq("id", document.journal_entry_id);
      toast.success("تم حذف المستند والقيد");
      await loadPage();
    } catch (error) {
      toast.error(`تعذر الحذف: ${(error as Error).message}`);
    }
  };

  const updateDraft = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value.slice(0, 500) }));

  return (
    <main className="min-h-screen bg-background p-4 md:p-8" dir="rtl" onPaste={handlePaste}>
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild aria-label="العودة">
              <Link to="/accounting"><ArrowRight className="h-5 w-5" /></Link>
            </Button>
            <div>
              <p className="text-sm font-medium text-primary">المعاملات البنكية المؤتمتة</p>
              <h1 className="text-3xl font-bold tracking-normal">قيد يومية مع المستند</h1>
              <p className="mt-1 text-sm text-muted-foreground">الصق صورة إشعار البنك، راجع البيانات، ثم احفظ القيد والمستند معاً.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadPage()} disabled={loading}>
            <RefreshCcw className="ml-2 h-4 w-4" /> تحديث السجل
          </Button>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2"><ClipboardPaste className="h-5 w-5 text-primary" /> المستند البنكي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="relative flex min-h-[270px] cursor-pointer flex-col items-center justify-center overflow-hidden border-2 border-dashed border-primary/30 bg-primary/[0.03] p-6 text-center transition-colors hover:bg-primary/[0.06]" onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0])} />
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="معاينة المستند البنكي" className="max-h-[250px] max-w-full object-contain" />
                    <Button type="button" variant="secondary" size="sm" className="absolute left-3 top-3" onClick={(event) => { event.stopPropagation(); setImageFile(null); setImagePreview(null); }}><X className="ml-1 h-4 w-4" /> إزالة</Button>
                  </>
                ) : (
                  <>
                    <FileImage className="mb-3 h-12 w-12 text-primary/70" />
                    <p className="font-semibold">الصق صورة البنك هنا أو اضغط لاختيار صورة</p>
                    <p className="mt-1 text-sm text-muted-foreground">يدعم PNG و JPG حتى 10 ميجابايت</p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={readDocument} disabled={isReading || !imageFile}>
                  {isReading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <FileText className="ml-2 h-4 w-4" />} قراءة بيانات البنك
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="ml-2 h-4 w-4" /> اختيار صورة</Button>
              </div>
              <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                <div><span className="text-xs text-muted-foreground">الحساب المدين الثابت</span><p className="mt-1 font-semibold text-primary">{debitAccount ? `${debitAccount.code} - ${debitAccount.name_ar}` : DEBIT_ACCOUNT_NAME}</p></div>
                <div><span className="text-xs text-muted-foreground">الحساب الدائن</span><button type="button" className="mt-1 block text-right font-semibold text-primary underline-offset-4 hover:underline" onClick={() => setAccountPickerOpen(true)}>{creditAccount ? `${creditAccount.code} - ${creditAccount.name_ar}` : "اختر الحساب الدائن"}</button></div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/30"><CardTitle>بيانات القيد المستخرجة</CardTitle></CardHeader>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="space-y-1 text-sm"><span>الرقم المرجعي</span><Input value={draft.reference_number} onChange={(event) => updateDraft("reference_number", event.target.value)} placeholder="رقم المرجع" /></label>
              <label className="space-y-1 text-sm"><span>تاريخ التنفيذ</span><Input type="date" value={draft.doc_date} onChange={(event) => updateDraft("doc_date", event.target.value)} /></label>
              <label className="space-y-1 text-sm"><span>المبلغ</span><Input type="text" inputMode="decimal" value={draft.amount} onChange={(event) => updateDraft("amount", event.target.value)} placeholder="0.00" /></label>
              <label className="space-y-1 text-sm"><span>رقم الحساب</span><Input value={draft.account_number} onChange={(event) => updateDraft("account_number", event.target.value)} placeholder="رقم الحساب البنكي" /></label>
              <label className="space-y-1 text-sm sm:col-span-2"><span>اسم المستفيد (إلى)</span><Input value={draft.beneficiary_name} onChange={(event) => updateDraft("beneficiary_name", event.target.value)} placeholder="اسم المستفيد" /></label>
              <label className="space-y-1 text-sm sm:col-span-2"><span>اسم المرسل (من)</span><Input value={draft.sender_name} onChange={(event) => updateDraft("sender_name", event.target.value)} placeholder="اسم المرسل" /></label>
              <label className="space-y-1 text-sm sm:col-span-2"><span>ملاحظات</span><Input value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} placeholder="ملاحظات المستند" /></label>
              <div className="sm:col-span-2"><Button className="w-full" onClick={() => void saveDocument()} disabled={isSaving}><Check className="ml-2 h-4 w-4" /> {isSaving ? "جاري الحفظ..." : "حفظ القيد والمستند"}</Button></div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold">المستندات المحفوظة</h2><p className="text-sm text-muted-foreground">استدعِ المستند والقيد بالرقم المرجعي أو التاريخ أو المبلغ.</p></div>
            <div className="relative w-full sm:w-80"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث في المستندات..." /></div>
          </div>
          <Card className="overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-muted/60"><tr><th className="p-3 text-right">المستند</th><th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">المبلغ</th><th className="p-3 text-right">المستفيد</th><th className="p-3 text-right">الحساب</th><th className="p-3 text-right">القيد</th><th className="p-3 text-right">إجراء</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></td></tr> : filteredDocuments.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">لا توجد مستندات محفوظة</td></tr> : filteredDocuments.map((document) => <tr key={document.id} className="border-t hover:bg-muted/20"><td className="p-3"><div className="flex items-center gap-3">{document.image_url ? <a href={document.image_url} target="_blank" rel="noreferrer"><img src={document.image_url} alt="مستند بنكي محفوظ" className="h-12 w-16 object-cover" /></a> : <FileImage className="h-8 w-8 text-muted-foreground" />}<span className="font-medium">{document.reference_number || "بدون مرجع"}</span></div></td><td className="p-3">{document.doc_date || "-"}</td><td className="p-3 font-semibold">{Number(document.amount || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</td><td className="p-3">{document.beneficiary_name || "-"}</td><td className="p-3">{document.account_number || "-"}</td><td className="p-3 text-primary">{document.journal_entry_id ? "محفوظ" : "-"}</td><td className="p-3"><Button variant="ghost" size="icon" className="text-destructive" aria-label="حذف المستند" onClick={() => void deleteDocument(document)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div></Card>
        </section>
      </div>

      <Dialog open={accountPickerOpen} onOpenChange={setAccountPickerOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>اختيار الحساب الدائن</DialogTitle></DialogHeader><div className="space-y-4"><Input value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="ابحث بالكود أو اسم الحساب" /><div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">{filteredAccounts.map((account) => <Button key={account.id} variant={account.id === creditAccountId ? "default" : "outline"} className="h-auto min-h-16 justify-start whitespace-normal p-3 text-right" onClick={() => { setCreditAccountId(account.id); setAccountPickerOpen(false); }}><span><span className="block text-xs opacity-70">{account.code}</span><span>{account.name_ar}</span></span></Button>)}</div></div></DialogContent></Dialog>
    </main>
  );
}
