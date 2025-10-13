import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn, LogOut, MapPin, Clock, Calendar, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Employee {
  id: string;
  name: string;
  position: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_in_location: string | null;
  check_out_time: string | null;
  check_out_location: string | null;
  employees: {
    name: string;
    position: string;
  };
}

const Attendance = () => {
  const [employeeCode, setEmployeeCode] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  const getCurrentLocation = () => {
    setLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLoadingLocation(false);
          toast.success("تم الحصول على الموقع بنجاح");
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("فشل الحصول على الموقع");
          setLoadingLocation(false);
        }
      );
    } else {
      toast.error("المتصفح لا يدعم خاصية تحديد الموقع");
      setLoadingLocation(false);
    }
  };

  const searchEmployee = async () => {
    if (!employeeCode) {
      toast.error("الرجاء إدخال كود الموظف");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, position")
        .eq("id", employeeCode)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedEmployee(data);
        getCurrentLocation();
        toast.success(`تم العثور على الموظف: ${data.name}`);
      }
    } catch (error) {
      console.error("Error searching employee:", error);
      toast.error("لم يتم العثور على الموظف");
      setSelectedEmployee(null);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedEmployee || !location) {
      toast.error("الرجاء تحديد الموظف والموقع");
      return;
    }

    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const locationString = `${location.lat},${location.lng}`;

      // Check if there's already a check-in today
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", selectedEmployee.id)
        .eq("attendance_date", today)
        .single();

      if (existing && existing.check_in_time) {
        toast.error("تم تسجيل الحضور مسبقاً اليوم");
        return;
      }

      const { error } = await supabase
        .from("attendance_records")
        .insert({
          employee_id: selectedEmployee.id,
          attendance_date: today,
          check_in_time: new Date().toISOString(),
          check_in_location: locationString,
        });

      if (error) throw error;

      toast.success("تم تسجيل الحضور بنجاح");
      setEmployeeCode("");
      setSelectedEmployee(null);
      setLocation(null);
      fetchAttendanceRecords();
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error("فشل تسجيل الحضور");
    }
  };

  const handleCheckOut = async () => {
    if (!selectedEmployee || !location) {
      toast.error("الرجاء تحديد الموظف والموقع");
      return;
    }

    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const locationString = `${location.lat},${location.lng}`;

      // Find today's attendance record
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", selectedEmployee.id)
        .eq("attendance_date", today)
        .single();

      if (!existing || !existing.check_in_time) {
        toast.error("لم يتم تسجيل الحضور بعد");
        return;
      }

      if (existing.check_out_time) {
        toast.error("تم تسجيل الانصراف مسبقاً");
        return;
      }

      const { error } = await supabase
        .from("attendance_records")
        .update({
          check_out_time: new Date().toISOString(),
          check_out_location: locationString,
        })
        .eq("id", existing.id);

      if (error) throw error;

      toast.success("تم تسجيل الانصراف بنجاح");
      setEmployeeCode("");
      setSelectedEmployee(null);
      setLocation(null);
      fetchAttendanceRecords();
    } catch (error) {
      console.error("Error checking out:", error);
      toast.error("فشل تسجيل الانصراف");
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          *,
          employees (
            name,
            position
          )
        `)
        .order("attendance_date", { ascending: false })
        .order("check_in_time", { ascending: false })
        .limit(50);

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      toast.error("فشل تحميل سجلات الحضور");
    }
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card print:hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/hr" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">الحضور والانصراف</h1>
              <p className="text-muted-foreground mt-1">
                تسجيل أوقات حضور وانصراف الموظفين
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 print:hidden">
          {/* Check In/Out Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                تسجيل الحضور والانصراف
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeCode">كود الموظف</Label>
                  <div className="flex gap-2">
                    <Input
                      id="employeeCode"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      placeholder="أدخل كود الموظف"
                      className="flex-1"
                    />
                    <Button onClick={searchEmployee}>بحث</Button>
                  </div>
                </div>

                {selectedEmployee && (
                  <Card className="bg-accent/50">
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <p className="text-lg font-semibold">{selectedEmployee.name}</p>
                        <p className="text-muted-foreground">{selectedEmployee.position}</p>
                        {location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>
                              الموقع: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={handleCheckIn}
                    className="flex-1"
                    disabled={!selectedEmployee || !location || loadingLocation}
                    size="lg"
                  >
                    <LogIn className="ml-2 h-5 w-5" />
                    تسجيل الحضور
                  </Button>
                  <Button
                    onClick={handleCheckOut}
                    variant="secondary"
                    className="flex-1"
                    disabled={!selectedEmployee || !location || loadingLocation}
                    size="lg"
                  >
                    <LogOut className="ml-2 h-5 w-5" />
                    تسجيل الانصراف
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Toggle */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">تقرير الحضور والانصراف</h2>
            <Button onClick={printReport} variant="outline">
              <FileText className="ml-2 h-4 w-4" />
              طباعة التقرير
            </Button>
          </div>
        </div>

        {/* Attendance Report */}
        <Card className="mt-6">
          <CardHeader className="print:text-center">
            <CardTitle className="print:text-2xl">سجل الحضور والانصراف</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">اسم الموظف</TableHead>
                  <TableHead className="text-right">الوظيفة</TableHead>
                  <TableHead className="text-right">وقت الحضور</TableHead>
                  <TableHead className="text-right">موقع الحضور</TableHead>
                  <TableHead className="text-right">وقت الانصراف</TableHead>
                  <TableHead className="text-right">موقع الانصراف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.attendance_date), "yyyy/MM/dd", {
                        locale: ar,
                      })}
                    </TableCell>
                    <TableCell>{record.employees.name}</TableCell>
                    <TableCell>{record.employees.position}</TableCell>
                    <TableCell>
                      {record.check_in_time
                        ? format(new Date(record.check_in_time), "hh:mm a", {
                            locale: ar,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {record.check_in_location || "-"}
                    </TableCell>
                    <TableCell>
                      {record.check_out_time
                        ? format(new Date(record.check_out_time), "hh:mm a", {
                            locale: ar,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {record.check_out_location || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .container, .container * {
              visibility: visible;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:text-center {
              text-align: center;
            }
            .print\\:text-2xl {
              font-size: 1.5rem;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Attendance;
