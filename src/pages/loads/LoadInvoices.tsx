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
import { CompanySettingsDialog } from "@/components/CompanySettingsDialog";

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
  const [companySettings, setCompanySettings] = useState<any>(null);
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
    const [invoicesRes, companiesRes, settingsRes] = await Promise.all([
      supabase
        .from('load_invoices')
        .select('*, companies(name), load_invoice_items(*, loads(load_number, load_types(name)))')
        .order('created_at', { ascending: false }),
      supabase.from('companies').select('*').eq('is_active', true),
      supabase.from('company_settings').select('*').limit(1).maybeSingle()
    ]);

    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (settingsRes.data) setCompanySettings(settingsRes.data);
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

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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
    
    // Load company settings if not loaded
    if (!companySettings) {
      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (data) setCompanySettings(data);
    }
    
    // Generate QR Code with company tax number
    const qrData = `الشركة: ${companySettings?.company_name || 'شركة الرمال الصناعية'}
الرقم الضريبي: ${companySettings?.tax_number || ''}
رقم الفاتورة: ${invoice.invoice_number}
التاريخ: ${invoice.date}
المبلغ الإجمالي: ${invoice.total_amount} ر.س
ضريبة القيمة المضافة: ${invoice.tax_amount} ر.س`;
    
    const qrUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
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
        <div className="mb-6 flex justify-between items-center">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إنشاء فاتورة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">فاتورة مبيعات جديدة</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">التاريخ</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">اسم العميل</Label>
                    <Select 
                      value={formData.companyId} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, companyId: value });
                        loadCompanyLoads(value);
                      }}
                    >
                      <SelectTrigger className="bg-background">
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
                    <Label className="text-sm font-semibold">نوع الدفع</Label>
                    <Select value={formData.paymentType} onValueChange={(value) => setFormData({ ...formData, paymentType: value })}>
                      <SelectTrigger className="bg-background">
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">الأصناف</Label>
                    {items.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        عدد الأصناف: {items.length}
                      </span>
                    )}
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-right w-16">م</TableHead>
                          <TableHead className="text-right">اسم الصنف</TableHead>
                          <TableHead className="text-right w-32">الكمية</TableHead>
                          <TableHead className="text-right w-32">السعر</TableHead>
                          <TableHead className="text-right w-32">الإجمالي</TableHead>
                          <TableHead className="text-right w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              اختر عميل لعرض الشحنات المعلقة
                            </TableCell>
                          </TableRow>
                        ) : (
                          items.map((item, index) => (
                            <TableRow key={index} className="hover:bg-muted/30">
                              <TableCell className="text-right font-medium">{index + 1}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  value={item.description}
                                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                                  className="min-w-[200px]"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {item.total.toFixed(2)} ر.س
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-lg border border-primary/20 space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-primary/20">
                    <span className="text-muted-foreground">الإجمالي قبل الضريبة:</span>
                    <span className="font-bold text-lg">{subtotal.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-primary/20">
                    <span className="text-muted-foreground">الضريبة (15%):</span>
                    <span className="font-bold text-lg">{taxAmount.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <span className="text-lg font-semibold">الإجمالي الكلي:</span>
                    <span className="font-bold text-2xl text-primary">{totalAmount.toFixed(2)} ر.س</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">ملاحظات</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="resize-none"
                    placeholder="أضف أي ملاحظات إضافية هنا..."
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    type="submit" 
                    disabled={loading || items.length === 0}
                    className="flex-1 h-11"
                    size="lg"
                  >
                    <Save className="h-5 w-5 ml-2" />
                    حفظ الفاتورة
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="flex-1 h-11"
                    size="lg"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <CompanySettingsDialog />
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
                <div className="border-b-2 pb-6 mb-6" style={{ borderColor: '#2563eb' }}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold mb-4" style={{ color: '#2563eb' }}>
                        {companySettings?.company_name || 'شركة الرمال الصناعية'}
                      </h1>
                      {companySettings?.tax_number && (
                        <p className="text-sm text-gray-700 mb-1">
                          <span className="font-semibold">الرقم الضريبي:</span> {companySettings.tax_number}
                        </p>
                      )}
                      {companySettings?.address && (
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">العنوان:</span> {companySettings.address}
                        </p>
                      )}
                      <div className="mt-4 pt-4 border-t">
                        <h2 className="text-xl font-bold mb-2" style={{ color: '#2563eb' }}>فاتورة ضريبية مبسطة</h2>
                        <p className="text-sm text-gray-700">رقم الفاتورة: <span className="font-semibold">{selectedInvoice.invoice_number}</span></p>
                        <p className="text-sm text-gray-700">التاريخ: <span className="font-semibold">{new Date(selectedInvoice.date).toLocaleDateString('ar-SA')}</span></p>
                      </div>
                    </div>
                    {qrCodeUrl && (
                      <div className="text-center">
                        <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 border-2 p-2" style={{ borderColor: '#2563eb' }} />
                        <p className="text-xs text-gray-600 mt-2 font-semibold">رمز الاستجابة السريعة</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-6">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#f1f5f9' }}>
                    <h3 className="font-bold mb-3" style={{ color: '#2563eb' }}>بيانات العميل</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-600">اسم العميل</p>
                        <p className="text-sm font-semibold">{selectedInvoice.companies?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">طريقة الدفع</p>
                        <p className="text-sm font-semibold">
                          {selectedInvoice.payment_type === 'cash' ? 'نقدي' : selectedInvoice.payment_type === 'credit' ? 'آجل' : 'بنك'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mb-6">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow style={{ backgroundColor: '#dbeafe' }}>
                          <TableHead className="text-right font-bold" style={{ color: '#1e40af' }}>م</TableHead>
                          <TableHead className="text-right font-bold" style={{ color: '#1e40af' }}>وصف الصنف</TableHead>
                          <TableHead className="text-right font-bold" style={{ color: '#1e40af' }}>الكمية</TableHead>
                          <TableHead className="text-right font-bold" style={{ color: '#1e40af' }}>سعر الوحدة</TableHead>
                          <TableHead className="text-right font-bold" style={{ color: '#1e40af' }}>الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.load_invoice_items?.map((item: any, index: number) => (
                          <TableRow key={item.id} className={index % 2 === 0 ? 'bg-white' : ''} style={{ backgroundColor: index % 2 === 1 ? '#f8fafc' : 'white' }}>
                            <TableCell className="text-right font-medium">{index + 1}</TableCell>
                            <TableCell className="text-right">{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{item.unit_price.toFixed(2)} ر.س</TableCell>
                            <TableCell className="text-right font-semibold">{item.total.toFixed(2)} ر.س</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-6">
                  <div className="w-96 border-2 rounded-lg p-4" style={{ borderColor: '#2563eb', backgroundColor: '#f8fafc' }}>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-700">الإجمالي قبل الضريبة:</span>
                        <span className="font-bold">{selectedInvoice.subtotal?.toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-700">ضريبة القيمة المضافة (15%):</span>
                        <span className="font-bold">{selectedInvoice.tax_amount?.toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between py-3 pt-4" style={{ borderTop: '2px solid #2563eb' }}>
                        <span className="text-xl font-bold" style={{ color: '#1e40af' }}>الإجمالي الكلي:</span>
                        <span className="text-2xl font-bold" style={{ color: '#2563eb' }}>{selectedInvoice.total_amount?.toFixed(2)} ر.س</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedInvoice.notes && (
                  <div className="p-4 rounded-lg mb-6 border" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
                    <h3 className="font-bold mb-2" style={{ color: '#92400e' }}>ملاحظات:</h3>
                    <p className="text-sm text-gray-800">{selectedInvoice.notes}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t-2 pt-6 mt-8 text-center" style={{ borderColor: '#2563eb' }}>
                  <p className="text-lg font-bold mb-2" style={{ color: '#2563eb' }}>شكراً لتعاملكم معنا</p>
                  <p className="text-sm text-gray-600 mb-4">نتطلع لخدمتكم دائماً</p>
                  {companySettings?.tax_number && (
                    <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#f1f5f9' }}>
                      <p className="text-xs text-gray-600">هذه فاتورة ضريبية مبسطة صادرة إلكترونياً</p>
                      <p className="text-xs text-gray-600 mt-1">الرقم الضريبي: {companySettings.tax_number}</p>
                    </div>
                  )}
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
