import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import CompanyLoadsReport from "@/components/reports/CompanyLoadsReport";
import DriverCommissionsReport from "@/components/reports/DriverCommissionsReport";

const DailyReports = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const { toast } = useToast();

  const handleGenerateReports = async () => {
    try {
      setIsGenerating(true);
      
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: orgData } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      const organizationId = orgData?.organization_id;

      // Generate company loads report
      const { error: companyError } = await supabase.rpc(
        "generate_company_loads_report",
        {
          p_report_date: selectedDate,
          p_organization_id: organizationId,
        }
      );

      if (companyError) throw companyError;

      // Generate driver commissions report
      const { error: driverError } = await supabase.rpc(
        "generate_driver_commissions_report",
        {
          p_report_date: selectedDate,
          p_organization_id: organizationId,
        }
      );

      if (driverError) throw driverError;

      setReportGenerated(true);
      toast({
        title: "تم إنشاء التقارير بنجاح",
        description: `تم إنشاء تقارير يوم ${format(new Date(selectedDate), "PPP", { locale: ar })}`,
      });
    } catch (error: any) {
      console.error("Error generating reports:", error);
      toast({
        title: "خطأ في إنشاء التقارير",
        description: error.message || "حدث خطأ أثناء إنشاء التقارير",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8" />
            التقارير اليومية
          </h1>
          <p className="text-muted-foreground mt-1">
            عرض تقارير الشركات والسائقين حسب التاريخ
          </p>
        </div>
      </div>

      {/* Date Filter Card */}
      <Card className="p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              اختر التاريخ
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setReportGenerated(false);
              }}
              className="max-w-xs"
            />
          </div>
          <Button
            onClick={handleGenerateReports}
            disabled={isGenerating}
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري إنشاء التقارير...
              </>
            ) : (
              "إنشاء التقارير"
            )}
          </Button>
        </div>
        {selectedDate && (
          <p className="text-sm text-muted-foreground mt-4">
            التاريخ المحدد: {format(new Date(selectedDate), "PPPP", { locale: ar })}
          </p>
        )}
      </Card>

      {/* Reports Display */}
      {reportGenerated && (
        <>
          <CompanyLoadsReport selectedDate={selectedDate} />
          <DriverCommissionsReport selectedDate={selectedDate} />
        </>
      )}

      {!reportGenerated && (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            لا توجد تقارير معروضة
          </h3>
          <p className="text-muted-foreground">
            اختر تاريخاً واضغط على "إنشاء التقارير" لعرض البيانات
          </p>
        </Card>
      )}
    </div>
  );
};

export default DailyReports;
