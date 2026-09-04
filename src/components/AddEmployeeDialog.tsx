import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface EmployeeFormData {
  id?: string;
  name: string;
  position: string;
  department: string;
  phone: string;
  email: string;
  nationalId: string;
  residenceNumber: string;
  bankName: string;
  bankAccountNumber: string;
  joinDate: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
}

const EMPTY_FORM: EmployeeFormData = {
  name: "",
  position: "",
  department: "",
  phone: "",
  email: "",
  nationalId: "",
  residenceNumber: "",
  bankName: "",
  bankAccountNumber: "",
  joinDate: new Date().toISOString().split("T")[0],
  basicSalary: 0,
  housingAllowance: 0,
  transportAllowance: 0,
  otherAllowances: 0,
};

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  employee?: EmployeeFormData | null;
}

export const AddEmployeeDialog = ({ open, onOpenChange, onSaved, employee }: AddEmployeeDialogProps) => {
  const [formData, setFormData] = useState<EmployeeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { user, currentOrganizationId } = useAuth();

  useEffect(() => {
    if (open) setFormData(employee ? { ...EMPTY_FORM, ...employee } : EMPTY_FORM);
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.position || !formData.department) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        position: formData.position,
        department: formData.department,
        phone: formData.phone,
        email: formData.email,
        national_id: formData.nationalId,
        residence_number: formData.residenceNumber,
        bank_name: formData.bankName,
        bank_account_number: formData.bankAccountNumber,
        hire_date: formData.joinDate,
        salary: formData.basicSalary,
        housing_allowance: formData.housingAllowance,
        transport_allowance: formData.transportAllowance,
        other_allowances: formData.otherAllowances,
        status: "active",
      };

      if (employee?.id) {
        const { error } = await supabase.from("employees").update(payload).eq("id", employee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert({
          ...payload,
          user_id: user?.id ?? null,
          organization_id: currentOrganizationId ?? null,
        });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-employees"] });
      queryClient.invalidateQueries({ queryKey: ["advance-employees"] });

      toast({ title: "تم بنجاح", description: employee?.id ? "تم تحديث بيانات الموظف" : "تم إضافة الموظف بنجاح" });
      setFormData(EMPTY_FORM);
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      console.error("Error saving employee:", error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء حفظ بيانات الموظف", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{employee?.id ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="أدخل الاسم"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>المسمى الوظيفي *</Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                placeholder="أدخل المسمى الوظيفي"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>القسم *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}
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
                onChange={(e) => setFormData((prev) => ({ ...prev, nationalId: e.target.value }))}
                placeholder="أدخل رقم الهوية"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الإقامة</Label>
              <Input
                value={formData.residenceNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, residenceNumber: e.target.value }))}
                placeholder="أدخل رقم الإقامة"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="05xxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="employee@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم البنك</Label>
              <Input
                value={formData.bankName}
                onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value }))}
                placeholder="أدخل اسم البنك"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الحساب البنكي</Label>
              <Input
                value={formData.bankAccountNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, bankAccountNumber: e.target.value }))}
                placeholder="أدخل رقم الحساب البنكي"
              />
            </div>
            <div className="space-y-2">
              <Label>تاريخ التعيين</Label>
              <Input
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, joinDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-3">معلومات الراتب</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الراتب الأساسي (ر.س)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={String(formData.basicSalary)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, basicSalary: Number(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>بدل السكن (ر.س)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={String(formData.housingAllowance)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, housingAllowance: Number(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>بدل النقل (ر.س)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={String(formData.transportAllowance)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, transportAllowance: Number(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>بدلات أخرى (ر.س)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={String(formData.otherAllowances)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, otherAllowances: Number(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : employee?.id ? "حفظ التعديلات" : "إضافة الموظف"}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
