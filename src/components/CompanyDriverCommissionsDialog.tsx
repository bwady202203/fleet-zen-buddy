import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface CompanyDriverCommissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

const commissionTypes = [
  { key: 'fixed', label: 'مبلغ ثابت' },
  { key: 'weight_less_40', label: 'أقل من 40 كيلو' },
  { key: 'weight_40_44', label: 'من 40-44 كيلو' },
  { key: 'weight_44_49', label: 'من 44-49 كيلو' },
  { key: 'weight_more_49', label: 'أكثر من 49 كيلو' },
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      loadCommissions();
    }
  }, [open, companyId]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error("Error loading commissions:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل العمولات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      for (const type of commissionTypes) {
        const amount = commissions[type.key] || "0";
        
        const { error } = await supabase
          .from("company_driver_commissions")
          .upsert(
            {
              company_id: companyId,
              commission_type: type.key as any,
              amount: parseFloat(amount),
            },
            {
              onConflict: 'company_id,commission_type'
            }
          );

        if (error) throw error;
      }

      toast({
        title: "نجح",
        description: "تم حفظ العمولات بنجاح",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving commissions:", error);
      toast({
        title: "خطأ",
        description: "فشل حفظ العمولات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>عمولة النقل للسائق - {companyName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {commissionTypes.map((type) => (
              <div key={type.key} className="space-y-2">
                <Label htmlFor={type.key}>{type.label}</Label>
                <Input
                  id={type.key}
                  type="number"
                  step="0.01"
                  value={commissions[type.key] || ""}
                  onChange={(e) =>
                    setCommissions({ ...commissions, [type.key]: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  "حفظ"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
