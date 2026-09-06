import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Star, StarOff, Search, LayoutGrid } from "lucide-react";
import { navigationGroups } from "@/components/SystemNavigationSidebar";
import { usePermissions } from "@/contexts/PermissionsContext";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dashboard-pinned-shortcuts";

const readPinned = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const GROUP_COLORS: Record<string, string | undefined> = {
  home: "--group-home",
  accounting: "--group-accounting",
  "trade-invoices": "--group-trade-invoices",
  closing: "--group-closing",
  vouchers: "--group-vouchers",
  hr: "--group-hr",
  fleet: "--group-fleet",
  loads: "--group-loads",
  custody: "--group-custody",
  zatca: "--group-zatca",
  admin: "--group-admin",
  projects: "--group-projects",
  settings: "--group-settings",
};

const getGroupColorVar = (groupKey: string) => GROUP_COLORS[groupKey] || "--primary";

export const FavoriteShortcuts = () => {
  const { hasPermission } = usePermissions();
  const [pinned, setPinned] = useState<string[]>(readPinned);
  const [search, setSearch] = useState("");

  const allItems = useMemo(
    () =>
      navigationGroups
        .filter((g) => !g.module || hasPermission(g.module, "view"))
        .flatMap((g) =>
          g.children.map((c) => ({
            ...c,
            groupKey: g.key,
            groupTitle: g.title,
            groupIcon: g.icon,
          }))
        ),
    [hasPermission]
  );

  const togglePin = (path: string) => {
    setPinned((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const pinnedItems = allItems.filter((i) => pinned.includes(i.path));
  const filtered = allItems.filter(
    (i) =>
      !search.trim() ||
      i.title.includes(search.trim()) ||
      i.groupTitle.includes(search.trim())
  );

  const renderCard = (item: (typeof allItems)[number], isPinned: boolean) => {
    const Icon = item.icon || item.groupIcon || LayoutGrid;
    const colorVar = getGroupColorVar(item.groupKey);

    return (
      <Card
        key={item.path + item.title}
        style={{ "--group-color": `var(${colorVar})` } as React.CSSProperties}
        className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-0 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl"
      >
        <button
          type="button"
          onClick={() => togglePin(item.path)}
          className={cn(
            "absolute top-4 left-4 z-10 rounded-md p-1 transition-transform duration-300 hover:scale-125",
            isPinned ? "text-amber-400" : "text-muted-foreground/40 hover:text-amber-400"
          )}
          aria-label={isPinned ? "إزالة من المفضلة" : "تثبيت في المفضلة"}
        >
          {isPinned ? (
            <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
          ) : (
            <StarOff className="h-6 w-6" />
          )}
        </button>

        <Link to={item.path} className="block h-full">
          <CardContent className="flex h-full flex-col items-center p-6 text-center">
            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-2xl bg-[hsl(var(--group-color)/0.10)] text-[hsl(var(--group-color))] transition-colors duration-500 group-hover:bg-[hsl(var(--group-color))] group-hover:text-[hsl(var(--group-on-color))]">
              <Icon className="h-12 w-12" strokeWidth={1.5} />
            </div>

            <h3 className="mb-1 text-xl font-bold leading-tight text-card-foreground">
              {item.title}
            </h3>

            <span className="mt-auto rounded-full bg-[hsl(var(--group-color)/0.12)] px-3 py-1 text-xs font-semibold text-[hsl(var(--group-color))]">
              {item.groupTitle}
            </span>

            <div
              className="absolute -bottom-4 -right-4 h-16 w-16 rounded-tl-full bg-[hsl(var(--group-color)/0.05)] transition-transform duration-500 group-hover:scale-150"
              aria-hidden="true"
            />
          </CardContent>
        </Link>
      </Card>
    );
  };

  return (
    <div className="space-y-10" dir="rtl">
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
          الأيقونات المثبتة
        </h3>
        {pinnedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لم يتم تثبيت أي شاشة بعد. اضغط على النجمة في أي مربع بالأسفل لتثبيته هنا.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pinnedItems.map((i) => renderCard(i, true))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-2xl font-bold">كل الشاشات</h3>
          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن شاشة..."
              className="pr-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((i) => renderCard(i, pinned.includes(i.path)))}
        </div>
      </div>
    </div>
  );
};

export default FavoriteShortcuts;
