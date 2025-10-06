import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, Printer, Download, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployeeTransactions } from "@/contexts/EmployeeTransactionsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// بيانات الموظفين الأساسية
const baseEmployees = [
  {
    id: "emp1",
    employeeName: "أحمد محمد علي",
    basicSalary: 15000,
    allowances: 5000
  },
  {
    id: "emp2",
    employeeName: "فاطمة أحمد",
    basicSalary: 12000,
    allowances: 4000
  },
  {
    id: "emp3",
    employeeName: "محمد سالم",
    basicSalary: 8000,
    allowances: 3000
  }
];

const Payroll = () => {
  const [selectedMonth, setSelectedMonth] = useState("2025-01");
  const { getEmployeeTransactions, updateTransactionBalance } = useEmployeeTransactions();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editedValues, setEditedValues] = useState({
    advances: 0,
    additions: 0,
    deductions: 0
  });

  // حساب كشف الرواتب من البيانات المسجلة
  const payroll = baseEmployees.map(emp => {
    const transactions = getEmployeeTransactions(emp.id);
    
    // حساب إجمالي الإضافيات
    const additions = transactions.additions.reduce((sum, add) => sum + add.amount, 0);
    
    // حساب إجمالي الخصومات
    const deductions = transactions.deductions.reduce((sum, ded) => sum + ded.amount, 0);
    
    // حساب إجمالي السلف (الرصيد المستحق)
    const advances = transactions.advancesBalance;
    
    // حساب صافي الراتب
    const netSalary = emp.basicSalary + emp.allowances + additions - deductions - advances;
    
    return {
      id: emp.id,
      employeeName: emp.employeeName,
      basicSalary: emp.basicSalary,
      allowances: emp.allowances,
      additions,
      deductions,
      advances,
      netSalary
    };
  });

  const totalBasicSalary = payroll.reduce((sum, emp) => sum + emp.basicSalary, 0);
  const totalAllowances = payroll.reduce((sum, emp) => sum + emp.allowances, 0);
  const totalAdditions = payroll.reduce((sum, emp) => sum + emp.additions, 0);
  const totalDeductions = payroll.reduce((sum, emp) => sum + emp.deductions, 0);
  const totalAdvances = payroll.reduce((sum, emp) => sum + emp.advances, 0);
  const totalNetSalary = payroll.reduce((sum, emp) => sum + emp.netSalary, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setEditedValues({
      advances: employee.advances,
      additions: employee.additions,
      deductions: employee.deductions
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingEmployee) {
      const advanceDiff = editedValues.advances - editingEmployee.advances;
      
      if (advanceDiff !== 0) {
        updateTransactionBalance(editingEmployee.id, advanceDiff);
      }
      
      setEditDialogOpen(false);
    }
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
                <h1 className="text-3xl font-bold">كشف الرواتب</h1>
                <p className="text-muted-foreground mt-1">
                  إصدار وطباعة كشوف رواتب الموظفين
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                تصدير PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="print:hidden">
            <div className="flex items-center justify-between">
              <CardTitle>كشف الرواتب الشهري</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">الشهر:</span>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-01">يناير 2025</SelectItem>
                    <SelectItem value="2024-12">ديسمبر 2024</SelectItem>
                    <SelectItem value="2024-11">نوفمبر 2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="print:block hidden mb-8">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold mb-2">كشف الرواتب</h1>
                <p className="text-lg">شهر يناير 2025</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الموظف</TableHead>
                    <TableHead className="text-right">الراتب الأساسي</TableHead>
                    <TableHead className="text-right">البدلات</TableHead>
                    <TableHead className="text-right">الإضافي</TableHead>
                    <TableHead className="text-right">الخصومات</TableHead>
                    <TableHead className="text-right">السلف</TableHead>
                    <TableHead className="text-right font-bold">صافي الراتب</TableHead>
                    <TableHead className="text-right no-print">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payroll.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.employeeName}</TableCell>
                      <TableCell>{employee.basicSalary.toLocaleString()} ر.س</TableCell>
                      <TableCell className="text-green-600">+{employee.allowances.toLocaleString()} ر.س</TableCell>
                      <TableCell className="text-green-600">
                        {employee.additions > 0 ? `+${employee.additions.toLocaleString()} ر.س` : "-"}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {employee.deductions > 0 ? `-${employee.deductions.toLocaleString()} ر.س` : "-"}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {employee.advances > 0 ? `-${employee.advances.toLocaleString()} ر.س` : "-"}
                      </TableCell>
                      <TableCell className="font-bold text-primary">{employee.netSalary.toLocaleString()} ر.س</TableCell>
                      <TableCell className="no-print">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(employee)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>الإجمالي</TableCell>
                    <TableCell>{totalBasicSalary.toLocaleString()} ر.س</TableCell>
                    <TableCell className="text-green-600">+{totalAllowances.toLocaleString()} ر.س</TableCell>
                    <TableCell className="text-green-600">+{totalAdditions.toLocaleString()} ر.س</TableCell>
                    <TableCell className="text-red-600">-{totalDeductions.toLocaleString()} ر.س</TableCell>
                    <TableCell className="text-red-600">-{totalAdvances.toLocaleString()} ر.س</TableCell>
                    <TableCell className="text-primary text-lg">{totalNetSalary.toLocaleString()} ر.س</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="mt-8 pt-6 border-t print:block hidden">
              <div className="flex justify-between text-sm">
                <div>
                  <p>التوقيع: _________________</p>
                  <p className="mt-4">التاريخ: _________________</p>
                </div>
                <div>
                  <p>الختم: _________________</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 print:hidden">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الرواتب الأساسية</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalBasicSalary.toLocaleString()} ر.س</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإضافات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">+{(totalAllowances + totalAdditions).toLocaleString()} ر.س</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">صافي الرواتب المستحقة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{totalNetSalary.toLocaleString()} ر.س</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل كشف الراتب - {editingEmployee?.employeeName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الإضافي (ر.س)</Label>
              <Input
                type="number"
                value={editedValues.additions}
                onChange={(e) => setEditedValues(prev => ({ ...prev, additions: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>الخصومات (ر.س)</Label>
              <Input
                type="number"
                value={editedValues.deductions}
                onChange={(e) => setEditedValues(prev => ({ ...prev, deductions: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>السلف المخصومة (ر.س)</Label>
              <Input
                type="number"
                value={editedValues.advances}
                onChange={(e) => setEditedValues(prev => ({ ...prev, advances: Number(e.target.value) }))}
              />
              <p className="text-sm text-muted-foreground">
                القيمة الأصلية: {editingEmployee?.advances.toLocaleString()} ر.س
              </p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm font-semibold">ملاحظة:</p>
              <p className="text-sm text-muted-foreground">
                عند تعديل قيمة السلف، سيتم خصم القيمة الجديدة فقط من رصيد الموظف
              </p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleSaveEdit}>حفظ التعديلات</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
