import { LogOut, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import * as HijriDate from "hijri-converter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SystemIconsBar = () => {
  const { signOut, user, userRole } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleExportData = async () => {
    try {
      toast.loading('جاري تصدير البيانات...');

      const tables: string[] = [
        'organizations',
        'employees',
        'vehicles',
        'spare_parts',
        'spare_parts_purchases',
        'mileage_records',
        'oil_change_records',
        'maintenance_requests',
        'loads',
        'companies',
        'drivers',
        'load_types',
        'custody_representatives',
        'custody_transfers',
        'custody_expenses',
        'chart_of_accounts',
        'journal_entries',
        'journal_entry_lines',
        'invoices',
        'invoice_items',
      ];

      const exportData: any = {
        exported_at: new Date().toISOString(),
        exported_by: user?.email,
        data: {} as Record<string, any[]>
      };

      for (const table of tables) {
        try {
          const { data, error } = await (supabase as any)
            .from(table)
            .select('*');

          if (error) {
            console.error(`Error fetching ${table}:`, error);
            continue;
          }

          exportData.data[table] = data || [];
        } catch (err) {
          console.error(`Exception fetching ${table}:`, err);
        }
      }

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('تم تصدير البيانات بنجاح');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  };

  const hijriDate = HijriDate.toHijri(
    currentTime.getFullYear(),
    currentTime.getMonth() + 1,
    currentTime.getDate()
  );
  const hijriDateStr = `${hijriDate.hy}/${hijriDate.hm}/${hijriDate.hd}`;
  const gregorianDateStr = format(currentTime, "yyyy/MM/dd", { locale: ar });
  const timeStr = format(currentTime, "HH:mm:ss", { locale: ar });

  return (
    <div className="border-b bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-2">
        {/* Date, Time and Logout Section */}
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground" dir="rtl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-semibold">الهجري:</span>
              <span>{hijriDateStr}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">الميلادي:</span>
              <span>{gregorianDateStr}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">الساعة:</span>
              <span className="font-mono">{timeStr}</span>
            </div>
            {(userRole === 'admin' || userRole === 'manager') && (
              <Button
                onClick={handleExportData}
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10"
                title="تصدير البيانات"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Button
            variant="ghost"
            onClick={signOut}
            className="flex items-center gap-2 hover:bg-destructive/10 text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">خروج</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
