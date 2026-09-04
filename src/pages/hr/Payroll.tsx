import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Download, Eye, Printer, RefreshCw, Settings2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEmployeeTransactions } from "@/contexts/EmployeeTransactionsContext";
import { PayrollToolbar } from "@/components/hr/payroll/PayrollToolbar";
import { PayrollTable } from "@/components/hr/payroll/PayrollTable";
import { PayrollSummary } from "@/components/hr/payroll/PayrollSummary";
import { PayrollColumnSettings } from "@/components/hr/payroll/PayrollColumnSettings";
import { PayrollPreview } from "@/components/hr/payroll/PayrollPreview";
import { usePayrollSettings } from "@/components/hr/payroll/usePayrollSettings";
import {
  PayrollFilters,
  usePayrollEmployees,
  usePayrollRows,
} from "@/components/hr/payroll/usePayrollData";
import { PayrollRow, formatMonthLabel } from "@/components/hr/payroll/types";

const DEFAULT_FILTERS: PayrollFilters = {
  search: "",
  bank: "all",
  department: "all",
  status: "all",
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

const Payroll = () => {
  const { toast } = useToast();
  const { updateTransactionBalance } = useEmployeeTransactions();
  const [month, setMonth] = useState(currentMonth);
  const [filters, setFilters] = useState<PayrollFilters>(DEFAULT_FILTERS);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoAction, setAutoAction] = useState<"print" | "pdf" | null>(null);
  const [editRow, setEditRow] = useState<PayrollRow | null>(null);
  const [editAdvance, setEditAdvance] = useState("0");

  const { settings, update, toggleColumn, setOrder, reset } = usePayrollSettings("monthly");
  const { data: employees, isLoading, isRefetching, refetch } = usePayrollEmployees();
  const { filteredRows, totals, banks, departments } = usePayrollRows(employees, month, filters);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = useMemo(() => {
    const start = (Math.min(page, pageCount) - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize, pageCount]);

  const visibleColumnCount = useMemo(
    () => settings.order.filter((k) => k !== "actions" && settings.visible[k]).length,
    [settings.order, settings.visible]
  );

  const handleFilters = useCallback((f: Partial<PayrollFilters>) => {
    setFilters((prev) => ({ ...prev, ...f }));
    setPage(1);
  }, []);

  const openPreview = useCallback((action: "print" | "pdf" | null = null) => {
    setAutoAction(action);
    setPreviewOpen(true);
  }, []);

  const handleSaveEdit = async () => {
    if (!editRow) return;
    const newValue = Number(editAdvance.replace(/,/g, "")) || 0;
    const diff = newValue - editRow.advances;
    if (diff !== 0) {
      await updateTransactionBalance(editRow.id, diff);
    }
    setEditRow(null);
    toast({ title: "تم تحديث بيانات الموظف" });
  };

  const suggestLandscape = visibleColumnCount > 7 && settings.orientation === "portrait";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/hr" className="transition-colors hover:text-primary" aria-label="رجوع">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">كشف الرواتب</h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatMonthLabel(month)}</span>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {totals.count} موظف
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={() => refetch()} disabled={isRefetching}>
                <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
                إنشاء / تحديث الكشف
              </Button>
              <Button className="gap-2" onClick={() => openPreview(null)}>
                <Eye className="h-4 w-4" />
                معاينة
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => openPreview("print")}>
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => openPreview("pdf")}>
                <Download className="h-4 w-4" />
                تصدير PDF
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setColumnsOpen(true)}>
                <Settings2 className="h-4 w-4" />
                إعدادات الكشف
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-4 px-4 py-6">
        <PayrollToolbar
          month={month}
          onMonthChange={(m) => {
            setMonth(m);
            setPage(1);
          }}
          filters={filters}
          onFiltersChange={handleFilters}
          banks={banks}
          departments={departments}
          orientation={settings.orientation}
          onOrientationChange={(o) => update("orientation", o)}
          onOpenColumns={() => setColumnsOpen(true)}
          onResetFilters={() => {
            setFilters(DEFAULT_FILTERS);
            setPage(1);
          }}
          pageSize={pageSize}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />

        {suggestLandscape && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-2 text-sm">
            <span>
              عدد الأعمدة الظاهرة {visibleColumnCount} — يُنصح باستخدام الاتجاه الأفقي لضمان بقاء الجدول داخل ورقة A4.
            </span>
            <Button size="sm" variant="outline" onClick={() => update("orientation", "landscape")}>
              تحويل إلى أفقي
            </Button>
          </div>
        )}

        <PayrollSummary totals={totals} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 py-4">
            <CardTitle className="text-lg">كشف رواتب {formatMonthLabel(month)}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                صفحة {Math.min(page, pageCount)} من {pageCount}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                السابق
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                التالي
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <PayrollTable
              rows={visibleRows}
              totals={totals}
              settings={settings}
              loading={isLoading}
              onEdit={(row) => {
                setEditRow(row);
                setEditAdvance(String(row.advances));
              }}
            />
          </CardContent>
        </Card>
      </main>

      <PayrollColumnSettings
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        settings={settings}
        onToggleColumn={toggleColumn}
        onOrderChange={setOrder}
        onUpdate={update}
        onReset={reset}
      />

      <PayrollPreview
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setAutoAction(null);
        }}
        rows={filteredRows}
        totals={totals}
        settings={settings}
        month={month}
        onOrientationChange={(o) => update("orientation", o)}
        autoAction={autoAction}
        onAutoActionDone={() => setAutoAction(null)}
      />

      <Dialog open={Boolean(editRow)} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>تعديل بيانات {editRow?.employeeName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>رصيد السلف المستحق</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={editAdvance}
                onChange={(e) => setEditAdvance(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditRow(null)}>
                إلغاء
              </Button>
              <Button onClick={handleSaveEdit}>حفظ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
