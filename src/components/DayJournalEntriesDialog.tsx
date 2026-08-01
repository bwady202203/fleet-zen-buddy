import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Printer, Save, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface AccountOption {
  id: string;
  code: string;
  name_ar: string;
}

interface LineDraft {
  id?: string;
  account_id: string;
  description: string;
  debit: string;
  credit: string;
  _deleted?: boolean;
}

interface EntryDraft {
  id?: string;
  entry_number: string;
  date: string;
  description: string;
  reference: string | null;
  lines: LineDraft[];
  isNew?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string; // yyyy-MM-dd
  accountId: string;
  accounts: AccountOption[];
  onChanged?: () => void;
}

const num = (v: string) => {
  const n = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};
const fmt = (n: number) =>
  n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DayJournalEntriesDialog = ({ open, onOpenChange, date, accountId, accounts, onChanged }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<EntryDraft[]>([]);

  const accountMap = useMemo(() => {
    const m = new Map<string, AccountOption>();
    accounts.forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const currentAccount = accountMap.get(accountId);

  useEffect(() => {
    if (open && date) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date, accountId]);

  const load = async () => {
    setLoading(true);
    try {
      // entry ids on this date touching the selected account
      const { data: idRows, error: idErr } = await supabase
        .from("journal_entry_lines")
        .select("journal_entry_id, journal_entries!inner(date)")
        .eq("account_id", accountId)
        .eq("journal_entries.date", date);
      if (idErr) throw idErr;

      const ids = Array.from(new Set((idRows || []).map((r: any) => r.journal_entry_id)));
      if (ids.length === 0) {
        setEntries([]);
        return;
      }

      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, entry_number, date, description, reference, journal_entry_lines(id, account_id, description, debit, credit)")
        .in("id", ids)
        .order("entry_number", { ascending: true });
      if (error) throw error;

      setEntries(
        (data || []).map((e: any) => ({
          id: e.id,
          entry_number: e.entry_number,
          date: e.date,
          description: e.description || "",
          reference: e.reference,
          lines: (e.journal_entry_lines || []).map((l: any) => ({
            id: l.id,
            account_id: l.account_id,
            description: l.description || "",
            debit: l.debit ? String(l.debit) : "",
            credit: l.credit ? String(l.credit) : "",
          })),
        }))
      );
    } catch (err) {
      console.error(err);
      toast({ title: "خطأ في تحميل قيود اليوم", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addNewEntry = () => {
    setEntries((prev) => [
      ...prev,
      {
        entry_number: "",
        date,
        description: "",
        reference: null,
        isNew: true,
        lines: [
          { account_id: accountId, description: "", debit: "", credit: "" },
          { account_id: "", description: "", debit: "", credit: "" },
        ],
      },
    ]);
  };

  const updateEntry = (idx: number, patch: Partial<EntryDraft>) =>
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  const updateLine = (eIdx: number, lIdx: number, patch: Partial<LineDraft>) =>
    setEntries((prev) =>
      prev.map((e, i) =>
        i === eIdx ? { ...e, lines: e.lines.map((l, j) => (j === lIdx ? { ...l, ...patch } : l)) } : e
      )
    );

  const addLine = (eIdx: number) =>
    setEntries((prev) =>
      prev.map((e, i) =>
        i === eIdx ? { ...e, lines: [...e.lines, { account_id: "", description: "", debit: "", credit: "" }] } : e
      )
    );

  const removeLine = (eIdx: number, lIdx: number) =>
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== eIdx) return e;
        const line = e.lines[lIdx];
        if (line.id) {
          return { ...e, lines: e.lines.map((l, j) => (j === lIdx ? { ...l, _deleted: true } : l)) };
        }
        return { ...e, lines: e.lines.filter((_, j) => j !== lIdx) };
      })
    );

  const nextEntryNumber = async (entryDate: string) => {
    const year = new Date(entryDate).getFullYear();
    const { data } = await supabase
      .from("journal_entries")
      .select("entry_number")
      .like("entry_number", `JE-${year}%`)
      .order("entry_number", { ascending: false })
      .limit(1);
    let n = 110000;
    if (data && data.length > 0) {
      const last = parseInt(String(data[0].entry_number).slice(-6));
      if (!isNaN(last)) n = last + 1;
    }
    return `JE-${year}${String(n).padStart(6, "0")}`;
  };

  const saveEntry = async (idx: number) => {
    const entry = entries[idx];
    const active = entry.lines.filter((l) => !l._deleted);
    if (active.some((l) => !l.account_id)) {
      toast({ title: "يجب اختيار الحساب لكل سطر", variant: "destructive" });
      return;
    }
    const totalDebit = active.reduce((s, l) => s + num(l.debit), 0);
    const totalCredit = active.reduce((s, l) => s + num(l.credit), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast({ title: "القيد غير متوازن", description: `مدين ${fmt(totalDebit)} / دائن ${fmt(totalCredit)}`, variant: "destructive" });
      return;
    }
    if (totalDebit === 0) {
      toast({ title: "لا يمكن حفظ قيد بقيمة صفر", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let entryId = entry.id;
      if (!entryId) {
        const entryNumber = entry.entry_number || (await nextEntryNumber(entry.date));
        const { data, error } = await supabase
          .from("journal_entries")
          .insert({
            entry_number: entryNumber,
            date: entry.date,
            description: entry.description || null,
            reference: entry.reference,
          })
          .select("id, entry_number")
          .single();
        if (error) throw error;
        entryId = data.id;
        updateEntry(idx, { id: data.id, entry_number: data.entry_number, isNew: false });
      } else {
        const { error } = await supabase
          .from("journal_entries")
          .update({ date: entry.date, description: entry.description || null })
          .eq("id", entryId);
        if (error) throw error;
      }

      // deletions
      const toDelete = entry.lines.filter((l) => l._deleted && l.id).map((l) => l.id as string);
      if (toDelete.length) {
        const { error } = await supabase.from("journal_entry_lines").delete().in("id", toDelete);
        if (error) throw error;
      }

      for (const l of active) {
        const payload = {
          account_id: l.account_id,
          description: l.description || null,
          debit: num(l.debit),
          credit: num(l.credit),
          journal_entry_id: entryId!,
        };
        if (l.id) {
          const { error } = await supabase.from("journal_entry_lines").update(payload).eq("id", l.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("journal_entry_lines").insert(payload);
          if (error) throw error;
        }
      }

      toast({ title: "تم حفظ القيد بنجاح" });
      await load();
      onChanged?.();
    } catch (err: any) {
      console.error(err);
      toast({ title: "خطأ في الحفظ", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const printDay = () => {
    const rows = entries
      .filter((e) => !e.isNew)
      .map((e) => {
        const lines = e.lines
          .filter((l) => !l._deleted)
          .map((l) => {
            const acc = accountMap.get(l.account_id);
            return `<tr>
              <td>${acc?.code || ""}</td>
              <td>${acc?.name_ar || ""}</td>
              <td>${l.description || ""}</td>
              <td style="text-align:left">${num(l.debit) ? fmt(num(l.debit)) : "-"}</td>
              <td style="text-align:left">${num(l.credit) ? fmt(num(l.credit)) : "-"}</td>
            </tr>`;
          })
          .join("");
        const td = e.lines.filter((l) => !l._deleted).reduce((s, l) => s + num(l.debit), 0);
        const tc = e.lines.filter((l) => !l._deleted).reduce((s, l) => s + num(l.credit), 0);
        return `<div class="entry">
          <div class="ehead"><strong>قيد رقم: ${e.entry_number}</strong><span>${e.date}</span></div>
          <div class="edesc">${e.description || ""}</div>
          <table><thead><tr><th>الكود</th><th>الحساب</th><th>البيان</th><th>مدين</th><th>دائن</th></tr></thead>
          <tbody>${lines}</tbody>
          <tfoot><tr><td colspan="3">الإجمالي</td><td style="text-align:left">${fmt(td)}</td><td style="text-align:left">${fmt(tc)}</td></tr></tfoot>
          </table></div>`;
      })
      .join("");

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>قيود يوم ${date}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: 'Cairo', sans-serif; color:#111; }
        h1 { text-align:center; font-size:18pt; margin:0 0 2mm; }
        h2 { text-align:center; font-size:13pt; font-weight:600; margin:0 0 6mm; color:#0a4a8a; }
        .entry { margin-bottom:8mm; page-break-inside:avoid; }
        .ehead { display:flex; justify-content:space-between; font-size:11pt; margin-bottom:1mm; }
        .edesc { font-size:10pt; color:#444; margin-bottom:2mm; }
        table { width:100%; border-collapse:collapse; font-size:10pt; }
        th,td { border:1px solid #999; padding:1.8mm; text-align:right; }
        thead tr { background:#0a4a8a; color:#fff; }
        tfoot tr { background:#e8eef7; font-weight:700; }
      </style></head><body>
      <h1>قيود يومية</h1>
      <h2>${currentAccount ? `${currentAccount.code} - ${currentAccount.name_ar}` : ""} — ${format(new Date(date), "PPP", { locale: ar })}</h2>
      ${rows || "<p style='text-align:center'>لا توجد قيود</p>"}
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            <span>قيود يوم {date}</span>
            {currentAccount && (
              <span className="text-sm font-normal text-muted-foreground">
                <span className="font-mono bg-muted px-2 py-0.5 rounded ml-1">{currentAccount.code}</span>
                {currentAccount.name_ar}
              </span>
            )}
            <div className="flex items-center gap-2 mr-auto">
              <Button size="sm" variant="outline" className="gap-1" onClick={printDay}>
                <Printer className="h-4 w-4" /> طباعة
              </Button>
              <Button size="sm" className="gap-1" onClick={addNewEntry}>
                <Plus className="h-4 w-4" /> قيد جديد
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto space-y-4 pl-1">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">لا توجد قيود لهذا اليوم — يمكنك إضافة قيد جديد</div>
          ) : (
            entries.map((entry, eIdx) => {
              const active = entry.lines.filter((l) => !l._deleted);
              const td = active.reduce((s, l) => s + num(l.debit), 0);
              const tc = active.reduce((s, l) => s + num(l.credit), 0);
              const balanced = Math.abs(td - tc) < 0.01;
              return (
                <Card key={entry.id || `new-${eIdx}`} className={entry.isNew ? "border-primary/50" : ""}>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {entry.entry_number || "قيد جديد"}
                      </span>
                      <Input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(eIdx, { date: e.target.value })}
                        className="w-[150px] h-9"
                      />
                      <Input
                        placeholder="بيان القيد"
                        value={entry.description}
                        onChange={(e) => updateEntry(eIdx, { description: e.target.value })}
                        className="flex-1 min-w-[200px] h-9"
                      />
                      <Button size="sm" className="gap-1" disabled={saving} onClick={() => saveEntry(eIdx)}>
                        <Save className="h-4 w-4" /> حفظ
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {entry.lines.map((line, lIdx) =>
                        line._deleted ? null : (
                          <div key={line.id || `l-${lIdx}`} className="flex flex-wrap items-center gap-2">
                            <Select
                              value={line.account_id}
                              onValueChange={(v) => updateLine(eIdx, lIdx, { account_id: v })}
                            >
                              <SelectTrigger className="w-[260px] h-9">
                                <SelectValue placeholder="اختر الحساب" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {accounts.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    <span className="font-mono text-xs ml-2">{a.code}</span>
                                    {a.name_ar}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="بيان السطر"
                              value={line.description}
                              onChange={(e) => updateLine(eIdx, lIdx, { description: e.target.value })}
                              className="flex-1 min-w-[160px] h-9"
                            />
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="مدين"
                              value={line.debit}
                              onChange={(e) => updateLine(eIdx, lIdx, { debit: e.target.value, credit: "" })}
                              className="w-[120px] h-9 text-red-600 font-medium"
                            />
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="دائن"
                              value={line.credit}
                              onChange={(e) => updateLine(eIdx, lIdx, { credit: e.target.value, debit: "" })}
                              className="w-[120px] h-9 text-emerald-600 font-medium"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-destructive"
                              onClick={() => removeLine(eIdx, lIdx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => addLine(eIdx)}>
                        <Plus className="h-4 w-4" /> إضافة سطر
                      </Button>
                      <span className="text-sm">
                        مدين: <span className="font-bold text-red-600">{fmt(td)}</span>
                      </span>
                      <span className="text-sm">
                        دائن: <span className="font-bold text-emerald-600">{fmt(tc)}</span>
                      </span>
                      {!balanced && (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <X className="h-3 w-3" /> القيد غير متوازن
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DayJournalEntriesDialog;
