import { ReactNode, type CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { FleetSidebar } from "@/components/FleetSidebar";
import { SystemIconsBar } from "@/components/SystemIconsBar";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface AppLayoutProps {
  children: ReactNode;
}

// مسارات قسم الأسطول التي تعرض القائمة الجانبية
const FLEET_PATHS = [
  "/fleet",
  "/new-maintenance-order",
  "/maintenance-orders-report",
  "/spare-parts",
  "/bulk-spare-parts",
  "/low-stock-alerts",
  "/purchases",
  "/maintenance-purchase-invoices",
  "/reports",
  "/maintenance-costs",
  "/vehicle-cost-report",
  "/vehicle-mileage",
  "/bulk-vehicles",
  "/edit-vehicles",
  "/stock-movement",
  "/price-history",
];

const isFleetRoute = (pathname: string) =>
  FLEET_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

export const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const showFleetSidebar = isFleetRoute(location.pathname);
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
      style={{ "--sidebar-width": "18rem", "--sidebar-width-icon": "4rem" } as CSSProperties}
    >
      <div className="min-h-screen flex w-full bg-background" dir="rtl">
        <FleetSidebar onExportExcel={exportToExcel} />
        <div className="flex-1 flex flex-col min-w-0">
          <SystemIconsBar />
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </SidebarProvider>
  );
};
