import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicles, VehicleStatus } from "@/contexts/VehiclesContext";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const AddVehicleDialog = () => {
  const { addVehicle } = useVehicles();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    licensePlate: "",
    type: "",
    status: "active" as VehicleStatus,
    lastService: "",
    nextService: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.licensePlate || !formData.type) {
      toast.error("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    addVehicle({
      ...formData,
      mileage: 0,
    });

    toast.success("تم إضافة المركبة بنجاح");
    setOpen(false);
    setFormData({
      name: "",
      licensePlate: "",
      type: "",
      status: "active",
      lastService: "",
      nextService: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 ml-2" />
          إضافة مركبة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة مركبة جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم المركبة *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="شاحنة A-101"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licensePlate">رقم المركبة *</Label>
            <Input
              id="licensePlate"
              value={formData.licensePlate}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
              placeholder="أ ب ج 1234"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">نوع المركبة *</Label>
            <Input
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="شاحنة ثقيلة"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">الحالة</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as VehicleStatus })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">نشطة</SelectItem>
                <SelectItem value="maintenance">قيد الصيانة</SelectItem>
                <SelectItem value="warning">تحتاج صيانة</SelectItem>
                <SelectItem value="out-of-service">خارج الخدمة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastService">آخر صيانة</Label>
            <Input
              id="lastService"
              type="date"
              value={formData.lastService}
              onChange={(e) => setFormData({ ...formData, lastService: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextService">الصيانة القادمة</Label>
            <Input
              id="nextService"
              type="date"
              value={formData.nextService}
              onChange={(e) => setFormData({ ...formData, nextService: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">
              إضافة
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
