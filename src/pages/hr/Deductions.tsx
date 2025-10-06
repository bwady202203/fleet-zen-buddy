import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Search, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployeeTransactions } from "@/contexts/EmployeeTransactionsContext";
import { toast } from "@/hooks/use-toast";

const mockEmployees = [
  { id: "emp1", name: "أحمد محمد علي" },
  { id: "emp2", name: "فاطمة أحمد" },
  { id: "emp3", name: "محمد سالم" }
];

const Deductions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { transactions, addTransaction } = useEmployeeTransactions();
  const [formData, setFormData] = useState({
    voucherNumber: "",
    date: new Date().toISOString().split('T')[0],
    employeeId: "",
    employeeName: "",
    amount: 0,
    reason: "",
    category: ""
  });

  const deductions = transactions.filter(t => t.type === "deduction");

  const filteredDeductions = deductions.filter((ded) =>
    ded.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ded.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (!formData.employeeId || !formData.amount || !formData.voucherNumber) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    const selectedEmployee = mockEmployees.find(e => e.id === formData.employeeId);
    
    addTransaction({
      employeeId: formData.employeeId,
      employeeName: selectedEmployee?.name || "",
      type: "deduction",
      amount: formData.amount,
      originalAmount: formData.amount,
      remainingBalance: 0,
      date: formData.date,
      reason: formData.reason,
      voucherNumber: formData.voucherNumber,
      category: formData.category
    });

    toast({
      title: "تم بنجاح",
      description: "تم إضافة سند الخصم بنجاح"
    });

    setFormData({
      voucherNumber: "",
      date: new Date().toISOString().split('T')[0],
      employeeId: "",
      employeeName: "",
      amount: 0,
      reason: "",
      category: ""
    });
    
    setIsDialogOpen(false);
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
                <h1 className="text-3xl font-bold">سندات الخصم</h1>
                <p className="text-muted-foreground mt-1">
                  تسجيل الخصومات على رواتب الموظفين
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  سند خصم جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة سند خصم جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>رقم السند</Label>
                    <Input 
                      placeholder="DED-003"
                      value={formData.voucherNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, voucherNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>التاريخ</Label>
                    <Input 
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الموظف</Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={(value) => {
                        const employee = mockEmployees.find(e => e.id === value);
                        setFormData(prev => ({ 
                          ...prev, 
                          employeeId: value,
                          employeeName: employee?.name || ""
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموظف" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الخصم</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الخصم" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="absence">غياب</SelectItem>
                        <SelectItem value="advance_repayment">قسط سلفة</SelectItem>
                        <SelectItem value="penalty">جزاء</SelectItem>
                        <SelectItem value="insurance">تأمينات</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المبلغ (ر.س)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>السبب</Label>
                    <Input 
                      placeholder="سبب الخصم"
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1" onClick={handleSubmit}>حفظ</Button>
                    <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
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
              <CardTitle>سجل الخصومات</CardTitle>
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
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">اسم الموظف</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeductions.map((deduction) => (
                  <TableRow key={deduction.id}>
                    <TableCell className="font-medium">{deduction.voucherNumber}</TableCell>
                    <TableCell>{deduction.date}</TableCell>
                    <TableCell>{deduction.employeeName}</TableCell>
                    <TableCell className="text-red-600 font-semibold">-{deduction.amount.toLocaleString()} ر.س</TableCell>
                    <TableCell>
                      {deduction.category === "absence" ? "غياب" : 
                       deduction.category === "advance_repayment" ? "قسط سلفة" :
                       deduction.category === "penalty" ? "جزاء" :
                       deduction.category === "insurance" ? "تأمينات" : "أخرى"}
                    </TableCell>
                    <TableCell>{deduction.reason}</TableCell>
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
      </main>
    </div>
  );
};

export default Deductions;
