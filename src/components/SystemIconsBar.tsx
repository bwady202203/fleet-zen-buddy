import { LogOut, Download, Clock, User } from "lucide-react";
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
  const [sessionStartTime] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState("00:00:00");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // حساب مدة الجلسة
      const now = new Date();
      const diff = now.getTime() - sessionStartTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setSessionDuration(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

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

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'admin': return 'مدير النظام';
      case 'manager': return 'مدير';
      case 'accountant': return 'محاسب';
      case 'employee': return 'موظف';
      default: return 'مستخدم';
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
    <div className="border-b bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 print:hidden">
      <div className="container mx-auto px-2 sm:px-4 py-2">
        {/* Date, Time and Logout Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-sm text-muted-foreground" dir="rtl">
          <div className="flex items-center gap-2 sm:gap-6 flex-wrap justify-center">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-semibold text-xs sm:text-sm">الهجري:</span>
              <span className="text-xs sm:text-sm">{hijriDateStr}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-semibold text-xs sm:text-sm">الميلادي:</span>
              <span className="text-xs sm:text-sm">{gregorianDateStr}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-semibold text-xs sm:text-sm">الساعة:</span>
              <span className="font-mono text-xs sm:text-sm">{timeStr}</span>
            </div>
            {(userRole === 'admin' || userRole === 'manager') && (
              <Button
                onClick={handleExportData}
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-primary/10"
                title="تصدير البيانات"
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
          
          {/* معلومات المستخدم وعداد الجلسة */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <div className="flex items-center gap-2 sm:gap-3 bg-primary/5 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-xs sm:text-sm shrink-0">
                  {user.email?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-medium text-foreground truncate max-w-[150px]">
                    {user.email}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {getRoleLabel(userRole)}
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 bg-background/50 rounded px-1.5 sm:px-2 py-0.5 sm:mr-2">
                  <Clock className="h-3 w-3 text-primary" />
                  <span className="font-mono text-[10px] sm:text-xs text-primary font-medium">
                    {sessionDuration}
                  </span>
                </div>
              </div>
            )}
            
            <Button
              variant="ghost"
              onClick={signOut}
              className="flex items-center gap-1 sm:gap-2 hover:bg-destructive/10 text-destructive px-2 sm:px-3"
              size="sm"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-sm font-medium">خروج</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
