import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, User, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useEmployeeTransactions } from "@/contexts/EmployeeTransactionsContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Mock data - في التطبيق الحقيقي، سيتم جلب البيانات من قاعدة البيانات
const mockEmployees = [
  {
    id: 1,
    name: "أحمد محمد علي",
    position: "مدير الموارد البشرية",
    department: "الإدارة",
    phone: "0501234567",
    email: "ahmed@company.com",
    nationalId: "1234567890",
    joinDate: "2020-01-15",
    basicSalary: 15000,
    housingAllowance: 3000,
    transportAllowance: 1500,
    otherAllowances: 500,
    status: "active"
  },
  {
    id: 2,
    name: "فاطمة أحمد",
    position: "محاسبة",
    department: "المالية",
    phone: "0509876543",
    email: "fatima@company.com",
    nationalId: "9876543210",
    joinDate: "2021-03-10",
    basicSalary: 12000,
    housingAllowance: 2500,
    transportAllowance: 1200,
    otherAllowances: 300,
    status: "active"
  },
  {
    id: 3,
    name: "محمد سالم",
    position: "سائق",
    department: "النقل",
    phone: "0551122334",
    email: "mohammed@company.com",
    nationalId: "5544332211",
    joinDate: "2019-06-20",
    basicSalary: 8000,
    housingAllowance: 2000,
    transportAllowance: 1000,
    otherAllowances: 0,
    status: "active"
  }
];

const Employees = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [employees] = useState(mockEmployees);
  const { getEmployeeTransactions } = useEmployeeTransactions();

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalSalary = (emp: typeof mockEmployees[0]) => {
    return emp.basicSalary + emp.housingAllowance + emp.transportAllowance + emp.otherAllowances;
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/hr" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">بيانات الموظفين</h1>
                <p className="text-muted-foreground mt-1">
                  إدارة معلومات الموظفين والرواتب
                </p>
              </div>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة موظف جديد
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن موظف..."
              className="pr-9 text-right"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{employee.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{employee.position}</p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-500">
                    نشط
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="personal">البيانات الشخصية</TabsTrigger>
                    <TabsTrigger value="salary">الراتب والبدلات</TabsTrigger>
                    <TabsTrigger value="transactions">السلف والخصومات</TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="space-y-3 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">القسم</p>
                        <p className="font-semibold">{employee.department}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">تاريخ التعيين</p>
                        <p className="font-semibold">{employee.joinDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">رقم الهوية</p>
                        <p className="font-semibold">{employee.nationalId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">الهاتف</p>
                        <p className="font-semibold">{employee.phone}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                        <p className="font-semibold">{employee.email}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="salary" className="space-y-3 mt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-muted-foreground">الراتب الأساسي</span>
                        <span className="font-bold">{employee.basicSalary.toLocaleString()} ر.س</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-muted-foreground">بدل السكن</span>
                        <span className="font-semibold">{employee.housingAllowance.toLocaleString()} ر.س</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-muted-foreground">بدل النقل</span>
                        <span className="font-semibold">{employee.transportAllowance.toLocaleString()} ر.س</span>
                      </div>
                      {employee.otherAllowances > 0 && (
                        <div className="flex justify-between items-center pb-2 border-b">
                          <span className="text-muted-foreground">بدلات أخرى</span>
                          <span className="font-semibold">{employee.otherAllowances.toLocaleString()} ر.س</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-primary/20">
                        <span className="font-bold text-lg">إجمالي الراتب</span>
                        <span className="font-bold text-lg text-primary">{getTotalSalary(employee).toLocaleString()} ر.س</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="transactions" className="space-y-4">
                    {(() => {
                      const empTransactions = getEmployeeTransactions(`emp${employee.id}`);
                      return (
                        <>
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">رصيد السلف المستحق</h4>
                            <p className="text-2xl font-bold text-destructive">
                              {empTransactions.advancesBalance.toLocaleString()} ر.س
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-semibold text-lg">السلف</h4>
                            {empTransactions.advances.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-right">رقم السند</TableHead>
                                    <TableHead className="text-right">التاريخ</TableHead>
                                    <TableHead className="text-right">المبلغ الأصلي</TableHead>
                                    <TableHead className="text-right">الرصيد المتبقي</TableHead>
                                    <TableHead className="text-right">السبب</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {empTransactions.advances.map((adv) => (
                                    <TableRow key={adv.id}>
                                      <TableCell className="font-medium">{adv.voucherNumber}</TableCell>
                                      <TableCell>{adv.date}</TableCell>
                                      <TableCell>{adv.originalAmount.toLocaleString()} ر.س</TableCell>
                                      <TableCell className="font-bold text-destructive">
                                        {adv.remainingBalance.toLocaleString()} ر.س
                                      </TableCell>
                                      <TableCell>{adv.reason}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-muted-foreground text-center py-4">لا توجد سلف</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-semibold text-lg">الإضافيات</h4>
                            {empTransactions.additions.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-right">رقم السند</TableHead>
                                    <TableHead className="text-right">التاريخ</TableHead>
                                    <TableHead className="text-right">المبلغ</TableHead>
                                    <TableHead className="text-right">السبب</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {empTransactions.additions.map((add) => (
                                    <TableRow key={add.id}>
                                      <TableCell className="font-medium">{add.voucherNumber}</TableCell>
                                      <TableCell>{add.date}</TableCell>
                                      <TableCell className="font-bold text-green-600">
                                        +{add.amount.toLocaleString()} ر.س
                                      </TableCell>
                                      <TableCell>{add.reason}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-muted-foreground text-center py-4">لا توجد إضافيات</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-semibold text-lg">الخصومات</h4>
                            {empTransactions.deductions.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-right">رقم السند</TableHead>
                                    <TableHead className="text-right">التاريخ</TableHead>
                                    <TableHead className="text-right">المبلغ</TableHead>
                                    <TableHead className="text-right">السبب</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {empTransactions.deductions.map((ded) => (
                                    <TableRow key={ded.id}>
                                      <TableCell className="font-medium">{ded.voucherNumber}</TableCell>
                                      <TableCell>{ded.date}</TableCell>
                                      <TableCell className="font-bold text-destructive">
                                        -{ded.amount.toLocaleString()} ر.س
                                      </TableCell>
                                      <TableCell>{ded.reason}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-muted-foreground text-center py-4">لا توجد خصومات</p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" className="flex-1">
                    تعديل
                  </Button>
                  <Button variant="outline" className="flex-1">
                    عرض التفاصيل
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد نتائج تطابق البحث
          </div>
        )}
      </main>
    </div>
  );
};

export default Employees;
