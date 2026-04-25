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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClipboardList, ArrowRight, Printer, Search, Filter, Eye, Wrench, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">سجل أوامر الصيانة</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 ml-2" />
              طباعة التقرير
            </Button>
            <Link to="/fleet">
              <Button variant="outline">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الأوامر</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Wrench className="h-8 w-8 text-primary opacity-70" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مكتملة</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600 opacity-70" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">قيد التنفيذ/الانتظار</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600 opacity-70" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي التكاليف</p>
                  <p className="text-2xl font-bold text-primary">{stats.totalCost.toLocaleString()} ر.س</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary opacity-70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              الفلاتر والبحث
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالمركبة أو الوصف..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="من تاريخ" />
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="إلى تاريخ" />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة أوامر الصيانة ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المركبة</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">الأولوية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">عدد القطع</TableHead>
                  <TableHead className="text-right">التكلفة</TableHead>
                  <TableHead className="text-right print:hidden">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">لا توجد أوامر صيانة</TableCell></TableRow>
                ) : (
                  filtered.map((o, idx) => {
                    const st = statusLabels[o.status] || statusLabels.pending;
                    const pr = priorityLabels[o.priority] || priorityLabels.medium;
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>{new Date(o.created_at).toLocaleDateString("ar-SA")}</TableCell>
                        <TableCell className="font-medium">{o.vehicle_name}</TableCell>
                        <TableCell className="max-w-xs truncate">{o.description}</TableCell>
                        <TableCell><Badge variant="outline" className={pr.className}>{pr.label}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                        <TableCell className="text-center">{o.items_count}</TableCell>
                        <TableCell className="font-semibold text-primary">{o.cost.toLocaleString()} ر.س</TableCell>
                        <TableCell className="print:hidden">
                          <Button size="sm" variant="ghost" onClick={() => handleViewDetails(o)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {filtered.length > 0 && (
                  <TableRow className="bg-primary/5 font-bold">
                    <TableCell colSpan={7} className="text-left">الإجمالي:</TableCell>
                    <TableCell className="text-lg text-primary">{stats.totalCost.toLocaleString()} ر.س</TableCell>
                    <TableCell className="print:hidden"></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
    </div>
  );
};

export default MaintenanceOrdersReport;
