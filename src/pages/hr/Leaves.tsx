import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Search, Printer, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

const mockLeaves = [
  {
    id: 1,
    voucherNumber: "LV-001",
    employeeName: "أحمد محمد علي",
    leaveType: "annual",
    startDate: "2025-01-20",
    endDate: "2025-01-25",
    days: 6,
    status: "approved",
    reason: "إجازة سنوية"
  },
  {
    id: 2,
    voucherNumber: "LV-002",
    employeeName: "فاطمة أحمد",
    leaveType: "sick",
    startDate: "2025-01-15",
    endDate: "2025-01-17",
    days: 3,
    status: "approved",
    reason: "إجازة مرضية"
  }
];

const Leaves = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [leaves] = useState(mockLeaves);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [leaveType, setLeaveType] = useState("");

  const filteredLeaves = leaves.filter((leave) =>
    leave.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    leave.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateDays = () => {
    if (startDate && endDate) {
      return differenceInDays(endDate, startDate) + 1;
    }
    return 0;
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card print:hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/hr" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">إدارة الإجازات</h1>
                <p className="text-muted-foreground mt-1">
                  تسجيل وإدارة إجازات الموظفين
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  سند إجازة جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-center">سند إجازة</DialogTitle>
                </DialogHeader>
                
                <div className="border-2 border-primary/20 rounded-lg p-8 bg-gradient-to-br from-background to-muted/20">
                  <div className="grid grid-cols-2 gap-8 mb-6">
                    <div className="space-y-2">
                      <Label className="text-lg font-semibold">رقم السند</Label>
                      <Input placeholder="LV-003" className="h-12 text-lg" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-lg font-semibold">التاريخ</Label>
                      <Input type="date" className="h-12 text-lg" />
                    </div>
                  </div>

                  <div className="border-t-2 border-primary/20 pt-6 mb-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold">اسم الموظف</Label>
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                          <SelectTrigger className="h-12 text-lg">
                            <SelectValue placeholder="اختر الموظف" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="emp1">أحمد محمد علي</SelectItem>
                            <SelectItem value="emp2">فاطمة أحمد</SelectItem>
                            <SelectItem value="emp3">محمد سالم</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold">نوع الإجازة</Label>
                        <Select value={leaveType} onValueChange={setLeaveType}>
                          <SelectTrigger className="h-12 text-lg">
                            <SelectValue placeholder="اختر نوع الإجازة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="annual">إجازة سنوية</SelectItem>
                            <SelectItem value="sick">إجازة مرضية</SelectItem>
                            <SelectItem value="emergency">إجازة طارئة</SelectItem>
                            <SelectItem value="unpaid">إجازة بدون راتب</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-primary/20 pt-6 mb-6">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold">تاريخ البدء</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-12 text-lg justify-start text-right font-normal",
                                !startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="ml-2 h-5 w-5" />
                              {startDate ? format(startDate, "PPP", { locale: ar }) : <span>اختر التاريخ</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-lg font-semibold">تاريخ الانتهاء</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-12 text-lg justify-start text-right font-normal",
                                !endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="ml-2 h-5 w-5" />
                              {endDate ? format(endDate, "PPP", { locale: ar }) : <span>اختر التاريخ</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              initialFocus
                              disabled={(date) => startDate ? date < startDate : false}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-lg font-semibold">عدد الأيام</Label>
                        <div className="h-12 flex items-center justify-center bg-primary/10 rounded-md border-2 border-primary/30">
                          <span className="text-2xl font-bold text-primary">{calculateDays()}</span>
                          <span className="mr-2 text-lg">يوم</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-primary/20 pt-6 mb-6">
                    <div className="space-y-2">
                      <Label className="text-lg font-semibold">سبب الإجازة</Label>
                      <Input placeholder="اكتب سبب الإجازة..." className="h-12 text-lg" />
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4 mb-6">
                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                      ⚠️ ملاحظة: سيتم خصم أيام الإجازة من كشف الراتب الشهري للموظف
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button className="flex-1 h-12 text-lg" onClick={() => setIsDialogOpen(false)}>
                      حفظ السند
                    </Button>
                    <Button variant="outline" className="flex-1 h-12 text-lg gap-2" onClick={handlePrintVoucher}>
                      <Printer className="h-5 w-5" />
                      طباعة
                    </Button>
                    <Button variant="outline" className="h-12 text-lg" onClick={() => setIsDialogOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>سجل الإجازات</CardTitle>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث..."
                  className="pr-9 text-right"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم السند</TableHead>
                  <TableHead className="text-right">اسم الموظف</TableHead>
                  <TableHead className="text-right">نوع الإجازة</TableHead>
                  <TableHead className="text-right">تاريخ البدء</TableHead>
                  <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                  <TableHead className="text-right">عدد الأيام</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="font-medium">{leave.voucherNumber}</TableCell>
                    <TableCell>{leave.employeeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {leave.leaveType === "annual" ? "سنوية" : "مرضية"}
                      </Badge>
                    </TableCell>
                    <TableCell>{leave.startDate}</TableCell>
                    <TableCell>{leave.endDate}</TableCell>
                    <TableCell className="font-semibold text-primary">{leave.days} يوم</TableCell>
                    <TableCell>
                      <Badge variant={leave.status === "approved" ? "default" : "secondary"}>
                        {leave.status === "approved" ? "معتمدة" : "قيد المراجعة"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">تعديل</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإجازات هذا الشهر</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredLeaves.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الأيام</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredLeaves.reduce((sum, leave) => sum + leave.days, 0)} يوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجازات معتمدة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {filteredLeaves.filter(l => l.status === "approved").length}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Leaves;
