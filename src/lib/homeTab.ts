import { navigationGroups } from "@/components/SystemNavigationSidebar";

export type HomeTab = "overview" | "accounting" | "loads" | "fleet" | "hr" | "favorites" | "statistics";

// خريطة مجموعات القائمة الجانبية إلى تبويبات الشاشة الرئيسية
const groupToHomeTab: Record<string, HomeTab> = {
  accounting: "accounting",
  "trade-invoices": "accounting",
  closing: "accounting",
  vouchers: "accounting",
  custody: "accounting",
  zatca: "accounting",
  projects: "accounting",
  loads: "loads",
  fleet: "fleet",
  hr: "hr",
};

/**
 * يحدد تبويب الشاشة الرئيسية المناسب لمسار معين
 * بناءً على مجموعات التنقل (أطول مسار مطابق يفوز)
 */
export const getHomeTabForPath = (pathname: string): HomeTab => {
  let best: { length: number; tab: HomeTab } | null = null;

  for (const group of navigationGroups) {
    const tab = groupToHomeTab[group.key];
    if (!tab) continue;
    for (const child of group.children) {
      if (child.path === "/") continue;
      const matches = pathname === child.path || pathname.startsWith(child.path + "/");
      if (matches && (!best || child.path.length > best.length)) {
        best = { length: child.path.length, tab };
      }
    }
  }

  return best?.tab ?? "overview";
};

/** مسار الرجوع إلى الشاشة الرئيسية مع التبويب المناسب */
export const getHomePathForPath = (pathname: string): string => {
  const tab = getHomeTabForPath(pathname);
  return tab === "overview" ? "/" : `/?tab=${tab}`;
};
