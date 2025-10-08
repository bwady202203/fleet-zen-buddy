import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const CompanySettingsDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    id: '',
    company_name: 'شركة الرمال الصناعية',
    tax_number: '',
    address: ''
  });

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (data) {
      setSettings(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (settings.id) {
        await supabase
          .from('company_settings')
          .update({
            company_name: settings.company_name,
            tax_number: settings.tax_number,
            address: settings.address
          })
          .eq('id', settings.id);
      } else {
        await supabase
          .from('company_settings')
          .insert({
            company_name: settings.company_name,
            tax_number: settings.tax_number,
            address: settings.address
          });
      }

      toast({
        title: "تم الحفظ",
        description: "تم تحديث إعدادات الشركة بنجاح"
      });
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 ml-2" />
          إعدادات الشركة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إعدادات الشركة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>اسم الشركة</Label>
            <Input
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              required
              placeholder="اسم الشركة"
            />
          </div>
          <div className="space-y-2">
            <Label>الرقم الضريبي</Label>
            <Input
              value={settings.tax_number}
              onChange={(e) => setSettings({ ...settings, tax_number: e.target.value })}
              placeholder="الرقم الضريبي"
            />
          </div>
          <div className="space-y-2">
            <Label>العنوان</Label>
            <Input
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="العنوان"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
