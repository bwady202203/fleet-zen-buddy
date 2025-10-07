import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
        .select('*')
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

  const getPrice = (loadTypeId: string) => {
    const price = companyPrices.find(p => p.load_type_id === loadTypeId);
    return price?.unit_price || '';
  };

  const isActive = (loadTypeId: string) => {
    const price = companyPrices.find(p => p.load_type_id === loadTypeId);
    return price?.is_active ?? true;
  };

  const handlePriceChange = async (loadTypeId: string, unitPrice: string) => {
    const existingPrice = companyPrices.find(p => p.load_type_id === loadTypeId);
    const priceValue = parseFloat(unitPrice) || 0;

    try {
      if (existingPrice) {
        const { error } = await supabase
          .from('company_load_type_prices')
          .update({ unit_price: priceValue })
          .eq('id', existingPrice.id);

        if (error) throw error;

        setCompanyPrices(prev => prev.map(p => 
          p.id === existingPrice.id ? { ...p, unit_price: priceValue } : p
        ));
      } else {
        const { data, error } = await supabase
          .from('company_load_type_prices')
          .insert({
            company_id: companyId,
            load_type_id: loadTypeId,
            unit_price: priceValue
          })
          .select()
          .single();

        if (error) throw error;

        setCompanyPrices(prev => [...prev, data]);
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleActiveToggle = async (loadTypeId: string, active: boolean) => {
    const existingPrice = companyPrices.find(p => p.load_type_id === loadTypeId);

    try {
      if (existingPrice) {
        const { error } = await supabase
          .from('company_load_type_prices')
          .update({ is_active: active })
          .eq('id', existingPrice.id);

        if (error) throw error;

        setCompanyPrices(prev => prev.map(p => 
          p.id === existingPrice.id ? { ...p, is_active: active } : p
        ));
      } else if (active) {
        const { data, error } = await supabase
          .from('company_load_type_prices')
          .insert({
            company_id: companyId,
            load_type_id: loadTypeId,
            unit_price: 0,
            is_active: active
          })
          .select()
          .single();

        if (error) throw error;

        setCompanyPrices(prev => [...prev, data]);
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>أسعار وأصناف {companyName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نوع الشحنة</TableHead>
                  <TableHead>السعر للوحدة</TableHead>
                  <TableHead>نسبة العمولة</TableHead>
                  <TableHead className="w-20">نشط</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadTypes.map((loadType) => (
                  <TableRow key={loadType.id}>
                    <TableCell className="font-medium">{loadType.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={getPrice(loadType.id)}
                        onChange={(e) => handlePriceChange(loadType.id, e.target.value)}
                        placeholder="0.00"
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {loadType.commission_rate}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={isActive(loadType.id)}
                        onCheckedChange={(checked) => handleActiveToggle(loadType.id, checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-2 pt-4">
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
