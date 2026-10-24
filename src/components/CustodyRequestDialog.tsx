import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, Printer, Wallet, Save, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fetchCustodyRequests, saveCustodyRequest, type CustodyRequestRecord } from "@/lib/custodyRequests";
import CustodyRequestRegister from "./CustodyRequestRegister";
import { numberToWords } from "@/lib/numberToWords";
import { CustodyRequestDocument, printCustodyRequest } from "./CustodyRequestPrint";

interface CustodyRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const CustodyRequestDialog = ({ open, onOpenChange }: CustodyRequestDialogProps) => {
  const { currentOrganizationId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amountRaw, setAmountRaw] = useState("");
  const [date, setDate] = useState(today());
  const [requestNo, setRequestNo] = useState("");
  const [preview, setPreview] = useState(false);
  const [tab, setTab] = useState("new");
  const [savedRecord, setSavedRecord] = useState<CustodyRequestRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const queryKey = ["custody-requests", currentOrganizationId];
  const register = useQuery({
    queryKey,
    queryFn: () => currentOrganizationId ? fetchCustodyRequests(currentOrganizationId) : Promise.resolve([]),
    enabled: open && !!currentOrganizationId,
  });

  const amount = parseFloat(amountRaw) || 0;
  const valid = Number.isFinite(amount) && amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const resetForm = () => {
    setAmountRaw(""); setDate(today()); setRequestNo(""); setSavedRecord(null); setPreview(false); setTab("new");
  };

  const openRecord = (record: CustodyRequestRecord) => {
    setSavedRecord(record); setAmountRaw(String(record.amount)); setDate(record.request_date);
    setRequestNo(record.request_number); setPreview(true);
  };

  const handleSave = async (showPreview: boolean) => {
    if (!valid || saving) return;
    if (savedRecord) { if (showPreview) setPreview(true); return; }
    if (!currentOrganizationId) { toast({ title: "تعذر تحديد الشركة، أعد تسجيل الدخول.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const record = await saveCustodyRequest(currentOrganizationId, amount, date);
      setSavedRecord(record); setRequestNo(record.request_number);
      await queryClient.invalidateQueries({ queryKey });
      toast({ title: `تم حفظ طلب العهدة ${record.request_number}` });
      if (showPreview) setPreview(true);
    } catch {
      toast({ title: "تعذر حفظ طلب العهدة، حاول مرة أخرى.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handlePrint = () => {
    if (savedRecord) printCustodyRequest(Number(savedRecord.amount), savedRecord.request_date, savedRecord.request_number);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-5 w-5 text-primary" />
            طلبات العهدة
          </DialogTitle>
        </DialogHeader>

        {!preview && <Tabs value={tab} onValueChange={setTab} dir="rtl">
          <TabsList className="w-full"><TabsTrigger value="new" className="flex-1">طلب عهدة</TabsTrigger><TabsTrigger value="register" className="flex-1">سجل طلبات العهدة</TabsTrigger></TabsList>
        </Tabs>}
        {!preview && tab === "register" ? <CustodyRequestRegister
          records={register.data || []} loading={register.isLoading} error={register.isError}
          onRefresh={() => { void register.refetch(); }} onPreview={openRecord}
          onPrint={record => printCustodyRequest(Number(record.amount), record.request_date, record.request_number)}
        /> : !preview ? (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custody-amount">المبلغ (ر.س)</Label>
                <Input
                  id="custody-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 5000"
                  value={amountRaw}
                  disabled={!!savedRecord || saving}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(v)) setAmountRaw(v);
                  }}
                  className="text-lg font-bold text-center"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custody-no">رقم الطلب</Label>
                <Input
                  id="custody-no"
                  type="text"
                  readOnly
                  placeholder="يُولّد تلقائيًا عند الحفظ"
                  value={requestNo}
                  dir="ltr"
                  className="text-lg font-bold text-center"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custody-date">التاريخ</Label>
                <Input
                  id="custody-date"
                  type="date"
                  value={date}
                  disabled={!!savedRecord || saving}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-center"
                />
              </div>
            </div>

            {/* التفقيط التلقائي */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="text-xs text-muted-foreground mb-1">المبلغ كتابةً (تفقيط تلقائي)</div>
              <div className="font-bold text-primary leading-relaxed min-h-[1.5rem]">
                {amount > 0 ? numberToWords(amount) : "—"}
              </div>
            </div>

            {/* نص الخطاب */}
            <div className="rounded-lg border p-4 text-sm leading-loose bg-background">
              <div className="font-bold mb-1">السيد / المدير العام المحترم</div>
              <div className="text-muted-foreground mb-2">السلام عليكم ورحمة الله وبركاته، وبعد:</div>
              <p>
                نأمل من سيادتكم صرف عهدة نقدية بمبلغ وقدره{" "}
                <span className="font-bold text-primary">
                  {amount > 0 ? amount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "⋯⋯"} ريال سعودي
                </span>{" "}
                ، وتُحوَّل على حساب بنك الرياض لصرفها حسب توجيهاتكم.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              {savedRecord ? <Button variant="outline" onClick={resetForm}><Plus className="h-4 w-4 ml-2" />طلب جديد</Button> : <Button variant="outline" onClick={() => { void handleSave(false); }} disabled={!valid || saving || !currentOrganizationId}><Save className="h-4 w-4 ml-2" />{saving ? "جارٍ الحفظ…" : "حفظ الطلب"}</Button>}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إغلاق
              </Button>
              <Button
                onClick={() => { void handleSave(true); }}
                disabled={!valid || saving || !currentOrganizationId}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                {savedRecord ? "معاينة وطباعة" : "حفظ ومعاينة"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex gap-2 justify-between items-center print:hidden">
              <Button variant="outline" onClick={() => setPreview(false)}>
                رجوع
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                طباعة / حفظ PDF
              </Button>
            </div>
            <div className="overflow-auto border rounded-lg bg-muted p-2 flex justify-center">
              <div style={{ transform: "scale(0.62)", transformOrigin: "top center" }}>
                <CustodyRequestDocument amount={amount} date={date} requestNo={requestNo} />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustodyRequestDialog;
