import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { navigationGroups } from "@/components/SystemNavigationSidebar";
import { usePermissions } from "@/contexts/PermissionsContext";

type GroupShortcutsProps = {
  groupKey: string;
  title: string;
  description: string;
  // لون مميز للتبويب (خلفية الأيقونة، التحويم، حدود البطاقة)
  iconBox: string; // مثال: "bg-orange-100 text-orange-600"
  hover: string; // مثال: "hover:border-orange-200 hover:shadow-orange-100"
  titleIcon: string; // مثال: "text-orange-600"
};

// مربعات شاشات أي مجموعة تنقلات في الشاشة الرئيسية (الأسطول، المحاسبة، الحمولات...)
const GroupShortcuts = ({ groupKey, title, description, iconBox, hover, titleIcon }: GroupShortcutsProps) => {
  const { hasPermission } = usePermissions();
  const group = navigationGroups.find((g) => g.key === groupKey);

  if (!group || (group.module && !hasPermission(group.module, "view"))) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
        لا تملك صلاحية عرض هذا القسم
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="mb-1 flex items-center justify-center gap-2 text-2xl font-bold">
          <group.icon className={`h-6 w-6 ${titleIcon}`} />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {group.children.map((child) => {
          const ChildIcon = child.icon ?? LayoutGrid;
          return (
            <Link
              key={child.path}
              to={child.path}
              className={`group flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${hover}`}
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${iconBox}`}
              >
                <ChildIcon className="h-8 w-8" strokeWidth={1.8} />
              </span>
              <span className="text-sm font-bold leading-snug">{child.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default GroupShortcuts;
