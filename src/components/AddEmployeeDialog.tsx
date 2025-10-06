import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddEmployee: (employee: any) => void;
}

export const AddEmployeeDialog = ({ open, onOpenChange, onAddEmployee }: AddEmployeeDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    department: "",
    phone: "",
    email: "",
    nationalId: "",
    joinDate: new Date().toISOString().split('T')[0],
    basicSalary: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    otherAllowances: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.position || !formData.department) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    const newEmployee = {
      id: Date.now(),
      ...formData,
      status: "active"
    };

    onAddEmployee(newEmployee);
    
    toast({
      title: "تم بنجاح",
      description: "تم إضافة الموظف بنجاح"
    });

    setFormData({
      name: "",
      position: "",
      department: "",
      phone: "",
      email: "",
      nationalId: "",
      joinDate: new Date().toISOString().split('T')[0],
      basicSalary: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowances: 0
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة موظف جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="أدخل الاسم"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>المسمى الوظيفي *</Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                placeholder="أدخل المسمى الوظيفي"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>القسم *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="الإدارة">الإدارة</SelectItem>
                  <SelectItem value="المالية">المالية</SelectItem>
                  <SelectItem value="النقل">النقل</SelectItem>
                  <SelectItem value="الموارد البشرية">الموارد البشرية</SelectItem>
                  <SelectItem value="التسويق">التسويق</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>رقم الهوية</Label>
              <Input
                value={formData.nationalId}
                onChange={(e) => setFormData(prev => ({ ...prev, nationalId: e.target.value }))}
                placeholder="أدخل رقم الهوية"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="05xxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="employee@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>تاريخ التعيين</Label>
              <Input
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData(prev => ({ ...prev, joinDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-3">معلومات الراتب</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الراتب الأساسي (ر.س)</Label>
                <Input
                  type="number"
                  value={formData.basicSalary}
                  onChange={(e) => setFormData(prev => ({ ...prev, basicSalary: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>بدل السكن (ر.س)</Label>
                <Input
                  type="number"
                  value={formData.housingAllowance}
                  onChange={(e) => setFormData(prev => ({ ...prev, housingAllowance: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>بدل النقل (ر.س)</Label>
                <Input
                  type="number"
                  value={formData.transportAllowance}
                  onChange={(e) => setFormData(prev => ({ ...prev, transportAllowance: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>بدلات أخرى (ر.س)</Label>
                <Input
                  type="number"
                  value={formData.otherAllowances}
                  onChange={(e) => setFormData(prev => ({ ...prev, otherAllowances: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">إضافة الموظف</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
