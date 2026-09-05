import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    return (
      <Card
        key={item.path + item.title}
        className={cn(
          "group relative border-2 transition-all hover:-translate-y-1 hover:shadow-lg",
          isPinned ? "border-primary/40" : "hover:border-primary/40"
        )}
      >
        <button
          type="button"
          onClick={() => togglePin(item.path)}
          className="absolute top-2 left-2 z-10 rounded-md p-1 text-muted-foreground hover:text-primary"
          aria-label={isPinned ? "إزالة من المفضلة" : "تثبيت في المفضلة"}
        >
          {isPinned ? <Star className="h-4 w-4 fill-primary text-primary" /> : <StarOff className="h-4 w-4" />}
        </button>
        <Link to={item.path}>
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-semibold leading-tight">{item.title}</span>
            <span className="text-[11px] text-muted-foreground">{item.groupTitle}</span>
          </CardContent>
        </Link>
      </Card>
    );
  };

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          الأيقونات المثبتة
        </h3>
        {pinnedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لم يتم تثبيت أي شاشة بعد. اضغط على النجمة في أي مربع بالأسفل لتثبيته هنا.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pinnedItems.map((i) => renderCard(i, true))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          <h3 className="text-xl font-bold">كل الشاشات</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن شاشة..."
              className="pr-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((i) => renderCard(i, pinned.includes(i.path)))}
        </div>
      </div>
    </div>
  );
};

export default FavoriteShortcuts;
