import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Users, Package } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const modules = [
    {
      title: "المحاسبة المالية",
      description: "إدارة الحسابات والتقارير المالية",
      icon: Calculator,
      color: "from-blue-500 to-blue-600",
      link: "/accounting",
      features: ["القيود اليومية", "دفتر الأستاذ", "الميزانية العمومية", "قائمة الدخل"]
    },
    {
      title: "الموارد البشرية",
      description: "إدارة الموظفين والرواتب",
      icon: Users,
      color: "from-green-500 to-green-600",
      link: "/hr",
      features: ["بيانات الموظفين", "الرواتب", "الحضور والانصراف", "الإجازات"]
    },
    {
      title: "إدارة الحمولات",
      description: "تتبع الشحنات والحمولات",
      icon: Package,
      color: "from-orange-500 to-orange-600",
      link: "/loads",
      features: ["تسجيل الحمولات", "تتبع الشحنات", "التقارير", "الفواتير"]
    }
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                نظام الإدارة المتكامل
              </h1>
              <p className="text-muted-foreground mt-1">
                إدارة شاملة لجميع عمليات المؤسسة
              </p>
            </div>
            <Link to="/fleet">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <span className="font-semibold">إدارة الأسطول</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((module) => (
            <Link key={module.title} to={module.link}>
              <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full border-2 hover:border-primary/50">
                <CardContent className="p-8">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <module.icon className="h-10 w-10 text-white" />
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {module.title}
                  </h2>
                  
                  <p className="text-muted-foreground mb-6">
                    {module.description}
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground mb-3">
                      الميزات الرئيسية:
                    </p>
                    <ul className="space-y-2">
                      {module.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                    <span className="text-sm text-primary font-semibold group-hover:gap-3 flex items-center gap-2 transition-all">
                      الدخول إلى النظام
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

export default Dashboard;
