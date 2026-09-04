import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, User, Search, Plus, Upload, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useEmployeeTransactions } from "@/contexts/EmployeeTransactionsContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddEmployeeDialog, EmployeeFormData } from "@/components/AddEmployeeDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { LoadingCup } from "@/components/LoadingCup";

interface DbEmployee {
  id: string;
  name: string;
  position: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  residence_number: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  hire_date: string | null;
  salary: number | null;
  housing_allowance: number | null;
  transport_allowance: number | null;
  other_allowances: number | null;
  status: string | null;
}

const useEmployees = () => {
  const { currentOrganizationId } = useAuth();
  return useQuery({
    queryKey: ["employees", currentOrganizationId],
    queryFn: async (): Promise<DbEmployee[]> => {
      let query = supabase.from("employees").select("*").order("created_at", { ascending: false });
      if (currentOrganizationId) query = query.eq("organization_id", currentOrganizationId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as DbEmployee[];
    },
  });
};

const toFormData = (emp: DbEmployee): EmployeeFormData => ({
  id: emp.id,
  name: emp.name ?? "",
  position: emp.position ?? "",
  department: emp.department ?? "",
  phone: emp.phone ?? "",
  email: emp.email ?? "",
  nationalId: emp.national_id ?? "",
  residenceNumber: emp.residence_number ?? "",
  bankName: emp.bank_name ?? "",
  bankAccountNumber: emp.bank_account_number ?? "",
  joinDate: emp.hire_date ?? new Date().toISOString().split("T")[0],
  basicSalary: Number(emp.salary ?? 0),
  housingAllowance: Number(emp.housing_allowance ?? 0),
  transportAllowance: Number(emp.transport_allowance ?? 0),
  otherAllowances: Number(emp.other_allowances ?? 0),
});

const Employees = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { getEmployeeTransactions } = useEmployeeTransactions();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeFormData | null>(null);
  const { data: employees = [], isLoading, refetch } = useEmployees();
  const queryClient = useQueryClient();

  const filteredEmployees = employees.filter(
    (emp) =>
      (emp.name ?? "").includes(searchQuery) ||
      (emp.position ?? "").includes(searchQuery) ||
      (emp.department ?? "").includes(searchQuery)
  );

  const getTotalSalary = (emp: DbEmployee) =>
    Number(emp.salary ?? 0) +
    Number(emp.housing_allowance ?? 0) +
    Number(emp.transport_allowance ?? 0) +
    Number(emp.other_allowances ?? 0);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف الموظف "${name}"؟`)) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: "تعذر حذف الموظف — قد تكون له سلف أو حركات مرتبطة", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["payroll-employees"] });
    queryClient.invalidateQueries({ queryKey: ["advance-employees"] });
    toast({ title: "تم حذف الموظف" });
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
                <p className="text-muted-foreground mt-1">إدارة معلومات الموظفين والرواتب</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="gap-2" onClick={() => { setEditingEmployee(null); setIsAddDialogOpen(true); }}>
                <Plus className="h-4 w-4" />
                إضافة موظف جديد
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/hr/bulk-employees">
                  <Upload className="h-4 w-4" />
                  استيراد من إكسل
                </Link>
              </Button>
            </div>
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

        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingCup />
          </div>
        ) : (
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
                      {employee.status === "active" ? "نشط" : employee.status ?? "نشط"}
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
                          <p className="font-semibold">{employee.department || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">تاريخ التعيين</p>
                          <p className="font-semibold">{employee.hire_date || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">رقم الهوية</p>
                          <p className="font-semibold">{employee.national_id || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">رقم الإقامة</p>
                          <p className="font-semibold">{employee.residence_number || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">الهاتف</p>
                          <p className="font-semibold">{employee.phone || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                          <p className="font-semibold">{employee.email || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">اسم البنك</p>
                          <p className="font-semibold">{employee.bank_name || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">رقم الحساب البنكي</p>
                          <p className="font-semibold font-mono text-sm">{employee.bank_account_number || "-"}</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="salary" className="space-y-3 mt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b">
                          <span className="text-muted-foreground">الراتب الأساسي</span>
                          <span className="font-bold">{Number(employee.salary ?? 0).toLocaleString()} ر.س</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b">
                          <span className="text-muted-foreground">بدل السكن</span>
                          <span className="font-semibold">{Number(employee.housing_allowance ?? 0).toLocaleString()} ر.س</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b">
                          <span className="text-muted-foreground">بدل النقل</span>
                          <span className="font-semibold">{Number(employee.transport_allowance ?? 0).toLocaleString()} ر.س</span>
                        </div>
                        {Number(employee.other_allowances ?? 0) > 0 && (
                          <div className="flex justify-between items-center pb-2 border-b">
                            <span className="text-muted-foreground">بدلات أخرى</span>
                            <span className="font-semibold">{Number(employee.other_allowances ?? 0).toLocaleString()} ر.س</span>
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
                        const empTransactions = getEmployeeTransactions(employee.id);
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
                    <Button
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => {
                        setEditingEmployee(toFormData(employee));
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      تعديل
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-1 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(employee.id, employee.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredEmployees.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {employees.length === 0 ? "لا يوجد موظفون بعد — أضف أول موظف ليظهر في السلف وكشوف الرواتب" : "لا توجد نتائج تطابق البحث"}
          </div>
        )}
      </main>

      <AddEmployeeDialog
        open={isAddDialogOpen}
        onOpenChange={(o) => {
          setIsAddDialogOpen(o);
          if (!o) setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSaved={() => refetch()}
      />
    </div>
  );
};

export default Employees;
