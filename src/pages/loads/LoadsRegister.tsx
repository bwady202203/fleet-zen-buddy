import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Plus, Save, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const LoadsRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    loadNumber: '',
    invoiceNumber: '',
    companyId: '',
    loadTypeId: '',
    driverId: '',
    truckNumber: '',
    quantity: '1',
    unitPrice: '0',
    notes: ''
  });
  const [isCommissionBased, setIsCommissionBased] = useState(false);

  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [driverSearchOpen, setDriverSearchOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [companiesRes, loadTypesRes, driversRes] = await Promise.all([
      supabase.from('companies').select('*').eq('is_active', true),
      supabase.from('load_types').select('*').eq('is_active', true),
      supabase.from('drivers').select('*').eq('is_active', true)
    ]);

    if (companiesRes.data) setCompanies(companiesRes.data);
    if (loadTypesRes.data) setLoadTypes(loadTypesRes.data);
    if (driversRes.data) setDrivers(driversRes.data);
  };

  const loadCompanyPrice = async (companyId: string, loadTypeId: string, quantity: number) => {
    if (!companyId || !loadTypeId) return;

    // أولاً: نحاول جلب السعر من جدول عمولات السائق بناءً على الكمية
    let commissionApplied = false;
    
    if (!isNaN(quantity) && quantity > 0) {
      let commissionType = 'fixed';
      
      if (quantity < 40) {
        commissionType = 'weight_less_40';
      } else if (quantity >= 40 && quantity <= 44) {
        commissionType = 'weight_40_44';
      } else if (quantity > 44 && quantity <= 49) {
        commissionType = 'weight_44_49';
      } else if (quantity > 49) {
        commissionType = 'weight_more_49';
      }

      const { data: commissionData, error: commissionError } = await supabase
        .from('company_driver_commissions')
        .select('amount')
        .eq('company_id', companyId)
        .eq('commission_type', commissionType as any)
        .maybeSingle();

      // نطبق عمولة السائق فقط إذا كانت القيمة أكبر من صفر
      if (!commissionError && commissionData && commissionData.amount > 0) {
        setFormData(prev => ({ ...prev, unitPrice: commissionData.amount.toString() }));
        setIsCommissionBased(true);
        commissionApplied = true;
      }
    }

    // ثانياً: إذا لم يتم تطبيق عمولة السائق، نجلب السعر من جدول أسعار الأصناف
    if (!commissionApplied) {
      const { data, error } = await supabase
        .from('company_load_type_prices')
        .select('unit_price')
        .eq('company_id', companyId)
        .eq('load_type_id', loadTypeId)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setFormData(prev => ({ ...prev, unitPrice: data.unit_price.toString() }));
        setIsCommissionBased(false);
      }
    }
  };

  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    if (formData.companyId && formData.loadTypeId) {
      loadCompanyPrice(formData.companyId, formData.loadTypeId, quantity);
    }
  }, [formData.companyId, formData.loadTypeId, formData.quantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // التحقق من عدم تكرار رقم الشحنة
      const { data: existingLoad, error: checkError } = await supabase
        .from('loads')
        .select('id')
        .eq('load_number', formData.loadNumber)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingLoad) {
        toast({
          title: "خطأ في رقم الشحنة",
          description: `رقم الشحنة "${formData.loadNumber}" موجود مسبقاً. الرجاء استخدام رقم آخر.`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const loadType = loadTypes.find(lt => lt.id === formData.loadTypeId);
      const quantity = parseFloat(formData.quantity);
      const unitPrice = parseFloat(formData.unitPrice);
      
      // إذا كان السعر من عمولة السائق، لا نضربه في الكمية
      const totalAmount = isCommissionBased ? unitPrice : (quantity * unitPrice);
      const commissionAmount = loadType ? (totalAmount * loadType.commission_rate / 100) : 0;

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('loads').insert({
        load_number: formData.loadNumber,
        invoice_number: formData.invoiceNumber || null,
        date: formData.date,
        company_id: formData.companyId || null,
        load_type_id: formData.loadTypeId || null,
        driver_id: formData.driverId || null,
        truck_number: formData.truckNumber || null,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        notes: formData.notes || null,
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: "تم الحفظ بنجاح",
        description: "تم تسجيل الشحنة بنجاح"
      });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        loadNumber: '',
        invoiceNumber: '',
        companyId: '',
        loadTypeId: '',
        driverId: '',
        truckNumber: '',
        quantity: '1',
        unitPrice: '0',
        notes: ''
      });
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

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">تسجيل الحمولات</h1>
              <p className="text-muted-foreground mt-1">إضافة حمولة جديدة</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>بيانات الشحنة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date">التاريخ</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loadNumber">رقم الشحنة</Label>
                  <Input
                    id="loadNumber"
                    value={formData.loadNumber}
                    onChange={(e) => setFormData({ ...formData, loadNumber: e.target.value })}
                    required
                    placeholder="أدخل رقم الشحنة"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">رقم الفاتورة</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="اختياري"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">اسم العميل</Label>
                  <Select value={formData.companyId} onValueChange={(value) => setFormData({ ...formData, companyId: value })}>
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
                  <Label htmlFor="loadType">نوع الحمولة</Label>
                  <div className="flex gap-2">
                    <Select value={formData.loadTypeId} onValueChange={(value) => setFormData({ ...formData, loadTypeId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الحمولة" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="outline" onClick={() => navigate('/loads/load-types')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driver">اسم السائق</Label>
                  <Popover open={driverSearchOpen} onOpenChange={setDriverSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={driverSearchOpen}
                        className="w-full justify-between"
                      >
                        {formData.driverId
                          ? drivers.find((driver) => driver.id === formData.driverId)?.name
                          : "اختر السائق..."}
                        <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="ابحث عن سائق..." />
                        <CommandList>
                          <CommandEmpty>لم يتم العثور على سائق</CommandEmpty>
                          <CommandGroup>
                            {drivers.map((driver) => (
                              <CommandItem
                                key={driver.id}
                                value={driver.name}
                                onSelect={() => {
                                  setFormData({ ...formData, driverId: driver.id });
                                  setDriverSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "ml-2 h-4 w-4",
                                    formData.driverId === driver.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {driver.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="truckNumber">رقم الشاحنة</Label>
                  <Input
                    id="truckNumber"
                    value={formData.truckNumber}
                    onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
                    placeholder="أدخل رقم الشاحنة"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">الكمية</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitPrice">السعر</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أدخل ملاحظات إضافية"
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ الشحنة
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/loads')}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LoadsRegister;
