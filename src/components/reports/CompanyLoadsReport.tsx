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
import { Building2, Package, DollarSign, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface CompanyReport {
  id: string;
  company_id: string;
  company_name: string;
  total_loads: number;
  total_quantity: number;
  total_amount: number;
}

interface CompanyLoadsReportProps {
  selectedDate: string;
}

const CompanyLoadsReport = ({ selectedDate }: CompanyLoadsReportProps) => {
  const [reports, setReports] = useState<CompanyReport[]>([]);
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
        .from("company_loads_reports")
        .select(`
          id,
          company_id,
          total_loads,
          total_quantity,
          total_amount,
          companies (name)
        `)
        .eq("report_date", selectedDate)
        .eq("organization_id", orgData?.organization_id);

      if (error) throw error;

      const formattedReports = (reportsData || []).map((report: any) => ({
        id: report.id,
        company_id: report.company_id,
        company_name: report.companies?.name || "غير معروف",
        total_loads: report.total_loads,
        total_quantity: report.total_quantity,
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
      
      const element = document.getElementById("company-report-table");
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
      pdf.save(`تقرير_الشركات_${selectedDate}.pdf`);

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
      quantity: acc.quantity + report.total_quantity,
      amount: acc.amount + report.total_amount,
    }),
    { loads: 0, quantity: 0, amount: 0 }
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
          <Building2 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">تقرير الشركات</h2>
        </div>
        <Button onClick={exportToPDF} disabled={isExporting || reports.length === 0}>
          <FileBarChart className="h-4 w-4 ml-2" />
          {isExporting ? "جاري التصدير..." : "تصدير PDF"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileBarChart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الشحنات</p>
              <p className="text-2xl font-bold">{totals.loads.toLocaleString("ar-SA")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الكميات</p>
              <p className="text-2xl font-bold">{totals.quantity.toLocaleString("ar-SA")}</p>
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
      <div id="company-report-table" dir="rtl" style={{ backgroundColor: "white", padding: "20px" }}>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">تقرير الشركات</h2>
          <p className="text-muted-foreground">التاريخ: {selectedDate}</p>
        </div>
        
        {reports.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الشركة</TableHead>
                <TableHead className="text-right">عدد الشحنات</TableHead>
                <TableHead className="text-right">إجمالي الكميات</TableHead>
                <TableHead className="text-right">إجمالي المبالغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.company_name}</TableCell>
                  <TableCell>{report.total_loads.toLocaleString("ar-SA")}</TableCell>
                  <TableCell>{report.total_quantity.toLocaleString("ar-SA")}</TableCell>
                  <TableCell>{report.total_amount.toLocaleString("ar-SA")} ر.س</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>الإجمالي</TableCell>
                <TableCell>{totals.loads.toLocaleString("ar-SA")}</TableCell>
                <TableCell>{totals.quantity.toLocaleString("ar-SA")}</TableCell>
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

export default CompanyLoadsReport;
