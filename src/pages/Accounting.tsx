import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, FileText, BarChart3, DollarSign, Receipt, Wallet, ShoppingCart, Package, RotateCcw, Target, FolderKanban, FileBarChart, Download } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const Accounting = () => {
  const { userRole } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      toast({
        title: "جاري تصدير البيانات...",
        description: "قد تستغرق هذه العملية بضع دقائق",
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("غير مصرح");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-system-data`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "فشل تصدير البيانات");
      }

      const systemData = await response.json();
      
      const blob = new Blob([JSON.stringify(systemData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `system-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${systemData.summary?.total_records || 0} سجل من ${systemData.summary?.total_tables || 0} جدول`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "خطأ في التصدير",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const sections = [
    {
      title: "شجرة الحسابات",
      description: "إدارة الدليل المحاسبي - 4 مستويات",
      icon: BookOpen,
      link: "/accounting/chart-of-accounts",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      title: "القيود اليومية",
      description: "تسجيل وعرض القيود اليومية",
      icon: FileText,
      link: "/accounting/journal-entries",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "تقارير القيود اليومية",
      description: "تقارير تفصيلية مع فلاتر متقدمة",
      icon: FileBarChart,
      link: "/accounting/journal-entries-reports",
      color: "from-slate-500 to-slate-600"
    },
    {
      title: "دفتر الأستاذ",
      description: "عرض دفتر الأستاذ لأي حساب",
      icon: BarChart3,
      link: "/accounting/ledger",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      title: "ميزان المراجعة",
      description: "عرض ميزان المراجعة",
      icon: DollarSign,
      link: "/accounting/trial-balance",
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "الميزانية العمومية",
      description: "عرض الميزانية العمومية",
      icon: DollarSign,
      link: "/accounting/balance-sheet",
      color: "from-green-500 to-green-600"
    },
    {
      title: "قائمة الدخل",
      description: "عرض قائمة الدخل",
      icon: Receipt,
      link: "/accounting/income-statement",
      color: "from-teal-500 to-teal-600"
    },
    {
      title: "السندات والعهد",
      description: "سندات القبض والصرف وإدارة العهد",
      icon: Wallet,
      link: "/accounting/vouchers",
      color: "from-orange-500 to-orange-600"
    },
    {
      title: "فواتير المبيعات",
      description: "إدارة فواتير المبيعات",
      icon: ShoppingCart,
      link: "/accounting/sales-invoice",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      title: "فواتير المشتريات",
      description: "إدارة فواتير المشتريات",
      icon: Package,
      link: "/accounting/purchase-invoice",
      color: "from-amber-500 to-amber-600"
    },
    {
      title: "مرتجعات المبيعات",
      description: "إدارة مرتجعات المبيعات",
      icon: RotateCcw,
      link: "/accounting/sales-return",
      color: "from-rose-500 to-rose-600"
    },
    {
      title: "مرتجعات المشتريات",
      description: "إدارة مرتجعات المشتريات",
      icon: RotateCcw,
      link: "/accounting/purchase-return",
      color: "from-pink-500 to-pink-600"
    },
    {
      title: "مراكز التكلفة",
      description: "إدارة مراكز التكلفة",
      icon: Target,
      link: "/accounting/cost-centers",
      color: "from-violet-500 to-violet-600"
    },
    {
      title: "الفروع",
      description: "إدارة الفروع",
      icon: Target,
      link: "/accounting/branches",
      color: "from-sky-500 to-sky-600"
    },
    {
      title: "المشاريع",
      description: "إدارة المشاريع",
      icon: FolderKanban,
      link: "/accounting/projects",
      color: "from-fuchsia-500 to-fuchsia-600"
    }
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">المحاسبة المالية</h1>
                <p className="text-muted-foreground mt-1">
                  إدارة شاملة للعمليات المحاسبية والتقارير المالية
                </p>
              </div>
            </div>
            {userRole === 'admin' && (
              <Button
                onClick={handleExportData}
                disabled={isExporting}
                variant="outline"
                className="gap-2"
              >
                <Download className={cn("h-4 w-4", isExporting && "animate-bounce")} />
                {isExporting ? "جاري التصدير..." : "تصدير البيانات"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Link key={section.title} to={section.link}>
              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full border-2 hover:border-primary/50">
                <CardHeader>
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <section.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{section.description}</p>
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm text-primary font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
                      فتح
                      <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Accounting;
