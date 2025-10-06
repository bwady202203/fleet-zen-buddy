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
import { Badge } from "@/components/ui/badge";
import { useEmployeeTransactions } from "@/contexts/EmployeeTransactionsContext";
import { toast } from "@/hooks/use-toast";

const mockEmployees = [
  { id: "emp1", name: "أحمد محمد علي" },
  { id: "emp2", name: "فاطمة أحمد" },
  { id: "emp3", name: "محمد سالم" }
];

const Advances = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { transactions, addTransaction } = useEmployeeTransactions();
  const [formData, setFormData] = useState({
    voucherNumber: "",
    date: new Date().toISOString().split('T')[0],
    employeeId: "",
    employeeName: "",
    amount: 0,
    reason: ""
  });

  const advances = transactions.filter(t => t.type === "advance");

  const filteredAdvances = advances.filter((adv) =>
    adv.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    adv.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase())
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
      type: "advance",
      amount: formData.amount,
      originalAmount: formData.amount,
      remainingBalance: formData.amount,
      date: formData.date,
      reason: formData.reason,
      voucherNumber: formData.voucherNumber,
      status: "approved"
    });

    toast({
      title: "تم بنجاح",
      description: "تم إضافة سند السلفة بنجاح"
    });

    setFormData({
      voucherNumber: "",
      date: new Date().toISOString().split('T')[0],
      employeeId: "",
      employeeName: "",
      amount: 0,
      reason: ""
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
                <h1 className="text-3xl font-bold">سندات السلف</h1>
                <p className="text-muted-foreground mt-1">
                  تسجيل وإدارة سندات السلف للموظفين
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  سند سلفة جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة سند سلفة جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>رقم السند</Label>
                    <Input 
                      placeholder="ADV-003"
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
                      placeholder="سبب السلفة"
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
              <CardTitle>سجل السلف</CardTitle>
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
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdvances.map((advance) => (
                  <TableRow key={advance.id}>
                    <TableCell className="font-medium">{advance.voucherNumber}</TableCell>
                    <TableCell>{advance.date}</TableCell>
                    <TableCell>{advance.employeeName}</TableCell>
                    <TableCell>{advance.amount.toLocaleString()} ر.س</TableCell>
                    <TableCell>{advance.reason}</TableCell>
                    <TableCell>
                      <Badge variant={advance.status === "approved" ? "default" : "secondary"}>
                        {advance.status === "approved" ? "معتمد" : "قيد المراجعة"}
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
      </main>
    </div>
  );
};

export default Advances;
