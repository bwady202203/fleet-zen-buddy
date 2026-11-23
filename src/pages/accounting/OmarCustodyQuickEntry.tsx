import AccountingPageHeader from "@/components/accounting/AccountingPageHeader";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { HandCoins, Printer, Search, Loader2 } from "lucide-react";
import JournalEntryVoucher, { type JournalVoucherEntry } from "@/components/accounting/JournalEntryVoucher";

const CUSTODY_CODE = "111106";
const SOURCE_CODE = "111004";

interface Acc { id: string; code: string; name_ar: string }

export default function OmarCustodyQuickEntry() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [expenses, setExpenses] = useState<Acc[]>([]);
  const [custody, setCustody] = useState<Acc | null>(null);
  const [source, setSource] = useState<Acc | null>(null);
  const [saving, setSaving] = useState(false);
  const [vouchers, setVouchers] = useState<JournalVoucherEntry[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("chart_of_accounts").select("id, code, name_ar, level")
        .or(`code.eq.${CUSTODY_CODE},code.eq.${SOURCE_CODE},and(code.like.5%,level.gte.4)`).order("code");
      const all = (data || []) as (Acc & { level: number })[];
      setCustody(all.find((a) => a.code === CUSTODY_CODE) || null);
      setSource(all.find((a) => a.code === SOURCE_CODE) || null);
      setExpenses(all.filter((a) => a.code.startsWith("5")));
    })();
    const reset = () => setPrinting(false);
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim();
    return q ? expenses.filter((e) => e.code.includes(q) || e.name_ar.includes(q)) : expenses;
  }, [search, expenses]);

  const value = parseFloat(amount);

  const nextNumbers = async () => {
    const year = new Date(date).getFullYear();
    const { data } = await supabase.from("journal_entries").select("entry_number")
      .like("entry_number", `JE-${year}%`).order("entry_number", { ascending: false }).limit(1);
    const n = data && data.length ? parseInt(data[0].entry_number.slice(-6)) || 0 : 0;
    const fmt = (k: number) => `JE-${year}${String(k).padStart(6, "0")}`;
    return [fmt(n + 1), fmt(n + 2)];
  };

  const createEntry = async (number: string, description: string, lines: { acc: Acc; debit: number; credit: number }[]) => {
    const { data: serial } = await supabase.rpc("generate_universal_serial", { prefix: "JE" });
    const { data: je, error } = await supabase.from("journal_entries").insert([{
      entry_number: number, date, description, reference: "omar_custody_quick",
      created_by: user?.id, universal_serial: serial as string,
    }]).select().single();
    if (error) throw error;
    const { error: lErr } = await supabase.from("journal_entry_lines").insert(lines.map((l) => ({
      journal_entry_id: je.id, account_id: l.acc.id, debit: l.debit, credit: l.credit, description,
    })));
    if (lErr) throw lErr;
    return {
      universalSerial: serial as string, entryNumber: number, date, description,
      lines: lines.map((l) => ({ accountCode: l.acc.code, accountName: l.acc.name_ar, description, debit: l.debit, credit: l.credit })),
      totalDebit: value, totalCredit: value,
    } as JournalVoucherEntry;
  };

  const handlePick = async (expense: Acc) => {
    if (!(value > 0)) { toast.error("اكتب المبلغ أولاً"); return; }
    if (!custody || !source) { toast.error("حساب عهدة عمر أو بنك الرياض غير موجود"); return; }
    setSaving(true);
    try {
      const [n1, n2] = await nextNumbers();
      const extra = note.trim() ? ` - ${note.trim()}` : "";
      const v1 = await createEntry(n1, `تعزيز عهدة عمر${extra}`, [
        { acc: custody, debit: value, credit: 0 }, { acc: source, debit: 0, credit: value },
      ]);
      const v2 = await createEntry(n2, `صرف من عهدة عمر - ${expense.name_ar.trim()}${extra}`, [
        { acc: expense, debit: value, credit: 0 }, { acc: custody, debit: 0, credit: value },
      ]);
      setVouchers([v1, v2]);
      setPreviewOpen(true);
      toast.success(`تم إنشاء القيدين ${n1} و ${n2}`);
      setAmount(""); setNote("");
    } catch (e: any) {
      toast.error("تعذر إنشاء القيود: " + e.message);
    } finally { setSaving(false); }
  };

  const handlePrint = () => { setPrinting(true); setTimeout(() => window.print(), 150); };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-primary print:hidden">
        <div className="container mx-auto px-4 py-5">
          <AccountingPageHeader title="قيد سريع — عهدة عمر" titleClassName="text-2xl font-bold"
            description={<p className="text-sm opacity-90">اكتب المبلغ ثم اختر نوع المصروف: يُنشأ قيد العهدة وقيد الصرف فورًا</p>}
            icon={<HandCoins className="h-9 w-9" />} className="text-primary-foreground" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 space-y-4 print:hidden">
        <Card className="p-4 grid gap-4 md:grid-cols-3">
          <div>
            <Label>المبلغ</Label>
            <Input autoFocus type="text" inputMode="decimal" value={amount} placeholder="0.00"
              className="text-2xl font-bold h-14" onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          </div>
          <div><Label>التاريخ</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-14" /></div>
          <div><Label>ملاحظة (اختياري)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} className="h-14" /></div>
          <p className="md:col-span-3 text-sm text-muted-foreground">
            القيد الأول: مدين {custody ? `${custody.code} ${custody.name_ar}` : CUSTODY_CODE} / دائن {source ? `${source.code} ${source.name_ar}` : SOURCE_CODE}
            — القيد الثاني: مدين نوع المصروف / دائن عهدة عمر
          </p>
        </Card>
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="ابحث عن نوع المصروف بالاسم أو الرمز" value={search} onChange={(e) => setSearch(e.target.value)} />
            {saving && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((e) => (
              <Button key={e.id} variant="outline" disabled={saving || !(value > 0)} onClick={() => handlePick(e)}
                className="h-auto py-3 flex flex-col items-start text-right whitespace-normal">
                <span className="font-mono text-xs text-muted-foreground">{e.code}</span>
                <span className="font-semibold">{e.name_ar}</span>
              </Button>
            ))}
          </div>
        </Card>
      </main>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto print:hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>معاينة القيدين</span>
              <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="ml-2 h-4 w-4" />طباعة</Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {vouchers.map((v) => <div key={v.entryNumber} className="border rounded-lg"><JournalEntryVoucher entry={v} /></div>)}
          </div>
        </DialogContent>
      </Dialog>

      {printing && createPortal(
        <div className="ledger-print-document" dir="rtl">
          {vouchers.map((v) => <div key={v.entryNumber} style={{ breakAfter: "page" }}><JournalEntryVoucher entry={v} /></div>)}
        </div>, document.body)}
    </div>
  );
}
