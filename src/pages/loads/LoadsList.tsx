import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Printer, Edit, Trash2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";

const LoadsList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loads, setLoads] = useState<any[]>([]);
  const [filteredLoads, setFilteredLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedLoadType, setSelectedLoadType] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");

  useEffect(() => {
    loadData();
    loadFilterData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [loads, selectedCompany, selectedLoadType, selectedDriver]);

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
      setLoads(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل تحميل البيانات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...loads];

    if (selectedCompany !== "all") {
      filtered = filtered.filter(load => load.company_id === selectedCompany);
    }

    if (selectedLoadType !== "all") {
      filtered = filtered.filter(load => load.load_type_id === selectedLoadType);
    }

    if (selectedDriver !== "all") {
      filtered = filtered.filter(load => load.driver_id === selectedDriver);
    }

    setFilteredLoads(filtered);
  };

  const resetFilters = () => {
    setSelectedCompany("all");
    setSelectedLoadType("all");
    setSelectedDriver("all");
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card print:hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/loads" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">سجل الشحنات</h1>
                <p className="text-muted-foreground mt-1">عرض جميع الشحنات المسجلة</p>
              </div>
            </div>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6 print:hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>فلتر البحث</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الشركة</label>
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
                <label className="text-sm font-medium">نوع الحمولة</label>
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
                <label className="text-sm font-medium">السائق</label>
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

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                  className="w-full"
                >
                  إعادة تعيين
                </Button>
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              عدد النتائج: {filteredLoads.length} من {loads.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>جدول الشحنات</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : filteredLoads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد شحنات مطابقة للفلتر
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">رقم الشحنة</TableHead>
                      <TableHead className="text-right">الشركة</TableHead>
                      <TableHead className="text-right">نوع الشحنة</TableHead>
                      <TableHead className="text-right">السائق</TableHead>
                      <TableHead className="text-right">رقم الشاحنة</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">المجموع</TableHead>
                      <TableHead className="text-right print:hidden">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoads.map((load) => (
                      <TableRow key={load.id} className="hover:bg-muted/50">
                        <TableCell className="text-right">
                          {format(new Date(load.date), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="text-right font-medium">{load.load_number}</TableCell>
                        <TableCell className="text-right">{load.companies?.name || '-'}</TableCell>
                        <TableCell className="text-right">{load.load_types?.name || '-'}</TableCell>
                        <TableCell className="text-right">{load.drivers?.name || '-'}</TableCell>
                        <TableCell className="text-right">{load.truck_number || '-'}</TableCell>
                        <TableCell className="text-right">{load.quantity}</TableCell>
                        <TableCell className="text-right">{load.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">{load.total_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right print:hidden">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/loads/edit/${load.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(load.id)}
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

      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadsList;
