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
import { ClipboardList, ArrowRight, Printer, Search, Filter, Eye, Wrench, DollarSign, CheckCircle2, Clock, Pencil, Trash2 } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="print:hidden">
        <div className="container mx-auto px-4 pt-8 pb-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-emerald-600" />
              سجل أوامر الصيانة
            </h1>
            <p className="text-slate-500 text-sm mt-1">إدارة ومتابعة كافة طلبات صيانة الأسطول</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm">
              <Printer className="h-4 w-4 ml-2" />
              طباعة التقرير
            </Button>
            <Link to="/fleet">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                العودة
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Print Header */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-3xl font-bold">سجل أوامر الصيانة</h1>
          <p className="text-sm text-muted-foreground mt-2">
            تاريخ التقرير: {new Date().toLocaleDateString("ar-SA")}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Wrench className="h-7 w-7" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">إجمالي الأوامر</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">الأوامر المكتملة</p>
              <h3 className="text-2xl font-bold text-emerald-600">{stats.completed}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Clock className="h-7 w-7" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">قيد التنفيذ/الانتظار</p>
              <h3 className="text-2xl font-bold text-amber-600">{stats.pending}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <DollarSign className="h-7 w-7" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">إجمالي التكاليف</p>
              <h3 className="text-xl font-bold text-slate-800 whitespace-nowrap">
                {stats.totalCost.toLocaleString()} <span className="text-sm font-normal text-slate-500">ر.س</span>
              </h3>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-4 print:hidden">
          <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
            <Filter className="h-4 w-4 text-emerald-600" />
            الفلاتر والبحث
          </div>
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="بحث بالمركبة أو الوصف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200 focus:ring-emerald-500">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="pending">قيد الانتظار</SelectItem>
              <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[150px] bg-slate-50 border-slate-200 focus-visible:ring-emerald-500" />
            <span className="text-slate-400 text-sm">إلى</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[150px] bg-slate-50 border-slate-200 focus-visible:ring-emerald-500" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">قائمة أوامر الصيانة</h2>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full">
              {filtered.length} أمر
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                  <TableHead className="text-right text-slate-600 font-semibold w-12">#</TableHead>
                  <TableHead className="text-right text-slate-600 font-semibold whitespace-nowrap">التاريخ</TableHead>
                  <TableHead className="text-right text-slate-600 font-semibold min-w-[170px]">المركبة</TableHead>
                  <TableHead className="text-right text-slate-600 font-semibold">الوصف</TableHead>
                  <TableHead className="text-right text-slate-600 font-semibold">الأولوية</TableHead>
                  <TableHead className="text-center text-slate-600 font-semibold">الحالة</TableHead>
                  <TableHead className="text-center text-slate-600 font-semibold">القطع</TableHead>
                  <TableHead className="text-left text-slate-600 font-semibold whitespace-nowrap">التكلفة</TableHead>
                  <TableHead className="text-right text-slate-600 font-semibold print:hidden">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-500">جاري التحميل...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-500">لا توجد أوامر صيانة</TableCell></TableRow>
                ) : (
                  filtered.map((o, idx) => {
                    const st = statusLabels[o.status] || statusLabels.pending;
                    const pr = priorityLabels[o.priority] || priorityLabels.medium;
                    const dotColor =
                      o.status === "completed" ? "bg-emerald-500" :
                      o.status === "in_progress" ? "bg-blue-500" :
                      o.status === "cancelled" ? "bg-red-500" : "bg-amber-500";
                    return (
                      <TableRow key={o.id} className={`${idx % 2 === 1 ? "bg-slate-50/30" : ""} hover:bg-slate-50 transition-colors`}>
                        <TableCell className="text-sm text-slate-500 font-medium">{idx + 1}</TableCell>
                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString("ar-SA")}</TableCell>
                        <TableCell>
                          <span className="font-bold text-slate-800 text-sm whitespace-nowrap bg-slate-100 border border-slate-200 px-2 py-1 rounded inline-block">
                            {o.vehicle_name}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-sm text-slate-600" title={o.description}>{o.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${pr.className} rounded-full text-xs font-bold whitespace-nowrap`}>{pr.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center print:hidden">
                            <Select value={o.status} onValueChange={(v) => handleStatusChange(o.id, v)}>
                              <SelectTrigger className={`h-8 w-[140px] rounded-lg text-xs font-semibold ${st.className}`}>
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${o.status === "in_progress" ? "animate-pulse" : ""}`} />
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
                          </div>
                          <div className="hidden print:flex justify-center">
                            <Badge variant="outline" className={st.className}>{st.label}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm text-slate-600">{o.items_count}</TableCell>
                        <TableCell className="text-left font-bold text-slate-800 text-sm whitespace-nowrap">
                          {o.cost.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ر.س</span>
                        </TableCell>
                        <TableCell className="print:hidden">
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" title="عرض التفاصيل" className="hover:bg-emerald-50 hover:text-emerald-600" onClick={() => handleViewDetails(o)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" title="تعديل" className="hover:bg-blue-50" onClick={() => openEdit(o)}>
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button size="sm" variant="ghost" title="حذف" className="hover:bg-red-50" onClick={() => handleDelete(o)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-500">إجمالي {filtered.length} أمر صيانة</span>
              <span className="text-sm font-bold text-slate-800">
                إجمالي التكاليف: <span className="text-emerald-700">{stats.totalCost.toLocaleString()} ر.س</span>
              </span>
            </div>
          )}
        </div>
      </main>

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
