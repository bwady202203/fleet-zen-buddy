import { ReactNode, useState, type CSSProperties } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SystemNavigationSidebar } from "@/components/SystemNavigationSidebar";
import { SystemIconsBar } from "@/components/SystemIconsBar";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface AppLayoutProps {
  children: ReactNode;
}

const SIDEBAR_OPEN_KEY = "wizer:sidebar-open";



export const AppLayout = ({ children }: AppLayoutProps) => {
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_OPEN_KEY) === "true";
    } catch {
      return false;
    }
  });

  const handleSidebarChange = (open: boolean) => {
    setSidebarOpen(open);
    try {
      localStorage.setItem(SIDEBAR_OPEN_KEY, String(open));
    } catch {
      // ignore storage failures
    }
  };


  const exportToExcel = async () => {
    try {
      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!vehiclesData) return;

      const excelData = vehiclesData.map((v: any) => ({
        "رقم اللوحة": v.license_plate || "-",
        "الموديل": v.model || "-",
        "السنة": v.year || "-",
        "اللون": v.color || "-",
        "السائق": v.driver_name || "-",
        "الحالة":
          v.status === "available"
            ? "متاحة"
            : v.status === "in_use"
            ? "قيد الاستخدام"
            : v.status === "maintenance"
            ? "قيد الصيانة"
            : "غير متاحة",
        "الكيلومترات الحالية": v.current_mileage || 0,
        "آخر تغيير زيت (كم)": v.last_oil_change_mileage || "-",
        "تاريخ آخر تغيير زيت": v.last_oil_change_date || "-",
        "ملاحظات": v.notes || "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "المركبات");
      worksheet["!cols"] = [
        { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 30 },
      ];
      XLSX.writeFile(workbook, `vehicles-${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={handleSidebarChange}
      style={{ "--sidebar-width": "19rem", "--sidebar-width-icon": "4rem" } as CSSProperties}
    >
      <div className="min-h-screen flex w-full bg-background" dir="rtl">
        <SystemNavigationSidebar onExportFleet={exportToExcel} />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="relative">
            {!headerCollapsed && <SystemIconsBar />}
            <button
              type="button"
              onClick={() => setHeaderCollapsed((v) => !v)}
              title={headerCollapsed ? "إظهار الشريط العلوي" : "طي الشريط العلوي"}
              className="absolute top-1 left-2 z-40 flex items-center gap-1 rounded-full border bg-background/90 px-2 py-0.5 text-[11px] text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground transition-colors"
            >
              {headerCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              {headerCollapsed ? "إظهار" : "طي"}
            </button>
          </div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </SidebarProvider>
  );
};
