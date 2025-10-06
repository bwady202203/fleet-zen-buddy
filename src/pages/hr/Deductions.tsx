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

const mockDeductions = [
  {
    id: 1,
    voucherNumber: "DED-001",
    date: "2025-01-15",
    employeeName: "محمد سالم",
    amount: 500,
    reason: "غياب بدون إذن",
    type: "absence"
  },
  {
    id: 2,
    voucherNumber: "DED-002",
    date: "2025-01-18",
    employeeName: "أحمد محمد علي",
    amount: 300,
    reason: "قسط سلفة",
    type: "advance_repayment"
  }
];

const Deductions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deductions] = useState(mockDeductions);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredDeductions = deductions.filter((ded) =>
    ded.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ded.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    <Input placeholder="DED-003" />
                  </div>
                  <div className="space-y-2">
                    <Label>التاريخ</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>الموظف</Label>
                    <Select>
                      <SelectTrigger>
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
                    <Label>نوع الخصم</Label>
                    <Select>
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
                    <Input type="number" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>السبب</Label>
                    <Input placeholder="سبب الخصم" />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1">حفظ</Button>
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
                      {deduction.type === "absence" ? "غياب" : "قسط سلفة"}
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
