import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Filter, Download, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const MaintenanceReports = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // بيانات تجريبية لطلبات الصيانة
  const maintenanceRequests = [
    {
      id: "REQ-001",
      vehicle: "شاحنة A-101",
      date: "2024-10-15",
      status: "قيد التنفيذ",
      spareParts: ["فلتر زيت", "زيت محرك"],
      totalCost: 850,
      description: "صيانة دورية شاملة"
    },
    {
      id: "REQ-002",
      vehicle: "فان B-205",
      date: "2024-10-10",
      status: "مكتمل",
      spareParts: ["إطارات", "فرامل"],
      totalCost: 2400,
      description: "تغيير الإطارات والفرامل"
    },
    {
      id: "REQ-003",
      vehicle: "شاحنة C-340",
      date: "2024-10-12",
      status: "قيد الانتظار",
      spareParts: ["بطارية"],
      totalCost: 650,
      description: "استبدال البطارية"
    },
    {
      id: "REQ-004",
      vehicle: "فان D-412",
      date: "2024-10-08",
      status: "مكتمل",
      spareParts: ["فلتر هواء", "شمعات"],
      totalCost: 450,
      description: "صيانة روتينية"
    },
    {
      id: "REQ-005",
      vehicle: "شاحنة A-101",
      date: "2024-10-05",
      status: "ملغي",
      spareParts: ["مساحات"],
      totalCost: 120,
      description: "تغيير المساحات - تم الإلغاء"
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "مكتمل":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "قيد التنفيذ":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "قيد الانتظار":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case "ملغي":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-muted";
    }
  };

  const filteredRequests = maintenanceRequests.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesVehicle = vehicleFilter === "all" || request.vehicle === vehicleFilter;
    const matchesSearch = 
      request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesVehicle && matchesSearch;
  });

  const totalCost = filteredRequests.reduce((sum, req) => sum + req.totalCost, 0);
  const completedCount = filteredRequests.filter(r => r.status === "مكتمل").length;
  const pendingCount = filteredRequests.filter(r => r.status === "قيد الانتظار").length;

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
                    <SelectItem value="مكتمل">مكتمل</SelectItem>
                    <SelectItem value="قيد التنفيذ">قيد التنفيذ</SelectItem>
                    <SelectItem value="قيد الانتظار">قيد الانتظار</SelectItem>
                    <SelectItem value="ملغي">ملغي</SelectItem>
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
                    <SelectItem value="شاحنة A-101">شاحنة A-101</SelectItem>
                    <SelectItem value="فان B-205">فان B-205</SelectItem>
                    <SelectItem value="شاحنة C-340">شاحنة C-340</SelectItem>
                    <SelectItem value="فان D-412">فان D-412</SelectItem>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      لا توجد طلبات صيانة تطابق معايير البحث
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.id}</TableCell>
                      <TableCell>{request.vehicle}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {request.date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {request.spareParts.map((part, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {part}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {request.totalCost.toLocaleString()} ر.س
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {request.description}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MaintenanceReports;
