import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Plus, Save, Check, ChevronsUpDown, Sparkles, FileBarChart, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const PremiumLoadsRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    loadNumber: "",
    invoiceNumber: "",
    invoiceDate: "",
    companyId: "",
    loadTypeId: "",
    driverId: "",
    truckNumber: "",
    quantity: "1",
    unloadQuantity: "",
    commissions: "0",
    deliveryFrom: "",
    deliveryTo: "",
  });

  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [driverSearchOpen, setDriverSearchOpen] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [locationDialog, setLocationDialog] = useState<null | "from" | "to">(null);
  const [newLocationName, setNewLocationName] = useState("");

  useEffect(() => {
    (async () => {
      const [companiesRes, loadTypesRes, driversRes] = await Promise.all([
        supabase.from("companies").select("*").eq("is_active", true),
        supabase.from("load_types").select("*").eq("is_active", true),
        supabase.from("drivers").select("*").eq("is_active", true),
      ]);
      if (companiesRes.data) setCompanies(companiesRes.data);
      if (loadTypesRes.data) setLoadTypes(loadTypesRes.data);
      if (driversRes.data) setDrivers(driversRes.data);
      loadLocations();
    })();
  }, []);

  const loadLocations = async () => {
    const { data } = await (supabase as any).from("delivery_locations").select("id, name").order("name");
    if (data) setLocations(data);
  };

  const addLocation = async () => {
    const name = newLocationName.trim();
    if (!name) return;
    const { error } = await (supabase as any).from("delivery_locations").insert({ name });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    setNewLocationName("");
    await loadLocations();
    toast({ title: "تمت الإضافة", description: `تم إضافة الموقع "${name}"` });
  };

  const deleteLocation = async (id: string) => {
    const { error } = await (supabase as any).from("delivery_locations").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    await loadLocations();
  };

  // استدعاء العمولات تلقائياً حسب الشركة والكمية
  useEffect(() => {
    if (!formData.companyId) return;
    let cancelled = false;
    (async () => {
      const quantity = parseFloat(formData.quantity) || 0;
      let commissionType = "fixed";
      if (quantity > 0 && quantity < 40) commissionType = "weight_less_40";
      else if (quantity >= 40 && quantity <= 44) commissionType = "weight_40_44";
      else if (quantity > 44 && quantity <= 49) commissionType = "weight_44_49";
      else if (quantity > 49) commissionType = "weight_more_49";

      const { data: commissionData } = await supabase
        .from("company_driver_commissions")
        .select("amount")
        .eq("company_id", formData.companyId)
        .eq("commission_type", commissionType as any)
        .maybeSingle();

      if (cancelled) return;

      if (commissionData && commissionData.amount > 0) {
        setFormData((prev) => ({ ...prev, commissions: commissionData.amount.toString() }));
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("driver_commission")
        .eq("id", formData.companyId)
        .maybeSingle();
      if (!cancelled && company) {
        setFormData((prev) => ({ ...prev, commissions: (company.driver_commission ?? 0).toString() }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.companyId, formData.quantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: existingLoad } = await supabase
        .from("loads")
        .select("id")
        .eq("load_number", formData.loadNumber)
        .maybeSingle();

      if (existingLoad) {
        toast({
          title: "خطأ في رقم الشحنة",
          description: `رقم الشحنة "${formData.loadNumber}" موجود مسبقاً. الرجاء استخدام رقم آخر.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const quantity = parseFloat(formData.quantity) || 0;
      const commissions = parseFloat(formData.commissions) || 0;

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("loads").insert({
        load_number: formData.loadNumber,
        invoice_number: formData.invoiceNumber || null,
        invoice_date: formData.invoiceDate || null,
        date: formData.date,
        company_id: formData.companyId || null,
        load_type_id: formData.loadTypeId || null,
        driver_id: formData.driverId || null,
        truck_number: formData.truckNumber || null,
        quantity,
        driver_commission: commissions,
        delivery_from: formData.deliveryFrom || null,
        delivery_to: formData.deliveryTo || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({ title: "تم الحفظ بنجاح", description: "تم تسجيل الحمولة بنجاح" });

      setFormData({
        date: new Date().toISOString().split("T")[0],
        loadNumber: "",
        invoiceNumber: "",
        invoiceDate: "",
        companyId: "",
        loadTypeId: "",
        driverId: "",
        truckNumber: "",
        quantity: "1",
        commissions: "0",
        deliveryFrom: "",
        deliveryTo: "",
      });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
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
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                تسجيل الحمولات المميز
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Premium Loads Registration</p>
            </div>
            <div className="mr-auto">
              <Button asChild variant="outline" size="icon" title="تقرير الحمولات المميز المفصل">
                <Link to="/loads/premium-report" aria-label="تقرير الحمولات المميز المفصل">
                  <FileBarChart className="h-5 w-5" />
                </Link>
              </Button>
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
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  <Label htmlFor="loadNumber">رقم الشحنة / Load Number</Label>
                  <Input
                    id="loadNumber"
                    value={formData.loadNumber}
                    onChange={(e) => setFormData({ ...formData, loadNumber: e.target.value })}
                    required
                    placeholder="أدخل رقم الشحنة / Enter load number"
                  />
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
                  <Label htmlFor="invoiceDate">تاريخ الفاتورة / Invoice Date</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>اسم العميل / Customer Name</Label>
                  <Select value={formData.companyId} onValueChange={(value) => setFormData({ ...formData, companyId: value })}>
                    <SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label>نوع الحمولة / Load Type</Label>
                  <div className="flex gap-2">
                    <Select value={formData.loadTypeId} onValueChange={(value) => setFormData({ ...formData, loadTypeId: value })}>
                      <SelectTrigger>
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
                    <Button type="button" size="icon" variant="outline" onClick={() => navigate("/loads/load-types")}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>اسم السائق / Driver Name</Label>
                  <Popover open={driverSearchOpen} onOpenChange={setDriverSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={driverSearchOpen} className="w-full justify-between">
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
                                <Check className={cn("ml-2 h-4 w-4", formData.driverId === driver.id ? "opacity-100" : "opacity-0")} />
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
                  <Label htmlFor="truckNumber">رقم الشاحنة / Truck Number</Label>
                  <Input
                    id="truckNumber"
                    value={formData.truckNumber}
                    onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
                    placeholder="أدخل رقم الشاحنة / Enter truck number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">الكمية / Quantity</Label>
                  <Input
                    id="quantity"
                    type="text"
                    inputMode="decimal"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commissions">عمولات / Commissions</Label>
                  <Input
                    id="commissions"
                    type="text"
                    inputMode="decimal"
                    value={formData.commissions}
                    onChange={(e) => setFormData({ ...formData, commissions: e.target.value })}
                    placeholder="0.00"
                  />
                  {formData.companyId && (
                    <p className="text-xs text-muted-foreground">يتم استدعاؤها تلقائياً حسب الشركة والكمية</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>التوصيل من / Delivery From</Label>
                  <div className="flex gap-2">
                    <Select value={formData.deliveryFrom} onValueChange={(value) => setFormData({ ...formData, deliveryFrom: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نقطة التحميل" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="outline" onClick={() => setLocationDialog("from")}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>التوصيل الى / Delivery To</Label>
                  <div className="flex gap-2">
                    <Select value={formData.deliveryTo} onValueChange={(value) => setFormData({ ...formData, deliveryTo: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نقطة التسليم" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="outline" onClick={() => setLocationDialog("to")}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ الشحنة / Save Load
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/loads")}>
                  إلغاء / Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <Dialog open={locationDialog !== null} onOpenChange={(o) => !o && setLocationDialog(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>مواقع التوصيل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="اسم الموقع"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLocation(); } }}
              />
              <Button type="button" onClick={addLocation}>إضافة</Button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد مواقع بعد</p>
              ) : locations.map((loc) => (
                <div key={loc.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <button
                    type="button"
                    className="text-sm hover:text-primary"
                    onClick={() => {
                      setFormData((prev) => locationDialog === "from"
                        ? { ...prev, deliveryFrom: loc.name }
                        : { ...prev, deliveryTo: loc.name });
                      setLocationDialog(null);
                    }}
                  >
                    {loc.name}
                  </button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => deleteLocation(loc.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PremiumLoadsRegister;
