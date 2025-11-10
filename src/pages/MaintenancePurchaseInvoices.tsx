import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Eye, Pencil, Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SparePart {
  id: string;
  name: string;
  code: string;
  unit_price: number;
}

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
}

interface InvoiceItem {
  id?: string;
  spare_part_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Invoice {
  id?: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  credit_account_id: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  items: InvoiceItem[];
}

export default function MaintenancePurchaseInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [currentInvoice, setCurrentInvoice] = useState<Invoice>({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    credit_account_id: '',
    subtotal: 0,
    tax_rate: 15,
    tax_amount: 0,
    total_amount: 0,
    notes: '',
    items: Array(6).fill(null).map(() => ({
      spare_part_id: null,
      item_name: '',
      quantity: 0,
      unit_price: 0,
      total_price: 0,
    }))
  });
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadInvoices();
    loadSpareParts();
    loadAccounts();
  }, []);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_purchase_invoices')
        .select(`
          *,
          maintenance_purchase_invoice_items (*)
        `)
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      const formattedInvoices = data?.map(inv => ({
        ...inv,
        items: inv.maintenance_purchase_invoice_items || []
      })) || [];

      setInvoices(formattedInvoices);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadSpareParts = async () => {
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('id, name, code, unit_price')
        .order('name');

      if (error) throw error;
      setSpareParts(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name_ar, name_en')
        .eq('type', 'liability')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateTotals = (items: InvoiceItem[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const tax_amount = subtotal * (taxRate / 100);
    const total_amount = subtotal + tax_amount;

    return { subtotal, tax_amount, total_amount };
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...currentInvoice.items];
    
    if (field === 'spare_part_id' && value) {
      const sparePart = spareParts.find(sp => sp.id === value);
      if (sparePart) {
        newItems[index] = {
          ...newItems[index],
          spare_part_id: value,
          item_name: sparePart.name,
          unit_price: sparePart.unit_price,
          total_price: newItems[index].quantity * sparePart.unit_price,
        };
      }
    } else if (field === 'quantity' || field === 'unit_price') {
      newItems[index] = {
        ...newItems[index],
        [field]: parseFloat(value) || 0,
      };
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };
    }

    const totals = calculateTotals(newItems, currentInvoice.tax_rate);
    setCurrentInvoice({
      ...currentInvoice,
      items: newItems,
      ...totals,
    });
  };

  const handleTaxRateChange = (value: string) => {
    const taxRate = parseFloat(value) || 0;
    const totals = calculateTotals(currentInvoice.items, taxRate);
    setCurrentInvoice({
      ...currentInvoice,
      tax_rate: taxRate,
      ...totals,
    });
  };

  const generateInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_purchase_invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const lastNumber = data?.[0]?.invoice_number?.match(/\d+$/)?.[0] || '0';
      const newNumber = `MINV-${(parseInt(lastNumber) + 1).toString().padStart(6, '0')}`;
      
      return newNumber;
    } catch (error) {
      return `MINV-${Date.now()}`;
    }
  };

  const createJournalEntry = async (invoice: Invoice, invoiceId: string) => {
    try {
      // إنشاء قيد يومي
      const { data: userData } = await supabase.auth.getUser();
      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userData?.user?.id)
        .single();

      // إنشاء رقم القيد
      const { data: journalData, error: journalError } = await supabase
        .rpc('create_journal_entry_with_number', {
          p_date: invoice.invoice_date,
          p_description: `فاتورة مشتريات صيانة رقم ${invoice.invoice_number} - ${invoice.supplier_name}`
        });

      if (journalError) throw journalError;

      const journalEntryId = journalData?.[0]?.id;

      // الحصول على حساب المخزون (مدين)
      const { data: inventoryAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('type', 'asset')
        .ilike('name_ar', '%مخزون%')
        .single();

      // إضافة سطور القيد
      const lines = [
        {
          journal_entry_id: journalEntryId,
          account_id: inventoryAccount?.id,
          description: `مخزون قطع غيار - ${invoice.supplier_name}`,
          debit: invoice.subtotal,
          credit: 0,
        },
        {
          journal_entry_id: journalEntryId,
          account_id: inventoryAccount?.id,
          description: `ضريبة القيمة المضافة`,
          debit: invoice.tax_amount,
          credit: 0,
        },
        {
          journal_entry_id: journalEntryId,
          account_id: invoice.credit_account_id,
          description: `الموردين - ${invoice.supplier_name}`,
          debit: 0,
          credit: invoice.total_amount,
        },
      ];

      for (const line of lines) {
        await supabase
          .from('journal_entry_lines')
          .insert(line);
      }

      // تحديث الفاتورة برقم القيد
      await supabase
        .from('maintenance_purchase_invoices')
        .update({ journal_entry_id: journalEntryId })
        .eq('id', invoiceId);

      return journalEntryId;
    } catch (error: any) {
      console.error('Error creating journal entry:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    try {
      if (!currentInvoice.supplier_name || !currentInvoice.credit_account_id) {
        toast({
          title: "خطأ",
          description: "يرجى إدخال اسم المورد والحساب الدائن",
          variant: "destructive",
        });
        return;
      }

      const validItems = currentInvoice.items.filter(item => 
        item.item_name && item.quantity > 0 && item.unit_price > 0
      );

      if (validItems.length === 0) {
        toast({
          title: "خطأ",
          description: "يرجى إضافة عنصر واحد على الأقل",
          variant: "destructive",
        });
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userData?.user?.id)
        .single();

      if (dialogMode === 'create') {
        const invoiceNumber = await generateInvoiceNumber();

        const { data: invoiceData, error: invoiceError } = await supabase
          .from('maintenance_purchase_invoices')
          .insert({
            invoice_number: invoiceNumber,
            invoice_date: currentInvoice.invoice_date,
            supplier_name: currentInvoice.supplier_name,
            credit_account_id: currentInvoice.credit_account_id,
            subtotal: currentInvoice.subtotal,
            tax_rate: currentInvoice.tax_rate,
            tax_amount: currentInvoice.tax_amount,
            total_amount: currentInvoice.total_amount,
            notes: currentInvoice.notes,
            organization_id: orgData?.organization_id,
            created_by: userData?.user?.id,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        const itemsToInsert = validItems.map(item => ({
          invoice_id: invoiceData.id,
          spare_part_id: item.spare_part_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          organization_id: orgData?.organization_id,
        }));

        const { error: itemsError } = await supabase
          .from('maintenance_purchase_invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // إنشاء قيد يومي
        await createJournalEntry(currentInvoice, invoiceData.id);

        // تحديث كمية قطع الغيار
        for (const item of validItems) {
          if (item.spare_part_id) {
            const { data: sparePartData } = await supabase
              .from('spare_parts')
              .select('quantity')
              .eq('id', item.spare_part_id)
              .single();

            await supabase
              .from('spare_parts')
              .update({ quantity: (sparePartData?.quantity || 0) + item.quantity })
              .eq('id', item.spare_part_id);
          }
        }

        toast({
          title: "نجح",
          description: "تم إضافة الفاتورة بنجاح",
        });
      } else if (dialogMode === 'edit') {
        // تحديث الفاتورة
        const { error: updateError } = await supabase
          .from('maintenance_purchase_invoices')
          .update({
            invoice_date: currentInvoice.invoice_date,
            supplier_name: currentInvoice.supplier_name,
            credit_account_id: currentInvoice.credit_account_id,
            subtotal: currentInvoice.subtotal,
            tax_rate: currentInvoice.tax_rate,
            tax_amount: currentInvoice.tax_amount,
            total_amount: currentInvoice.total_amount,
            notes: currentInvoice.notes,
          })
          .eq('id', currentInvoice.id);

        if (updateError) throw updateError;

        // حذف العناصر القديمة وإضافة الجديدة
        await supabase
          .from('maintenance_purchase_invoice_items')
          .delete()
          .eq('invoice_id', currentInvoice.id);

        const itemsToInsert = validItems.map(item => ({
          invoice_id: currentInvoice.id,
          spare_part_id: item.spare_part_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          organization_id: orgData?.organization_id,
        }));

        const { error: itemsError } = await supabase
          .from('maintenance_purchase_invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        toast({
          title: "نجح",
          description: "تم تحديث الفاتورة بنجاح",
        });
      }

      setShowDialog(false);
      loadInvoices();
      resetForm();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;

    try {
      const { error } = await supabase
        .from('maintenance_purchase_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "نجح",
        description: "تم حذف الفاتورة بنجاح",
      });

      loadInvoices();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setCurrentInvoice({
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      supplier_name: '',
      credit_account_id: '',
      subtotal: 0,
      tax_rate: 15,
      tax_amount: 0,
      total_amount: 0,
      notes: '',
      items: Array(6).fill(null).map(() => ({
        spare_part_id: null,
        item_name: '',
        quantity: 0,
        unit_price: 0,
        total_price: 0,
      }))
    });
  };

  const openDialog = (mode: 'create' | 'edit' | 'view', invoice?: Invoice) => {
    setDialogMode(mode);
    if (invoice) {
      // تأكد من أن هناك 6 عناصر على الأقل
      const items = [...invoice.items];
      while (items.length < 6) {
        items.push({
          spare_part_id: null,
          item_name: '',
          quantity: 0,
          unit_price: 0,
          total_price: 0,
        });
      }
      setCurrentInvoice({ ...invoice, items });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">فواتير مشتريات الصيانة</CardTitle>
            <Button onClick={() => openDialog('create')}>
              <Plus className="h-4 w-4 ml-2" />
              فاتورة جديدة
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الفاتورة أو اسم المورد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoice_number}</TableCell>
                  <TableCell>{new Date(invoice.invoice_date).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>{invoice.supplier_name}</TableCell>
                  <TableCell>{invoice.total_amount.toFixed(2)} ريال</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDialog('view', invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDialog('edit', invoice)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(invoice.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'فاتورة مشتريات جديدة' : 
               dialogMode === 'edit' ? 'تعديل الفاتورة' : 'عرض الفاتورة'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={currentInvoice.invoice_date}
                  onChange={(e) => setCurrentInvoice({ ...currentInvoice, invoice_date: e.target.value })}
                  disabled={dialogMode === 'view'}
                />
              </div>
              <div>
                <Label>المورد / المندوب</Label>
                <Input
                  value={currentInvoice.supplier_name}
                  onChange={(e) => setCurrentInvoice({ ...currentInvoice, supplier_name: e.target.value })}
                  disabled={dialogMode === 'view'}
                  placeholder="اسم المورد أو المندوب"
                />
              </div>
              <div>
                <Label>الحساب الدائن</Label>
                <Select
                  value={currentInvoice.credit_account_id}
                  onValueChange={(value) => setCurrentInvoice({ ...currentInvoice, credit_account_id: value })}
                  disabled={dialogMode === 'view'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">العناصر</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>قطعة الغيار</TableHead>
                    <TableHead>اسم الصنف</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>سعر الوحدة</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    {dialogMode !== 'view' && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInvoice.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={item.spare_part_id || ''}
                          onValueChange={(value) => handleItemChange(index, 'spare_part_id', value)}
                          disabled={dialogMode === 'view'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر قطعة غيار" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">+ صنف جديد</SelectItem>
                            {spareParts.map((sp) => (
                              <SelectItem key={sp.id} value={sp.id}>
                                {sp.code} - {sp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.item_name}
                          onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                          disabled={dialogMode === 'view'}
                          placeholder="اسم الصنف"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          disabled={dialogMode === 'view'}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price || ''}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          disabled={dialogMode === 'view'}
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>{item.total_price.toFixed(2)}</TableCell>
                      {dialogMode !== 'view' && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const newItems = [...currentInvoice.items];
                              newItems[index] = {
                                spare_part_id: null,
                                item_name: '',
                                quantity: 0,
                                unit_price: 0,
                                total_price: 0,
                              };
                              const totals = calculateTotals(newItems, currentInvoice.tax_rate);
                              setCurrentInvoice({ ...currentInvoice, items: newItems, ...totals });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <div></div>
              <div></div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span>{currentInvoice.subtotal.toFixed(2)} ريال</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>الضريبة:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={currentInvoice.tax_rate}
                      onChange={(e) => handleTaxRateChange(e.target.value)}
                      disabled={dialogMode === 'view'}
                      className="w-20"
                    />
                    <span>%</span>
                    <span>{currentInvoice.tax_amount.toFixed(2)} ريال</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>الإجمالي:</span>
                  <span>{currentInvoice.total_amount.toFixed(2)} ريال</span>
                </div>
              </div>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={currentInvoice.notes}
                onChange={(e) => setCurrentInvoice({ ...currentInvoice, notes: e.target.value })}
                disabled={dialogMode === 'view'}
                rows={3}
              />
            </div>

            {dialogMode !== 'view' && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}