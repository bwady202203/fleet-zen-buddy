import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

interface DeliveryReceipt {
  id: string;
  receipt_number: string;
  entry_time: string | null;
  exit_time: string | null;
  material_type: string | null;
  customer_name: string | null;
  driver_id: string | null;
  truck_number: string | null;
  supplier_company: string | null;
  empty_weight: number;
  full_weight: number;
  net_weight: number;
  driver_signature: string | null;
  receiver_signature: string | null;
  supervisor_signature: string | null;
  created_at: string;
}

interface Driver {
  id: string;
  name: string;
}

export default function DeliveryReceipts() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<DeliveryReceipt[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDriverDialogOpen, setAddDriverDialogOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [isDeliveryMode, setIsDeliveryMode] = useState(false);
  
  useEffect(() => {
    const deliveryMode = sessionStorage.getItem("delivery_system_mode") === "true";
    setIsDeliveryMode(deliveryMode);
  }, []);
  
  const [formData, setFormData] = useState({
    entry_time: "",
    exit_time: "",
    material_type: "",
    customer_name: "",
    driver_id: "",
    truck_number: "",
    supplier_company: "",
    empty_weight: 0,
    full_weight: 0,
    driver_signature: "",
    receiver_signature: "",
    supervisor_signature: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [receiptsData, driversData] = await Promise.all([
        supabase.from("delivery_receipts").select("*").order("created_at", { ascending: false }),
        supabase.from("drivers").select("id, name").eq("is_active", true),
      ]);

      if (receiptsData.error) throw receiptsData.error;
      if (driversData.error) throw driversData.error;

      setReceipts(receiptsData.data || []);
      setDrivers(driversData.data || []);
    } catch (error: any) {
      toast.error("خطأ في تحميل البيانات: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptNumber = async () => {
    const { data, error } = await supabase
      .from("delivery_receipts")
      .select("receipt_number")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) return "DR-001";
    if (!data || data.length === 0) return "DR-001";

    const lastNumber = parseInt(data[0].receipt_number.split("-")[1]);
    return `DR-${String(lastNumber + 1).padStart(3, "0")}`;
  };

  const handleSubmit = async () => {
    try {
      const receiptNumber = await generateReceiptNumber();
      const netWeight = formData.full_weight - formData.empty_weight;

      const { error } = await supabase.from("delivery_receipts").insert({
        receipt_number: receiptNumber,
        entry_time: formData.entry_time,
        exit_time: formData.exit_time,
        material_type: formData.material_type,
        customer_name: formData.customer_name,
        driver_id: formData.driver_id || null,
        truck_number: formData.truck_number,
        supplier_company: formData.supplier_company,
        empty_weight: formData.empty_weight,
        full_weight: formData.full_weight,
        net_weight: netWeight,
        driver_signature: formData.driver_signature,
        receiver_signature: formData.receiver_signature,
        supervisor_signature: formData.supervisor_signature,
      });

      if (error) throw error;

      toast.success("تم إضافة سند التسليم بنجاح");
      setDialogOpen(false);
      setFormData({
        entry_time: "",
        exit_time: "",
        material_type: "",
        customer_name: "",
        driver_id: "",
        truck_number: "",
        supplier_company: "",
        empty_weight: 0,
        full_weight: 0,
        driver_signature: "",
        receiver_signature: "",
        supervisor_signature: "",
      });
      loadData();
    } catch (error: any) {
      toast.error("خطأ في إضافة سند التسليم: " + error.message);
    }
  };

  const handleAddDriver = async () => {
    if (!newDriverName.trim()) {
      toast.error("الرجاء إدخال اسم السائق");
      return;
    }

    try {
      const { data, error } = await supabase.from("drivers").insert({ name: newDriverName }).select();

      if (error) throw error;

      toast.success("تم إضافة السائق بنجاح");
      setDrivers([...drivers, data[0]]);
      setFormData({ ...formData, driver_id: data[0].id });
      setAddDriverDialogOpen(false);
      setNewDriverName("");
    } catch (error: any) {
      toast.error("خطأ في إضافة السائق: " + error.message);
    }
  };

  const printReceipt = (receipt: DeliveryReceipt) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const driver = drivers.find((d) => d.id === receipt.driver_id);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>سند تسليم ${receipt.receipt_number}</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .info-item { border: 1px solid #ddd; padding: 10px; }
            .label { font-weight: bold; color: #555; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; }
            .signature-box { border: 1px solid #000; padding: 30px 10px; text-align: center; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>سند تسليم</h1>
            <h2>رقم السند: ${receipt.receipt_number}</h2>
          </div>
          <div class="info-grid">
            <div class="info-item"><span class="label">وقت الدخول:</span> ${receipt.entry_time ? new Date(receipt.entry_time).toLocaleString("ar-SA") : "-"}</div>
            <div class="info-item"><span class="label">وقت الخروج:</span> ${receipt.exit_time ? new Date(receipt.exit_time).toLocaleString("ar-SA") : "-"}</div>
            <div class="info-item"><span class="label">نوع المواد:</span> ${receipt.material_type || "-"}</div>
            <div class="info-item"><span class="label">اسم العميل:</span> ${receipt.customer_name || "-"}</div>
            <div class="info-item"><span class="label">اسم السائق:</span> ${driver?.name || "-"}</div>
            <div class="info-item"><span class="label">رقم الشاحنة:</span> ${receipt.truck_number || "-"}</div>
            <div class="info-item"><span class="label">اسم الشركة المورد:</span> ${receipt.supplier_company || "-"}</div>
            <div class="info-item"><span class="label">وزن الشاحنة فارغة:</span> ${receipt.empty_weight} كجم</div>
            <div class="info-item"><span class="label">وزن الشاحنة كاملة:</span> ${receipt.full_weight} كجم</div>
            <div class="info-item"><span class="label">وزن الشاحنة صافي:</span> ${receipt.net_weight} كجم</div>
          </div>
          <div class="signatures">
            <div class="signature-box">
              <p><strong>توقيع السائق</strong></p>
              <p>${receipt.driver_signature || ""}</p>
            </div>
            <div class="signature-box">
              <p><strong>توقيع المستلم</strong></p>
              <p>${receipt.receiver_signature || ""}</p>
            </div>
            <div class="signature-box">
              <p><strong>توقيع المسؤول</strong></p>
              <p>${receipt.supervisor_signature || ""}</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleBackClick = () => {
    if (isDeliveryMode) {
      navigate("/delivery-system/home");
    } else {
      navigate("/loads");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-right">سندات التسليم</h1>
          <Button onClick={handleBackClick} variant="outline">
            رجوع
          </Button>
        </div>

        <div className="mb-6">
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            تسجيل سند تسليم جديد
          </Button>
        </div>

        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم السند</TableHead>
                <TableHead className="text-right">وقت الدخول</TableHead>
                <TableHead className="text-right">وقت الخروج</TableHead>
                <TableHead className="text-right">اسم العميل</TableHead>
                <TableHead className="text-right">رقم الشاحنة</TableHead>
                <TableHead className="text-right">الوزن الصافي</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="text-right">{receipt.receipt_number}</TableCell>
                  <TableCell className="text-right">
                    {receipt.entry_time ? new Date(receipt.entry_time).toLocaleString("ar-SA") : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {receipt.exit_time ? new Date(receipt.exit_time).toLocaleString("ar-SA") : "-"}
                  </TableCell>
                  <TableCell className="text-right">{receipt.customer_name || "-"}</TableCell>
                  <TableCell className="text-right">{receipt.truck_number || "-"}</TableCell>
                  <TableCell className="text-right">{receipt.net_weight} كجم</TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => printReceipt(receipt)} size="sm" variant="outline" className="gap-2">
                      <Printer className="h-4 w-4" />
                      طباعة
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Add Receipt Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">تسجيل سند تسليم جديد</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entry_time" className="text-right block mb-2">
                  وقت دخول السيارة
                </Label>
                <Input
                  id="entry_time"
                  type="datetime-local"
                  value={formData.entry_time}
                  onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="exit_time" className="text-right block mb-2">
                  وقت خروج السيارة
                </Label>
                <Input
                  id="exit_time"
                  type="datetime-local"
                  value={formData.exit_time}
                  onChange={(e) => setFormData({ ...formData, exit_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="material_type" className="text-right block mb-2">
                  نوع المواد
                </Label>
                <Input
                  id="material_type"
                  value={formData.material_type}
                  onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customer_name" className="text-right block mb-2">
                  اسم العميل
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-right block mb-2">اسم السائق</Label>
                <div className="flex gap-2">
                  <Select value={formData.driver_id} onValueChange={(value) => setFormData({ ...formData, driver_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر السائق" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="icon" onClick={() => setAddDriverDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="truck_number" className="text-right block mb-2">
                  رقم الشاحنة
                </Label>
                <Input
                  id="truck_number"
                  value={formData.truck_number}
                  onChange={(e) => setFormData({ ...formData, truck_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="supplier_company" className="text-right block mb-2">
                  اسم الشركة المورد
                </Label>
                <Input
                  id="supplier_company"
                  value={formData.supplier_company}
                  onChange={(e) => setFormData({ ...formData, supplier_company: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="empty_weight" className="text-right block mb-2">
                  وزن الشاحنة فارغة (كجم)
                </Label>
                <Input
                  id="empty_weight"
                  type="number"
                  value={formData.empty_weight}
                  onChange={(e) => setFormData({ ...formData, empty_weight: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="full_weight" className="text-right block mb-2">
                  وزن الشاحنة كاملة (كجم)
                </Label>
                <Input
                  id="full_weight"
                  type="number"
                  value={formData.full_weight}
                  onChange={(e) => setFormData({ ...formData, full_weight: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-right block mb-2">الوزن الصافي (كجم)</Label>
                <Input value={formData.full_weight - formData.empty_weight} disabled />
              </div>
              <div>
                <Label htmlFor="driver_signature" className="text-right block mb-2">
                  توقيع السائق
                </Label>
                <Input
                  id="driver_signature"
                  value={formData.driver_signature}
                  onChange={(e) => setFormData({ ...formData, driver_signature: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="receiver_signature" className="text-right block mb-2">
                  توقيع المستلم
                </Label>
                <Input
                  id="receiver_signature"
                  value={formData.receiver_signature}
                  onChange={(e) => setFormData({ ...formData, receiver_signature: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="supervisor_signature" className="text-right block mb-2">
                  توقيع المسؤول
                </Label>
                <Input
                  id="supervisor_signature"
                  value={formData.supervisor_signature}
                  onChange={(e) => setFormData({ ...formData, supervisor_signature: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit}>حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Driver Dialog */}
        <Dialog open={addDriverDialogOpen} onOpenChange={setAddDriverDialogOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">إضافة سائق جديد</DialogTitle>
            </DialogHeader>
            <div>
              <Label htmlFor="new_driver_name" className="text-right block mb-2">
                اسم السائق
              </Label>
              <Input
                id="new_driver_name"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setAddDriverDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddDriver}>إضافة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}