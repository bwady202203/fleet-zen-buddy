import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { fleetIconByTitle } from "@/components/dashboard/FleetIcons";
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
  // نمط البطاقات: "boxed" (افتراضي) أو "plain" (أيقونة كبيرة بدون مربع خلفية)
  variant?: "boxed" | "plain";
  iconColor?: string; // مثال: "text-cyan-500" (يستخدم مع plain)
};

// مربعات شاشات أي مجموعة تنقلات في الشاشة الرئيسية (الأسطول، المحاسبة، الحمولات...)
const GroupShortcuts = ({ groupKey, title, description, iconBox, hover, titleIcon, variant = "boxed", iconColor = "" }: GroupShortcutsProps) => {

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

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {group.children.map((child) => {
          const CustomIcon = groupKey === "fleet" ? fleetIconByTitle[child.title] : undefined;
          const ChildIcon = child.icon ?? LayoutGrid;
          if (CustomIcon) {
            return (
              <Link
                key={child.path}
                to={child.path}
                className={`group flex flex-col items-center justify-center gap-4 rounded-[20px] border border-border/40 bg-card px-4 py-8 text-center shadow-[0_10px_28px_-14px_hsl(var(--foreground)/0.18)] transition-all duration-300 hover:-translate-y-2 hover:border-[#2EC4B6] hover:shadow-[0_18px_36px_-14px_rgba(18,143,134,0.45)] active:translate-y-0 active:scale-[0.98] ${hover}`}
              >
                <CustomIcon className="h-[72px] w-[72px] drop-shadow-[0_8px_10px_rgba(20,120,120,0.22)] transition-all duration-300 group-hover:-rotate-[4deg] group-hover:scale-110 group-hover:drop-shadow-[0_12px_16px_rgba(18,143,134,0.35)]" />
                <span className="text-base font-bold leading-snug text-foreground transition-colors duration-300 group-hover:text-[#128F86]">
                  {child.title}
                </span>

              </Link>
            );
          }
          if (variant === "plain") {
            return (
              <Link
                key={child.path}
                to={child.path}
                className={`group flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/40 bg-card px-4 py-8 text-center shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_-12px_hsl(var(--foreground)/0.22)] ${hover}`}
              >
                <ChildIcon
                  className={`h-14 w-14 transition-transform duration-300 group-hover:scale-110 ${iconColor}`}
                  strokeWidth={1.5}
                />
                <span className="text-base font-bold leading-snug text-foreground">{child.title}</span>
              </Link>
            );
          }

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
