import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Plus, Save, Printer, Eye, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import QRCode from "qrcode";

const LoadInvoices = () => {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loads, setLoads] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    companyId: '',
    paymentType: 'cash',
    notes: ''
  });
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [invoicesRes, companiesRes] = await Promise.all([
      supabase
        .from('load_invoices')
        .select('*, companies(name), load_invoice_items(*, loads(load_number, load_types(name)))')
        .order('created_at', { ascending: false }),
      supabase.from('companies').select('*').eq('is_active', true)
    ]);

    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
  };

  const loadCompanyLoads = async (companyId: string) => {
    const { data } = await supabase
      .from('loads')
      .select('*, load_types(name)')
      .eq('company_id', companyId)
      .eq('status', 'pending');

    if (data) {
      setLoads(data);
      setItems(data.map(load => ({
        loadId: load.id,
        description: load.load_types?.name || 'شحنة',
        quantity: load.quantity,
        unitPrice: load.unit_price,
        total: load.total_amount
      })));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { subtotal, taxAmount, totalAmount } = calculateTotals();
      
      const invoiceNumber = `INV-${Date.now()}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('load_invoices')
        .insert({
          invoice_number: invoiceNumber,
          date: formData.date,
          company_id: formData.companyId,
          payment_type: formData.paymentType,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes: formData.notes,
          created_by: user?.id,
          status: 'completed'
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert invoice items
      const itemsToInsert = items.map(item => ({
        invoice_id: invoice.id,
        load_id: item.loadId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from('load_invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update load status to completed
      const loadIds = items.map(item => item.loadId);
      const { error: loadUpdateError } = await supabase
        .from('loads')
        .update({ status: 'completed' })
        .in('id', loadIds);

      if (loadUpdateError) throw loadUpdateError;

      // Deduct quantities from company balance
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const { data: company } = await supabase
        .from('companies')
        .select('total_quantity')
        .eq('id', formData.companyId)
        .single();

      if (company) {
        await supabase
          .from('companies')
          .update({ 
            total_quantity: Math.max(0, (company.total_quantity || 0) - totalQuantity)
          })
          .eq('id', formData.companyId);
      }

      toast({
        title: "تم الحفظ",
        description: "تم إنشاء الفاتورة وخصم الكميات بنجاح"
      });

      setDialogOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        companyId: '',
        paymentType: 'cash',
        notes: ''
      });
      setItems([]);
      loadData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoice: any) => {
    setSelectedInvoice(invoice);
    
    // Generate QR Code
    const qrData = `Invoice: ${invoice.invoice_number}\nDate: ${invoice.date}\nTotal: ${invoice.total_amount} SAR`;
    const qrUrl = await QRCode.toDataURL(qrData);
    setQrCodeUrl(qrUrl);
    
    setViewDialogOpen(true);
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current;
      const windowPrint = window.open('', '', 'width=900,height=650');
      windowPrint?.document.write(printContent.innerHTML);
      windowPrint?.document.close();
      windowPrint?.focus();
      windowPrint?.print();
      windowPrint?.close();
    }
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">فواتير المبيعات</h1>
              <p className="text-muted-foreground mt-1">إدارة فواتير الشحن</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إنشاء فاتورة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>فاتورة مبيعات جديدة</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>التاريخ</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم العميل</Label>
                    <Select 
                      value={formData.companyId} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, companyId: value });
                        loadCompanyLoads(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العميل" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الدفع</Label>
                    <Select value={formData.paymentType} onValueChange={(value) => setFormData({ ...formData, paymentType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="credit">آجل</SelectItem>
                        <SelectItem value="bank">بنك</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>الأصناف</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>م</TableHead>
                        <TableHead>اسم الصنف</TableHead>
                        <TableHead>الكمية</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell>{item.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>الإجمالي قبل الضريبة:</span>
                    <span className="font-bold">{subtotal.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الضريبة (15%):</span>
                    <span className="font-bold">{taxAmount.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>الإجمالي بعد الضريبة:</span>
                    <span className="font-bold text-primary">{totalAmount.toFixed(2)} ر.س</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading || items.length === 0}>
                    <Save className="h-4 w-4 ml-2" />
                    حفظ الفاتورة
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Invoice List */}
        <Card>
          <CardHeader>
            <CardTitle>سجل الفواتير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الفاتورة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">المبلغ الإجمالي</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium text-right">{invoice.invoice_number}</TableCell>
                      <TableCell className="text-right">{new Date(invoice.date).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell className="text-right">{invoice.companies?.name}</TableCell>
                      <TableCell className="text-right font-semibold">{invoice.total_amount.toFixed(2)} ر.س</TableCell>
                      <TableCell className="text-right">
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          {invoice.status === 'completed' ? 'مكتملة' : 'مسودة'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* View Invoice Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>عرض الفاتورة</DialogTitle>
                <div className="flex gap-2">
                  <Button onClick={handlePrint} size="sm">
                    <Printer className="h-4 w-4 ml-2" />
                    طباعة
                  </Button>
                </div>
              </div>
            </DialogHeader>
            
            {selectedInvoice && (
              <div ref={printRef} className="p-8 bg-white text-black">
                {/* Invoice Header */}
                <div className="border-b-2 border-primary pb-6 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-bold text-primary mb-2">فاتورة مبيعات</h1>
                      <p className="text-sm text-gray-600">رقم الفاتورة: {selectedInvoice.invoice_number}</p>
                      <p className="text-sm text-gray-600">التاريخ: {new Date(selectedInvoice.date).toLocaleDateString('ar-SA')}</p>
                    </div>
                    {qrCodeUrl && (
                      <div className="text-center">
                        <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                        <p className="text-xs text-gray-500 mt-1">رمز الاستجابة السريعة</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Company Info */}
                <div className="mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">معلومات العميل</h3>
                    <p className="text-sm">العميل: {selectedInvoice.companies?.name}</p>
                    <p className="text-sm">نوع الدفع: {selectedInvoice.payment_type === 'cash' ? 'نقدي' : selectedInvoice.payment_type === 'credit' ? 'آجل' : 'بنك'}</p>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mb-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10">
                        <TableHead className="text-right">م</TableHead>
                        <TableHead className="text-right">البيان</TableHead>
                        <TableHead className="text-right">الكمية</TableHead>
                        <TableHead className="text-right">السعر</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.load_invoice_items?.map((item: any, index: number) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-right">{index + 1}</TableCell>
                          <TableCell className="text-right">{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-6">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span>الإجمالي قبل الضريبة:</span>
                      <span className="font-semibold">{selectedInvoice.subtotal?.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>ضريبة القيمة المضافة (15%):</span>
                      <span className="font-semibold">{selectedInvoice.tax_amount?.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between py-3 border-t-2 border-primary">
                      <span className="text-lg font-bold">الإجمالي الكلي:</span>
                      <span className="text-lg font-bold text-primary">{selectedInvoice.total_amount?.toFixed(2)} ر.س</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedInvoice.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h3 className="font-semibold mb-2">ملاحظات:</h3>
                    <p className="text-sm">{selectedInvoice.notes}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t pt-4 mt-8 text-center text-xs text-gray-500">
                  <p>شكراً لتعاملكم معنا</p>
                  <p className="mt-1">تم إنشاء الفاتورة بواسطة نظام إدارة الشحنات</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default LoadInvoices;
