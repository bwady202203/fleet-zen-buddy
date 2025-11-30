import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  Printer, 
  Edit, 
  Trash2, 
  Filter, 
  FileDown, 
  Search,
  Calendar,
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  RefreshCw,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import * as XLSX from "xlsx";

const AdvancedLoadsList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedLoadType, setSelectedLoadType] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [sortField, setSortField] = useState<'date' | 'load_number' | 'quantity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData();
    loadFilterData();
  }, []);

  const loadFilterData = async () => {
    try {
      const [companiesRes, loadTypesRes, driversRes] = await Promise.all([
        supabase.from('companies').select('id, name').eq('is_active', true).order('name'),
        supabase.from('load_types').select('id, name').eq('is_active', true).order('name'),
        supabase.from('drivers').select('id, name').eq('is_active', true).order('name')
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      if (loadTypesRes.data) setLoadTypes(loadTypesRes.data);
      if (driversRes.data) setDrivers(driversRes.data);
    } catch (error: any) {
      console.error('Error loading filter data:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loads')
        .select(`
          *,
          companies (name),
          load_types (name),
          drivers (name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      
      console.log(`✅ تم تحميل ${data?.length || 0} شحنة`);
      setLoads(data || []);
      
      toast({
        title: "تم التحميل بنجاح",
        description: `تم تحميل ${data?.length || 0} شحنة`,
      });
    } catch (error: any) {
      console.error('Error loading loads:', error);
      toast({
        title: "خطأ في التحميل",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLoads = useMemo(() => {
    let filtered = [...loads];

    // Filter by company
    if (selectedCompany !== "all") {
      filtered = filtered.filter(load => load.company_id === selectedCompany);
    }

    // Filter by load type
    if (selectedLoadType !== "all") {
      filtered = filtered.filter(load => load.load_type_id === selectedLoadType);
    }

    // Filter by driver
    if (selectedDriver !== "all") {
      filtered = filtered.filter(load => load.driver_id === selectedDriver);
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(load => load.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(load => load.date <= endDate);
    }

    // Filter by search text
    if (searchText.trim()) {
      const search = searchText.trim().toLowerCase();
      filtered = filtered.filter(load => 
        (load.load_number && load.load_number.toLowerCase().includes(search)) ||
        (load.truck_number && load.truck_number.toLowerCase().includes(search)) ||
        (load.companies?.name && load.companies.name.toLowerCase().includes(search)) ||
        (load.drivers?.name && load.drivers.name.toLowerCase().includes(search))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'load_number') {
        comparison = (a.load_number || '').localeCompare(b.load_number || '');
      } else if (sortField === 'quantity') {
        comparison = (a.quantity || 0) - (b.quantity || 0);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [loads, selectedCompany, selectedLoadType, selectedDriver, startDate, endDate, searchText, sortField, sortOrder]);

  const statistics = useMemo(() => {
    return {
      totalLoads: filteredLoads.length,
      totalQuantity: filteredLoads.reduce((sum, load) => sum + (load.quantity || 0), 0),
      totalAmount: filteredLoads.reduce((sum, load) => sum + (parseFloat(load.unit_price) || 0), 0),
      uniqueDrivers: new Set(filteredLoads.map(load => load.driver_id)).size,
      uniqueCompanies: new Set(filteredLoads.map(load => load.company_id)).size,
    };
  }, [filteredLoads]);

  const resetFilters = () => {
    setSelectedCompany("all");
    setSelectedLoadType("all");
    setSelectedDriver("all");
    setStartDate("");
    setEndDate("");
    setSearchText("");
    
    toast({
      title: "تمت إعادة التعيين",
      description: `عرض جميع الشحنات (${loads.length})`,
    });
  };

  const exportToExcel = () => {
    const exportData = filteredLoads.map(load => ({
      'التاريخ': format(new Date(load.date), 'yyyy-MM-dd'),
      'رقم الشحنة': load.load_number,
      'الشركة': load.companies?.name || '-',
      'نوع الشحنة': load.load_types?.name || '-',
      'السائق': load.drivers?.name || '-',
      'رقم الشاحنة': load.truck_number || '-',
      'الكمية': load.quantity,
      'السعر': parseFloat(load.unit_price).toFixed(2),
      'المبلغ الإجمالي': parseFloat(load.total_amount || 0).toFixed(2),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loads");
    XLSX.writeFile(wb, `loads_advanced_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: "تم التصدير",
      description: "تم تصدير البيانات إلى Excel بنجاح"
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الشحنة؟')) return;

    try {
      const { error } = await supabase
        .from('loads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الشحنة بنجاح"
      });
      
      loadData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSort = (field: 'date' | 'load_number' | 'quantity') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/loads" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
                  سجل الشحنات المطور
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Advanced Loads Registry - نظام متقدم لإدارة وعرض الشحنات
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => loadData()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
              <Button onClick={exportToExcel} variant="outline" size="sm">
                <FileDown className="h-4 w-4 ml-2" />
                تصدير Excel
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">عدد الشحنات</p>
                  <p className="text-3xl font-bold text-blue-600">{statistics.totalLoads}</p>
                </div>
                <Package className="h-10 w-10 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">إجمالي الكمية</p>
                  <p className="text-3xl font-bold text-green-600">{statistics.totalQuantity.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">طن</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">إجمالي المبلغ</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {statistics.totalAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">ريال</p>
                </div>
                <DollarSign className="h-10 w-10 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">عدد السائقين</p>
                  <p className="text-3xl font-bold text-purple-600">{statistics.uniqueDrivers}</p>
                </div>
                <Truck className="h-10 w-10 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border-pink-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">عدد الشركات</p>
                  <p className="text-3xl font-bold text-pink-600">{statistics.uniqueCompanies}</p>
                </div>
                <Package className="h-10 w-10 text-pink-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle>فلاتر البحث المتقدم</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Search Bar */}
            <div className="mb-6">
              <Label className="text-sm font-medium mb-2 block">بحث سريع</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="ابحث برقم الشحنة، الشاحنة، الشركة، أو السائق..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  من تاريخ
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  إلى تاريخ
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">الشركة</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
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
                <Label className="text-sm font-medium">نوع الحمولة</Label>
                <Select value={selectedLoadType} onValueChange={setSelectedLoadType}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الأنواع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    {loadTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">السائق</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع السائقين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع السائقين</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetFilters}>
                إعادة تعيين
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle>جدول الشحنات</CardTitle>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {filteredLoads.length} شحنة
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : filteredLoads.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">لا توجد شحنات مطابقة للفلتر</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">
                        <button 
                          onClick={() => handleSort('date')} 
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          التاريخ
                          {sortField === 'date' && (
                            <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button 
                          onClick={() => handleSort('load_number')} 
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          رقم الشحنة
                          {sortField === 'load_number' && (
                            <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">الشركة</TableHead>
                      <TableHead className="text-right">نوع الشحنة</TableHead>
                      <TableHead className="text-right">السائق</TableHead>
                      <TableHead className="text-right">رقم الشاحنة</TableHead>
                      <TableHead className="text-right">
                        <button 
                          onClick={() => handleSort('quantity')} 
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          الكمية
                          {sortField === 'quantity' && (
                            <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoads.map((load, index) => (
                      <TableRow 
                        key={load.id} 
                        className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                      >
                        <TableCell className="text-right font-medium">
                          {format(new Date(load.date), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {load.load_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{load.companies?.name || '-'}</TableCell>
                        <TableCell className="text-right">{load.load_types?.name || '-'}</TableCell>
                        <TableCell className="text-right">{load.drivers?.name || '-'}</TableCell>
                        <TableCell className="text-right">{load.truck_number || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {load.quantity.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {parseFloat(load.unit_price).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/loads/edit/${load.id}`)}
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(load.id)}
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdvancedLoadsList;