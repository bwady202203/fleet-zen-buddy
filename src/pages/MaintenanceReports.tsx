import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
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
      const { data: requestsData, error: requestsError } = await supabase
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 ml-2" />
                  تصدير PDF
                </Button>
              </div>
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
                          {new Date(request.created_at).toLocaleDateString('ar-SA')}
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
