import { Package, ShoppingCart, Receipt, FileText, Gauge, List, Edit, FileSpreadsheet, Truck } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface FleetSidebarProps {
  onExportExcel: () => void;
}

const items = [
  { to: "/spare-parts", icon: Package, label: "قطع الغيار", color: "text-blue-600 dark:text-blue-400" },
  { to: "/purchases", icon: ShoppingCart, label: "المشتريات", color: "text-emerald-600 dark:text-emerald-400" },
  { to: "/maintenance-purchase-invoices", icon: Receipt, label: "فواتير المشتريات", color: "text-amber-600 dark:text-amber-400" },
  { to: "/reports", icon: FileText, label: "تقرير الصيانة", color: "text-indigo-600 dark:text-indigo-400" },
  { to: "/vehicle-cost-report", icon: Receipt, label: "تقرير التكاليف", color: "text-rose-600 dark:text-rose-400" },
  { to: "/vehicle-mileage", icon: Gauge, label: "تقرير الكيلومترات", color: "text-cyan-600 dark:text-cyan-400" },
  { to: "/bulk-vehicles", icon: List, label: "تسجيل عدة مركبات", color: "text-violet-600 dark:text-violet-400" },
  { to: "/edit-vehicles", icon: Edit, label: "تعديل الأسماء", color: "text-orange-600 dark:text-orange-400" },
];

export function FleetSidebar({ onExportExcel }: FleetSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            {!collapsed && <span>إدارة الأسطول</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ to, icon: Icon, label, color }) => {
                const active = location.pathname === to;
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild tooltip={label} size="lg" className="h-12 text-base">
                      <NavLink
                        to={to}
                        className={`flex items-center gap-3 ${active ? "bg-muted text-primary font-semibold" : "hover:bg-muted/50"}`}
                      >
                        <Icon className={`!h-6 !w-6 shrink-0 ${color}`} />
                        {!collapsed && <span className="truncate text-base">{label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "أدوات"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onExportExcel} tooltip="تصدير Excel">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                  {!collapsed && <span className="truncate">تصدير Excel</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
