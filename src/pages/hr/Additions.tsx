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

const mockAdditions = [
  {
    id: 1,
    voucherNumber: "ADD-001",
    date: "2025-01-15",
    employeeName: "أحمد محمد علي",
    amount: 2000,
    reason: "مكافأة أداء",
    type: "bonus"
  },
  {
    id: 2,
    voucherNumber: "ADD-002",
    date: "2025-01-20",
    employeeName: "فاطمة أحمد",
    amount: 1500,
    reason: "ساعات إضافية",
    type: "overtime"
  }
];

const Additions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [additions] = useState(mockAdditions);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredAdditions = additions.filter((add) =>
    add.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    add.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase())
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
                <h1 className="text-3xl font-bold">سندات الإضافي</h1>
                <p className="text-muted-foreground mt-1">
                  تسجيل المكافآت والإضافات على رواتب الموظفين
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  سند إضافي جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة سند إضافي جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>رقم السند</Label>
                    <Input placeholder="ADD-003" />
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
                    <Label>نوع الإضافي</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الإضافي" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bonus">مكافأة</SelectItem>
                        <SelectItem value="overtime">ساعات إضافية</SelectItem>
                        <SelectItem value="commission">عمولة</SelectItem>
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
                    <Input placeholder="سبب الإضافي" />
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
              <CardTitle>سجل الإضافيات</CardTitle>
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
                {filteredAdditions.map((addition) => (
                  <TableRow key={addition.id}>
                    <TableCell className="font-medium">{addition.voucherNumber}</TableCell>
                    <TableCell>{addition.date}</TableCell>
                    <TableCell>{addition.employeeName}</TableCell>
                    <TableCell className="text-green-600 font-semibold">+{addition.amount.toLocaleString()} ر.س</TableCell>
                    <TableCell>{addition.type === "bonus" ? "مكافأة" : "ساعات إضافية"}</TableCell>
                    <TableCell>{addition.reason}</TableCell>
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

export default Additions;
