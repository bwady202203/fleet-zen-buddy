import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CompanyDriverCommissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

type CommissionType = {
  key: string;
  label: string;
  description: string;
};

const commissionTypes: CommissionType[] = [
  { key: "fixed", label: "مبلغ ثابت", description: "عمولة ثابتة بغض النظر عن الوزن" },
  { key: "weight_less_40", label: "أقل من 40 كيلو", description: "للشحنات أقل من 40 كيلو" },
  { key: "weight_40_44", label: "من 40-44 كيلو", description: "للشحنات من 40 إلى 44 كيلو" },
  { key: "weight_44_49", label: "من 44-49 كيلو", description: "للشحنات من 44 إلى 49 كيلو" },
  { key: "weight_more_49", label: "أكثر من 49 كيلو", description: "للشحنات أكثر من 49 كيلو" },
];

export const CompanyDriverCommissionsDialog = ({
  open,
  onOpenChange,
  companyId,
  companyName,
}: CompanyDriverCommissionsDialogProps) => {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      loadCommissions();
    }
  }, [open, companyId]);

  const loadCommissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_driver_commissions")
        .select("*")
        .eq("company_id", companyId);

      if (error) throw error;

      const commissionsMap: Record<string, string> = {};
      data?.forEach((item) => {
        commissionsMap[item.commission_type] = item.amount.toString();
      });
      setCommissions(commissionsMap);
    } catch (error: any) {
      console.error("Error loading commissions:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل العمولات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCommissionChange = async (type: string, amount: string) => {
    try {
      const numAmount = parseFloat(amount) || 0;

      const { error } = await supabase
        .from("company_driver_commissions")
        .upsert([
          {
            company_id: companyId,
            commission_type: type as any,
            amount: numAmount,
          },
        ]);

      if (error) throw error;

      setCommissions((prev) => ({ ...prev, [type]: amount }));

      toast({
        title: "تم التحديث",
        description: "تم تحديث العمولة بنجاح",
      });
    } catch (error: any) {
      console.error("Error updating commission:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث العمولة",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>عمولات النقل للسائق - {companyName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <div className="space-y-6">
            {commissionTypes.map((type) => (
              <div key={type.key} className="space-y-2 p-4 border rounded-lg">
                <Label htmlFor={type.key} className="text-base font-semibold">
                  {type.label}
                </Label>
                <p className="text-sm text-muted-foreground">{type.description}</p>
                <div className="flex gap-2 items-center">
                  <Input
                    id={type.key}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={commissions[type.key] || ""}
                    onChange={(e) => setCommissions((prev) => ({ ...prev, [type.key]: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleCommissionChange(type.key, commissions[type.key] || "0")}
                    size="sm"
                  >
                    حفظ
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
