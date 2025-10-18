import { Calculator, Users, Package, Truck, Wallet, Home, LogOut, Download } from "lucide-react";
import { Link } from "react-router-dom";
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
      <div className="container mx-auto px-4 py-3">
        {/* Date and Time Section */}
        <div className="flex items-center justify-center gap-6 mb-3 text-sm text-muted-foreground" dir="rtl">
          <div className="flex items-center gap-2">
            <span className="font-semibold">التاريخ الهجري:</span>
            <span>{hijriDateStr}</span>
            {userRole === 'admin' && (
              <Button
                onClick={handleExportData}
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-primary/10"
                title="تصدير البيانات"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">التاريخ الميلادي:</span>
            <span>{gregorianDateStr}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">الساعة:</span>
            <span className="font-mono">{timeStr}</span>
          </div>
        </div>

        {/* Icons Section */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">الرئيسية</span>
          </Link>
          
          <Link to="/accounting" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">المحاسبة</span>
          </Link>
          
          <Link to="/hr" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">الموارد البشرية</span>
          </Link>
          
          <Link to="/fleet" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">الأسطول</span>
          </Link>
          
          <Link to="/loads" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">الحمولات</span>
          </Link>
          
          <Link to="/custody" className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">العهد</span>
          </Link>

          <Button
            variant="outline"
            onClick={signOut}
            className="group flex items-center gap-2 p-2 rounded-lg hover:bg-destructive/10 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <LogOut className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-destructive">خروج</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
