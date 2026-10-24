import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, Printer, Wallet } from "lucide-react";
import { numberToWords } from "@/lib/numberToWords";
import { CustodyRequestDocument, printCustodyRequest } from "./CustodyRequestPrint";

interface CustodyRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const CustodyRequestDialog = ({ open, onOpenChange }: CustodyRequestDialogProps) => {
  const [amountRaw, setAmountRaw] = useState("");
  const [date, setDate] = useState(today());
  const [preview, setPreview] = useState(false);

  const amount = parseFloat(amountRaw) || 0;
  const valid = amount > 0 && !!date;

  const handlePrint = () => {
    printCustodyRequest(amount, date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-5 w-5 text-teal-600" />
            نموذج طلب عهدة
          </DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custody-amount">المبلغ (ر.س)</Label>
                <Input
                  id="custody-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 5000"
                  value={amountRaw}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(v)) setAmountRaw(v);
                  }}
                  className="text-lg font-bold text-center"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custody-date">التاريخ</Label>
                <Input
                  id="custody-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-center"
                />
              </div>
            </div>

            {/* التفقيط التلقائي */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="text-xs text-muted-foreground mb-1">المبلغ كتابةً (تفقيط تلقائي)</div>
              <div className="font-bold text-teal-700 leading-relaxed min-h-[1.5rem]">
                {amount > 0 ? numberToWords(amount) : "—"}
              </div>
            </div>

            {/* نص الخطاب */}
            <div className="rounded-lg border p-4 text-sm leading-loose bg-background">
              <div className="font-bold mb-1">السيد / المدير العام المحترم</div>
              <div className="text-muted-foreground mb-2">السلام عليكم ورحمة الله وبركاته، وبعد:</div>
              <p>
                نأمل من سيادتكم صرف عهدة نقدية بمبلغ وقدره{" "}
                <span className="font-bold text-teal-700">
                  {amount > 0 ? amount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "⋯⋯"} ريال سعودي
                </span>{" "}
                وذلك للمصروفات الخاصة بالشركة.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إغلاق
              </Button>
              <Button
                onClick={() => setPreview(true)}
                disabled={!valid}
                className="bg-teal-600 hover:bg-teal-700 gap-2"
              >
                <Eye className="h-4 w-4" />
                معاينة وطباعة
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex gap-2 justify-between items-center print:hidden">
              <Button variant="outline" onClick={() => setPreview(false)}>
                رجوع للتعديل
              </Button>
              <Button onClick={handlePrint} className="bg-teal-600 hover:bg-teal-700 gap-2">
                <Printer className="h-4 w-4" />
                طباعة / حفظ PDF
              </Button>
            </div>
            <div className="overflow-auto border rounded-lg bg-slate-100 p-2 flex justify-center">
              <div style={{ transform: "scale(0.62)", transformOrigin: "top center" }}>
                <CustodyRequestDocument amount={amount} date={date} />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustodyRequestDialog;
