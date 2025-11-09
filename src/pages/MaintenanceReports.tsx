import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Printer } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Filter, Download, ArrowRight, Eye, Pencil, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { MaintenanceRequestDialog } from "@/components/MaintenanceRequestDialog";
import { useToast } from "@/hooks/use-toast";

interface MaintenanceRequest {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  description: string;
  status: string;
  cost: number | null;
  created_at: string;
  completed_date: string | null;
}

const MaintenanceReports = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [showDialog, setShowDialog] = useState(false);
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [displayLimit, setDisplayLimit] = useState<number>(10);
  const { toast } = useToast();

  useEffect(() => {
    loadData();

    // Setup realtime subscription
    const channel = supabase
      .channel('maintenance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests'
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // جلب المركبات
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, license_plate, model');

      if (vehiclesError) throw vehiclesError;
      
      const vehiclesList = (vehiclesData || []).map(v => ({
        id: v.id,
        name: `${v.model} - ${v.license_plate}`
      }));
      setVehicles(vehiclesList);

      // جلب طلبات الصيانة
      let query = supabase
        .from('maintenance_requests')
        .select(`
          id,
          vehicle_id,
          description,
          status,
          cost,
          created_at,
          completed_date
        `)
        .order('created_at', { ascending: false });

      // تطبيق فلتر التاريخ إذا كان محدداً
      if (startDate) {
        query = query.gte('created_at', startDate + 'T00:00:00');
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      // تحديد عدد السجلات المعروضة (افتراضياً آخر 10 عمليات)
      if (!startDate && !endDate) {
        query = query.limit(displayLimit);
      }

      const { data: requestsData, error: requestsError } = await query;

      if (requestsError) throw requestsError;

      // دمج بيانات المركبات مع طلبات الصيانة
      const requestsWithVehicles = (requestsData || []).map(request => {
        const vehicle = vehiclesList.find(v => v.id === request.vehicle_id);
        return {
          ...request,
          vehicle_name: vehicle?.name || 'مركبة غير معروفة',
        };
      });

      setMaintenanceRequests(requestsWithVehicles);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-muted";
    }
  };

  const filteredRequests = maintenanceRequests.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesVehicle = vehicleFilter === "all" || request.vehicle_id === vehicleFilter;
    const matchesSearch = 
      request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.vehicle_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesVehicle && matchesSearch;
  });

  const totalCost = filteredRequests.reduce((sum, req) => sum + (req.cost || 0), 0);
  const completedCount = filteredRequests.filter(r => r.status === "completed").length;
  const pendingCount = filteredRequests.filter(r => r.status === "pending").length;

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "مكتمل";
      case "in_progress": return "قيد التنفيذ";
      case "pending": return "قيد الانتظار";
      case "cancelled": return "ملغي";
      default: return status;
    }
  };

  const handleView = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setDialogMode('view');
    setShowDialog(true);
  };

  const handleEdit = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setDialogMode('edit');
    setShowDialog(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteRequestId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRequestId) return;

    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .delete()
        .eq('id', deleteRequestId);

      if (error) throw error;

      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف طلب الصيانة بنجاح",
      });

      setDeleteRequestId(null);
      loadData();
    } catch (error: any) {
      console.error('Error deleting maintenance request:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف طلب الصيانة",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير طلبات الصيانة</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            direction: rtl;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .summary {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 8px;
          }
          .summary-item {
            text-align: center;
          }
          .summary-item .label {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }
          .summary-item .value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: right;
          }
          th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            display: inline-block;
          }
          .status-completed { background-color: #d4edda; color: #155724; }
          .status-in_progress { background-color: #d1ecf1; color: #0c5460; }
          .status-pending { background-color: #fff3cd; color: #856404; }
          .status-cancelled { background-color: #f8d7da; color: #721c24; }
          .total-row {
            font-weight: bold;
            background-color: #e9ecef;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>تقرير طلبات الصيانة</h1>
          <p>تاريخ الطباعة: ${format(new Date(), "dd/MM/yyyy", { locale: ar })}</p>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="label">إجمالي الطلبات</div>
            <div class="value">${filteredRequests.length}</div>
          </div>
          <div class="summary-item">
            <div class="label">مكتملة</div>
            <div class="value" style="color: #28a745;">${completedCount}</div>
          </div>
          <div class="summary-item">
            <div class="label">قيد الانتظار</div>
            <div class="value" style="color: #ffc107;">${pendingCount}</div>
          </div>
          <div class="summary-item">
            <div class="label">التكلفة الإجمالية</div>
            <div class="value" style="color: #007bff;">${totalCost.toLocaleString()} ر.س</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>المركبة</th>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th>التكلفة</th>
              <th>الوصف</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRequests.map(request => `
              <tr>
                <td>${request.id.slice(0, 8)}</td>
                <td>${request.vehicle_name}</td>
                <td>${format(new Date(request.created_at), "dd/MM/yyyy", { locale: ar })}</td>
                <td>
                  <span class="status-badge status-${request.status}">
                    ${getStatusText(request.status)}
                  </span>
                </td>
                <td>${(request.cost || 0).toLocaleString()} ر.س</td>
                <td>${request.description}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4" style="text-align: left;">الإجمالي:</td>
              <td>${totalCost.toLocaleString()} ر.س</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">تقرير طلبات الصيانة</h1>
            </div>
            <Link to="/">
              <Button variant="outline">
                العودة للرئيسية
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي الطلبات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredRequests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                مكتملة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{completedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                قيد الانتظار
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                التكلفة الإجمالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCost.toLocaleString()} ر.س</div>
            </CardContent>
          </Card>
        </div>

        {/* الفلاتر */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              تصفية التقرير
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
              <div>
                <Label htmlFor="start-date">من تاريخ</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">إلى تاريخ</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">بحث</label>
                <Input
                  placeholder="رقم الطلب أو المركبة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-right"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">الحالة</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">المركبة</label>
                <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المركبة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المركبات</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="w-full" onClick={loadData}>
                  <Filter className="h-4 w-4 ml-2" />
                  تطبيق الفلتر
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {!startDate && !endDate ? (
                  <span>عرض آخر {displayLimit} عمليات صيانة</span>
                ) : (
                  <span>عرض جميع عمليات الصيانة في الفترة المحددة</span>
                )}
              </div>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة التقرير
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* جدول التقرير */}
        <Card>
          <CardHeader>
            <CardTitle>طلبات الصيانة</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الطلب</TableHead>
                  <TableHead className="text-right">المركبة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">قطع الغيار</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التكلفة</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      لا توجد طلبات صيانة تطابق معايير البحث
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.id.slice(0, 8)}</TableCell>
                      <TableCell>{request.vehicle_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ar })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          قطع غيار
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusText(request.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {request.cost ? request.cost.toLocaleString() : '0'} ر.س
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {request.description}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(request)}
                            title="عرض"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(request)}
                            title="تعديل"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(request.id)}
                            title="حذف"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {selectedRequest && (
        <MaintenanceRequestDialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) {
              setSelectedRequest(null);
              loadData();
            }
          }}
          maintenanceRequest={selectedRequest}
          mode={dialogMode}
        />
      )}

      <AlertDialog open={!!deleteRequestId} onOpenChange={(open) => !open && setDeleteRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف طلب الصيانة هذا؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MaintenanceReports;
