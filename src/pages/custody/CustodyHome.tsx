import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, List, Filter, BookOpen, ArrowRight, Banknote, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const CustodyHome = () => {
  const sections = [
    {
      title: "المندوبين",
      description: "عرض وإدارة المندوبين وعهدهم",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      link: "/custody/representatives"
    },
    {
      title: "سند تحويل عهدة",
      description: "إنشاء سند تحويل عهدة جديد",
      icon: FileText,
      color: "from-green-500 to-green-600",
      link: "/custody/transfers"
    },
    {
      title: "المصروفات",
      description: "تسجيل وإدارة مصروفات المندوبين",
      icon: Banknote,
      color: "from-red-500 to-red-600",
      link: "/custody/expenses"
    },
    {
      title: "العهد المستلمة",
      description: "عرض وإدارة سجل العهد المستلمة",
      icon: List,
      color: "from-purple-500 to-purple-600",
      link: "/custody/records"
    },
    {
      title: "تصفية العهد",
      description: "البحث والتصفية في سجل العهد",
      icon: Filter,
      color: "from-orange-500 to-orange-600",
      link: "/custody/filter"
    },
    {
      title: "قيود اليومية",
      description: "عرض القيود المحاسبية للعهد",
      icon: BookOpen,
      color: "from-teal-500 to-teal-600",
      link: "/custody/journal"
    },
    {
      title: "قيود ذكية",
      description: "إنشاء قيود محاسبية بطريقة ذكية وسريعة",
      icon: Sparkles,
      color: "from-violet-500 to-violet-600",
      link: "/custody/smart-journal"
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                نظام إدارة العهد
              </h1>
              <p className="text-muted-foreground mt-1">
                إدارة شاملة لعهد المندوبين والسندات
              </p>
            </div>
            <Link to="/">
              <Button variant="outline">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Link key={section.title} to={section.link}>
              <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full border-2 hover:border-primary/50">
                <CardContent className="p-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <section.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {section.title}
                  </h2>
                  
                  <p className="text-muted-foreground text-sm">
                    {section.description}
                  </p>
                  
                  <div className="mt-4 pt-3 border-t">
                    <span className="text-sm text-primary font-semibold group-hover:gap-3 flex items-center gap-2 transition-all">
                      الدخول
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

export default CustodyHome;