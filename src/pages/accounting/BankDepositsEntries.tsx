import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowRight, Loader2, Save, Trash2, Wand2, Landmark, Search, Settings2, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  level: number;
  type: string;
}

interface DepositRow {
  date: string;
  name: string;
  amount: number;
  accountId: string | null;
  auto: boolean;
}

// حساب بنك الرياض (الرمال)
const RIYADH_BANK_ACCOUNT_ID = "2edc3d0d-7582-4173-81f2-4b547ad32874";
const DEBIT_STORAGE_KEY = "bank_deposits_debit_account_v1";

const normalizeAr = (s: string) =>
  (s || "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const parseAmount = (value: string): number => {
  if (!value) return 0;
  let str = String(value).trim();
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  str = str.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
  str = str.replace(/٫/g, ".").replace(/٬/g, "").replace(/,/g, "");
  str = str.replace(/[^\d.]/g, "");
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
};

const isDateLike = (s: string) => /\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test((s || "").trim());

const normalizeDate = (raw: string): string => {
  const s = (raw || "").trim();
  let m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  return format(new Date(), "yyyy-MM-dd");
};

export default function BankDepositsEntries() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState("");
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerRow, setPickerRow] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debitAccountId, setDebitAccountId] = useState<string>(
    localStorage.getItem(DEBIT_STORAGE_KEY) || RIYADH_BANK_ACCOUNT_ID
  );
  const [debitPickerOpen, setDebitPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name_ar, name_en, level, type")
        .eq("is_active", true)
        .order("code");
      if (error) toast.error("خطأ في تحميل الحسابات");
      setAccounts((data as Account[]) || []);
      setLoading(false);
    })();
  }, []);

  const getAccount = (id: string | null) => accounts.find((a) => a.id === id);

  // مرشحو الحسابات الدائنة (الالتزامات / الذمم) مع بقية الحسابات كاحتياط
  const predictAccount = (name: string): string | null => {
    const target = normalizeAr(name);
    if (!target) return null;
    const scored = accounts
      .map((a) => {
        const n = normalizeAr(a.name_ar || "");
        let score = 0;
        if (n === target) score = 100;
        else if (n.includes(target)) score = 80 - Math.min(20, n.length - target.length);
        else if (target.includes(n) && n.length >= 3) score = 70;
        else {
          const words = target.split(" ").filter((w) => w.length >= 3);
          const hits = words.filter((w) => n.includes(w)).length;
          if (hits > 0) score = 40 + hits * 5;
        }
        if (score > 0) {
          if (a.type === "liability") score += 12;
          if (a.level >= 4) score += 6;
          if (a.id === debitAccountId) score = 0;
        }
        return { id: a.id, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.length ? scored[0].id : null;
  };

  const handleParse = () => {
    const lines = rawData.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error("لا توجد بيانات للتحليل");
      return;
    }
    const parsed: DepositRow[] = [];
    for (const line of lines) {
      const cells = line.split(/\t|\s{2,}|;|\|/).map((c) => c.trim()).filter(Boolean);
      if (cells.length < 2) continue;
      const dateCell = cells.find((c) => isDateLike(c)) || "";
      const rest = cells.filter((c) => c !== dateCell);
      // المبلغ: أول خلية رقمية بحتة
      const amountCell =
        rest.find((c) => /^[\d.,٠-٩٫٬\s]+$/.test(c) && parseAmount(c) > 0) || "";
      const nameCell = rest.filter((c) => c !== amountCell).join(" ").trim();
      const amount = parseAmount(amountCell);
      if (!amount) continue;
      const accountId = predictAccount(nameCell);
      parsed.push({
        date: normalizeDate(dateCell),
        name: nameCell,
        amount,
        accountId,
        auto: !!accountId,
      });
    }
    if (parsed.length === 0) {
      toast.error("لم يتم التعرف على أي صف صحيح");
      return;
    }
    parsed.sort((a, b) => a.date.localeCompare(b.date));
    setRows(parsed);
    const matched = parsed.filter((r) => r.accountId).length;
    toast.success(`تم تحليل ${parsed.length} إيداع — تم التنبؤ بالحساب لـ ${matched}`);
  };

  const setRowAccount = (index: number, id: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, accountId: id, auto: false } : r)));
    setPickerRow(null);
    setSearch("");
  };

  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const filteredAccounts = useMemo(() => {
    const q = normalizeAr(search);
    if (!q) return accounts.slice(0, 200);
    return accounts
      .filter(
        (a) =>
          normalizeAr(a.name_ar).includes(q) ||
          a.code.includes(search.trim()) ||
          (a.name_en || "").toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 200);
  }, [accounts, search]);

  const dateGroups = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const r of rows) {
      const cur = map.get(r.date) || { total: 0, count: 0 };
      cur.total += r.amount;
      cur.count += 1;
      map.set(r.date, cur);
    }
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const missingCount = rows.filter((r) => !r.accountId).length;

  const handleSave = async () => {
    const valid = rows.filter((r) => r.accountId && r.amount > 0);
    if (valid.length === 0) {
      toast.error("يرجى اختيار حساب لكل إيداع قبل الحفظ");
      return;
    }
    if (!debitAccountId) {
      toast.error("يرجى تحديد الحساب المدين (البنك)");
      return;
    }

    const groups = new Map<string, DepositRow[]>();
    for (const r of valid) {
      if (!groups.has(r.date)) groups.set(r.date, []);
      groups.get(r.date)!.push(r);
    }

    setIsSaving(true);
    try {
      const savedNumbers: string[] = [];
      for (const dateKey of Array.from(groups.keys()).sort()) {
        const groupRows = groups.get(dateKey)!;
        const yearOfEntry = new Date(dateKey).getFullYear();

        const { data: existingEntries } = await supabase
          .from("journal_entries")
          .select("entry_number")
          .like("entry_number", `JE-${yearOfEntry}%`)
          .order("entry_number", { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (existingEntries && existingEntries.length > 0) {
          nextNumber = (parseInt(existingEntries[0].entry_number.slice(-6)) || 0) + 1;
        }
        const entryNumber = `JE-${yearOfEntry}${nextNumber.toString().padStart(6, "0")}`;

        const bankName = getAccount(debitAccountId)?.name_ar || "بنك الرياض";
        const { data: journalEntry, error: entryError } = await supabase
          .from("journal_entries")
          .insert({
            entry_number: entryNumber,
            date: dateKey,
            description: `إيداعات ${bankName} - ${dateKey}`,
            reference: "bank_deposits",
          })
          .select()
          .single();
        if (entryError) throw entryError;

        const lines: any[] = [];
        let groupTotal = 0;
        for (const r of groupRows) {
          groupTotal += r.amount;
          lines.push({
            journal_entry_id: journalEntry.id,
            account_id: r.accountId,
            debit: 0,
            credit: r.amount,
            description: `إيداع ${r.name}`.trim(),
          });
        }
        lines.unshift({
          journal_entry_id: journalEntry.id,
          account_id: debitAccountId,
          debit: groupTotal,
          credit: 0,
          description: `إيداعات ${bankName} - ${dateKey}`,
        });

        const { error: linesError } = await supabase.from("journal_entry_lines").insert(lines);
        if (linesError) throw linesError;
        savedNumbers.push(entryNumber);
      }

      toast.success(`تم حفظ ${savedNumbers.length} قيد بنجاح (${savedNumbers.join("، ")})`);
      setRows([]);
      setRawData("");
    } catch (e: any) {
      toast.error("خطأ في حفظ القيود: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/accounting")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Landmark className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">قيود الإيداعات البنكية</h1>
              <p className="text-xs text-muted-foreground">
                لصق الإيداعات (المبلغ / الاسم / التاريخ) والتنبؤ بالحساب وإنشاء قيد لكل تاريخ
              </p>
              <button
                type="button"
                onClick={() => { setDebitPickerOpen(true); setSearch(""); }}
                className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-1 rounded border bg-primary/5 hover:bg-primary/10"
              >
                <Settings2 className="h-3.5 w-3.5" />
                الطرف المدين: {getAccount(debitAccountId)?.name_ar || "بنك الرياض"}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rows.length > 0 && (
              <>
                <Button variant="outline" onClick={() => setRows([])}>
                  <Trash2 className="h-4 w-4 ml-2" /> مسح
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
                  حفظ القيود ({dateGroups.length})
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <Card className="p-4">
          <p className="text-sm font-semibold mb-2">لصق البيانات من إكسل</p>
          <Textarea
            dir="rtl"
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            placeholder={"1,500.00\tالراجحي\t24/01/2026\n10,000.00\tسلطان\t22/01/2026"}
            className="min-h-[140px] font-mono text-sm"
          />
          <div className="flex items-center gap-2 mt-3">
            <Button onClick={handleParse}>
              <Wand2 className="h-4 w-4 ml-2" /> تحليل والتنبؤ بالحسابات
            </Button>
            <span className="text-xs text-muted-foreground">
              الأعمدة: المبلغ، الاسم، التاريخ (بأي ترتيب)
            </span>
          </div>
        </Card>

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {dateGroups.map((g) => (
                <div key={g.date} className="rounded-lg border bg-card px-3 py-2 text-xs">
                  <div className="flex items-center gap-1 font-semibold">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    {g.date}
                  </div>
                  <div className="text-muted-foreground">
                    {g.count} إيداع — {g.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>

            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="p-2 text-right w-12">#</th>
                    <th className="p-2 text-right">التاريخ</th>
                    <th className="p-2 text-right">الاسم في البيان</th>
                    <th className="p-2 text-right">المبلغ</th>
                    <th className="p-2 text-right">الحساب الدائن</th>
                    <th className="p-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const acc = getAccount(r.accountId);
                    return (
                      <tr key={i} className={cn("border-t", !r.accountId && "bg-destructive/5")}>
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2">
                          <Input
                            type="date"
                            value={r.date}
                            onChange={(e) =>
                              setRows((prev) => prev.map((x, ix) => (ix === i ? { ...x, date: e.target.value } : x)))
                            }
                            className="h-8 w-36"
                          />
                        </td>
                        <td className="p-2 font-medium">{r.name || "—"}</td>
                        <td className="p-2 font-bold tabular-nums">
                          {r.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => { setPickerRow(i); setSearch(r.name || ""); }}
                            className={cn(
                              "w-full text-right px-2 py-1.5 rounded border text-xs hover:bg-accent",
                              acc ? (r.auto ? "bg-amber-50 border-amber-300" : "bg-emerald-50 border-emerald-300") : "bg-background"
                            )}
                          >
                            {acc ? `${acc.code} - ${acc.name_ar}${r.auto ? " (تنبؤ)" : ""}` : "اختر الحساب..."}
                          </button>
                        </td>
                        <td className="p-2 text-center">
                          <Button variant="ghost" size="icon" onClick={() => removeRow(i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/60 font-bold">
                  <tr>
                    <td className="p-2" colSpan={3}>
                      الإجمالي ({rows.length} إيداع){missingCount ? ` — ${missingCount} بدون حساب` : ""}
                    </td>
                    <td className="p-2 tabular-nums">
                      {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2" colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </>
        )}
      </div>

      <Dialog
        open={pickerRow !== null || debitPickerOpen}
        onOpenChange={(o) => {
          if (!o) { setPickerRow(null); setDebitPickerOpen(false); setSearch(""); }
        }}
      >
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{debitPickerOpen ? "اختيار الحساب المدين (البنك)" : "اختيار الحساب الدائن"}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الحساب..."
              className="pr-9"
            />
          </div>
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {filteredAccounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  if (debitPickerOpen) {
                    setDebitAccountId(a.id);
                    localStorage.setItem(DEBIT_STORAGE_KEY, a.id);
                    setDebitPickerOpen(false);
                    setSearch("");
                  } else if (pickerRow !== null) {
                    setRowAccount(pickerRow, a.id);
                  }
                }}
                className="w-full text-right px-3 py-2 rounded border hover:bg-accent text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground ml-2">{a.code}</span>
                {a.name_ar}
              </button>
            ))}
            {filteredAccounts.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">لا توجد نتائج</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
