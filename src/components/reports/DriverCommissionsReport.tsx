import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, TrendingUp, DollarSign, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface DriverReport {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  total_loads: number;
  total_commissions: number;
  total_amount: number;
}

interface DriverCommissionsReportProps {
  selectedDate: string;
}

const DriverCommissionsReport = ({ selectedDate }: DriverCommissionsReportProps) => {
  const [reports, setReports] = useState<DriverReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadReports();
  }, [selectedDate]);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: orgData } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      const { data: reportsData, error } = await supabase
        .from("driver_commissions_reports")
        .select(`
          id,
          driver_id,
          total_loads,
          total_commissions,
          total_amount,
          drivers (name, phone)
        `)
        .eq("report_date", selectedDate)
        .eq("organization_id", orgData?.organization_id);

      if (error) throw error;

      const formattedReports = (reportsData || []).map((report: any) => ({
        id: report.id,
        driver_id: report.driver_id,
        driver_name: report.drivers?.name || "غير معروف",
        driver_phone: report.drivers?.phone || "-",
        total_loads: report.total_loads,
        total_commissions: report.total_commissions,
        total_amount: report.total_amount,
      }));

      setReports(formattedReports);
    } catch (error: any) {
      console.error("Error loading reports:", error);
      toast({
        title: "خطأ في تحميل التقرير",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      
      const element = document.getElementById("driver-report-table");
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      pdf.save(`تقرير_السائقين_${selectedDate}.pdf`);

      toast({
        title: "تم التصدير بنجاح",
        description: "تم تصدير التقرير إلى ملف PDF",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير التقرير",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const totals = reports.reduce(
    (acc, report) => ({
      loads: acc.loads + report.total_loads,
      commissions: acc.commissions + report.total_commissions,
      amount: acc.amount + report.total_amount,
    }),
    { loads: 0, commissions: 0, amount: 0 }
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">جاري التحميل...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">تقرير السائقين والعمولات</h2>
        </div>
        <Button onClick={exportToPDF} disabled={isExporting || reports.length === 0}>
          <FileBarChart className="h-4 w-4 ml-2" />
          {isExporting ? "جاري التصدير..." : "تصدير PDF"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <FileBarChart className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الشحنات</p>
              <p className="text-2xl font-bold">{totals.loads.toLocaleString("ar-SA")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي العمولات</p>
              <p className="text-2xl font-bold">{totals.commissions.toLocaleString("ar-SA")} ر.س</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-green-500/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المبالغ</p>
              <p className="text-2xl font-bold">{totals.amount.toLocaleString("ar-SA")} ر.س</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <div id="driver-report-table" dir="rtl" style={{ backgroundColor: "white", padding: "20px" }}>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">تقرير السائقين والعمولات</h2>
          <p className="text-muted-foreground">التاريخ: {selectedDate}</p>
        </div>
        
        {reports.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">السائق</TableHead>
                <TableHead className="text-right">الجوال</TableHead>
                <TableHead className="text-right">عدد الشحنات</TableHead>
                <TableHead className="text-right">إجمالي العمولات</TableHead>
                <TableHead className="text-right">إجمالي المبالغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.driver_name}</TableCell>
                  <TableCell>{report.driver_phone}</TableCell>
                  <TableCell>{report.total_loads.toLocaleString("ar-SA")}</TableCell>
                  <TableCell>{report.total_commissions.toLocaleString("ar-SA")} ر.س</TableCell>
                  <TableCell>{report.total_amount.toLocaleString("ar-SA")} ر.س</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={2}>الإجمالي</TableCell>
                <TableCell>{totals.loads.toLocaleString("ar-SA")}</TableCell>
                <TableCell>{totals.commissions.toLocaleString("ar-SA")} ر.س</TableCell>
                <TableCell>{totals.amount.toLocaleString("ar-SA")} ر.س</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد بيانات لهذا التاريخ
          </div>
        )}
      </div>
    </Card>
  );
};

export default DriverCommissionsReport;
