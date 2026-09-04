import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  Calculator,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Gauge,
  Home,
  Landmark,
  LayoutGrid,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/contexts/PermissionsContext";
import { cn } from "@/lib/utils";
import wizerLogo from "@/assets/wizer-logo.png.asset.json";

type NavigationChild = {
  title: string;
  path: string;
  icon?: LucideIcon;
};

type NavigationGroup = {
  key: string;
  title: string;
  icon: LucideIcon;
  module: string | null;
  children: NavigationChild[];
};

const navigationGroups: NavigationGroup[] = [
  {
    key: "home",
    title: "الرئيسية",
    icon: Home,
    module: null,
    children: [{ title: "لوحة النظام", path: "/", icon: LayoutGrid }],
  },
  {
    key: "accounting",
    title: "المحاسبة",
    icon: Calculator,
    module: "accounting",
    children: [
      { title: "نظرة عامة", path: "/accounting", icon: LayoutGrid },
      { title: "القيود اليومية", path: "/accounting/journal-entries", icon: FileText },
      { title: "قيود ذكية", path: "/accounting/smart-journal", icon: Calculator },
      { title: "قيد بمستند", path: "/accounting/journal-document-entry", icon: FileCheck2 },
      { title: "تقارير القيود", path: "/accounting/journal-entries-reports", icon: BarChart3 },
      { title: "سندات الصرف", path: "/accounting/payment-vouchers", icon: Receipt },
      { title: "سندات القبض", path: "/accounting/collection-receipts", icon: Wallet },
      { title: "طلبات الشراء", path: "/accounting/purchase-order", icon: ShoppingCart },
      { title: "فاتورة مبيعات", path: "/accounting/sales-invoice", icon: Receipt },
      { title: "فاتورة مشتريات", path: "/accounting/purchase-invoice", icon: Receipt },
      { title: "مرتجع مبيعات", path: "/accounting/sales-return", icon: FileText },
      { title: "مرتجع مشتريات", path: "/accounting/purchase-return", icon: FileText },
      { title: "طلبات التحويل", path: "/accounting/transfer-requests", icon: Landmark },
      { title: "أرشيف التحويلات", path: "/accounting/transfer-requests-archive", icon: ClipboardList },
      { title: "أرصدة الحسابات الهامة", path: "/accounting/important-balances", icon: Gauge },
      { title: "أرصدة المستوى الرابع", path: "/accounting/level4-balances", icon: BarChart3 },
      { title: "مطابقة البنوك", path: "/accounting/bank-reconciliation", icon: Landmark },
      { title: "استيراد كشف بنكي", path: "/accounting/bank-statement", icon: FileSpreadsheet },
      { title: "قيود بنك الرياض الذكية", path: "/accounting/riyadh-bank-smart", icon: Landmark },
      { title: "سندات صرف بنك الرياض", path: "/accounting/riyadh-bank-payment", icon: Receipt },
      { title: "الإيداعات البنكية", path: "/accounting/bank-deposits", icon: Landmark },
      { title: "مراكز التكلفة", path: "/accounting/cost-centers", icon: Boxes },
      { title: "الفروع", path: "/accounting/branches", icon: Building2 },
      { title: "المشاريع", path: "/accounting/projects", icon: ClipboardList },
      { title: "تقرير حساب", path: "/account-report", icon: FileSpreadsheet },
    ],
  },
  {
    key: "closing",
    title: "القوائم الختامية",
    icon: FileSpreadsheet,
    module: "accounting",
    children: [
      { title: "شجرة الحسابات", path: "/accounting/chart-of-accounts", icon: BookOpen },
      { title: "دفتر الأستاذ", path: "/accounting/ledger", icon: BookOpen },
      { title: "دفتر الأستاذ الجديد", path: "/accounting/ledger-new", icon: BookOpen },
      { title: "ميزان المراجعة", path: "/accounting/trial-balance", icon: BarChart3 },
      { title: "ميزان المراجعة الجديد", path: "/accounting/trial-balance-new", icon: BarChart3 },
      { title: "الميزانية العمومية", path: "/accounting/balance-sheet", icon: FileSpreadsheet },
      { title: "قائمة الدخل", path: "/accounting/income-statement", icon: BarChart3 },
    ],
  },
  {
    key: "vouchers",
    title: "السندات",
    icon: Receipt,
    module: "vouchers",
    children: [
      { title: "واجهة السندات", path: "/vouchers", icon: LayoutGrid },
      { title: "سند صرف بنكي", path: "/accounting/bank-payment-voucher", icon: Receipt },
      { title: "سند قبض بنكي", path: "/accounting/bank-collection-receipt", icon: Wallet },
      { title: "مصروفات العهد", path: "/custody/expenses", icon: FileText },
    ],
  },
  {
    key: "hr",
    title: "الموارد البشرية",
    icon: Users,
    module: "hr",
    children: [
      { title: "نظرة عامة", path: "/hr", icon: LayoutGrid },
      { title: "بيانات الموظفين", path: "/hr/employees", icon: Users },
      { title: "إضافة موظفين بالجملة", path: "/hr/bulk-employees", icon: Users },
      { title: "كشف الرواتب", path: "/hr/payroll", icon: FileSpreadsheet },
      { title: "سندات السلف", path: "/hr/advances", icon: Wallet },
      { title: "سندات الإضافي", path: "/hr/additions", icon: Receipt },
      { title: "سندات الخصم", path: "/hr/deductions", icon: Receipt },
      { title: "الحضور والانصراف", path: "/hr/attendance", icon: Gauge },
      { title: "الإجازات", path: "/hr/leaves", icon: FileText },
    ],
  },
  {
    key: "fleet",
    title: "إدارة الأسطول",
    icon: Truck,
    module: "fleet",
    children: [
      { title: "لوحة الأسطول", path: "/fleet", icon: LayoutGrid },
      { title: "السيارات", path: "/fleet/vehicles", icon: Truck },
      { title: "إضافة سيارات بالجملة", path: "/bulk-vehicles", icon: Truck },
      { title: "تعديل السيارات", path: "/edit-vehicles", icon: Wrench },
      { title: "أمر صيانة جديد", path: "/new-maintenance-order", icon: Wrench },
      { title: "سجل أوامر الصيانة", path: "/maintenance-orders-report", icon: ClipboardList },
      { title: "تكاليف الصيانة", path: "/maintenance-costs", icon: BarChart3 },
      { title: "قطع الغيار", path: "/spare-parts", icon: Package },
      { title: "إضافة قطع غيار بالجملة", path: "/bulk-spare-parts", icon: Package },
      { title: "تنبيهات نقص المخزون", path: "/low-stock-alerts", icon: Gauge },
      { title: "المشتريات", path: "/purchases", icon: ShoppingCart },
      { title: "نقطة بيع المشتريات", path: "/purchases/pos", icon: ShoppingCart },
      { title: "سجل الأسعار", path: "/price-history", icon: BarChart3 },
      { title: "فواتير المشتريات", path: "/maintenance-purchase-invoices", icon: Receipt },
      { title: "تقرير الصيانة", path: "/reports", icon: FileText },
      { title: "تقرير التكاليف", path: "/vehicle-cost-report", icon: BarChart3 },
      { title: "تقرير الكيلومترات", path: "/vehicle-mileage", icon: Gauge },
      { title: "حركة المخزون", path: "/stock-movement", icon: Boxes },
    ],
  },
  {
    key: "loads",
    title: "إدارة الحمولات",
    icon: Package,
    module: "loads",
    children: [
      { title: "نظرة عامة", path: "/loads", icon: LayoutGrid },
      { title: "تسجيل الحمولات", path: "/loads/register", icon: Package },
      { title: "تسجيل الحمولات المميز", path: "/loads/premium-register", icon: Package },
      { title: "تقرير الحمولات المميز", path: "/loads/premium-report", icon: BarChart3 },
      { title: "سجل الشحنات", path: "/loads/list", icon: ClipboardList },
      { title: "السجل المتقدم", path: "/loads/advanced-list", icon: ClipboardList },
      { title: "السجل المبسط", path: "/loads/simple-list", icon: ClipboardList },
      { title: "السائقون", path: "/loads/drivers", icon: Users },
      { title: "الشركات", path: "/loads/companies", icon: Building2 },
      { title: "الموردون", path: "/loads/suppliers", icon: Building2 },
      { title: "أنواع الحمولات", path: "/loads/load-types", icon: Boxes },
      { title: "الفواتير", path: "/loads/invoices", icon: Receipt },
      { title: "سندات القبض", path: "/loads/receipts", icon: Wallet },
      { title: "سندات التوصيل", path: "/loads/delivery-receipts", icon: FileText },
      { title: "كشف حساب عميل", path: "/loads/customer-statement", icon: FileSpreadsheet },
      { title: "التقارير", path: "/loads/reports", icon: BarChart3 },
      { title: "التقارير اليومية", path: "/loads/daily-reports", icon: FileText },
      { title: "ملخص شحنات السائقين", path: "/loads/driver-loads-summary", icon: Truck },
      { title: "تقرير مستحقات السائقين", path: "/loads/drivers-payment-report", icon: Wallet },
      { title: "تقرير العمولات", path: "/loads/commissions-report", icon: FileText },
    ],
  },
  {
    key: "custody",
    title: "إدارة العهد",
    icon: Wallet,
    module: "custody",
    children: [
      { title: "نظرة عامة", path: "/custody", icon: LayoutGrid },
      { title: "المندوبون", path: "/custody/representatives", icon: Users },
      { title: "سند تحويل عهدة", path: "/custody/transfers", icon: FileText },
      { title: "مصروفات العهد", path: "/custody/expenses", icon: Receipt },
      { title: "العهد المستلمة", path: "/custody/records", icon: ClipboardList },
      { title: "تصفية العهد", path: "/custody/filter", icon: FileSpreadsheet },
      { title: "كشف مجمع", path: "/custody/combined-statement", icon: FileSpreadsheet },
      { title: "قيود اليومية", path: "/custody/journal", icon: BookOpen },
      { title: "قيود ذكية", path: "/custody/smart-journal", icon: Calculator },
    ],
  },
  {
    key: "zatca",
    title: "الفوترة الإلكترونية",
    icon: ShieldCheck,
    module: "accounting",
    children: [
      { title: "نظرة عامة", path: "/zatca", icon: LayoutGrid },
      { title: "الفواتير المعتمدة", path: "/zatca/invoices", icon: FileCheck2 },
      { title: "الإرسال للهيئة", path: "/zatca/submission", icon: ShieldCheck },
      { title: "محرك الامتثال", path: "/zatca/compliance", icon: ClipboardList },
      { title: "ملفات XML", path: "/zatca/xml", icon: FileText },
      { title: "الشهادات الرقمية", path: "/zatca/certificates", icon: FileText },
      { title: "سجل التدقيق", path: "/zatca/audit-log", icon: ClipboardList },
      { title: "المساعد الذكي", path: "/zatca/ai-assistant", icon: Calculator },
      { title: "إعدادات الفوترة", path: "/zatca/settings", icon: Settings },
      { title: "التقارير الضريبية", path: "/zatca/reports", icon: BarChart3 },
    ],
  },
  {
    key: "admin",
    title: "الإدارية",
    icon: LayoutGrid,
    module: null,
    children: [{ title: "الروابط وبطاقات التشغيل", path: "/admin-panel", icon: LayoutGrid }],
  },
  {
    key: "settings",
    title: "الإعدادات",
    icon: Settings,
    module: null,
    children: [
      { title: "مركز الإعدادات", path: "/settings-hub", icon: Settings },
      { title: "إدارة المستخدمين", path: "/users", icon: Users },
      { title: "إدارة المنشآت", path: "/organizations", icon: Building2 },
    ],
  },
];


const isPathActive = (pathname: string, path: string) => {
  if (path === "/") return pathname === "/";
  if (["/accounting", "/vouchers", "/hr", "/fleet", "/loads", "/custody", "/zatca"].includes(path)) {
    return pathname === path;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
};

interface SystemNavigationSidebarProps {
  onExportFleet: () => void;
}

export function SystemNavigationSidebar({ onExportFleet }: SystemNavigationSidebarProps) {
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const { state, setOpen, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const visibleGroups = useMemo(
    () => navigationGroups.filter((group) => !group.module || hasPermission(group.module, "view")),
    [hasPermission],
  );

  const activeGroupKeys = useMemo(
    () => visibleGroups.filter((group) => group.children.some((child) => isPathActive(location.pathname, child.path))).map((group) => group.key),
    [location.pathname, visibleGroups],
  );
  const [openGroups, setOpenGroups] = useState<string[]>(activeGroupKeys);

  useEffect(() => {
    if (activeGroupKeys.length === 0) return;
    setOpenGroups((current) => Array.from(new Set([...current, ...activeGroupKeys])));
  }, [location.pathname]);

  const toggleGroup = (key: string) => {
    if (collapsed && !isMobile) setOpen(true);
    setOpenGroups((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar side="right" collapsible="icon" className="print:hidden">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <NavLink to="/" onClick={closeMobile} className="flex h-11 items-center gap-3 overflow-hidden rounded-md px-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary">
            <img src={wizerLogo.url} alt="ويزر" className="h-6 w-6 object-contain" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">نظام الإدارة المتكامل</span>
              <span className="block truncate text-xs text-muted-foreground">القائمة السريعة</span>
            </span>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup className="p-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {visibleGroups.map((group) => {
                const GroupIcon = group.icon;
                const groupActive = activeGroupKeys.includes(group.key);
                const groupOpen = openGroups.includes(group.key);

                return (
                  <Collapsible key={group.key} open={groupOpen && !collapsed} onOpenChange={() => toggleGroup(group.key)} asChild>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          size="lg"
                          isActive={groupActive}
                          tooltip={{ children: group.title, side: "left" }}
                          className="h-11 cursor-pointer justify-start gap-3"
                        >
                          <GroupIcon className="h-5 w-5" />
                          {!collapsed && <span className="flex-1 text-right font-semibold">{group.title}</span>}
                          {!collapsed && (
                            <ChevronDown className={cn("h-4 w-4 transition-transform", groupOpen && "rotate-180")} />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub className="mr-4 ml-0 border-r border-l-0 pr-3 pl-0">
                          {group.children.map((child) => {
                            const ChildIcon = child.icon;
                            const active = isPathActive(location.pathname, child.path);
                            return (
                              <SidebarMenuSubItem key={`${group.key}-${child.path}-${child.title}`}>
                                <SidebarMenuSubButton asChild isActive={active} className="h-9">
                                  <NavLink to={child.path} onClick={closeMobile}>
                                    {ChildIcon && <ChildIcon className="h-4 w-4" />}
                                    <span>{child.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                          {group.key === "fleet" && (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton
                                asChild
                                className="h-9 cursor-pointer text-primary"
                              >
                                <button type="button" onClick={onExportFleet}>
                                  <FileSpreadsheet className="h-4 w-4" />
                                  <span>تصدير المركبات Excel</span>
                                </button>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className={cn("text-xs text-muted-foreground", collapsed ? "text-center" : "px-2")}>
          {collapsed ? "ويزر" : "ويزر • نظام الإدارة المتكامل"}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}