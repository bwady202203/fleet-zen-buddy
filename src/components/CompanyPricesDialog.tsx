import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CompanyPricesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

export const CompanyPricesDialog = ({ open, onOpenChange, companyId, companyName }: CompanyPricesDialogProps) => {
  const { toast } = useToast();
  const [loadTypes, setLoadTypes] = useState<any[]>([]);
  const [companyPrices, setCompanyPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPrice, setNewPrice] = useState({
    loadTypeId: '',
    unitPrice: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all load types
      const { data: types, error: typesError } = await supabase
        .from('load_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (typesError) throw typesError;

      // Load existing prices for this company
      const { data: prices, error: pricesError } = await supabase
        .from('company_load_type_prices')
        .select('*, load_types(name)')
        .eq('company_id', companyId);

      if (pricesError) throw pricesError;

      setLoadTypes(types || []);
      setCompanyPrices(prices || []);
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

  const handleAddPrice = async () => {
    if (!newPrice.loadTypeId || !newPrice.unitPrice) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد نوع الشحنة والسعر",
        variant: "destructive"
      });
      return;
    }

    // Check if price already exists
    const exists = companyPrices.find(p => p.load_type_id === newPrice.loadTypeId);
    if (exists) {
      toast({
        title: "خطأ",
        description: "السعر موجود مسبقاً لهذا النوع",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('company_load_type_prices')
        .insert({
          company_id: companyId,
          load_type_id: newPrice.loadTypeId,
          unit_price: parseFloat(newPrice.unitPrice),
          is_active: true
        })
        .select('*, load_types(name)')
        .single();

      if (error) throw error;

      setCompanyPrices(prev => [...prev, data]);
      setNewPrice({ loadTypeId: '', unitPrice: '' });

      toast({
        title: "تم الإضافة",
        description: "تم إضافة السعر بنجاح"
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdatePrice = async (priceId: string, unitPrice: string) => {
    try {
      const { error } = await supabase
        .from('company_load_type_prices')
        .update({ unit_price: parseFloat(unitPrice) })
        .eq('id', priceId);

      if (error) throw error;

      setCompanyPrices(prev => prev.map(p => 
        p.id === priceId ? { ...p, unit_price: parseFloat(unitPrice) } : p
      ));

      toast({
        title: "تم التحديث",
        description: "تم تحديث السعر بنجاح"
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (priceId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السعر؟')) return;

    try {
      const { error } = await supabase
        .from("company_load_type_prices")
        .delete()
        .eq("id", priceId);

      if (error) throw error;

      setCompanyPrices(prev => prev.filter(p => p.id !== priceId));

      toast({
        title: "تم الحذف",
        description: "تم حذف السعر بنجاح",
      });
    } catch (error) {
      console.error("Error deleting price:", error);
      toast({
        title: "خطأ",
        description: "فشل حذف السعر",
        variant: "destructive",
      });
    }
  };

  const availableLoadTypes = loadTypes.filter(
    type => !companyPrices.find(p => p.load_type_id === type.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>أسعار المنتجات - {companyName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <div className="space-y-6">
            {/* Add New Price Form */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold mb-4">إضافة سعر جديد</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>نوع الشحنة</Label>
                  <Select
                    value={newPrice.loadTypeId}
                    onValueChange={(value) => setNewPrice({ ...newPrice, loadTypeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الشحنة" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLoadTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>السعر (ر.س)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newPrice.unitPrice}
                    onChange={(e) => setNewPrice({ ...newPrice, unitPrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={handleAddPrice} className="w-full">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة
                  </Button>
                </div>
              </div>
            </div>

            {/* Prices List */}
            <div>
              <h3 className="font-semibold mb-4">الأسعار المسجلة</h3>
              {companyPrices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  لا توجد أسعار مسجلة
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">نوع الشحنة</TableHead>
                      <TableHead className="text-right">السعر (ر.س)</TableHead>
                      <TableHead className="text-right w-20">حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyPrices.map((price) => (
                      <TableRow key={price.id}>
                        <TableCell className="font-medium text-right">
                          {price.load_types?.name || 'غير محدد'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={price.unit_price}
                            onChange={(e) => handleUpdatePrice(price.id, e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(price.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
