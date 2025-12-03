import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, DollarSign, FileDown, FileSpreadsheet, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";

interface DriverDailyDuesReportProps {
  startDate: string;
  endDate: string;
}

interface DriverDuesData {
  driver_id: string;
  driver_name: string;
  total_loads: number;
  total_quantity: number;
  total_amount: number;
  total_commission: number;
  net_due: number;
}

interface DailyDriverData {
  date: string;
  driver_id: string;
  driver_name: string;
  loads_count: number;
  quantity: number;
  amount: number;
  commission: number;
  net_due: number;
}

const DriverDailyDuesReport = ({ startDate, endDate }: DriverDailyDuesReportProps) => {
  const [loading, setLoading] = useState(true);
  const [driversData, setDriversData] = useState<DriverDuesData[]>([]);
  const [dailyData, setDailyData] = useState<DailyDriverData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  // حساب العمولة بناءً على الوزن
  const calculateCommission = (
    quantity: number,
    companyCommissions: any[]
  ): number => {
    if (!companyCommissions || companyCommissions.length === 0) {
      return 0;
    }

    // تحديد نطاق الوزن
    let commissionType = "weight_less_40";
    if (quantity >= 49) {
      commissionType = "weight_more_49";
    } else if (quantity >= 44) {
      commissionType = "weight_44_49";
    } else if (quantity >= 40) {
      commissionType = "weight_40_44";
    }

    // البحث عن العمولة المناسبة
    const commission = companyCommissions.find(
      (c) => c.commission_type === commissionType
    );

    return commission ? Number(commission.amount) : 0;
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // جلب بيانات الشحنات مع معلومات السائقين والشركات
      const { data: loadsData, error } = await supabase
        .from("loads")
        .select(`
          id,
          date,
          driver_id,
          company_id,
          quantity,
          total_amount,
          commission_amount,
          drivers (
            id,
            name
          ),
          companies (
            id,
            name
          )
        `)
        .gte("date", startDate)
        .lte("date", endDate)
        .not("driver_id", "is", null)
        .order("date", { ascending: true });

      if (error) throw error;

      // جلب عمولات السائقين لكل شركة
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("company_driver_commissions")
        .select("*");

      if (commissionsError) throw commissionsError;

      // تجميع العمولات حسب الشركة
      const companyCommissionsMap = new Map<string, any[]>();
      commissionsData?.forEach((commission) => {
        const companyId = commission.company_id;
        if (!companyCommissionsMap.has(companyId)) {
          companyCommissionsMap.set(companyId, []);
        }
        companyCommissionsMap.get(companyId)!.push(commission);
      });

      // تجميع البيانات اليومية
      const dailyMap = new Map<string, DailyDriverData>();
      const driverMap = new Map<string, DriverDuesData>();

      loadsData?.forEach((load) => {
        const driverId = load.driver_id || "";
        const driverName = load.drivers?.name || "غير محدد";
        const companyId = load.company_id || "";
        const loadDate = load.date;
        const quantity = Number(load.quantity) || 0;
        const amount = Number(load.total_amount) || 0;
        
        // حساب العمولة بناءً على الوزن والشركة
        const companyCommissions = companyCommissionsMap.get(companyId) || [];
        let commission = Number(load.commission_amount) || 0;
        
        // إذا كانت العمولة صفر، احسبها من جدول العمولات
        if (commission === 0) {
          commission = calculateCommission(quantity, companyCommissions);
        }
        
        const netDue = commission; // المستحق هو العمولة

        // مفتاح يومي فريد
        const dailyKey = `${loadDate}_${driverId}`;

        // تجميع البيانات اليومية
        if (dailyMap.has(dailyKey)) {
          const existing = dailyMap.get(dailyKey)!;
          existing.loads_count += 1;
          existing.quantity += quantity;
          existing.amount += amount;
          existing.commission += commission;
          existing.net_due += netDue;
        } else {
          dailyMap.set(dailyKey, {
            date: loadDate,
            driver_id: driverId,
            driver_name: driverName,
            loads_count: 1,
            quantity,
            amount,
            commission,
            net_due: netDue,
          });
        }

        // تجميع إجمالي السائقين
        if (driverMap.has(driverId)) {
          const existing = driverMap.get(driverId)!;
          existing.total_loads += 1;
          existing.total_quantity += quantity;
          existing.total_amount += amount;
          existing.total_commission += commission;
          existing.net_due += netDue;
        } else {
          driverMap.set(driverId, {
            driver_id: driverId,
            driver_name: driverName,
            total_loads: 1,
            total_quantity: quantity,
            total_amount: amount,
            total_commission: commission,
            net_due: netDue,
          });
        }
      });

      const sortedDrivers = Array.from(driverMap.values()).sort(
        (a, b) => b.net_due - a.net_due
      );
      const sortedDaily = Array.from(dailyMap.values()).sort((a, b) => {
        if (a.date === b.date) return b.net_due - a.net_due;
        return a.date.localeCompare(b.date);
      });

      setDriversData(sortedDrivers);
      setDailyData(sortedDaily);
    } catch (error: any) {
      console.error("Error fetching report data:", error);
      toast({
        title: "خطأ في جلب البيانات",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalLoads = driversData.reduce((sum, item) => sum + item.total_loads, 0);
  const totalQuantity = driversData.reduce((sum, item) => sum + item.total_quantity, 0);
  const totalAmount = driversData.reduce((sum, item) => sum + item.total_amount, 0);
  const totalCommission = driversData.reduce((sum, item) => sum + item.total_commission, 0);
  const totalNetDue = driversData.reduce((sum, item) => sum + item.net_due, 0);

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // إنشاء محتوى HTML للتقرير
      const container = document.createElement("div");
      container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 750px;
        background: white;
        padding: 20px;
        direction: rtl;
        font-family: 'Cairo', Arial, sans-serif;
        box-sizing: border-box;
      `;

      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #1976d2; padding-bottom: 15px;">
          <h1 style="color: #1976d2; font-size: 22px; margin: 0 0 8px 0; font-weight: 800;">تقرير مستحقات السائقين</h1>
          <p style="color: #666; font-size: 13px; margin: 0;">
            من ${format(new Date(startDate), "dd/MM/yyyy")} إلى ${format(new Date(endDate), "dd/MM/yyyy")}
          </p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
          <div style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); padding: 15px; border-radius: 8px; text-align: center; color: white; border: 2px solid #0d47a1;">
            <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${totalLoads}</div>
            <div style="font-size: 12px; opacity: 0.95;">عدد الرحلات</div>
          </div>
          <div style="background: linear-gradient(135deg, #388e3c 0%, #2e7d32 100%); padding: 15px; border-radius: 8px; text-align: center; color: white; border: 2px solid #1b5e20;">
            <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${totalQuantity.toLocaleString()}</div>
            <div style="font-size: 12px; opacity: 0.95;">إجمالي الكمية</div>
          </div>
          <div style="background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%); padding: 15px; border-radius: 8px; text-align: center; color: white; border: 2px solid #b71c1c;">
            <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${totalNetDue.toLocaleString()} ر.س</div>
            <div style="font-size: 12px; opacity: 0.95;">إجمالي المستحق</div>
          </div>
        </div>

        <h2 style="color: #1976d2; font-size: 16px; margin: 20px 0 10px; border-bottom: 2px solid #1976d2; padding-bottom: 8px; font-weight: 700;">إجمالي مستحقات كل سائق</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
          <thead>
            <tr style="background: #1976d2; color: white;">
              <th style="padding: 10px 8px; text-align: right; border: 2px solid #0d47a1; font-weight: 700;">#</th>
              <th style="padding: 10px 8px; text-align: right; border: 2px solid #0d47a1; font-weight: 700;">السائق</th>
              <th style="padding: 10px 8px; text-align: center; border: 2px solid #0d47a1; font-weight: 700;">الرحلات</th>
              <th style="padding: 10px 8px; text-align: center; border: 2px solid #0d47a1; font-weight: 700;">الكمية</th>
              <th style="padding: 10px 8px; text-align: center; border: 2px solid #0d47a1; font-weight: 700; background: #c62828;">المستحق</th>
            </tr>
          </thead>
          <tbody>
            ${driversData.map((item, index) => `
              <tr style="background: ${index % 2 === 0 ? "#ffffff" : "#f5f5f5"};">
                <td style="padding: 8px; text-align: right; border: 2px solid #ddd; font-weight: 600;">${index + 1}</td>
                <td style="padding: 8px; text-align: right; border: 2px solid #ddd; font-weight: 600;">${item.driver_name}</td>
                <td style="padding: 8px; text-align: center; border: 2px solid #ddd;">${item.total_loads}</td>
                <td style="padding: 8px; text-align: center; border: 2px solid #ddd;">${item.total_quantity.toLocaleString()}</td>
                <td style="padding: 8px; text-align: center; border: 2px solid #ddd; font-weight: 700; color: #c62828; font-size: 13px;">${item.net_due.toLocaleString()} ر.س</td>
              </tr>
            `).join("")}
            <tr style="background: #1976d2; color: white; font-weight: 700;">
              <td style="padding: 10px 8px; text-align: right; border: 2px solid #0d47a1;" colspan="2">الإجمالي</td>
              <td style="padding: 10px 8px; text-align: center; border: 2px solid #0d47a1;">${totalLoads}</td>
              <td style="padding: 10px 8px; text-align: center; border: 2px solid #0d47a1;">${totalQuantity.toLocaleString()}</td>
              <td style="padding: 10px 8px; text-align: center; border: 2px solid #0d47a1; background: #c62828; font-size: 14px;">${totalNetDue.toLocaleString()} ر.س</td>
            </tr>
          </tbody>
        </table>

        <h2 style="color: #1976d2; font-size: 16px; margin: 20px 0 10px; border-bottom: 2px solid #1976d2; padding-bottom: 8px; font-weight: 700;">التفاصيل اليومية</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #1976d2; color: white;">
              <th style="padding: 8px 6px; text-align: right; border: 2px solid #0d47a1; font-weight: 700;">التاريخ</th>
              <th style="padding: 8px 6px; text-align: right; border: 2px solid #0d47a1; font-weight: 700;">السائق</th>
              <th style="padding: 8px 6px; text-align: center; border: 2px solid #0d47a1; font-weight: 700;">الرحلات</th>
              <th style="padding: 8px 6px; text-align: center; border: 2px solid #0d47a1; font-weight: 700;">الكمية</th>
              <th style="padding: 8px 6px; text-align: center; border: 2px solid #0d47a1; font-weight: 700; background: #c62828;">المستحق</th>
            </tr>
          </thead>
          <tbody>
            ${dailyData.map((item, index) => `
              <tr style="background: ${index % 2 === 0 ? "#ffffff" : "#f5f5f5"};">
                <td style="padding: 6px; text-align: right; border: 2px solid #ddd;">${format(new Date(item.date), "dd/MM/yyyy")}</td>
                <td style="padding: 6px; text-align: right; border: 2px solid #ddd;">${item.driver_name}</td>
                <td style="padding: 6px; text-align: center; border: 2px solid #ddd;">${item.loads_count}</td>
                <td style="padding: 6px; text-align: center; border: 2px solid #ddd;">${item.quantity.toLocaleString()}</td>
                <td style="padding: 6px; text-align: center; border: 2px solid #ddd; font-weight: 600; color: #c62828;">${item.net_due.toLocaleString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div style="margin-top: 20px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #ddd; padding-top: 10px;">
          تم الإنشاء في: ${format(new Date(), "dd/MM/yyyy HH:mm")}
        </div>
      `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 2 * margin;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 2 * margin;
      }

      const fileName = `مستحقات_السائقين_${format(new Date(startDate), "yyyy-MM-dd")}_${format(new Date(endDate), "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);

      toast({
        title: "تم التصدير بنجاح",
        description: "تم حفظ ملف PDF",
      });
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "خطأ في التصدير",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    try {
      // بيانات الإجماليات
      const summaryData = driversData.map((item, index) => ({
        "#": index + 1,
        "السائق": item.driver_name,
        "عدد الرحلات": item.total_loads,
        "الكمية": item.total_quantity,
        "المستحق": item.net_due,
      }));

      // إضافة صف الإجمالي
      summaryData.push({
        "#": "الإجمالي" as any,
        "السائق": "",
        "عدد الرحلات": totalLoads,
        "الكمية": totalQuantity,
        "المستحق": totalNetDue,
      });

      // بيانات التفاصيل اليومية
      const dailyExportData = dailyData.map((item) => ({
        "التاريخ": format(new Date(item.date), "dd/MM/yyyy"),
        "السائق": item.driver_name,
        "عدد الرحلات": item.loads_count,
        "الكمية": item.quantity,
        "المستحق": item.net_due,
      }));

      const workbook = XLSX.utils.book_new();

      // ورقة الإجماليات
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "إجمالي المستحقات");

      // ورقة التفاصيل اليومية
      const dailySheet = XLSX.utils.json_to_sheet(dailyExportData);
      XLSX.utils.book_append_sheet(workbook, dailySheet, "التفاصيل اليومية");

      const fileName = `مستحقات_السائقين_${format(new Date(startDate), "yyyy-MM-dd")}_${format(new Date(endDate), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "تم التصدير بنجاح",
        description: "تم حفظ ملف Excel",
      });
    } catch (error: any) {
      console.error("Error exporting Excel:", error);
      toast({
        title: "خطأ في التصدير",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">جاري تحميل البيانات...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            تقرير مستحقات السائقين
          </h2>
          <p className="text-muted-foreground mt-1">
            من {format(new Date(startDate), "PPP", { locale: ar })} إلى {format(new Date(endDate), "PPP", { locale: ar })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} className="gap-2 bg-red-600 hover:bg-red-700">
            <FileDown className="h-4 w-4" />
            تصدير PDF
          </Button>
          <Button onClick={exportToExcel} className="gap-2 bg-green-600 hover:bg-green-700">
            <FileSpreadsheet className="h-4 w-4" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">عدد الرحلات</p>
              <p className="text-2xl font-bold">{totalLoads}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">إجمالي الكمية</p>
              <p className="text-2xl font-bold">{totalQuantity.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">إجمالي المستحق</p>
              <p className="text-2xl font-bold">{totalNetDue.toLocaleString()} ر.س</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Drivers Summary Table */}
      <Card>
        <div className="p-4 bg-primary/10 border-b">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            إجمالي مستحقات كل سائق
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-right p-4 font-semibold">#</th>
                <th className="text-right p-4 font-semibold">السائق</th>
                <th className="text-center p-4 font-semibold">عدد الرحلات</th>
                <th className="text-center p-4 font-semibold">الكمية</th>
                <th className="text-center p-4 font-semibold text-red-600">المستحق</th>
              </tr>
            </thead>
            <tbody>
              {driversData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted-foreground">
                    لا توجد بيانات لهذه الفترة
                  </td>
                </tr>
              ) : (
                <>
                  {driversData.map((item, index) => (
                    <tr key={item.driver_id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{index + 1}</td>
                      <td className="p-4 font-medium">{item.driver_name}</td>
                      <td className="p-4 text-center">{item.total_loads}</td>
                      <td className="p-4 text-center">{item.total_quantity.toLocaleString()}</td>
                      <td className="p-4 text-center font-bold text-red-600 text-lg">
                        {item.net_due.toLocaleString()} ر.س
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-primary text-primary-foreground font-bold">
                    <td className="p-4" colSpan={2}>الإجمالي</td>
                    <td className="p-4 text-center">{totalLoads}</td>
                    <td className="p-4 text-center">{totalQuantity.toLocaleString()}</td>
                    <td className="p-4 text-center text-lg">{totalNetDue.toLocaleString()} ر.س</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default DriverDailyDuesReport;
