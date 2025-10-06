import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, FileText, BarChart3, DollarSign, Receipt, Wallet } from "lucide-react";

const Accounting = () => {
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
    }
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
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
