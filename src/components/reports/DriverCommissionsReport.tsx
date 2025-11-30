import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, DollarSign, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface DriverCommissionsReportProps {
  startDate: string;
  endDate: string;
}

interface DriverData {
  driver_id: string;
  driver_name: string;
  total_loads: number;
  total_commissions: number;
  total_amount: number;
}

interface DailyData {
  report_date: string;
  driver_name: string;
  total_loads: number;
  total_commissions: number;
  total_amount: number;
}

const DriverCommissionsReport = ({ startDate, endDate }: DriverCommissionsReportProps) => {
  const [loading, setLoading] = useState(true);
  const [aggregatedData, setAggregatedData] = useState<DriverData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      const { data: reportData, error } = await supabase
        .from("driver_commissions_reports")
        .select(`
          *,
          drivers (
            name
          )
        `)
        .gte("report_date", startDate)
        .lte("report_date", endDate)
        .order("report_date", { ascending: true });

      if (error) throw error;

      // Process daily data
      const daily = reportData?.map(item => ({
        report_date: item.report_date,
        driver_name: item.drivers?.name || "غير محدد",
        total_loads: item.total_loads || 0,
        total_commissions: item.total_commissions || 0,
        total_amount: item.total_amount || 0,
      })) || [];

      // Aggregate data by driver
      const driverMap = new Map<string, DriverData>();
      
      reportData?.forEach(item => {
        const driverId = item.driver_id || "";
        const driverName = item.drivers?.name || "غير محدد";
        
        if (driverMap.has(driverId)) {
          const existing = driverMap.get(driverId)!;
          existing.total_loads += item.total_loads || 0;
          existing.total_commissions += item.total_commissions || 0;
          existing.total_amount += item.total_amount || 0;
        } else {
          driverMap.set(driverId, {
            driver_id: driverId,
            driver_name: driverName,
            total_loads: item.total_loads || 0,
            total_commissions: item.total_commissions || 0,
            total_amount: item.total_amount || 0,
          });
        }
      });

      const aggregated = Array.from(driverMap.values()).sort((a, b) => b.total_commissions - a.total_commissions);
      
      setAggregatedData(aggregated);
      setDailyData(daily);
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

  const totalLoads = aggregatedData.reduce((sum, item) => sum + item.total_loads, 0);
  const totalCommissions = aggregatedData.reduce((sum, item) => sum + item.total_commissions, 0);
  const totalAmount = aggregatedData.reduce((sum, item) => sum + item.total_amount, 0);

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      const aggregatedContainer = document.createElement("div");
      aggregatedContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        background: white;
        padding: 40px;
        direction: rtl;
        font-family: Arial, sans-serif;
      `;

      aggregatedContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; font-size: 28px; margin-bottom: 10px;">تقرير إجمالي عمولات السائقين</h1>
          <p style="color: #666; font-size: 16px;">من ${format(new Date(startDate), "dd/MM/yyyy")} إلى ${format(new Date(endDate), "dd/MM/yyyy")}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; text-align: center; color: white;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 8px;">${totalLoads}</div>
            <div style="font-size: 14px; opacity: 0.9;">إجمالي الرحلات</div>
          </div>
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; text-align: center; color: white;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 8px;">${totalCommissions.toLocaleString()} ر.س</div>
            <div style="font-size: 14px; opacity: 0.9;">إجمالي العمولات</div>
          </div>
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; text-align: center; color: white;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 8px;">${totalAmount.toLocaleString()} ر.س</div>
            <div style="font-size: 14px; opacity: 0.9;">إجمالي المبلغ</div>
          </div>
        </div>

        <h2 style="color: #1a1a1a; font-size: 20px; margin: 30px 0 15px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">الإجماليات التراكمية</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6; font-weight: bold;">السائق</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6; font-weight: bold;">عدد الرحلات</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6; font-weight: bold;">العمولات</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6; font-weight: bold;">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${aggregatedData.map((item, index) => `
              <tr style="background: ${index % 2 === 0 ? "#ffffff" : "#f8f9fa"};">
                <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">${item.driver_name}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">${item.total_loads}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">${item.total_commissions.toLocaleString()} ر.س</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">${item.total_amount.toLocaleString()} ر.س</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <h2 style="color: #1a1a1a; font-size: 20px; margin: 30px 0 15px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">التفاصيل اليومية</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6; font-weight: bold;">التاريخ</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6; font-weight: bold;">السائق</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6; font-weight: bold;">الرحلات</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6; font-weight: bold;">العمولات</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6; font-weight: bold;">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${dailyData.map((item, index) => `
              <tr style="background: ${index % 2 === 0 ? "#ffffff" : "#f8f9fa"};">
                <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">${format(new Date(item.report_date), "dd/MM/yyyy")}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">${item.driver_name}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">${item.total_loads}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">${item.total_commissions.toLocaleString()} ر.س</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">${item.total_amount.toLocaleString()} ر.س</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;

      document.body.appendChild(aggregatedContainer);

      const canvas = await html2canvas(aggregatedContainer, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(aggregatedContainer);

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

      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `تم الإنشاء في: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      const fileName = `تقرير_السائقين_${format(new Date(startDate), "yyyy-MM-dd")}_${format(new Date(endDate), "yyyy-MM-dd")}.pdf`;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            تقرير السائقين
          </h2>
          <p className="text-muted-foreground mt-1">
            من {format(new Date(startDate), "PPP", { locale: ar })} إلى {format(new Date(endDate), "PPP", { locale: ar })}
          </p>
        </div>
        <Button onClick={exportToPDF} size="lg" className="gap-2">
          <FileDown className="h-4 w-4" />
          تصدير PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الرحلات</p>
              <p className="text-2xl font-bold">{totalLoads}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي العمولات</p>
              <p className="text-2xl font-bold">{totalCommissions.toLocaleString()} ر.س</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
              <p className="text-2xl font-bold">{totalAmount.toLocaleString()} ر.س</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Aggregated Data Table */}
      <Card>
        <div className="p-4 bg-muted/50 border-b">
          <h3 className="font-semibold text-lg">الإجماليات التراكمية</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-right p-4 font-semibold">السائق</th>
                <th className="text-center p-4 font-semibold">عدد الرحلات</th>
                <th className="text-center p-4 font-semibold">إجمالي العمولات</th>
                <th className="text-center p-4 font-semibold">إجمالي المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-muted-foreground">
                    لا توجد بيانات لهذه الفترة
                  </td>
                </tr>
              ) : (
                aggregatedData.map((item, index) => (
                  <tr
                    key={item.driver_id}
                    className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                  >
                    <td className="p-4 text-right font-medium">
                      {item.driver_name}
                    </td>
                    <td className="p-4 text-center">{item.total_loads}</td>
                    <td className="p-4 text-center font-semibold text-primary">
                      {item.total_commissions.toLocaleString()} ر.س
                    </td>
                    <td className="p-4 text-center">
                      {item.total_amount.toLocaleString()} ر.س
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Daily Details Table */}
      <Card>
        <div className="p-4 bg-muted/50 border-b">
          <h3 className="font-semibold text-lg">التفاصيل اليومية</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-right p-4 font-semibold">التاريخ</th>
                <th className="text-right p-4 font-semibold">السائق</th>
                <th className="text-center p-4 font-semibold">الرحلات</th>
                <th className="text-center p-4 font-semibold">العمولات</th>
                <th className="text-center p-4 font-semibold">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted-foreground">
                    لا توجد بيانات لهذه الفترة
                  </td>
                </tr>
              ) : (
                dailyData.map((item, index) => (
                  <tr
                    key={`${item.report_date}-${item.driver_name}`}
                    className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                  >
                    <td className="p-4 text-right">
                      {format(new Date(item.report_date), "dd/MM/yyyy")}
                    </td>
                    <td className="p-4 text-right font-medium">
                      {item.driver_name}
                    </td>
                    <td className="p-4 text-center">{item.total_loads}</td>
                    <td className="p-4 text-center font-semibold text-primary">
                      {item.total_commissions.toLocaleString()} ر.س
                    </td>
                    <td className="p-4 text-center">
                      {item.total_amount.toLocaleString()} ر.س
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default DriverCommissionsReport;
