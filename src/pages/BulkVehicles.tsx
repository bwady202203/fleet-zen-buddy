import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicles, VehicleStatus } from "@/contexts/VehiclesContext";
import { toast } from "sonner";
import { Trash2, Plus, Save, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface VehicleRow {
  id: string;
  name: string;
  type: string;
  status: VehicleStatus;
  lastService: string;
  nextService: string;
}

const BulkVehicles = () => {
  const { addVehicle } = useVehicles();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([
    { id: "1", name: "", type: "", status: "active", lastService: "", nextService: "" }
  ]);

  const addRow = () => {
    setVehicles([
      ...vehicles,
      { id: Date.now().toString(), name: "", type: "", status: "active", lastService: "", nextService: "" }
    ]);
  };

  const removeRow = (id: string) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter(v => v.id !== id));
    }
  };

  const updateVehicle = (id: string, field: keyof VehicleRow, value: string) => {
    setVehicles(vehicles.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const handleSaveAll = () => {
    const validVehicles = vehicles.filter(v => v.name && v.type);
    
    if (validVehicles.length === 0) {
      toast.error("الرجاء إدخال اسم ونوع على الأقل لكل مركبة");
      return;
    }

    validVehicles.forEach(vehicle => {
      addVehicle({
        name: vehicle.name,
        type: vehicle.type,
        status: vehicle.status,
        lastService: vehicle.lastService,
        nextService: vehicle.nextService,
        mileage: 0,
      });
    });

    toast.success(`تم إضافة ${validVehicles.length} مركبة بنجاح`);
    setVehicles([{ id: Date.now().toString(), name: "", type: "", status: "active", lastService: "", nextService: "" }]);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">تسجيل عدة مركبات</h1>
            <Link to="/">
              <Button variant="outline">
                <ArrowRight className="h-4 w-4 ml-2" />
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-card rounded-lg border p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">إضافة مركبات جديدة</h2>
            <div className="flex gap-2">
              <Button onClick={addRow} variant="outline">
                <Plus className="h-4 w-4 ml-2" />
                إضافة صف
              </Button>
              <Button onClick={handleSaveAll}>
                <Save className="h-4 w-4 ml-2" />
                حفظ الجميع
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم المركبة</TableHead>
                  <TableHead className="text-right">نوع المركبة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">آخر صيانة</TableHead>
                  <TableHead className="text-right">الصيانة القادمة</TableHead>
                  <TableHead className="text-right w-20">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <Input
                        value={vehicle.name}
                        onChange={(e) => updateVehicle(vehicle.id, "name", e.target.value)}
                        placeholder="شاحنة A-101"
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={vehicle.type}
                        onChange={(e) => updateVehicle(vehicle.id, "type", e.target.value)}
                        placeholder="شاحنة ثقيلة"
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={vehicle.status}
                        onValueChange={(value) => updateVehicle(vehicle.id, "status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">نشطة</SelectItem>
                          <SelectItem value="maintenance">قيد الصيانة</SelectItem>
                          <SelectItem value="warning">تحتاج صيانة</SelectItem>
                          <SelectItem value="out-of-service">خارج الخدمة</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={vehicle.lastService}
                        onChange={(e) => updateVehicle(vehicle.id, "lastService", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={vehicle.nextService}
                        onChange={(e) => updateVehicle(vehicle.id, "nextService", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(vehicle.id)}
                        disabled={vehicles.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BulkVehicles;
