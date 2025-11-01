import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, Printer, Download, Edit, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployeeTransactions } from "@/contexts/EmployeeTransactionsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// بيانات الموظفين الأساسية
const baseEmployees = [
  {
    id: "emp1",
    employeeName: "أحمد محمد علي",
    basicSalary: 15000,
    allowances: 5000,
    bankName: "البنك الأهلي",
    bankAccountNumber: "SA1234567890123456789012",
    residenceNumber: "2345678901"
  },
  {
    id: "emp2",
    employeeName: "فاطمة أحمد",
    basicSalary: 12000,
    allowances: 4000,
    bankName: "بنك الراجحي",
    bankAccountNumber: "SA9876543210987654321098",
    residenceNumber: "3456789012"
  },
  {
    id: "emp3",
    employeeName: "محمد سالم",
    basicSalary: 8000,
    allowances: 3000,
    bankName: "البنك السعودي الفرنسي",
    bankAccountNumber: "SA5544332211445566778899",
    residenceNumber: "4567890123"
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
  
  const [visibleColumns, setVisibleColumns] = useState({
    employeeName: true,
    bankName: true,
    bankAccountNumber: true,
    residenceNumber: true,
    basicSalary: true,
    allowances: true,
    additions: true,
    deductions: true,
    advances: true,
    netSalary: true
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
      bankName: emp.bankName,
      bankAccountNumber: emp.bankAccountNumber,
      residenceNumber: emp.residenceNumber,
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
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 1cm;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            .print-hidden {
              display: none !important;
            }
            .print-header {
              border: 2px solid #000;
              padding: 15px;
              margin-bottom: 20px;
              text-align: center;
            }
            .print-header h1 {
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
              font-size: 24px;
            }
            .print-table {
              border-collapse: collapse;
              width: 100%;
              font-size: 10px;
              margin-top: 10px;
              border: 2px solid #000;
            }
            .print-table th {
              background: #fff;
              color: #000;
              padding: 8px 4px;
              font-weight: 700;
              border: 1px solid #000;
              text-align: center;
            }
            .print-table td {
              padding: 6px 4px;
              border: 1px solid #000;
              text-align: center;
              background: #fff;
            }
            .print-total-row {
              background: #fff !important;
              font-weight: 700;
              font-size: 11px;
              border-top: 3px double #000 !important;
            }
            .print-footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #000;
            }
            .print-card {
              background: white;
              box-shadow: none;
            }
            header, nav {
              display: none !important;
            }
            main {
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}
      </style>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Settings2 className="h-4 w-4" />
                      إظهار/إخفاء الأعمدة
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end" dir="rtl">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">اختر الأعمدة المراد عرضها</h4>
                      <div className="space-y-2">
                        {Object.entries(visibleColumns).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <Checkbox
                              id={key}
                              checked={value}
                              onCheckedChange={(checked) => 
                                setVisibleColumns(prev => ({ ...prev, [key]: checked as boolean }))
                              }
                            />
                            <Label htmlFor={key} className="text-sm cursor-pointer">
                              {key === 'employeeName' && 'اسم الموظف'}
                              {key === 'bankName' && 'اسم البنك'}
                              {key === 'bankAccountNumber' && 'رقم الحساب البنكي'}
                              {key === 'residenceNumber' && 'رقم الإقامة'}
                              {key === 'basicSalary' && 'الراتب الأساسي'}
                              {key === 'allowances' && 'البدلات'}
                              {key === 'additions' && 'الإضافي'}
                              {key === 'deductions' && 'الخصومات'}
                              {key === 'advances' && 'السلف'}
                              {key === 'netSalary' && 'صافي الراتب'}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
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
          <Card className="print:print-card print:shadow-none print:border-0">
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
            <CardContent className="print:p-0">
              {/* Print Preview Header */}
              <div className="print:block hidden">
                <div className="print-header">
                  <h1 className="text-4xl font-bold mb-4">كشف رواتب الموظفين</h1>
                  <div className="flex justify-between items-center text-base px-4">
                    <div><strong>الشهر:</strong> يناير 2025</div>
                    <div><strong>التاريخ:</strong> {new Date().toLocaleDateString('ar-SA')}</div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="print:print-table">
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.employeeName && <TableHead className="text-right">اسم الموظف</TableHead>}
                      {visibleColumns.bankName && <TableHead className="text-right">اسم البنك</TableHead>}
                      {visibleColumns.bankAccountNumber && <TableHead className="text-right">رقم الحساب البنكي</TableHead>}
                      {visibleColumns.residenceNumber && <TableHead className="text-right">رقم الإقامة</TableHead>}
                      {visibleColumns.basicSalary && <TableHead className="text-right">الراتب الأساسي</TableHead>}
                      {visibleColumns.allowances && <TableHead className="text-right">البدلات</TableHead>}
                      {visibleColumns.additions && <TableHead className="text-right">الإضافي</TableHead>}
                      {visibleColumns.deductions && <TableHead className="text-right">الخصومات</TableHead>}
                      {visibleColumns.advances && <TableHead className="text-right">السلف</TableHead>}
                      {visibleColumns.netSalary && <TableHead className="text-right font-bold">صافي الراتب</TableHead>}
                      <TableHead className="text-right print:hidden">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payroll.map((employee) => (
                      <TableRow key={employee.id}>
                        {visibleColumns.employeeName && <TableCell className="font-medium">{employee.employeeName}</TableCell>}
                        {visibleColumns.bankName && <TableCell>{employee.bankName || "-"}</TableCell>}
                        {visibleColumns.bankAccountNumber && <TableCell className="font-mono text-sm">{employee.bankAccountNumber || "-"}</TableCell>}
                        {visibleColumns.residenceNumber && <TableCell>{employee.residenceNumber || "-"}</TableCell>}
                        {visibleColumns.basicSalary && <TableCell>{employee.basicSalary.toLocaleString()} ر.س</TableCell>}
                        {visibleColumns.allowances && <TableCell className="text-green-600">+{employee.allowances.toLocaleString()} ر.س</TableCell>}
                        {visibleColumns.additions && (
                          <TableCell className="text-green-600">
                            {employee.additions > 0 ? `+${employee.additions.toLocaleString()} ر.س` : "-"}
                          </TableCell>
                        )}
                        {visibleColumns.deductions && (
                          <TableCell className="text-red-600">
                            {employee.deductions > 0 ? `-${employee.deductions.toLocaleString()} ر.س` : "-"}
                          </TableCell>
                        )}
                        {visibleColumns.advances && (
                          <TableCell className="text-red-600">
                            {employee.advances > 0 ? `-${employee.advances.toLocaleString()} ر.س` : "-"}
                          </TableCell>
                        )}
                        {visibleColumns.netSalary && <TableCell className="font-bold text-primary">{employee.netSalary.toLocaleString()} ر.س</TableCell>}
                        <TableCell className="print-hidden">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(employee)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold print:print-total-row">
                      {visibleColumns.employeeName && <TableCell>الإجمالي</TableCell>}
                      {visibleColumns.bankName && <TableCell>-</TableCell>}
                      {visibleColumns.bankAccountNumber && <TableCell>-</TableCell>}
                      {visibleColumns.residenceNumber && <TableCell>-</TableCell>}
                      {visibleColumns.basicSalary && <TableCell>{totalBasicSalary.toLocaleString()} ر.س</TableCell>}
                      {visibleColumns.allowances && <TableCell className="text-green-600">+{totalAllowances.toLocaleString()} ر.س</TableCell>}
                      {visibleColumns.additions && <TableCell className="text-green-600">+{totalAdditions.toLocaleString()} ر.س</TableCell>}
                      {visibleColumns.deductions && <TableCell className="text-red-600">-{totalDeductions.toLocaleString()} ر.س</TableCell>}
                      {visibleColumns.advances && <TableCell className="text-red-600">-{totalAdvances.toLocaleString()} ر.س</TableCell>}
                      {visibleColumns.netSalary && <TableCell className="text-primary text-lg">{totalNetSalary.toLocaleString()} ر.س</TableCell>}
                      <TableCell className="print-hidden"></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Print Footer */}
              <div className="print:block hidden print-footer">
                <div className="grid grid-cols-3 gap-12 text-center mt-8">
                  <div>
                    <p className="font-bold text-base mb-3">المدير المالي</p>
                    <div className="border-t-2 border-gray-600 pt-3 mt-12 mx-4">
                      <p className="text-sm">التوقيع</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-base mb-3">مدير الموارد البشرية</p>
                    <div className="border-t-2 border-gray-600 pt-3 mt-12 mx-4">
                      <p className="text-sm">التوقيع</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-base mb-3">المدير العام</p>
                    <div className="border-t-2 border-gray-600 pt-3 mt-12 mx-4">
                      <p className="text-sm">التوقيع والختم</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </main>

        <div className="container mx-auto px-4 pb-8">
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
        </div>

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
    </>
  );
};

export default Payroll;
