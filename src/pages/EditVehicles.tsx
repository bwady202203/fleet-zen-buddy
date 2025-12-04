import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Save, Truck, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VehicleEdit {
  id: string;
  license_plate: string;
  model: string;
  selected: boolean;
  originalModel: string;
}

const EditVehicles = () => {
  const [vehicles, setVehicles] = useState<VehicleEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkName, setBulkName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, license_plate, model')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setVehicles(data.map(v => ({
          id: v.id,
          license_plate: v.license_plate,
          model: v.model || '',
          originalModel: v.model || '',
          selected: false
        })));
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل المركبات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setVehicles(prev => prev.map(v => ({ ...v, selected: checked })));
  };

  const handleSelectVehicle = (id: string, checked: boolean) => {
    setVehicles(prev => prev.map(v => 
      v.id === id ? { ...v, selected: checked } : v
    ));
  };

  const handleNameChange = (id: string, name: string) => {
    setVehicles(prev => prev.map(v => 
      v.id === id ? { ...v, model: name } : v
    ));
  };

  const handleBulkNameChange = () => {
    if (!bulkName.trim()) return;
    
    setVehicles(prev => prev.map(v => 
      v.selected ? { ...v, model: bulkName } : v
    ));
    setBulkName("");
  };

  const handleSaveAll = async () => {
    const changedVehicles = vehicles.filter(v => v.model !== v.originalModel);
    
    if (changedVehicles.length === 0) {
      toast({
        title: 'لا توجد تغييرات',
        description: 'لم يتم إجراء أي تعديلات على أسماء المركبات',
      });
      return;
    }

    setSaving(true);
    try {
      for (const vehicle of changedVehicles) {
        const { error } = await supabase
          .from('vehicles')
          .update({ model: vehicle.model })
          .eq('id', vehicle.id);

        if (error) throw error;
      }

      toast({
        title: 'تم الحفظ',
        description: `تم تحديث ${changedVehicles.length} مركبة بنجاح`,
      });

      // تحديث القيم الأصلية
      setVehicles(prev => prev.map(v => ({ ...v, originalModel: v.model })));
    } catch (error) {
      console.error('Error saving vehicles:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ التغييرات',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = vehicles.filter(v => v.selected).length;
  const changedCount = vehicles.filter(v => v.model !== v.originalModel).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <Edit className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">تعديل أسماء المركبات</h1>
            </div>
            <Link to="/fleet">
              <Button variant="outline">
                <ArrowRight className="h-4 w-4 ml-2" />
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">تعديل دفعة واحدة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-2 block">
                  الاسم الجديد للمركبات المحددة ({selectedCount} محددة)
                </label>
                <Input
                  value={bulkName}
                  onChange={(e) => setBulkName(e.target.value)}
                  placeholder="أدخل الاسم الجديد..."
                  disabled={selectedCount === 0}
                />
              </div>
              <Button 
                onClick={handleBulkNameChange}
                disabled={selectedCount === 0 || !bulkName.trim()}
              >
                تطبيق على المحددة
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5" />
                قائمة المركبات ({vehicles.length})
              </CardTitle>
              <div className="flex items-center gap-4">
                {changedCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {changedCount} تغييرات غير محفوظة
                  </span>
                )}
                <Button onClick={handleSaveAll} disabled={saving || changedCount === 0}>
                  <Save className="h-4 w-4 ml-2" />
                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-right w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      />
                    </th>
                    <th className="p-3 text-right">رقم اللوحة</th>
                    <th className="p-3 text-right">الاسم / الموديل</th>
                    <th className="p-3 text-right w-20">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-t hover:bg-muted/30">
                      <td className="p-3">
                        <Checkbox
                          checked={vehicle.selected}
                          onCheckedChange={(checked) => handleSelectVehicle(vehicle.id, !!checked)}
                        />
                      </td>
                      <td className="p-3 font-medium">{vehicle.license_plate}</td>
                      <td className="p-3">
                        <Input
                          value={vehicle.model}
                          onChange={(e) => handleNameChange(vehicle.id, e.target.value)}
                          className={vehicle.model !== vehicle.originalModel ? 'border-primary' : ''}
                        />
                      </td>
                      <td className="p-3 text-center">
                        {vehicle.model !== vehicle.originalModel && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            معدّل
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditVehicles;
