import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Plus, Save, Printer, Eye, X, Download, Settings, RotateCcw, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import QRCode from "qrcode";
import { CompanySettingsDialog } from "@/components/CompanySettingsDialog";
import { CompanyPricesDialog } from "@/components/CompanyPricesDialog";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const LoadInvoices = () => {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loads, setLoads] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [pricesDialogOpen, setPricesDialogOpen] = useState(false);
  const [selectedCompanyForPrices, setSelectedCompanyForPrices] = useState<any>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    companyId: '',
    supplierId: '',
    paymentType: 'cash',
    notes: ''
  });
  const [items, setItems] = useState<any[]>([]);
  
  // Filters state
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('all');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [invoicesRes, companiesRes, suppliersRes, settingsRes] = await Promise.all([
      supabase
        .from('load_invoices')
        .select('*, companies(name, tax_number, commercial_registration, address, phone), load_invoice_items(*, loads(load_number, load_types(name)))')
        .order('created_at', { ascending: false }),
      supabase.from('companies').select('*').eq('is_active', true),
      supabase.from('suppliers').select('*, name_en').eq('is_active', true),
      supabase.from('company_settings').select('*').limit(1).maybeSingle()
    ]);

    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (suppliersRes.data) setSuppliers(suppliersRes.data);
    if (settingsRes.data) setCompanySettings(settingsRes.data);
  };

  const loadCompanyLoads = async (companyId: string) => {
    try {
      // Load pending loads for this company
      const { data: pendingLoads } = await supabase
        .from('loads')
        .select('*, load_types(id, name)')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('date', { ascending: false });

      // Load company prices
      const { data: companyPrices } = await supabase
        .from('company_load_type_prices')
        .select('*, load_types(id, name)')
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Group pending loads by load type and sum quantities
      const loadsByType = new Map();
      if (pendingLoads && pendingLoads.length > 0) {
        pendingLoads.forEach(load => {
          const typeId = load.load_type_id;
          if (typeId) {
            if (loadsByType.has(typeId)) {
              const existing = loadsByType.get(typeId);
              existing.quantity += load.quantity || 0;
              existing.loadIds.push(load.id);
            } else {
              loadsByType.set(typeId, {
                loadTypeId: typeId,
                typeName: load.load_types?.name || 'صنف',
                quantity: load.quantity || 0,
                loadIds: [load.id]
              });
            }
          }
        });
      }

      // Create items based on company prices and pending loads
      if (companyPrices && companyPrices.length > 0) {
        const items = companyPrices.map(price => {
          const pendingData = loadsByType.get(price.load_type_id);
          return {
            loadId: null,
            loadTypeId: price.load_type_id,
            description: price.load_types?.name || 'صنف',
            quantity: pendingData?.quantity || 0,
            unitPrice: price.unit_price,
            total: (pendingData?.quantity || 0) * price.unit_price,
            loadIds: pendingData?.loadIds || []
          };
        });
        setItems(items);
      } else {
        // If no prices set, show message
        toast({
          title: "تنبيه",
          description: "لم يتم تحديد أسعار لهذه الشركة. يرجى إضافة الأسعار أولاً.",
          variant: "destructive"
        });
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Filter invoices based on filters
  const filteredInvoices = invoices.filter(invoice => {
    let matches = true;
    
    if (filterStartDate) {
      matches = matches && new Date(invoice.date) >= new Date(filterStartDate);
    }
    
    if (filterEndDate) {
      matches = matches && new Date(invoice.date) <= new Date(filterEndDate);
    }
    
    if (filterCompanyId && filterCompanyId !== 'all') {
      matches = matches && invoice.company_id === filterCompanyId;
    }
    
    return matches;
  });
  
  // Calculate statistics
  const statsData = {
    totalInvoices: filteredInvoices.length,
    totalAmount: filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
    totalTax: filteredInvoices.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0)
  };
  
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * 0.15;
    const totalAmount = afterDiscount + taxAmount;
    return { subtotal, taxAmount, totalAmount, afterDiscount };
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    
    if (field === 'quantity') {
      const quantity = parseFloat(value) || 0;
      newItems[index].quantity = quantity;
      newItems[index].total = quantity * newItems[index].unitPrice;
    } else if (field === 'unitPrice') {
      const unitPrice = parseFloat(value) || 0;
      newItems[index].unitPrice = unitPrice;
      newItems[index].total = newItems[index].quantity * unitPrice;
    } else {
      newItems[index][field] = value;
    }
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const resetAllQuantities = () => {
    const newItems = items.map(item => ({
      ...item,
      quantity: 0,
      total: 0
    }));
    setItems(newItems);
    toast({
      title: "تم التصفير",
      description: "تم تصفير جميع الكميات بنجاح"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { subtotal, taxAmount, totalAmount } = calculateTotals();
      
      const invoiceNumber = `${Date.now().toString().slice(-6)}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('load_invoices')
        .insert({
          invoice_number: invoiceNumber,
          date: formData.date,
          company_id: formData.companyId,
          supplier_id: formData.supplierId || null,
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

      // Insert invoice items - filter out items with zero quantity
      const itemsToInsert = items
        .filter(item => item.quantity > 0)
        .map(item => ({
          invoice_id: invoice.id,
          load_id: item.loadId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total
        }));

      if (itemsToInsert.length === 0) {
        throw new Error('يجب إضافة صنف واحد على الأقل مع كمية أكبر من صفر');
      }

      const { error: itemsError } = await supabase
        .from('load_invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

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
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        companyId: '',
        supplierId: '',
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
    
    // Load supplier if exists
    if (invoice.supplier_id) {
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', invoice.supplier_id)
        .maybeSingle();
      if (supplierData) setSelectedSupplier(supplierData);
    }
    
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

  const handleEditInvoice = async (invoice: any) => {
    setFormData({
      date: invoice.date,
      issueDate: invoice.date,
      dueDate: invoice.date,
      companyId: invoice.company_id,
      supplierId: invoice.supplier_id || '',
      paymentType: invoice.payment_type,
      notes: invoice.notes || ''
    });

    // Load invoice items
    const invoiceItems = invoice.load_invoice_items?.map((item: any) => ({
      loadId: item.load_id,
      loadTypeId: null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total,
      loadIds: []
    })) || [];
    
    setItems(invoiceItems);
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;

    try {
      setLoading(true);

      // Delete invoice items first
      const { error: itemsError } = await supabase
        .from('load_invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);

      if (itemsError) throw itemsError;

      // Delete invoice
      const { error: invoiceError } = await supabase
        .from('load_invoices')
        .delete()
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      toast({
        title: "تم الحذف",
        description: "تم حذف الفاتورة بنجاح"
      });

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`invoice-${selectedInvoice?.invoice_number}.pdf`);

      toast({
        title: "تم التحميل",
        description: "تم تحميل الفاتورة بصيغة PDF بنجاح"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الفاتورة",
        variant: "destructive"
      });
    }
  };

  const handlePrintPreview = () => {
    setShowPrintPreview(true);
  };

  const handlePrintFromPreview = () => {
    window.print();
  };

  const handleExportToExcel = () => {
    const exportData = filteredInvoices.map(invoice => ({
      'رقم الفاتورة': invoice.invoice_number,
      'التاريخ': new Date(invoice.date).toLocaleDateString('ar-SA'),
      'العميل': invoice.companies?.name || '',
      'المبلغ قبل الضريبة': (invoice.subtotal || 0).toFixed(2),
      'الضريبة': (invoice.tax_amount || 0).toFixed(2),
      'المبلغ الإجمالي': (invoice.total_amount || 0).toFixed(2),
      'الحالة': invoice.status === 'completed' ? 'مكتملة' : 'مسودة',
      'نوع الدفع': invoice.payment_type === 'cash' ? 'نقدي' : invoice.payment_type === 'credit' ? 'آجل' : 'بنك'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الفواتير');
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // رقم الفاتورة
      { wch: 15 }, // التاريخ
      { wch: 25 }, // العميل
      { wch: 18 }, // المبلغ قبل الضريبة
      { wch: 15 }, // الضريبة
      { wch: 18 }, // المبلغ الإجمالي
      { wch: 12 }, // الحالة
      { wch: 12 }  // نوع الدفع
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `فواتير_المبيعات_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير الفواتير إلى ملف Excel بنجاح"
    });
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
            <div className="flex-1">
              <h1 className="text-3xl font-bold">فواتير المبيعات</h1>
              <p className="text-muted-foreground mt-1">إدارة فواتير الشحن</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="invoices">الفواتير</TabsTrigger>
            <TabsTrigger value="prices">أسعار الشركات</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-6">
        <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
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
                    <Label className="text-sm font-semibold">تاريخ الإصدار</Label>
                    <Input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">تاريخ الاستحقاق</Label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
                    <Label className="text-sm font-semibold">اسم المورد</Label>
                    <Select 
                      value={formData.supplierId} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, supplierId: value });
                        const supplier = suppliers.find(s => s.id === value);
                        setSelectedSupplier(supplier);
                      }}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="اختر المورد" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
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
                    <div className="flex items-center gap-3">
                      {items.length > 0 && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resetAllQuantities}
                            className="gap-2"
                          >
                            <RotateCcw className="h-4 w-4" />
                            تصفير الكميات
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            عدد الأصناف: {items.length}
                          </span>
                        </>
                      )}
                    </div>
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
                              اختر عميل لعرض الأصناف والأسعار
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
                                  placeholder="اسم الصنف"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                  className="text-right"
                                  placeholder="0"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                  className="text-right"
                                  placeholder="0.00"
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
                    <Label htmlFor="discount-amount" className="text-muted-foreground">الخصم:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="discount-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        className="w-40 h-10 text-right"
                        placeholder="0.00"
                      />
                      <span className="font-bold">ر.س</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-primary/20">
                    <span className="text-muted-foreground">المبلغ بعد الخصم:</span>
                    <span className="font-bold text-lg">{(subtotal - discountAmount).toFixed(2)} ر.س</span>
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
          <div className="flex gap-2">
            <CompanySettingsDialog />
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">إجمالي الفواتير</p>
                <p className="text-3xl font-bold text-primary">{statsData.totalInvoices}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">إجمالي المبالغ</p>
                <p className="text-3xl font-bold text-green-600">{statsData.totalAmount.toFixed(2)} ر.س</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">إجمالي الضرائب</p>
                <p className="text-3xl font-bold text-blue-600">{statsData.totalTax.toFixed(2)} ر.س</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>الشركة</Label>
                <Select value={filterCompanyId} onValueChange={setFilterCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الشركات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الشركات</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="opacity-0">إجراءات</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setFilterCompanyId('all');
                    }}
                    className="flex-1"
                  >
                    إعادة تعيين
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportToExcel}
                    className="flex-1"
                  >
                    <FileSpreadsheet className="h-4 w-4 ml-2" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrintPreview}
                    className="flex-1"
                  >
                    <Printer className="h-4 w-4 ml-2" />
                    طباعة
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle>سجل الفواتير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto" dir="rtl">
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
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium text-right">{invoice.invoice_number}</TableCell>
                      <TableCell className="text-right">{new Date(invoice.date).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell className="text-right">{invoice.companies?.name}</TableCell>
                      <TableCell className="text-right font-semibold">{invoice.total_amount.toFixed(2)} ر.س</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-block px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          {invoice.status === 'completed' ? 'مكتملة' : 'مسودة'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end" dir="ltr">
                          <Button size="sm" variant="outline" onClick={() => handleDeleteInvoice(invoice.id)} className="hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditInvoice(invoice)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
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
          </TabsContent>

          <TabsContent value="prices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  إدارة أسعار الشركات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    قم بتحديد الأسعار لكل نوع شحنة لكل شركة. سيتم استخدام هذه الأسعار تلقائياً عند إنشاء فواتير جديدة.
                  </p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">اسم الشركة</TableHead>
                          <TableHead className="text-right">الهاتف</TableHead>
                          <TableHead className="text-right">البريد الإلكتروني</TableHead>
                          <TableHead className="text-right">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companies.map((company) => (
                          <TableRow key={company.id}>
                            <TableCell className="font-medium text-right">{company.name}</TableCell>
                            <TableCell className="text-right">{company.phone || '-'}</TableCell>
                            <TableCell className="text-right">{company.email || '-'}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedCompanyForPrices(company);
                                  setPricesDialogOpen(true);
                                }}
                              >
                                <Settings className="h-4 w-4 ml-1" />
                                إدارة الأسعار
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Invoice Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full">
            <DialogHeader className="print:hidden">
              <div className="flex justify-between items-center">
                <DialogTitle>عرض الفاتورة</DialogTitle>
                <div className="flex gap-2">
                  <Button onClick={handleDownloadPDF} size="sm" variant="outline">
                    <Download className="h-4 w-4 ml-2" />
                    تحميل PDF
                  </Button>
                  <Button onClick={handlePrint} size="sm">
                    <Printer className="h-4 w-4 ml-2" />
                    طباعة
                  </Button>
                </div>
              </div>
            </DialogHeader>
            
            {selectedInvoice && (
              <div ref={printRef} className="p-6 bg-white text-black print:p-8" style={{ maxHeight: '297mm' }}>
                {/* Invoice Header */}
                <div className="border-b-2 pb-4 mb-4" style={{ borderColor: '#2563eb' }}>
                  <div className="flex justify-between items-start gap-4">
                    {/* Arabic Section - Supplier Info */}
                    <div className="flex-1">
                      <h1 className="text-xl font-bold mb-2" style={{ color: '#2563eb' }}>
                        {selectedSupplier?.name || companySettings?.supplier_name || 'اسم المورد'}
                      </h1>
                      {(selectedSupplier?.tax_number || companySettings?.tax_number) && (
                        <p className="text-xs text-gray-700 mb-1">
                          <span className="font-semibold">الرقم الضريبي:</span> {selectedSupplier?.tax_number || companySettings?.tax_number}
                        </p>
                      )}
                      {(selectedSupplier?.commercial_registration || companySettings?.commercial_registration) && (
                        <p className="text-xs text-gray-700 mb-1">
                          <span className="font-semibold">السجل التجاري:</span> {selectedSupplier?.commercial_registration || companySettings?.commercial_registration}
                        </p>
                      )}
                      {(selectedSupplier?.phone || companySettings?.phone) && (
                        <p className="text-xs text-gray-700 mb-1">
                          <span className="font-semibold">الهاتف:</span> {selectedSupplier?.phone || companySettings?.phone}
                        </p>
                      )}
                      {(selectedSupplier?.address || companySettings?.address) && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold">العنوان:</span> {selectedSupplier?.address || companySettings?.address}
                        </p>
                      )}
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-700">رقم الفاتورة: <span className="font-semibold">{selectedInvoice.invoice_number}</span></p>
                        <p className="text-xs text-gray-700">التاريخ: <span className="font-semibold">{new Date(selectedInvoice.date).toLocaleDateString('en-GB')}</span></p>
                        <p className="text-xs text-gray-700">تاريخ الإصدار: <span className="font-semibold">{new Date(selectedInvoice.date).toLocaleDateString('en-GB')}</span></p>
                        <p className="text-xs text-gray-700">تاريخ الاستحقاق: <span className="font-semibold">{new Date(selectedInvoice.date).toLocaleDateString('en-GB')}</span></p>
                      </div>
                    </div>

                    {/* QR Code in the center */}
                    {qrCodeUrl && (
                      <div className="text-center flex-shrink-0">
                        <h2 className="text-base font-bold mb-2" style={{ color: '#2563eb' }}>فاتورة ضريبية</h2>
                        <img src={qrCodeUrl} alt="QR Code" className="w-28 h-28 border-2 p-1" style={{ borderColor: '#2563eb' }} />
                      </div>
                    )}

                    {/* English Section - Supplier Info */}
                    <div className="flex-1 text-left" dir="ltr">
                      {(selectedSupplier?.tax_number || companySettings?.tax_number) && (
                        <p className="text-xs text-gray-700 mb-1">
                          <span className="font-semibold">{selectedSupplier?.name_en || selectedSupplier?.name || companySettings?.supplier_name || 'Supplier Name'}</span>
                        </p>
                      )}
                      {(selectedSupplier?.tax_number || companySettings?.tax_number) && (
                        <p className="text-xs text-gray-700 mb-1">
                          <span className="font-semibold">Tax Number:</span> {selectedSupplier?.tax_number || companySettings?.tax_number}
                        </p>
                      )}
                      {(selectedSupplier?.commercial_registration || companySettings?.commercial_registration) && (
                        <p className="text-xs text-gray-700 mb-1">
                          <span className="font-semibold">Commercial Registration:</span> {selectedSupplier?.commercial_registration || companySettings?.commercial_registration}
                        </p>
                      )}
                      {(selectedSupplier?.phone || companySettings?.phone) && (
                        <p className="text-xs text-gray-700 mb-1">
                          <span className="font-semibold">Phone:</span> {selectedSupplier?.phone || companySettings?.phone}
                        </p>
                      )}
                      {(selectedSupplier?.address || companySettings?.address) && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold">Address:</span> {selectedSupplier?.address || companySettings?.address}
                        </p>
                      )}
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-700">Invoice Number: <span className="font-semibold">{selectedInvoice.invoice_number}</span></p>
                        <p className="text-xs text-gray-700">Date: <span className="font-semibold">{new Date(selectedInvoice.date).toLocaleDateString('en-GB')}</span></p>
                        <p className="text-xs text-gray-700">Issue Date: <span className="font-semibold">{new Date(selectedInvoice.date).toLocaleDateString('en-GB')}</span></p>
                        <p className="text-xs text-gray-700">Due Date: <span className="font-semibold">{new Date(selectedInvoice.date).toLocaleDateString('en-GB')}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-4">
                  <div className="p-3 rounded-lg border-2" style={{ backgroundColor: '#f1f5f9', borderColor: '#2563eb' }}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-base" style={{ color: '#2563eb' }}>بيانات العميل</h3>
                      <h3 className="font-bold text-base" style={{ color: '#2563eb' }}>Customer Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">اسم العميل / Customer Name</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedInvoice.companies?.name}</p>
                      </div>
                      {selectedInvoice.companies?.tax_number && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">الرقم الضريبي / Tax Number</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedInvoice.companies.tax_number}</p>
                        </div>
                      )}
                      {selectedInvoice.companies?.commercial_registration && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">السجل التجاري / Commercial Registration</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedInvoice.companies.commercial_registration}</p>
                        </div>
                      )}
                      {selectedInvoice.companies?.phone && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">الهاتف / Phone</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedInvoice.companies.phone}</p>
                        </div>
                      )}
                      {selectedInvoice.companies?.address && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">العنوان / Address</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedInvoice.companies.address}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600 mb-1">طريقة الدفع / Payment Method</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedInvoice.payment_type === 'cash' ? 'نقدي / Cash' : selectedInvoice.payment_type === 'credit' ? 'آجل / Credit' : 'بنك / Bank'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mb-4">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow style={{ backgroundColor: '#dbeafe' }}>
                          <TableHead className="text-right font-bold" style={{ color: '#1e40af' }}>م<br/>#</TableHead>
                          <TableHead className="text-right font-bold" style={{ color: '#1e40af' }}>وصف الصنف<br/>Description</TableHead>
                          <TableHead className="text-right font-bold" style={{ color: '#1e40af' }}>الكمية<br/>Quantity</TableHead>
                          <TableHead className="text-right font-bold" style={{ color: '#1e40af' }}>سعر الوحدة<br/>Unit Price</TableHead>
                          <TableHead className="text-right font-bold" style={{ color: '#1e40af' }}>الإجمالي<br/>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const itemsToShow = [...(selectedInvoice.load_invoice_items || [])];
                          while (itemsToShow.length < 6) {
                            itemsToShow.push({ id: `empty-${itemsToShow.length}`, description: '', quantity: '', unit_price: '', total: '' });
                          }
                          return itemsToShow.map((item: any, index: number) => (
                            <TableRow key={item.id} style={{ backgroundColor: index % 2 === 1 ? '#f8fafc' : 'white', minHeight: '40px' }}>
                              <TableCell className="text-right font-medium">{item.description ? index + 1 : ''}</TableCell>
                              <TableCell className="text-right">{item.description || ''}</TableCell>
                              <TableCell className="text-right">{item.quantity || ''}</TableCell>
                              <TableCell className="text-right">{item.unit_price ? `${item.unit_price.toFixed(2)} ر.س` : ''}</TableCell>
                              <TableCell className="text-right font-semibold">{item.total ? `${item.total.toFixed(2)} ر.س` : ''}</TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals - Horizontal Layout */}
                <div className="mb-4">
                  <div className="border-2 rounded-lg p-3" style={{ borderColor: '#2563eb', backgroundColor: '#f8fafc' }}>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      <div className="border-l px-2">
                        <p className="text-xs text-gray-600 mb-1">الإجمالي قبل الخصم<br/>Subtotal</p>
                        <p className="text-sm font-bold">{selectedInvoice.subtotal?.toFixed(2)} ر.س</p>
                      </div>
                      <div className="border-l px-2">
                        <p className="text-xs text-gray-600 mb-1">الخصم<br/>Discount</p>
                        <p className="text-sm font-bold text-red-600">-{discountAmount.toFixed(2)} ر.س</p>
                      </div>
                      <div className="border-l px-2">
                        <p className="text-xs text-gray-600 mb-1">بعد الخصم<br/>After Discount</p>
                        <p className="text-sm font-bold">{(selectedInvoice.subtotal - discountAmount).toFixed(2)} ر.س</p>
                      </div>
                      <div className="border-l px-2">
                        <p className="text-xs text-gray-600 mb-1">ض.ق.م (15%)<br/>VAT</p>
                        <p className="text-sm font-bold">{selectedInvoice.tax_amount?.toFixed(2)} ر.س</p>
                      </div>
                      <div className="px-2" style={{ backgroundColor: '#dbeafe' }}>
                        <p className="text-xs font-bold mb-1" style={{ color: '#1e40af' }}>الإجمالي الكلي<br/>Grand Total</p>
                        <p className="text-lg font-bold" style={{ color: '#2563eb' }}>{selectedInvoice.total_amount?.toFixed(2)} ر.س</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedInvoice.notes && (
                  <div className="p-3 rounded-lg mb-4 border" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
                    <h3 className="font-bold mb-1 text-sm" style={{ color: '#92400e' }}>ملاحظات:</h3>
                    <p className="text-xs text-gray-800">{selectedInvoice.notes}</p>
                  </div>
                )}

                {/* Signatures Section */}
                <div className="mb-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4 text-center" style={{ borderColor: '#2563eb', minHeight: '100px' }}>
                      <p className="text-sm font-bold mb-2" style={{ color: '#2563eb' }}>توقيع العميل</p>
                      <p className="text-xs text-gray-600">Customer Signature</p>
                      <div className="mt-4 border-t pt-2" style={{ borderColor: '#d1d5db' }}>
                        <div className="h-8"></div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 text-center" style={{ borderColor: '#2563eb', minHeight: '100px' }}>
                      <p className="text-sm font-bold mb-2" style={{ color: '#2563eb' }}>استلم بواسطة</p>
                      <p className="text-xs text-gray-600">Received By</p>
                      <div className="mt-4 border-t pt-2" style={{ borderColor: '#d1d5db' }}>
                        <div className="h-8"></div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 text-center" style={{ borderColor: '#2563eb', minHeight: '100px' }}>
                      <p className="text-sm font-bold mb-2" style={{ color: '#2563eb' }}>توقيع المورد</p>
                      <p className="text-xs text-gray-600">Supplier Signature</p>
                      <div className="mt-4 border-t pt-2" style={{ borderColor: '#d1d5db' }}>
                        <div className="h-8"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t-2 pt-3 mt-4 text-center" style={{ borderColor: '#2563eb' }}>
                  <p className="text-base font-bold mb-1" style={{ color: '#2563eb' }}>شكراً لتعاملكم معنا</p>
                  <p className="text-xs text-gray-600">نتطلع لخدمتكم دائماً</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Company Prices Dialog */}
        {selectedCompanyForPrices && (
          <CompanyPricesDialog
            open={pricesDialogOpen}
            onOpenChange={setPricesDialogOpen}
            companyId={selectedCompanyForPrices.id}
            companyName={selectedCompanyForPrices.name}
          />
        )}
      </main>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاينة الطباعة</DialogTitle>
          </DialogHeader>
          <div ref={printPreviewRef} className="p-6 bg-white" dir="rtl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">تقرير فواتير المبيعات</h2>
              {(filterStartDate || filterEndDate) && (
                <p className="text-sm text-muted-foreground">
                  {filterStartDate && `من ${new Date(filterStartDate).toLocaleDateString('ar-SA')}`}
                  {filterEndDate && ` إلى ${new Date(filterEndDate).toLocaleDateString('ar-SA')}`}
                </p>
              )}
            </div>

            {/* Statistics Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-gray-600">إجمالي الفواتير</p>
                <p className="text-xl font-bold">{statsData.totalInvoices}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">إجمالي المبالغ</p>
                <p className="text-xl font-bold">{statsData.totalAmount.toFixed(2)} ر.س</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">إجمالي الضرائب</p>
                <p className="text-xl font-bold">{statsData.totalTax.toFixed(2)} ر.س</p>
              </div>
            </div>

            {/* Invoices Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الفاتورة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">المبلغ قبل الضريبة</TableHead>
                  <TableHead className="text-right">الضريبة</TableHead>
                  <TableHead className="text-right">المبلغ الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="text-right">{invoice.invoice_number}</TableCell>
                    <TableCell className="text-right">{new Date(invoice.date).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell className="text-right">{invoice.companies?.name}</TableCell>
                    <TableCell className="text-right">{(invoice.subtotal || 0).toFixed(2)} ر.س</TableCell>
                    <TableCell className="text-right">{(invoice.tax_amount || 0).toFixed(2)} ر.س</TableCell>
                    <TableCell className="text-right font-semibold">{invoice.total_amount.toFixed(2)} ر.س</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button onClick={handlePrintFromPreview}>
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
            <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoadInvoices;
