import { memo } from "react";
import { Search, Settings2, FileText, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageOrientation } from "./types";
import { PayrollFilters } from "./usePayrollData";

interface Props {
  month: string;
  onMonthChange: (m: string) => void;
  filters: PayrollFilters;
  onFiltersChange: (f: Partial<PayrollFilters>) => void;
  banks: string[];
  departments: string[];
  orientation: PageOrientation;
  onOrientationChange: (o: PageOrientation) => void;
  onOpenColumns: () => void;
  onResetFilters: () => void;
  pageSize: number;
  onPageSizeChange: (n: number) => void;
}

export const PayrollToolbar = memo(
  ({
    month,
    onMonthChange,
    filters,
    onFiltersChange,
    banks,
    departments,
    orientation,
    onOrientationChange,
    onOpenColumns,
    onResetFilters,
    pageSize,
    onPageSizeChange,
  }: Props) => (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">الشهر</Label>
          <Input
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-[160px]"
          />
        </div>

        <div className="min-w-[200px] flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">البحث عن موظف</Label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="الاسم، رقم الموظف، الإقامة، الحساب البنكي"
              className="pr-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">البنك</Label>
          <Select value={filters.bank} onValueChange={(v) => onFiltersChange({ bank: v })}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">كل البنوك</SelectItem>
              {banks.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">القسم</Label>
          <Select
            value={filters.department}
            onValueChange={(v) => onFiltersChange({ department: v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">كل الأقسام</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">حالة الموظف</Label>
          <Select value={filters.status} onValueChange={(v) => onFiltersChange({ status: v })}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">على رأس العمل</SelectItem>
              <SelectItem value="inactive">موقوف</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">اتجاه الصفحة</Label>
          <ToggleGroup
            type="single"
            value={orientation}
            onValueChange={(v) => v && onOrientationChange(v as PageOrientation)}
            className="justify-start"
          >
            <ToggleGroupItem value="portrait" className="px-3 text-xs">
              A4 طولي
            </ToggleGroupItem>
            <ToggleGroupItem value="landscape" className="px-3 text-xs">
              A4 أفقي
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">صفوف الجدول</Label>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {[25, 50, 100, 200].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={onOpenColumns}>
            <Settings2 className="h-4 w-4" />
            إظهار/إخفاء الأعمدة
          </Button>
          <Button variant="ghost" className="gap-2" onClick={onResetFilters}>
            <RotateCcw className="h-4 w-4" />
            مسح الفلاتر
          </Button>
        </div>
      </div>
    </div>
  )
);
PayrollToolbar.displayName = "PayrollToolbar";
