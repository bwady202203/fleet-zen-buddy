import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useInvoices, InvoiceItem } from "@/contexts/InvoicesContext";
import { useAccounting } from "@/contexts/AccountingContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Trash2, Printer, Search } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const SalesReturn = () => {
  const { addInvoice, getInvoicesByType, getNextInvoiceNumber } = useInvoices();
  const { searchAccounts } = useAccounting();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [itemAccountSearch, setItemAccountSearch] = useState("");

  const [formData, setFormData] = useState({
    invoiceNumber: getNextInvoiceNumber('sales-return'),
    date: new Date().toISOString().split('T')[0],
    customerSupplierName: "",
    customerSupplierAccount: "",
    notes: "",
    items: [] as InvoiceItem[],
  });

  const [currentItem, setCurrentItem] = useState({
    itemName: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 15,
    accountId: "",
  });

  const salesReturns = getInvoicesByType('sales-return');
  const customerAccounts = accountSearch ? searchAccounts(accountSearch).filter(acc => acc.level === 4) : [];
  const itemAccounts = itemAccountSearch ? searchAccounts(itemAccountSearch).filter(acc => acc.level === 4) : [];

  const addItem = () => {
    if (!currentItem.itemName || !currentItem.accountId) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم الصنف والحساب",
        variant: "destructive",
      });
      return;
    }

    const total = currentItem.quantity * currentItem.unitPrice;
    const taxAmount = total * (currentItem.taxRate / 100);

    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      ...currentItem,
      total,
      taxAmount,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    setCurrentItem({
      itemName: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 15,
      accountId: "",
    });
    setItemAccountSearch("");
  };

  const removeItem = (id: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter(item => item.id !== id),
    });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const taxTotal = formData.items.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = subtotal + taxTotal;
    return { subtotal, taxTotal, total };
  };

  const handleSubmit = () => {
    if (!formData.customerSupplierName || !formData.customerSupplierAccount || formData.items.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال بيانات العميل وإضافة صنف واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    const { subtotal, taxTotal, total } = calculateTotals();

    addInvoice({
      ...formData,
      type: 'sales-return',
      subtotal,
      taxTotal,
      total,
    });

    toast({
      title: "تم الحفظ بنجاح",
      description: `تم حفظ مرتجع المبيعات رقم ${formData.invoiceNumber}`,
    });

    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: getNextInvoiceNumber('sales-return'),
      date: new Date().toISOString().split('T')[0],
      customerSupplierName: "",
      customerSupplierAccount: "",
      notes: "",
      items: [],
    });
    setAccountSearch("");
  };

  const handlePrint = (invoice: any) => {
    window.print();
  };

  const { subtotal, taxTotal, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card print:hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/accounting" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">مرتجعات المبيعات</h1>
                <p className="text-muted-foreground mt-1">إدارة مرتجعات المبيعات</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg">
                  <Plus className="ml-2" />
                  مرتجع جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>مرتجع مبيعات جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-accent/50 rounded-lg">
                    <div>
                      <Label>رقم المرتجع</Label>
                      <Input
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>التاريخ</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>اسم العميل</Label>
                      <Input
                        value={formData.customerSupplierName}
                        onChange={(e) => setFormData({ ...formData, customerSupplierName: e.target.value })}
                        placeholder="اسم العميل"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>حساب العميل</Label>
                    <div className="relative">
                      <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={accountSearch}
                        onChange={(e) => setAccountSearch(e.target.value)}
                        placeholder="ابحث عن الحساب..."
                        className="pr-10"
                      />
                    </div>
                    {accountSearch && customerAccounts.length > 0 && (
                      <div className="border rounded-lg max-h-48 overflow-y-auto">
                        {customerAccounts.map(acc => (
                          <div
                            key={acc.id}
                            className="p-2 hover:bg-accent cursor-pointer"
                            onClick={() => {
                              setFormData({ ...formData, customerSupplierAccount: acc.id });
                              setAccountSearch(acc.name);
                            }}
                          >
                            {acc.code} - {acc.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>الأصناف المرتجعة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-2">
                          <Label>اسم الصنف</Label>
                          <Input
                            value={currentItem.itemName}
                            onChange={(e) => setCurrentItem({ ...currentItem, itemName: e.target.value })}
                            placeholder="اسم الصنف"
                          />
                        </div>
                        <div>
                          <Label>الكمية</Label>
                          <Input
                            type="number"
                            value={currentItem.quantity}
                            onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>السعر</Label>
                          <Input
                            type="number"
                            value={currentItem.unitPrice}
                            onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>الضريبة %</Label>
                          <Input
                            type="number"
                            value={currentItem.taxRate}
                            onChange={(e) => setCurrentItem({ ...currentItem, taxRate: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>الحساب</Label>
                          <Input
                            value={itemAccountSearch}
                            onChange={(e) => setItemAccountSearch(e.target.value)}
                            placeholder="بحث..."
                          />
                          {itemAccountSearch && itemAccounts.length > 0 && (
                            <div className="absolute z-50 border rounded-lg max-h-32 overflow-y-auto bg-background mt-1">
                              {itemAccounts.map(acc => (
                                <div
                                  key={acc.id}
                                  className="p-2 hover:bg-accent cursor-pointer text-sm"
                                  onClick={() => {
                                    setCurrentItem({ ...currentItem, accountId: acc.id });
                                    setItemAccountSearch(acc.name);
                                  }}
                                >
                                  {acc.code} - {acc.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button type="button" onClick={addItem} className="w-full">
                        <Plus className="ml-2" />
                        إضافة صنف
                      </Button>

                      {formData.items.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>الصنف</TableHead>
                              <TableHead>الكمية</TableHead>
                              <TableHead>السعر</TableHead>
                              <TableHead>الإجمالي</TableHead>
                              <TableHead>الضريبة</TableHead>
                              <TableHead>المجموع</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.items.map(item => (
                              <TableRow key={item.id}>
                                <TableCell>{item.itemName}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{item.unitPrice.toFixed(2)}</TableCell>
                                <TableCell>{item.total.toFixed(2)}</TableCell>
                                <TableCell>{item.taxAmount.toFixed(2)}</TableCell>
                                <TableCell>{(item.total + item.taxAmount).toFixed(2)}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  <div className="bg-accent/50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-lg">
                      <span>الإجمالي قبل الضريبة:</span>
                      <span className="font-bold">{subtotal.toFixed(2)} ريال</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span>الضريبة:</span>
                      <span className="font-bold">{taxTotal.toFixed(2)} ريال</span>
                    </div>
                    <div className="flex justify-between text-2xl font-bold border-t pt-2">
                      <span>الإجمالي الكلي:</span>
                      <span className="text-destructive">{total.toFixed(2)} ريال</span>
                    </div>
                  </div>

                  <div>
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="ملاحظات إضافية..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSubmit} className="flex-1">حفظ المرتجع</Button>
                    <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>قائمة مرتجعات المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            {salesReturns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد مرتجعات بعد</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم المرتجع</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesReturns.map(invoice => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{new Date(invoice.date).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell>{invoice.customerSupplierName}</TableCell>
                      <TableCell className="text-destructive">{invoice.total.toFixed(2)} ريال</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handlePrint(invoice)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SalesReturn;
