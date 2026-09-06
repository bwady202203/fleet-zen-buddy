import { Link } from "react-router-dom";
import { Truck } from "lucide-react";
import { navigationGroups } from "@/components/SystemNavigationSidebar";
import { usePermissions } from "@/contexts/PermissionsContext";

// تبويب الأسطول في الشاشة الرئيسية: يعرض كل شاشات الأسطول على شكل مربعات
const FleetShortcuts = () => {
  const { hasPermission } = usePermissions();
  const fleetGroup = navigationGroups.find((group) => group.key === "fleet");

  if (!hasPermission("fleet", "view") || !fleetGroup) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
        لا تملك صلاحية عرض قسم الأسطول
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="mb-1 flex items-center justify-center gap-2 text-2xl font-bold">
          <Truck className="h-6 w-6 text-cyan-600" />
          إدارة الأسطول
        </h2>
        <p className="text-sm text-muted-foreground">جميع شاشات الأسطول والصيانة وقطع الغيار</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {fleetGroup.children.map((child) => {
          const ChildIcon = child.icon ?? Truck;
          return (
            <Link
              key={child.path}
              to={child.path}
              className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-100"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <ChildIcon className="h-7 w-7" />
              </span>
              <span className="text-sm font-bold leading-snug">{child.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default FleetShortcuts;
