import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const EditLoad = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    company_id: "",
    load_type_id: "",
    driver_id: "",
    truck_number: "",
    quantity: "",
    unit_price: "",
    notes: ""
  });

  const [companies, setCompanies] = useState<any[]>([]);
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load load data
      const { data: loadData, error: loadError } = await supabase
        .from('loads')
        .select('*')
        .eq('id', id)
        .single();

      if (loadError) throw loadError;

      if (loadData) {
        setFormData({
          date: loadData.date,
          company_id: loadData.company_id || "",
          load_type_id: loadData.load_type_id || "",
          driver_id: loadData.driver_id || "",
          truck_number: loadData.truck_number || "",
          quantity: loadData.quantity?.toString() || "",
          unit_price: loadData.unit_price?.toString() || "",
          notes: loadData.notes || ""
        });
      }

      // Load dropdown data
      const [companiesRes, loadTypesRes, driversRes] = await Promise.all([
        supabase.from('companies').select('id, name').eq('is_active', true).order('name'),
        supabase.from('load_types').select('id, name').eq('is_active', true).order('name'),
        supabase.from('drivers').select('id, name').eq('is_active', true).order('name')
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      if (loadTypesRes.data) setLoadTypes(loadTypesRes.data);
      if (driversRes.data) setDrivers(driversRes.data);

    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحميل البيانات",
        variant: "destructive"
      });
      navigate('/loads/list');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_id || !formData.load_type_id || !formData.driver_id) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const quantity = parseFloat(formData.quantity) || 0;
      const unitPrice = parseFloat(formData.unit_price) || 0;
      const totalAmount = quantity * unitPrice;

      const { error } = await supabase
        .from('loads')
        .update({
          date: formData.date,
          company_id: formData.company_id,
          load_type_id: formData.load_type_id,
          driver_id: formData.driver_id,
          truck_number: formData.truck_number,
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          notes: formData.notes
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث الشحنة بنجاح"
      });

      navigate('/loads/list');
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث الشحنة",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.company_id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">جاري التحميل / Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads/list" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">تعديل الشحنة / Edit Load</h1>
              <p className="text-muted-foreground mt-1">تحديث بيانات الشحنة / Update Load Information</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>بيانات الشحنة / Load Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date">التاريخ / Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">الشركة / Company *</Label>
                  <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الشركة / Select Company" />
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
                  <Label htmlFor="load_type">نوع الحمولة / Load Type *</Label>
                  <Select value={formData.load_type_id} onValueChange={(value) => setFormData({ ...formData, load_type_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الحمولة / Select Load Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driver">السائق / Driver *</Label>
                  <Select value={formData.driver_id} onValueChange={(value) => setFormData({ ...formData, driver_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر السائق / Select Driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="truck_number">رقم الشاحنة / Truck Number</Label>
                  <Input
                    id="truck_number"
                    value={formData.truck_number}
                    onChange={(e) => setFormData({ ...formData, truck_number: e.target.value })}
                    placeholder="رقم الشاحنة / Truck Number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">الكمية / Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="الكمية / Quantity"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_price">السعر / Unit Price</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    placeholder="السعر / Unit Price"
                  />
                </div>

                <div className="space-y-2">
                  <Label>المجموع / Total</Label>
                  <Input
                    type="text"
                    value={((parseFloat(formData.quantity) || 0) * (parseFloat(formData.unit_price) || 0)).toFixed(2)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات / Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات / Notes"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/loads/list')}
                  disabled={loading}
                >
                  إلغاء / Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "جاري الحفظ..." : "حفظ / Save"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditLoad;
