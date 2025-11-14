import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, ArrowRight, AlertCircle, Pencil, Trash2, Activity, Upload, ShoppingCart, TrendingUp, History, Search, List, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useSpareParts } from "@/contexts/SparePartsContext";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";

const SpareParts = () => {
  const { spareParts, addSparePart, updateSparePart, deleteSparePart } = useSpareParts();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<'name' | 'code' | 'price' | 'quantity' | 'minQuantity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stockTransactions, setStockTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchStockTransactions();
  }, [dateFrom, dateTo, spareParts]);

  const fetchStockTransactions = async () => {
    let query = supabase
      .from('stock_transactions')
      .select('*');
    
    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('transaction_date', dateTo);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching stock transactions:', error);
      return;
    }
    setStockTransactions(data || []);
  };

  const getSparePartStats = (sparePartId: string) => {
    const transactions = stockTransactions.filter(t => t.spare_part_id === sparePartId);
    const totalPurchased = transactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalUsed = transactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + Math.abs(t.quantity || 0), 0);
    
    return { totalPurchased, totalUsed };
  };

  const handleSort = (field: 'name' | 'code' | 'price' | 'quantity' | 'minQuantity') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedSpareParts = spareParts
    .filter(part => 
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.unit.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const exportToExcel = () => {
    const excelData = filteredAndSortedSpareParts.map(part => {
      const stats = getSparePartStats(part.id);
      return {
        'الكود': part.code || '-',
        'اسم القطعة': part.name,
        'السعر (ر.س)': part.price,
        'الكمية المتاحة': part.quantity,
        'الوحدة': part.unit,
        'الحد الأدنى': part.minQuantity,
        'إجمالي الكمية المشتراة': stats.totalPurchased,
        'الكمية المصروفة': stats.totalUsed,
        'الحالة': part.quantity <= part.minQuantity ? 'مخزون منخفض' : 'متوفر',
        'القيمة الإجمالية (ر.س)': part.price * part.quantity
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'قطع الغيار');
    
    // تنسيق العرض
    const cols = [
      { wch: 15 }, // الكود
      { wch: 30 }, // اسم القطعة
      { wch: 12 }, // السعر
      { wch: 15 }, // الكمية المتاحة
      { wch: 10 }, // الوحدة
      { wch: 12 }, // الحد الأدنى
      { wch: 18 }, // إجمالي المشتراة
      { wch: 15 }, // المصروفة
      { wch: 15 }, // الحالة
      { wch: 18 }  // القيمة الإجمالية
    ];
    worksheet['!cols'] = cols;
    
    const dateRange = dateFrom || dateTo 
      ? `-${dateFrom || 'start'}-to-${dateTo || 'end'}`
      : '';
    XLSX.writeFile(workbook, `spare-parts${dateRange}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    price: "",
    quantity: "",
    minQuantity: "",
    unit: "قطعة",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingPart) {
      updateSparePart(editingPart, {
        name: formData.name,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        minQuantity: parseInt(formData.minQuantity),
        unit: formData.unit,
      });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث قطعة الغيار",
      });
    } else {
      addSparePart({
        code: formData.code || `SP-${Date.now()}`,
        name: formData.name,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        minQuantity: parseInt(formData.minQuantity),
        unit: formData.unit,
      });
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تم إضافة قطعة الغيار الجديدة",
      });
    }
    
    setDialogOpen(false);
    setEditingPart(null);
    setFormData({
      code: "",
      name: "",
      price: "",
      quantity: "",
      minQuantity: "",
      unit: "قطعة",
    });
  };

  const handleEdit = (part: any) => {
    setEditingPart(part.id);
    setFormData({
      code: part.code || '',
      name: part.name,
      price: part.price.toString(),
      quantity: part.quantity.toString(),
      minQuantity: part.minQuantity.toString(),
      unit: part.unit,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف ${name}؟`)) {
      deleteSparePart(id);
      toast({
        title: "تم الحذف",
        description: "تم حذف قطعة الغيار",
      });
    }
  };

  const lowStockParts = filteredAndSortedSpareParts.filter((part) => part.quantity <= part.minQuantity);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 mr-1 text-muted-foreground" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-3 w-3 mr-1 text-primary" />
      : <ArrowDown className="h-3 w-3 mr-1 text-primary" />;
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">إدارة قطع الغيار</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                تصدير Excel
              </Button>
              <Link to="/bulk-spare-parts">
                <Button variant="outline">
                  <List className="h-4 w-4 ml-2" />
                  إضافة من اكسل
                </Button>
              </Link>
              <Link to="/stock-movement">
                <Button variant="outline">
                  <Activity className="h-4 w-4 ml-2" />
                  حركة المخزون
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
        {/* إحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي الأصناف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{spareParts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                أصناف منخفضة المخزون
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{lowStockParts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                القيمة الإجمالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {spareParts.reduce((sum, part) => sum + part.price * part.quantity, 0).toLocaleString()} ر.س
              </div>
            </CardContent>
          </Card>
        </div>

        {/* تنبيه المخزون المنخفض */}
        {lowStockParts.length > 0 && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-500 mb-2">تنبيه: مخزون منخفض</h3>
                  <p className="text-sm text-muted-foreground">
                    لديك {lowStockParts.length} من قطع الغيار تحتاج إلى إعادة طلب:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {lowStockParts.map((part) => (
                      <Badge key={part.id} variant="outline" className="border-yellow-500 text-yellow-500">
                        {part.name} ({part.quantity} {part.unit})
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* قائمة قطع الغيار */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle>قطع الغيار</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingPart(null);
                    setFormData({
                      code: "",
                      name: "",
                      price: "",
                      quantity: "",
                      minQuantity: "",
                      unit: "قطعة",
                    });
                  }}>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة قطعة غيار
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPart ? "تعديل قطعة الغيار" : "إضافة قطعة غيار جديدة"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="code">كود القطعة</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="اختياري - سيتم توليده تلقائياً"
                        className="text-right"
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">اسم القطعة</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="text-right"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">السعر (ر.س)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                          className="text-right"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit">الوحدة</Label>
                        <Input
                          id="unit"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          required
                          className="text-right"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity">الكمية الحالية</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          required
                          className="text-right"
                        />
                      </div>
                      <div>
                        <Label htmlFor="minQuantity">الحد الأدنى</Label>
                        <Input
                          id="minQuantity"
                          type="number"
                          value={formData.minQuantity}
                          onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                          required
                          className="text-right"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingPart ? "تحديث" : "إضافة"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="ابحث عن قطع الغيار بالاسم أو الكود..." 
                    className="pr-9 text-right"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="dateFrom" className="whitespace-nowrap">من تاريخ:</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="dateTo" className="whitespace-nowrap">إلى تاريخ:</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 font-semibold"
                      onClick={() => handleSort('code')}
                    >
                      <SortIcon field="code" />
                      الكود
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 font-semibold"
                      onClick={() => handleSort('name')}
                    >
                      <SortIcon field="name" />
                      القطعة
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 font-semibold"
                      onClick={() => handleSort('price')}
                    >
                      <SortIcon field="price" />
                      السعر
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 font-semibold"
                      onClick={() => handleSort('quantity')}
                    >
                      <SortIcon field="quantity" />
                      الكمية المتاحة
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 font-semibold"
                      onClick={() => handleSort('minQuantity')}
                    >
                      <SortIcon field="minQuantity" />
                      الحد الأدنى
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">إجمالي الكمية المشتراة</TableHead>
                  <TableHead className="text-right">الكمية المصروفة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">القيمة الإجمالية</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSpareParts.length > 0 ? (
                  filteredAndSortedSpareParts.map((part) => {
                    const stats = getSparePartStats(part.id);
                    return (
                  <TableRow key={part.id}>
                    <TableCell className="font-mono text-sm">{part.code}</TableCell>
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell>{part.price.toLocaleString()} ر.س</TableCell>
                    <TableCell>
                      {part.quantity} {part.unit}
                    </TableCell>
                    <TableCell>
                      {part.minQuantity} {part.unit}
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {stats.totalPurchased} {part.unit}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {stats.totalUsed} {part.unit}
                    </TableCell>
                    <TableCell>
                      {part.quantity <= part.minQuantity ? (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                          مخزون منخفض
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-500">
                          متوفر
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {(part.price * part.quantity).toLocaleString()} ر.س
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(part)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(part.id, part.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      لا توجد قطع غيار تطابق البحث
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SpareParts;
