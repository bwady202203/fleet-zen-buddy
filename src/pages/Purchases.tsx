import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Plus, ArrowRight, Trash2, BarChart3, Check, ChevronsUpDown, PackagePlus, Store, Calendar, TrendingUp, Eye, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { useSpareParts, Purchase } from "@/contexts/SparePartsContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Purchases = () => {
  const { spareParts, purchases, addPurchase, addSparePart, updatePurchase, deletePurchase } = useSpareParts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addPartDialogOpen, setAddPartDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    supplier: "",
    notes: "",
  });
  const [selectedParts, setSelectedParts] = useState<
    { sparePartId: string; quantity: number; price: number }[]
  >([]);
  const [newPartForm, setNewPartForm] = useState({
    name: "",
    code: "",
    price: 0,
    category: "",
    location: "",
    minQuantity: 0,
  });

  const handleAddPart = () => {
    setSelectedParts([
      ...selectedParts,
      { sparePartId: "", quantity: 1, price: 0 },
    ]);
  };

  const handleRemovePart = (index: number) => {
    setSelectedParts(selectedParts.filter((_, i) => i !== index));
  };

  const handlePartChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = [...selectedParts];
    if (field === "sparePartId") {
      const part = spareParts.find((p) => p.id === value);
      updated[index] = {
        ...updated[index],
        sparePartId: value as string,
        price: part?.price || 0,
      };
    } else if (field === "quantity") {
      updated[index] = { ...updated[index], quantity: Number(value) };
    } else if (field === "price") {
      updated[index] = { ...updated[index], price: Number(value) };
    }
    setSelectedParts(updated);
  };

  const handleAddNewPart = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPartForm.name) {
      toast({
        title: "خطأ",
        description: "يجب إدخال اسم القطعة",
        variant: "destructive",
      });
      return;
    }

    try {
      await addSparePart({
        code: `SP-${Date.now()}`,
        name: newPartForm.name,
        price: newPartForm.price,
        quantity: 0,
        minQuantity: newPartForm.minQuantity,
        unit: "قطعة",
      });

      toast({
        title: "تمت الإضافة",
        description: "تم إضافة قطعة الغيار بنجاح",
      });

      setNewPartForm({
        name: "",
        code: "",
        price: 0,
        category: "",
        location: "",
        minQuantity: 0,
      });

      setAddPartDialogOpen(false);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة القطعة",
        variant: "destructive",
      });
    }
  };

  const totalCost = selectedParts.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedParts.length === 0) {
      toast({
        title: "خطأ",
        description: "يجب إضافة قطعة غيار واحدة على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (!formData.supplier.trim()) {
      toast({
        title: "خطأ",
        description: "يجب إدخال اسم المورد",
        variant: "destructive",
      });
      return;
    }

    const hasInvalidPart = selectedParts.some((item) => !item.sparePartId);
    if (hasInvalidPart) {
      toast({
        title: "خطأ",
        description: "يجب اختيار قطعة الغيار لكل صف",
        variant: "destructive",
      });
      return;
    }

    addPurchase({
      date: formData.date,
      supplier: formData.supplier,
      notes: formData.notes,
      spareParts: selectedParts,
      totalCost,
    });

    toast({
      title: "تمت الإضافة بنجاح",
      description: "تم إضافة عملية الشراء وتحديث المخزون",
    });

    setDialogOpen(false);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      supplier: "",
      notes: "",
    });
    setSelectedParts([]);
  };

  // إحصائيات التكاليف
  const costStats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    
    const todayCost = purchases
      .filter((p) => p.date === today)
      .reduce((sum, p) => sum + p.totalCost, 0);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const weekCost = purchases
      .filter((p) => new Date(p.date) >= weekStart)
      .reduce((sum, p) => sum + p.totalCost, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthCost = purchases
      .filter((p) => new Date(p.date) >= monthStart)
      .reduce((sum, p) => sum + p.totalCost, 0);

    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearCost = purchases
      .filter((p) => new Date(p.date) >= yearStart)
      .reduce((sum, p) => sum + p.totalCost, 0);

    return { todayCost, weekCost, monthCost, yearCost };
  }, [purchases]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">إدارة المشتريات</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/purchases/pos">
                <Button variant="default">
                  <Store className="h-4 w-4 ml-2" />
                  نقطة البيع POS
                </Button>
              </Link>
              <Link to="/price-history">
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 ml-2" />
                  سجل الأسعار
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline">
                  العودة للرئيسية
                  <ArrowRight className="h-4 w-4 mr-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* إحصائيات التكاليف */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>إحصائيات التكاليف</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="today" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="today">اليوم</TabsTrigger>
                <TabsTrigger value="week">الأسبوع</TabsTrigger>
                <TabsTrigger value="month">الشهر</TabsTrigger>
                <TabsTrigger value="year">السنة</TabsTrigger>
              </TabsList>
              <TabsContent value="today" className="mt-4">
                <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground mb-1">تكلفة اليوم</p>
                  <p className="text-3xl font-bold text-primary">
                    {costStats.todayCost.toLocaleString()} ر.س
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="week" className="mt-4">
                <div className="text-center p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-muted-foreground mb-1">تكلفة آخر 7 أيام</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {costStats.weekCost.toLocaleString()} ر.س
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="month" className="mt-4">
                <div className="text-center p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-muted-foreground mb-1">تكلفة هذا الشهر</p>
                  <p className="text-3xl font-bold text-green-600">
                    {costStats.monthCost.toLocaleString()} ر.س
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="year" className="mt-4">
                <div className="text-center p-6 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-sm text-muted-foreground mb-1">تكلفة هذه السنة</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {costStats.yearCost.toLocaleString()} ر.س
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* إحصائيات عامة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي المشتريات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purchases.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                التكلفة الإجمالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {purchases
                  .reduce((sum, p) => sum + p.totalCost, 0)
                  .toLocaleString()}{" "}
                ر.س
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                هذا الشهر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {purchases
                  .filter((p) => {
                    const purchaseDate = new Date(p.date);
                    const now = new Date();
                    return (
                      purchaseDate.getMonth() === now.getMonth() &&
                      purchaseDate.getFullYear() === now.getFullYear()
                    );
                  })
                  .reduce((sum, p) => sum + p.totalCost, 0)
                  .toLocaleString()}{" "}
                ر.س
              </div>
            </CardContent>
          </Card>
        </div>

        {/* قائمة المشتريات */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>سجل المشتريات</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة عملية شراء
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>إضافة عملية شراء جديدة</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">التاريخ</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) =>
                            setFormData({ ...formData, date: e.target.value })
                          }
                          required
                          className="text-right"
                        />
                      </div>
                      <div>
                        <Label htmlFor="supplier">المورد</Label>
                        <Input
                          id="supplier"
                          value={formData.supplier}
                          onChange={(e) =>
                            setFormData({ ...formData, supplier: e.target.value })
                          }
                          required
                          className="text-right"
                          placeholder="اسم المورد"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>قطع الغيار</Label>
                      <div className="space-y-3 mt-2">
                        {selectedParts.map((item, index) => (
                          <div
                            key={index}
                            className="flex gap-2 items-end p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <Label className="text-xs">القطعة</Label>
                                <Dialog open={addPartDialogOpen} onOpenChange={setAddPartDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2">
                                      <PackagePlus className="h-3 w-3 ml-1" />
                                      إضافة قطعة جديدة
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md" dir="rtl">
                                    <DialogHeader>
                                      <DialogTitle>إضافة قطعة غيار جديدة</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleAddNewPart} className="space-y-4">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <Label htmlFor="new-name">اسم القطعة *</Label>
                                          <Input
                                            id="new-name"
                                            value={newPartForm.name}
                                            onChange={(e) => setNewPartForm({ ...newPartForm, name: e.target.value })}
                                            required
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="new-price">السعر</Label>
                                          <Input
                                            id="new-price"
                                            type="number"
                                            step="0.01"
                                            value={newPartForm.price}
                                            onChange={(e) => setNewPartForm({ ...newPartForm, price: parseFloat(e.target.value) || 0 })}
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <Label htmlFor="new-min">الحد الأدنى للكمية</Label>
                                          <Input
                                            id="new-min"
                                            type="number"
                                            value={newPartForm.minQuantity}
                                            onChange={(e) => setNewPartForm({ ...newPartForm, minQuantity: parseInt(e.target.value) || 0 })}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2 justify-end">
                                        <Button type="submit">
                                          <Plus className="h-4 w-4 ml-1" />
                                          إضافة
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => setAddPartDialogOpen(false)}>
                                          إلغاء
                                        </Button>
                                      </div>
                                    </form>
                                  </DialogContent>
                                </Dialog>
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between",
                                      !item.sparePartId && "text-muted-foreground"
                                    )}
                                  >
                                    {item.sparePartId
                                      ? spareParts.find((p) => p.id === item.sparePartId)?.name
                                      : "ابحث عن قطعة الغيار..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="ابحث عن قطعة الغيار..." />
                                    <CommandList>
                                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                                      <CommandGroup>
                                        {spareParts.map((part) => (
                                          <CommandItem
                                            key={part.id}
                                            value={part.name}
                                            onSelect={() => {
                                              handlePartChange(index, "sparePartId", part.id);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                item.sparePartId === part.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <div className="flex-1">
                                              <div className="font-medium">{part.name}</div>
                                              <div className="text-xs text-muted-foreground">
                                                السعر: {part.price} ر.س • الكمية: {part.quantity}
                                              </div>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="w-24">
                              <Label className="text-xs">الكمية</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handlePartChange(index, "quantity", e.target.value)
                                }
                                className="text-right"
                              />
                            </div>
                            <div className="w-28">
                              <Label className="text-xs">السعر</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) =>
                                  handlePartChange(index, "price", e.target.value)
                                }
                                className="text-right"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePart(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddPart}
                        className="w-full mt-2"
                      >
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة قطعة
                      </Button>
                    </div>

                    <div>
                      <Label htmlFor="notes">ملاحظات</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        className="text-right"
                        placeholder="ملاحظات إضافية..."
                      />
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>الإجمالي:</span>
                        <span>{totalCost.toLocaleString()} ر.س</span>
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
                      حفظ عملية الشراء
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد عمليات شراء مسجلة</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">المورد</TableHead>
                    <TableHead className="text-right">قطع الغيار</TableHead>
                    <TableHead className="text-right">التكلفة الإجمالية</TableHead>
                    <TableHead className="text-right">الملاحظات</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>{purchase.date}</TableCell>
                        <TableCell className="font-medium">{purchase.supplier}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {purchase.spareParts.map((item, idx) => {
                              const part = spareParts.find((p) => p.id === item.sparePartId);
                              return (
                                <Badge key={idx} variant="outline">
                                  {part?.name} ({item.quantity})
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {purchase.totalCost.toLocaleString()} ر.س
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {purchase.notes || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPurchase(purchase);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPurchase(purchase);
                                setFormData({
                                  date: purchase.date,
                                  supplier: purchase.supplier,
                                  notes: purchase.notes,
                                });
                                setSelectedParts(purchase.spareParts);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPurchase(purchase);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Purchase Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>تفاصيل عملية الشراء</DialogTitle>
            </DialogHeader>
            {selectedPurchase && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">التاريخ</Label>
                    <p className="font-medium">{selectedPurchase.date}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المورد</Label>
                    <p className="font-medium">{selectedPurchase.supplier}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">قطع الغيار</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">القطعة</TableHead>
                        <TableHead className="text-right">الكمية</TableHead>
                        <TableHead className="text-right">السعر</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPurchase.spareParts.map((item, idx) => {
                        const part = spareParts.find((p) => p.id === item.sparePartId);
                        return (
                          <TableRow key={idx}>
                            <TableCell>{part?.name || "غير معروف"}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.price.toFixed(2)} ر.س</TableCell>
                            <TableCell>{(item.quantity * item.price).toFixed(2)} ر.س</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <Label className="text-muted-foreground">التكلفة الإجمالية</Label>
                  <p className="text-2xl font-bold text-primary">
                    {selectedPurchase.totalCost.toLocaleString()} ر.س
                  </p>
                </div>
                {selectedPurchase.notes && (
                  <div>
                    <Label className="text-muted-foreground">الملاحظات</Label>
                    <p className="font-medium">{selectedPurchase.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Purchase Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل عملية الشراء</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedPurchase) return;

                try {
                  await updatePurchase(selectedPurchase.id, {
                    date: formData.date,
                    supplier: formData.supplier,
                    notes: formData.notes,
                    spareParts: selectedParts,
                    totalCost: selectedParts.reduce((sum, item) => sum + item.quantity * item.price, 0),
                  });
                  setEditDialogOpen(false);
                  setSelectedPurchase(null);
                } catch (error) {
                  console.error(error);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-date">التاريخ</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-supplier">المورد</Label>
                  <Input
                    id="edit-supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>قطع الغيار</Label>
                <div className="space-y-3 mt-2">
                  {selectedParts.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
                      <div className="flex-1">
                        <Label className="text-xs">القطعة</Label>
                        <Select
                          value={item.sparePartId}
                          onValueChange={(value) => handlePartChange(index, "sparePartId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر القطعة" />
                          </SelectTrigger>
                          <SelectContent>
                            {spareParts.map((part) => (
                              <SelectItem key={part.id} value={part.id}>
                                {part.name} - {part.price} ر.س
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">الكمية</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handlePartChange(index, "quantity", e.target.value)}
                        />
                      </div>
                      <div className="w-28">
                        <Label className="text-xs">السعر</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => handlePartChange(index, "price", e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePart(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={handleAddPart} className="w-full">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة قطعة
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-notes">الملاحظات</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span>الإجمالي:</span>
                <span className="text-xl font-bold">
                  {selectedParts.reduce((sum, item) => sum + item.quantity * item.price, 0).toLocaleString()} ر.س
                </span>
              </div>

              <Button type="submit" className="w-full">
                حفظ التعديلات
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف عملية الشراء هذه؟ هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (selectedPurchase) {
                    try {
                      await deletePurchase(selectedPurchase.id);
                      setDeleteDialogOpen(false);
                      setSelectedPurchase(null);
                    } catch (error) {
                      console.error(error);
                    }
                  }
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Purchases;
