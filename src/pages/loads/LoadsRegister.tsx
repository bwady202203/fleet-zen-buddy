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
import { standardLoadRegistrationSchema } from "@/lib/loadRegistrationValidation";

const LoadsRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    loadNumber: '',
    invoiceNumber: '',
    invoiceDate: '',
    companyId: '',
    loadTypeId: '',
    driverId: '',
    truckNumber: '',
    quantity: '1',
    unitPrice: '0',
    driverCommission: '0',
    deliveryCommission: '0',
    unloadQuantity: '',
    deliveryFrom: '',
    deliveryTo: '',
    notes: ''
  });
  const [isCommissionBased, setIsCommissionBased] = useState(false);

  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [driverSearchOpen, setDriverSearchOpen] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const validation = standardLoadRegistrationSchema.safeParse(formData);
  const errors: Record<string, string> = {};
  if (validationAttempted && !validation.success) {
    for (const issue of validation.error.issues) {
      const key = String(issue.path[0]);
      if (!errors[key]) errors[key] = issue.message;
    }
  }
  const fieldProps = (field: string) => ({ id: field, "aria-required": true as const, "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `${field}-error` : undefined });
  const errorMessage = (field: string) => errors[field] ? <p id={`${field}-error`} role="alert" className="text-sm text-destructive">{errors[field]}</p> : null;

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
    const { data: locationData } = await supabase.from('delivery_locations').select('id, name').order('name');
    if (locationData) setLocations(locationData);
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

  // Auto-load driver/delivery commissions from company data (always fetch latest)
  useEffect(() => {
    if (!formData.companyId) {
      setFormData(prev => ({ ...prev, driverCommission: '0', deliveryCommission: '0' }));
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('driver_commission, delivery_commission')
        .eq('id', formData.companyId)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        setFormData(prev => ({
          ...prev,
          driverCommission: (data.driver_commission ?? 0).toString(),
          deliveryCommission: (data.delivery_commission ?? 0).toString()
        }));
      } else {
        const company = companies.find(c => c.id === formData.companyId);
        if (company) {
          setFormData(prev => ({
            ...prev,
            driverCommission: (company.driver_commission ?? 0).toString(),
            deliveryCommission: (company.delivery_commission ?? 0).toString()
          }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [formData.companyId, companies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationAttempted(true);
    const result = standardLoadRegistrationSchema.safeParse(formData);
    if (!result.success) {
      toast({ title: "يرجى استكمال الحقول المطلوبة", description: result.error.issues.map((issue) => issue.message).join("، "), variant: "destructive" });
      const field = result.error.issues[0]?.path[0];
      if (typeof field === "string") document.getElementById(field)?.focus();
      return;
    }
    const validated = result.data;
    setLoading(true);

    try {
      // التحقق من عدم تكرار رقم الشحنة
      const { data: existingLoad, error: checkError } = await supabase
        .from('loads')
        .select('id')
        .eq('load_number', validated.loadNumber)
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
      const quantity = validated.quantity;
      const unitPrice = validated.unitPrice;
      
      // إذا كان السعر من عمولة السائق، لا نضربه في الكمية
      const totalAmount = isCommissionBased ? unitPrice : (quantity * unitPrice);
      const commissionAmount = loadType ? (totalAmount * loadType.commission_rate / 100) : 0;

      const { error } = await supabase.rpc("register_standard_load", { p_load: {
        load_number: validated.loadNumber,
        invoice_number: formData.invoiceNumber || null,
        invoice_date: validated.invoiceDate,
        date: formData.date,
        company_id: validated.companyId,
        load_type_id: validated.loadTypeId,
        driver_id: validated.driverId,
        truck_number: validated.truckNumber,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        driver_commission: validated.driverCommission,
        delivery_commission: validated.deliveryCommission,
        notes: formData.notes || null,
        unload_quantity: validated.unloadQuantity,
        delivery_from: validated.deliveryFrom,
        delivery_to: validated.deliveryTo,
      } });

      if (error) throw error;

      toast({
        title: "تم الحفظ بنجاح",
        description: "تم تسجيل الشحنة بنجاح"
      });

      setValidationAttempted(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        loadNumber: '',
        invoiceNumber: '',
        invoiceDate: '',
        companyId: '',
        loadTypeId: '',
        driverId: '',
        truckNumber: '',
        quantity: '1',
        unitPrice: '0',
        driverCommission: '0',
        deliveryCommission: '0',
        unloadQuantity: '',
    deliveryFrom: '',
    deliveryTo: '',
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
              <h1 className="text-3xl font-bold">تسجيل الحمولات / Loads Registration</h1>
              <p className="text-muted-foreground mt-1">إضافة حمولة جديدة / Add New Load</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>بيانات الشحنة / Load Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form noValidate onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date">التاريخ / Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loadNumber">رقم الشحنة / Load Number <span className="text-destructive">*</span></Label>
                  <Input
                    {...fieldProps("loadNumber")}
                    value={formData.loadNumber}
                    onChange={(e) => setFormData({ ...formData, loadNumber: e.target.value })}
                    required
                    placeholder="أدخل رقم الشحنة / Enter load number"
                  />
                  {errorMessage("loadNumber")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">رقم الفاتورة / Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="اختياري / Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceDate">تاريخ الفاتورة / Invoice Date <span className="text-destructive">*</span></Label>
                  <Input
                    {...fieldProps("invoiceDate")}
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  />
                  {errorMessage("invoiceDate")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyId">اسم العميل / Customer Name <span className="text-destructive">*</span></Label>
                  <Select value={formData.companyId} onValueChange={(value) => setFormData({ ...formData, companyId: value })}>
                    <SelectTrigger {...fieldProps("companyId")}>
                      <SelectValue placeholder="اختر العميل / Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errorMessage("companyId")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loadTypeId">نوع الحمولة / Load Type <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <Select value={formData.loadTypeId} onValueChange={(value) => setFormData({ ...formData, loadTypeId: value })}>
                      <SelectTrigger {...fieldProps("loadTypeId")}>
                        <SelectValue placeholder="اختر نوع الحمولة / Select load type" />
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
                  {errorMessage("loadTypeId")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driverId">اسم السائق / Driver Name <span className="text-destructive">*</span></Label>
                  <Popover open={driverSearchOpen} onOpenChange={setDriverSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        {...fieldProps("driverId")}
                        variant="outline"
                        role="combobox"
                        aria-expanded={driverSearchOpen}
                        className="w-full justify-between"
                      >
                        {formData.driverId
                          ? drivers.find((driver) => driver.id === formData.driverId)?.name
                          : "اختر السائق / Select driver..."}
                        <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="ابحث عن سائق / Search driver..." />
                        <CommandList>
                          <CommandEmpty>لم يتم العثور على سائق / No driver found</CommandEmpty>
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
                  {errorMessage("driverId")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="truckNumber">رقم الشاحنة / Truck Number <span className="text-destructive">*</span></Label>
                  <Input
                    {...fieldProps("truckNumber")}
                    value={formData.truckNumber}
                    onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
                    placeholder="أدخل رقم الشاحنة / Enter truck number"
                  />
                  {errorMessage("truckNumber")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">الكمية / Quantity <span className="text-destructive">*</span></Label>
                  <Input
                    {...fieldProps("quantity")}
                    type="text"
                    inputMode="decimal"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                  {errorMessage("quantity")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitPrice">السعر / Price <span className="text-destructive">*</span></Label>
                  <Input
                    {...fieldProps("unitPrice")}
                    type="text"
                    inputMode="decimal"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    required
                  />
                  {errorMessage("unitPrice")}
                  {isCommissionBased && formData.unitPrice !== '0' && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ عمولة ثابتة بناءً على الكمية ({parseFloat(formData.quantity)} طن)
                    </p>
                  )}
                  {!isCommissionBased && formData.unitPrice !== '0' && formData.companyId && formData.loadTypeId && (
                    <p className="text-sm text-blue-600 font-medium">
                      السعر من قائمة أسعار الشركة / Price from company price list
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driverCommission">عمولة السائق / Driver Commission <span className="text-destructive">*</span></Label>
                  <Input
                    {...fieldProps("driverCommission")}
                    type="text"
                    inputMode="decimal"
                    value={formData.driverCommission}
                    onChange={(e) => setFormData({ ...formData, driverCommission: e.target.value })}
                    placeholder="0.00"
                  />
                  {errorMessage("driverCommission")}
                  {formData.companyId && (
                    <p className="text-xs text-muted-foreground">يتم استدعاؤها تلقائياً من بيانات الشركة</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryCommission">عمولة التوصيل / Delivery Commission <span className="text-destructive">*</span></Label>
                  <Input
                    {...fieldProps("deliveryCommission")}
                    type="text"
                    inputMode="decimal"
                    value={formData.deliveryCommission}
                    onChange={(e) => setFormData({ ...formData, deliveryCommission: e.target.value })}
                    placeholder="0.00"
                  />
                  {errorMessage("deliveryCommission")}
                  {formData.companyId && (
                    <p className="text-xs text-muted-foreground">يتم استدعاؤها تلقائياً من بيانات الشركة</p>
                  )}
                </div>


                <div className="space-y-2">
                  <Label htmlFor="unloadQuantity">كمية التنزيل / Unload Quantity <span className="text-destructive">*</span></Label>
                  <Input {...fieldProps("unloadQuantity")} type="text" inputMode="decimal" value={formData.unloadQuantity} onChange={(e) => setFormData({ ...formData, unloadQuantity: e.target.value })} required />
                  {errorMessage("unloadQuantity")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryFrom">التوصيل من <span className="text-destructive">*</span></Label>
                  <Select value={formData.deliveryFrom} onValueChange={(value) => setFormData({ ...formData, deliveryFrom: value })}>
                    <SelectTrigger {...fieldProps("deliveryFrom")}><SelectValue placeholder="اختر الموقع" /></SelectTrigger>
                    <SelectContent>{locations.map((location) => <SelectItem key={location.id} value={location.name}>{location.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {errorMessage("deliveryFrom")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryTo">التوصيل الى <span className="text-destructive">*</span></Label>
                  <Select value={formData.deliveryTo} onValueChange={(value) => setFormData({ ...formData, deliveryTo: value })}>
                    <SelectTrigger {...fieldProps("deliveryTo")}><SelectValue placeholder="اختر الموقع" /></SelectTrigger>
                    <SelectContent>{locations.map((location) => <SelectItem key={location.id} value={location.name}>{location.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {errorMessage("deliveryTo")}
                </div>

                {/* عرض المبلغ الإجمالي المحسوب */}
                <div className="space-y-2 md:col-span-2">
                  <Label>المبلغ الإجمالي المحسوب / Calculated Total</Label>
                  <div className={cn(
                    "p-4 rounded-lg border-2",
                    isCommissionBased ? "bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700" : "bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700"
                  )}>
                    <div className="text-2xl font-bold text-center">
                      {isCommissionBased 
                        ? parseFloat(formData.unitPrice || '0').toLocaleString('ar-SA')
                        : (parseFloat(formData.quantity || '0') * parseFloat(formData.unitPrice || '0')).toLocaleString('ar-SA')
                      } ر.س
                    </div>
                    <div className="text-sm text-center mt-2 text-muted-foreground">
                      {isCommissionBased ? (
                        <span className="text-green-700 dark:text-green-400">
                          عمولة ثابتة = {parseFloat(formData.unitPrice || '0').toLocaleString('ar-SA')} ر.س
                        </span>
                      ) : (
                        <span className="text-blue-700 dark:text-blue-400">
                          الكمية ({parseFloat(formData.quantity || '0')}) × السعر ({parseFloat(formData.unitPrice || '0')}) = {(parseFloat(formData.quantity || '0') * parseFloat(formData.unitPrice || '0')).toLocaleString('ar-SA')} ر.س
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات / Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أدخل ملاحظات إضافية / Enter additional notes"
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ الشحنة / Save Load
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/loads')}>
                  إلغاء / Cancel
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
