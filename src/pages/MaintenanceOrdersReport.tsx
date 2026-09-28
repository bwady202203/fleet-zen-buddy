import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Search, Filter, Eye, Wrench, DollarSign, CheckCircle2, Clock, Pencil, Trash2, Bell, Settings, Menu, Truck, Home, ChevronLeft, ChevronRight, Plus, FileSpreadsheet, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useDeleteConfirmation } from "@/components/DeleteConfirmationDialog";

interface MaintenanceOrder {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  description: string;
  priority: string;
  status: string;
  cost: number;
  created_at: string;
  completed_date: string | null;
  items_count: number;
}

interface CostItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: string;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "قيد الانتظار", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  in_progress: { label: "قيد التنفيذ", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  completed: { label: "مكتمل", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  cancelled: { label: "ملغي", className: "bg-red-500/10 text-red-600 border-red-500/30" },
};

const priorityLabels: Record<string, { label: string; className: string }> = {
  low: { label: "منخفض", className: "bg-gray-500/10 text-gray-600" },
  medium: { label: "متوسط", className: "bg-blue-500/10 text-blue-600" },
  high: { label: "عالي", className: "bg-orange-500/10 text-orange-600" },
  urgent: { label: "عاجل", className: "bg-red-500/10 text-red-600" },
};

const MaintenanceOrdersReport = () => {
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrder | null>(null);
  const [orderItems, setOrderItems] = useState<CostItem[]>([]);
  const [editOrder, setEditOrder] = useState<MaintenanceOrder | null>(null);
  const [editForm, setEditForm] = useState({ description: "", priority: "medium", status: "pending", cost: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const { requestDelete, DeleteDialog } = useDeleteConfirmation();
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUserName((u?.user_metadata as any)?.full_name || u?.email?.split("@")[0] || "");
    });
  }, []);

  const openEdit = (order: MaintenanceOrder) => {
    setEditOrder(order);
    setEditForm({
      description: order.description || "",
      priority: order.priority,
      status: order.status,
      cost: String(order.cost ?? ""),
    });
  };

  const saveEdit = async () => {
    if (!editOrder) return;
    try {
      setSavingEdit(true);
      const newStatus = editForm.status;
      const updates: Record<string, any> = {
        description: editForm.description,
        priority: editForm.priority,
        status: newStatus,
        cost: Number(editForm.cost) || 0,
        completed_date:
          newStatus === "completed"
            ? editOrder.completed_date || new Date().toISOString()
            : null,
      };
      const { error } = await supabase
        .from("maintenance_requests")
        .update(updates)
        .eq("id", editOrder.id);
      if (error) throw error;

      setOrders(prev =>
        prev.map(o =>
          o.id === editOrder.id
            ? {
                ...o,
                description: updates.description,
                priority: updates.priority,
                status: updates.status,
                cost: updates.cost,
                completed_date: updates.completed_date,
              }
            : o
        )
      );
      toast({ title: "تم الحفظ", description: "تم تعديل أمر الصيانة بنجاح" });
      setEditOrder(null);
    } catch (e) {
      console.error(e);
      toast({ title: "خطأ", description: "تعذر تعديل أمر الصيانة", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = (order: MaintenanceOrder) => {
    requestDelete(
      async () => {
        try {
          const { error: itemsError } = await supabase
            .from("maintenance_cost_items")
            .delete()
            .eq("maintenance_request_id", order.id);
          if (itemsError) throw itemsError;

          const { error } = await supabase
            .from("maintenance_requests")
            .delete()
            .eq("id", order.id);
          if (error) throw error;

          setOrders(prev => prev.filter(o => o.id !== order.id));
          toast({ title: "تم الحذف", description: "تم حذف أمر الصيانة وقطعه" });
        } catch (e) {
          console.error(e);
          toast({ title: "خطأ", description: "تعذر حذف أمر الصيانة", variant: "destructive" });
        }
      },
      {
        title: "حذف أمر الصيانة",
        description: `سيتم حذف أمر الصيانة الخاص بـ ${order.vehicle_name} وكل قطعه. لا يمكن التراجع.`,
      }
    );
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data: requests, error } = await supabase
        .from("maintenance_requests")
        .select("id, vehicle_id, description, priority, status, cost, created_at, completed_date")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const vehicleIds = [...new Set((requests || []).map(r => r.vehicle_id))];
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, license_plate, model")
        .in("id", vehicleIds);

      const vehicleMap = new Map((vehicles || []).map(v => [v.id, `${v.model} - ${v.license_plate}`]));

      const requestIds = (requests || []).map(r => r.id);
      const { data: items } = await supabase
        .from("maintenance_cost_items")
        .select("maintenance_request_id")
        .in("maintenance_request_id", requestIds);

      const itemsCountMap = new Map<string, number>();
      (items || []).forEach(it => {
        itemsCountMap.set(it.maintenance_request_id, (itemsCountMap.get(it.maintenance_request_id) || 0) + 1);
      });

      const enriched: MaintenanceOrder[] = (requests || []).map(r => ({
        id: r.id,
        vehicle_id: r.vehicle_id,
        vehicle_name: vehicleMap.get(r.vehicle_id) || "غير محدد",
        description: r.description,
        priority: r.priority || "medium",
        status: r.status || "pending",
        cost: Number(r.cost) || 0,
        created_at: r.created_at,
        completed_date: r.completed_date,
        items_count: itemsCountMap.get(r.id) || 0,
      }));

      setOrders(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderItems = async (orderId: string) => {
    const { data } = await supabase
      .from("maintenance_cost_items")
      .select("item_name, quantity, unit_price, total_price, item_type")
      .eq("maintenance_request_id", orderId);
    setOrderItems(data || []);
  };

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (startDate && o.created_at < startDate) return false;
      if (endDate && o.created_at > endDate + "T23:59:59") return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.vehicle_name.toLowerCase().includes(q) && !o.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, startDate, endDate]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter(o => o.status === "completed").length;
    const pending = filtered.filter(o => o.status === "pending" || o.status === "in_progress").length;
    const totalCost = filtered.reduce((sum, o) => sum + o.cost, 0);
    return { total, completed, pending, totalCost };
  }, [filtered]);

  const handlePrint = () => window.print();

  const handleViewDetails = async (order: MaintenanceOrder) => {
    setSelectedOrder(order);
    await loadOrderItems(order.id);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === "completed") {
        updates.completed_date = new Date().toISOString();
      } else {
        updates.completed_date = null;
      }
      const { error } = await supabase
        .from("maintenance_requests")
        .update(updates)
        .eq("id", orderId);
      if (error) throw error;

      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? { ...o, status: newStatus, completed_date: updates.completed_date }
            : o
        )
      );

      toast({
        title: "تم التحديث",
        description: `تم تغيير حالة أمر الصيانة إلى ${statusLabels[newStatus]?.label || newStatus}`,
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "خطأ",
        description: "تعذر تحديث حالة أمر الصيانة",
        variant: "destructive",
      });
    }
  };

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = filtered.map((o, i) => ({
      "#": i + 1,
      "التاريخ": new Date(o.created_at).toLocaleDateString("ar-SA"),
      "المركبة": o.vehicle_name,
      "الوصف": o.description,
      "الأولوية": priorityLabels[o.priority]?.label || o.priority,
      "الحالة": statusLabels[o.status]?.label || o.status,
      "القطع": o.items_count,
      "التكلفة": o.cost,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!views"] = [{ RTL: true }] as any;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "أوامر الصيانة");
    XLSX.writeFile(wb, "maintenance-orders.xlsx");
  };

  const dotOf = (s: string) =>
    s === "completed" ? "bg-emerald-500" : s === "in_progress" ? "bg-blue-500" : s === "cancelled" ? "bg-red-500" : "bg-amber-500";

  const statusSelect = (o: MaintenanceOrder, full = false) => {
    const st = statusLabels[o.status] || statusLabels.pending;
    return (
      <Select value={o.status} onValueChange={(v) => handleStatusChange(o.id, v)}>
        <SelectTrigger className={`h-8 ${full ? "w-full" : "w-full max-w-[130px]"} rounded-full text-xs font-semibold px-2.5 ${st.className}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotOf(o.status)} ${o.status === "in_progress" ? "animate-pulse" : ""}`} />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">قيد الانتظار</SelectItem>
          <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
          <SelectItem value="completed">مكتمل</SelectItem>
          <SelectItem value="cancelled">ملغي</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  const actions = (o: MaintenanceOrder) => (
    <div className="flex items-center justify-center gap-0.5">
      <Link to={`/vehicle-maintenance-report?order=${o.id}`}>
        <Button size="icon" variant="ghost" title="تقرير الصيانة" className="h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600">
          <FileText className="h-4 w-4" />
        </Button>
      </Link>
      <Button size="icon" variant="ghost" title="عرض التفاصيل" className="h-8 w-8 text-slate-500 hover:bg-blue-50 hover:text-blue-600" onClick={() => handleViewDetails(o)}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" title="تعديل" className="h-8 w-8 text-slate-500 hover:bg-amber-50 hover:text-amber-600" onClick={() => openEdit(o)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" title="حذف" className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(o)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const today = new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const kpis = [
    { label: "إجمالي الأوامر", value: stats.total.toLocaleString(), icon: Wrench, tone: "bg-blue-50 text-blue-600", valueTone: "text-slate-800" },
    { label: "قيد التنفيذ / الانتظار", value: stats.pending.toLocaleString(), icon: Clock, tone: "bg-amber-50 text-amber-600", valueTone: "text-amber-600" },
    { label: "الأوامر المكتملة", value: stats.completed.toLocaleString(), icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600", valueTone: "text-emerald-600" },
    { label: "إجمالي التكاليف", value: stats.totalCost.toLocaleString(), unit: "ر.س", icon: DollarSign, tone: "bg-sky-50 text-sky-600", valueTone: "text-slate-800" },
  ];

  return (
    <div className="maintenance-orders-report min-h-screen bg-background overflow-x-hidden" dir="rtl">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04)] print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button size="icon" variant="ghost" className="lg:hidden h-9 w-9 text-slate-600" title="القائمة" asChild>
              <Link to="/fleet"><Menu className="h-5 w-5" /></Link>
            </Button>
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Truck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm md:text-base truncate">نظام إدارة الأسطول والصيانة</p>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">إدارة المركبات وأوامر الصيانة والتكاليف</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <Button size="icon" variant="ghost" title="الإشعارات" className="h-9 w-9 text-slate-500 relative">
              <Bell className="h-5 w-5" />
              {stats.pending > 0 && <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-amber-500" />}
            </Button>
            <Button size="icon" variant="ghost" title="الإعدادات" className="h-9 w-9 text-slate-500" asChild>
              <Link to="/settings"><Settings className="h-5 w-5" /></Link>
            </Button>
            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="text-left hidden md:block max-w-[160px]">
                <p className="text-xs font-semibold text-slate-700 truncate">{userName || "المستخدم"}</p>
                <p className="text-[10px] text-slate-400">متصل</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                {(userName || "م").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="maintenance-orders-screen max-w-[1600px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Print Header */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-3xl font-bold">سجل أوامر الصيانة</h1>
          <p className="text-sm text-muted-foreground mt-2">تاريخ التقرير: {new Date().toLocaleDateString("ar-SA")}</p>
        </div>

        {/* Page title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 print:hidden">
          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
              <Link to="/" className="hover:text-blue-600 flex items-center gap-1"><Home className="h-3.5 w-3.5" />الرئيسية</Link>
              <ChevronLeft className="h-3 w-3" />
              <Link to="/fleet" className="hover:text-blue-600">الصيانة</Link>
              <ChevronLeft className="h-3 w-3" />
              <span className="text-slate-600 font-medium">أوامر الصيانة</span>
            </nav>
            <h1 className="text-2xl md:text-[28px] font-bold text-slate-800">سجل أوامر الصيانة</h1>
            <p className="text-xs text-slate-400 mt-1">تاريخ التقرير: {today}</p>
          </div>
          <Button asChild variant="outline" className="bg-white border-slate-200 text-slate-600 rounded-xl self-start sm:self-auto">
            <Link to="/fleet"><ArrowRight className="h-4 w-4 ml-2" />العودة</Link>
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-center gap-4 min-w-0 hover:shadow-md transition-shadow">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${k.tone}`}>
                <k.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-sm truncate">{k.label}</p>
                <p className={`text-2xl md:text-3xl font-bold leading-tight truncate ${k.valueTone}`}>
                  {k.value} {k.unit && <span className="text-sm font-medium text-slate-400">{k.unit}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* List card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04)] w-full min-w-0 overflow-hidden">
          <div className="p-4 md:px-6 md:py-5 border-b border-slate-100 space-y-4 print:hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800 text-lg">قائمة أوامر الصيانة</h2>
                <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">{filtered.length}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9">
                  <Link to="/new-maintenance-order"><Plus className="h-4 w-4 ml-1" />إضافة أمر صيانة</Link>
                </Button>
                <Button variant="outline" onClick={exportExcel} title="تصدير Excel" className="rounded-xl h-9 border-slate-200 text-emerald-700 hover:bg-emerald-50">
                  <FileSpreadsheet className="h-4 w-4 ml-1" />Excel
                </Button>
                <Button variant="outline" onClick={handlePrint} title="طباعة / PDF" className="rounded-xl h-9 border-slate-200 text-red-600 hover:bg-red-50">
                  <FileText className="h-4 w-4 ml-1" />PDF
                </Button>
                <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters(v => !v)} title="فلترة" className="rounded-xl h-9 border-slate-200 text-slate-600">
                  <Filter className="h-4 w-4 ml-1" />فلترة
                </Button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="ابحث برقم المركبة أو وصف الصيانة..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pr-9 h-10 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
                />
              </div>
              {showFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[150px] h-10 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="الحالة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                      <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="cancelled">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="w-[145px] h-10 rounded-xl bg-slate-50 border-slate-200" />
                  <span className="text-slate-400 text-sm">إلى</span>
                  <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="w-[145px] h-10 rounded-xl bg-slate-50 border-slate-200" />
                </div>
              )}
            </div>
          </div>

          {/* Desktop table (no horizontal scroll) */}
          <div className="hidden md:block print:block">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[4%]" />
                <col className="w-[10%]" />
                <col className="w-[17%]" />
                <col />
                <col className="w-[9%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[11%] print:hidden" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-xs font-semibold border-b border-slate-100">
                  <th className="text-right px-3 py-3">#</th>
                  <th className="text-right px-3 py-3">التاريخ</th>
                  <th className="text-right px-3 py-3">المركبة</th>
                  <th className="text-right px-3 py-3">الوصف</th>
                  <th className="text-center px-3 py-3">الأولوية</th>
                  <th className="text-center px-3 py-3">الحالة</th>
                  <th className="text-left px-3 py-3">التكلفة</th>
                  <th className="text-center px-3 py-3 print:hidden">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-400">لا توجد أوامر صيانة</td></tr>
                ) : (
                  pageRows.map((o, i) => {
                    const idx = (safePage - 1) * PAGE_SIZE + i;
                    const st = statusLabels[o.status] || statusLabels.pending;
                    const pr = priorityLabels[o.priority] || priorityLabels.medium;
                    const open = expandedId === o.id;
                    return (
                      <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40 transition-colors align-middle">
                        <td className="px-3 py-3 text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-3 py-3 text-slate-600 truncate">{new Date(o.created_at).toLocaleDateString("ar-SA")}</td>
                        <td className="px-3 py-3">
                          <span className="block truncate font-semibold text-slate-800" title={o.vehicle_name}>{o.vehicle_name}</span>
                          <span className="text-[11px] text-slate-400">{o.items_count} قطعة</span>
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          <button
                            type="button"
                            onClick={() => setExpandedId(open ? null : o.id)}
                            title={open ? "إخفاء" : "اضغط لعرض النص كاملاً"}
                            className={`text-right w-full ${open ? "whitespace-pre-wrap break-words [overflow-wrap:anywhere]" : "truncate block"} hover:text-blue-700`}
                          >
                            {o.description || "—"}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${pr.className}`}>{pr.label}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-center print:hidden">{statusSelect(o)}</div>
                          <div className="hidden print:flex justify-center"><Badge variant="outline" className={st.className}>{st.label}</Badge></div>
                        </td>
                        <td className="px-3 py-3 text-left font-bold text-slate-800 truncate">
                          {o.cost.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ر.س</span>
                        </td>
                        <td className="px-2 py-3 print:hidden">{actions(o)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden print:hidden divide-y divide-slate-100">
            {loading ? (
              <p className="text-center py-10 text-slate-400">جاري التحميل...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-10 text-slate-400">لا توجد أوامر صيانة</p>
            ) : pageRows.map((o, i) => {
              const pr = priorityLabels[o.priority] || priorityLabels.medium;
              const open = expandedId === o.id;
              return (
                <div key={o.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{o.vehicle_name}</p>
                      <p className="text-xs text-slate-400">#{(safePage - 1) * PAGE_SIZE + i + 1} · {new Date(o.created_at).toLocaleDateString("ar-SA")}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${pr.className}`}>{pr.label}</span>
                  </div>
                  <button type="button" onClick={() => setExpandedId(open ? null : o.id)} className={`text-right w-full text-sm text-slate-600 ${open ? "break-words [overflow-wrap:anywhere]" : "line-clamp-2"}`}>
                    {o.description || "—"}
                  </button>
                  <div className="grid grid-cols-2 gap-3 items-center">
                    {statusSelect(o, true)}
                    <p className="text-left font-bold text-slate-800">{o.cost.toLocaleString()} <span className="text-xs font-normal text-slate-400">ر.س</span></p>
                  </div>
                  <div className="flex justify-end border-t border-slate-100 pt-2">{actions(o)}</div>
                </div>
              );
            })}
          </div>

          {filtered.length > 0 && (
            <div className="px-4 md:px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-slate-500">إجمالي <b className="text-slate-700">{filtered.length}</b> أوامر</span>
                <span className="text-slate-500">إجمالي التكاليف: <b className="text-blue-700">{stats.totalCost.toLocaleString()} ر.س</b></span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1 print:hidden">
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} title="السابق">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, n) => n + 1)
                    .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                    .map((n, i, arr) => (
                      <span key={n} className="flex items-center gap-1">
                        {i > 0 && n - arr[i - 1] > 1 && <span className="text-slate-400 px-1">…</span>}
                        <Button size="sm" variant={n === safePage ? "default" : "outline"} className={`h-8 min-w-8 px-2 rounded-lg ${n === safePage ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`} onClick={() => setPage(n)}>{n}</Button>
                      </span>
                    ))}
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} title="التالي">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Independent print document: all filtered rows, rather than the current screen page. */}
      <section className="maintenance-orders-print" dir="rtl" aria-label="تقرير سجل أوامر الصيانة">
        <div className="mp-heading">
          <div className="mp-title-wrap">
            <div className="mp-logo"><Wrench /></div>
            <div>
              <h1>سجل أوامر الصيانة</h1>
              <p className="mp-brand">نظام إدارة الأسطول والصيانة</p>
            </div>
          </div>
          <div className="mp-date-card"><span>تاريخ التقرير</span><strong>{today}</strong></div>
        </div>
        <div className="mp-cards">
          <div className="mp-card"><span>عدد الأوامر</span><strong>{filtered.length.toLocaleString("ar-SA")}</strong></div>
          <div className="mp-card"><span>الفترة الزمنية</span><strong>{startDate || "البداية"} — {endDate || "اليوم"}</strong></div>
          <div className="mp-card"><span>حالة الأوامر</span><strong>{statusFilter === "all" ? "جميع الحالات" : statusLabels[statusFilter]?.label}</strong></div>
          <div className="mp-card mp-card-accent"><span>إجمالي التكلفة</span><strong>{stats.totalCost.toLocaleString("en-US", { maximumFractionDigits: 2 })} ر.س</strong></div>
        </div>
        <table className="maintenance-print-table">
          <colgroup>
            <col className="maintenance-col-number" />
            <col className="maintenance-col-date" />
            <col className="maintenance-col-vehicle" />
            <col className="maintenance-col-description" />
            <col className="maintenance-col-priority" />
            <col className="maintenance-col-status" />
            <col className="maintenance-col-cost" />
          </colgroup>
          <thead><tr>
            <th>م</th><th>التاريخ</th><th>المركبة</th><th>وصف الصيانة</th>
            <th>الأولوية</th><th>الحالة</th><th>التكلفة (ر.س)</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="maintenance-print-empty">لا توجد أوامر صيانة مطابقة</td></tr>
            ) : filtered.map((o, i) => (
              <tr key={o.id}>
                <td className="mp-num">{(i + 1).toLocaleString("ar-SA")}</td>
                <td>{new Date(o.created_at).toLocaleDateString("ar-SA")}</td>
                <td className="mp-vehicle">{o.vehicle_name}</td>
                <td className="mp-desc">{o.description || "—"}</td>
                <td>{priorityLabels[o.priority]?.label || o.priority}</td>
                <td><span className={`mp-status mp-status-${o.status}`}>{statusLabels[o.status]?.label || o.status}</span></td>
                <td className="maintenance-print-amount">{o.cost.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mp-summary">
          <div className="mp-summary-total">
            <span>إجمالي التكاليف</span>
            <strong>{stats.totalCost.toLocaleString("en-US", { maximumFractionDigits: 2 })} ر.س</strong>
          </div>
          <div className="mp-summary-grid">
            <div><span>إجمالي الأوامر</span><strong>{stats.total.toLocaleString("ar-SA")}</strong></div>
            <div><span>المكتملة</span><strong>{stats.completed.toLocaleString("ar-SA")}</strong></div>
            <div><span>قيد التنفيذ</span><strong>{filtered.filter(o => o.status === "in_progress").length.toLocaleString("ar-SA")}</strong></div>
            <div><span>متوسط تكلفة الأمر</span><strong>{(stats.total ? stats.totalCost / stats.total : 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ر.س</strong></div>
          </div>
        </div>
        <div className="mp-footer">
          <span>نظام إدارة الأسطول والصيانة</span>
          <span>أُنشئ في: {new Date().toLocaleString("ar-SA")}</span>
        </div>
      </section>


      {/* Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل أمر الصيانة</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">المركبة:</span> <span className="font-semibold">{selectedOrder.vehicle_name}</span></div>
                <div><span className="text-muted-foreground">التاريخ:</span> <span className="font-semibold">{new Date(selectedOrder.created_at).toLocaleDateString("ar-SA")}</span></div>
                <div><span className="text-muted-foreground">الحالة:</span> <Badge variant="outline" className={statusLabels[selectedOrder.status]?.className}>{statusLabels[selectedOrder.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">الأولوية:</span> <Badge variant="outline" className={priorityLabels[selectedOrder.priority]?.className}>{priorityLabels[selectedOrder.priority]?.label}</Badge></div>
                <div className="col-span-2"><span className="text-muted-foreground">الوصف:</span> <span>{selectedOrder.description}</span></div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">قطع الغيار المستخدمة</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">القطعة</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">لا توجد قطع</TableCell></TableRow>
                    ) : orderItems.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell>{it.item_name}</TableCell>
                        <TableCell>{it.quantity}</TableCell>
                        <TableCell>{it.unit_price.toLocaleString()} ر.س</TableCell>
                        <TableCell className="font-semibold">{it.total_price.toLocaleString()} ر.س</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/5 font-bold">
                      <TableCell colSpan={3} className="text-left">الإجمالي:</TableCell>
                      <TableCell className="text-primary">{selectedOrder.cost.toLocaleString()} ر.س</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editOrder} onOpenChange={(open) => !open && setEditOrder(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل أمر الصيانة</DialogTitle>
          </DialogHeader>
          {editOrder && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                المركبة: <span className="font-semibold text-foreground">{editOrder.vehicle_name}</span>
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  rows={6}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الأولوية</Label>
                  <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفض</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="high">عالي</SelectItem>
                      <SelectItem value="urgent">عاجل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                      <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="cancelled">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>التكلفة (ر.س)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editForm.cost}
                  onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
            <Button variant="outline" onClick={() => setEditOrder(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog />
    </div>
  );
};

export default MaintenanceOrdersReport;
