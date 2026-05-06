import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Printer, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import CustodyStatementPrintView, { StatementItem } from './CustodyStatementPrintView';
import { format } from 'date-fns';

interface ExpenseType {
  id: string;
  name_ar: string;
  code: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representativeName: string;
  representativeCode?: string;
  date: Date;
  expenseTypes: ExpenseType[];
  onSave: (items: StatementItem[], notes: string) => Promise<{ ok: boolean; statementNumber?: string }>;
}

const CombinedExpenseStatementDialog = ({
  open,
  onOpenChange,
  representativeName,
  representativeCode,
  date,
  expenseTypes,
  onSave,
}: Props) => {
  const [items, setItems] = useState<StatementItem[]>([]);
  const [typeId, setTypeId] = useState('');
  const [amount, setAmount] = useState('');
  const [withTax, setWithTax] = useState(true);
  const [desc, setDesc] = useState('');
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [savedNumber, setSavedNumber] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    const t = expenseTypes.find((x) => x.id === typeId);
    const a = parseFloat(amount);
    if (!t || !a || a <= 0) {
      toast.error('اختر نوع المصروف وأدخل مبلغاً صحيحاً');
      return;
    }
    const tax = withTax ? +(a * 0.15).toFixed(2) : 0;
    setItems((prev) => [
      ...prev,
      {
        expense_type_id: t.id,
        expense_type_name: t.name_ar,
        amount: a,
        tax,
        total: +(a + tax).toFixed(2),
        description: desc,
      },
    ]);
    setTypeId('');
    setAmount('');
    setDesc('');
  };

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const totals = items.reduce(
    (acc, i) => ({
      amount: acc.amount + i.amount,
      tax: acc.tax + i.tax,
      total: acc.total + i.total,
    }),
    { amount: 0, tax: 0, total: 0 }
  );

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('أضف بنداً واحداً على الأقل');
      return;
    }
    setSaving(true);
    const res = await onSave(items, notes);
    setSaving(false);
    if (res.ok) {
      setSavedNumber(res.statementNumber);
      toast.success('تم حفظ البيان والقيد بنجاح');
    }
  };

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 300);
  };

  const handleClose = () => {
    setItems([]);
    setNotes('');
    setSavedNumber(undefined);
    setShowPreview(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          dir="rtl"
          className="max-w-5xl max-h-[90vh] overflow-y-auto print:hidden"
        >
          <DialogHeader>
            <DialogTitle>بيان مصروفات مجمّع — {representativeName}</DialogTitle>
          </DialogHeader>

          {/* Add row */}
          <div className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg">
            <div className="col-span-4 space-y-1">
              <Label>نوع المصروف</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر..." />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name_ar} ({t.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>المبلغ</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="col-span-3 space-y-1">
              <Label>وصف</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="اختياري" />
            </div>
            <div className="col-span-2 flex items-center gap-2 pb-2">
              <Checkbox
                id="withTax"
                checked={withTax}
                onCheckedChange={(v) => setWithTax(!!v)}
              />
              <Label htmlFor="withTax" className="cursor-pointer">شامل ضريبة 15%</Label>
            </div>
            <div className="col-span-1">
              <Button onClick={addItem} className="w-full">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Items */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">م</TableHead>
                <TableHead className="text-right">نوع المصروف</TableHead>
                <TableHead className="text-right">الوصف</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">الضريبة</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    لا توجد بنود — أضف بنداً للبدء
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{it.expense_type_name}</TableCell>
                    <TableCell>{it.description || '-'}</TableCell>
                    <TableCell>{it.amount.toFixed(2)}</TableCell>
                    <TableCell>{it.tax.toFixed(2)}</TableCell>
                    <TableCell className="font-bold">{it.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {items.length > 0 && (
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={3}>الإجمالي</TableCell>
                  <TableCell>{totals.amount.toFixed(2)}</TableCell>
                  <TableCell>{totals.tax.toFixed(2)}</TableCell>
                  <TableCell>{totals.total.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="space-y-2">
            <Label>ملاحظات للبيان</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>إغلاق</Button>
            <Button onClick={handlePrint} variant="secondary" disabled={items.length === 0}>
              <Printer className="h-4 w-4 ml-2" />
              معاينة الطباعة
            </Button>
            <Button onClick={handleSave} disabled={saving || items.length === 0}>
              <Save className="h-4 w-4 ml-2" />
              {saving ? 'جاري الحفظ...' : 'حفظ القيد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print area (rendered to body when previewing) */}
      {showPreview && (
        <div className="custody-statement-print-wrapper fixed inset-0 z-[9999] bg-white overflow-auto print:static print:inset-auto">
          <div className="p-4 flex gap-2 justify-center print:hidden border-b">
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 ml-2" />طباعة
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)}>إغلاق المعاينة</Button>
          </div>
          <CustodyStatementPrintView
            representativeName={representativeName}
            representativeCode={representativeCode}
            date={date}
            items={items}
            notes={notes}
            statementNumber={savedNumber || `BN-${format(date, 'yyyyMMdd')}`}
          />
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              .custody-statement-print-wrapper, .custody-statement-print-wrapper * { visibility: visible !important; }
              .custody-statement-print-wrapper { position: absolute !important; left: 0; top: 0; width: 100%; }
              @page { size: A4; margin: 0; }
            }
          `}</style>
        </div>
      )}
    </>
  );
};

export default CombinedExpenseStatementDialog;
