import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Users, Package, Truck, LogOut, Sparkles, Wallet, FileText, DollarSign, TrendingUp, BarChart3, PieChart, Activity, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard } from "@/components/StatsCard";

const Dashboard = () => {
  const { signOut, user, userRole } = useAuth();
  const { hasPermission } = usePermissions();
  
  const allModules = [
    {
      title: "المحاسبة المالية",
      description: "إدارة الحسابات والتقارير المالية",
      icon: Calculator,
      color: "from-blue-500 to-blue-600",
      link: "/accounting",
      features: ["القيود اليومية", "دفتر الأستاذ", "الميزانية العمومية", "قائمة الدخل"],
      module: "accounting"
    },
    {
      title: "الموارد البشرية",
      description: "إدارة الموظفين والرواتب",
      icon: Users,
      color: "from-green-500 to-green-600",
      link: "/hr",
      features: ["بيانات الموظفين", "الرواتب", "الحضور والانصراف", "الإجازات"],
      module: "hr"
    },
    {
      title: "إدارة الأسطول",
      description: "إدارة المركبات والصيانة",
      icon: Truck,
      color: "from-purple-500 to-purple-600",
      link: "/fleet",
      features: ["بيانات المركبات", "الصيانة", "الكيلومترات", "قطع الغيار"],
      module: "fleet"
    },
    {
      title: "إدارة الحمولات",
      description: "تتبع الشحنات والحمولات",
      icon: Package,
      color: "from-orange-500 to-orange-600",
      link: "/loads",
      features: ["تسجيل الحمولات", "تتبع الشحنات", "التقارير", "الفواتير"],
      module: "loads"
    },
    {
      title: "إدارة العهد",
      description: "إدارة عهد المندوبين والسندات",
      icon: Wallet,
      color: "from-teal-500 to-teal-600",
      link: "/custody",
      features: ["المندوبين", "سندات التحويل", "العهد المستلمة", "القيود اليومية"],
      module: "custody"
    }
  ];

  // تصفية الأقسام حسب الصلاحيات
  const modules = allModules.filter(module => hasPermission(module.module, 'view'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            نظام الإدارة المتكامل
          </h1>
          <h2 className="text-3xl font-bold mb-2">اختر النظام المناسب</h2>
          <p className="text-muted-foreground">جميع الأنظمة متكاملة لإدارة أعمالك بكفاءة</p>
        </div>
        
        <Tabs defaultValue="modules" className="w-full" dir="rtl">
          <TabsList className="hidden">
            <TabsTrigger value="modules">الأنظمة</TabsTrigger>
            <TabsTrigger value="statistics">الإحصائيات</TabsTrigger>
          </TabsList>
          
          <TabsContent value="modules" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Admin Settings Card */}
              {userRole === 'admin' && (
                <Link to="/users">
                  <Card className="group relative overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 h-full border-2 hover:border-primary/50 bg-card/50 backdrop-blur-sm">
                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-red-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <CardContent className="p-8 relative">
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                          <Shield className="h-8 w-8 text-white" />
                        </div>
                        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          مسؤول
                        </div>
                      </div>
                      
                      <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                        إدارة المستخدمين والصلاحيات
                      </h2>
                      
                      <p className="text-muted-foreground mb-6 text-sm">
                        إضافة وتعديل المستخدمين وتحديد صلاحياتهم
                      </p>
                      
                      <div className="space-y-3 mb-6">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          الميزات الرئيسية
                        </p>
                        <ul className="space-y-2">
                          {["إضافة مستخدمين جدد", "تحديد الأدوار", "إدارة صلاحيات الأقسام", "حذف المستخدمين"].map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm group/item">
                              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 group-hover/item:scale-150 transition-transform"></div>
                              <span className="group-hover/item:translate-x-[-2px] transition-transform">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-primary font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                            الدخول الآن
                            <span className="group-hover:translate-x-[-4px] transition-transform text-lg">←</span>
                          </span>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {/* Existing Modules */}
              {modules.map((module, index) => (
                <Link key={module.title} to={module.link}>
                  <Card className="group relative overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 h-full border-2 hover:border-primary/50 bg-card/50 backdrop-blur-sm">
                    <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${module.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    
                    <CardContent className="p-8 relative">
                      <div className="flex items-start justify-between mb-6">
                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                          <module.icon className="h-8 w-8 text-white" />
                        </div>
                        <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${module.color} text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                          نشط
                        </div>
                      </div>
                      
                      <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {module.title}
                      </h2>
                      
                      <p className="text-muted-foreground mb-6 text-sm">
                        {module.description}
                      </p>
                      
                      <div className="space-y-3 mb-6">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          الميزات الرئيسية
                        </p>
                        <ul className="space-y-2">
                          {module.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm group/item">
                              <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${module.color} group-hover/item:scale-150 transition-transform`}></div>
                              <span className="group-hover/item:translate-x-[-2px] transition-transform">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-primary font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                            الدخول الآن
                            <span className="group-hover:translate-x-[-4px] transition-transform text-lg">←</span>
                          </span>
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

        <TabsContent value="statistics" dir="rtl">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold mb-2">إحصائيات شاملة للنظام</h2>
            <p className="text-muted-foreground">نظرة عامة على جميع الأنظمة</p>
          </div>

          <div className="space-y-8">
            {/* Accounting Statistics */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                إحصائيات المحاسبة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="إجمالي الإيرادات"
                  value="0"
                  icon={DollarSign}
                  description="إيرادات هذا الشهر"
                />
                <StatsCard
                  title="المصروفات"
                  value="0"
                  icon={TrendingUp}
                  description="مصروفات هذا الشهر"
                />
                <StatsCard
                  title="صافي الربح"
                  value="0"
                  icon={BarChart3}
                  description="الربح الصافي"
                />
                <StatsCard
                  title="عدد القيود"
                  value="0"
                  icon={FileText}
                  description="قيود يومية"
                />
              </div>
            </div>

            {/* HR Statistics */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                إحصائيات الموارد البشرية
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="إجمالي الموظفين"
                  value="0"
                  icon={Users}
                  description="موظفين نشطين"
                />
                <StatsCard
                  title="الرواتب الشهرية"
                  value="0"
                  icon={DollarSign}
                  description="إجمالي الرواتب"
                />
                <StatsCard
                  title="السلف"
                  value="0"
                  icon={TrendingUp}
                  description="سلف مستحقة"
                />
                <StatsCard
                  title="الإجازات"
                  value="0"
                  icon={Activity}
                  description="إجازات هذا الشهر"
                />
              </div>
            </div>

            {/* Fleet Statistics */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-600" />
                إحصائيات الأسطول
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="إجمالي المركبات"
                  value="0"
                  icon={Truck}
                  description="مركبات نشطة"
                />
                <StatsCard
                  title="قيد الصيانة"
                  value="0"
                  icon={Activity}
                  description="تحت الصيانة"
                />
                <StatsCard
                  title="تكلفة الصيانة"
                  value="0"
                  icon={DollarSign}
                  description="هذا الشهر"
                />
                <StatsCard
                  title="قطع الغيار"
                  value="0"
                  icon={Package}
                  description="مخزون متوفر"
                />
              </div>
            </div>

            {/* Loads Statistics */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                إحصائيات الحمولات
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="إجمالي الحمولات"
                  value="0"
                  icon={Package}
                  description="حمولات هذا الشهر"
                />
                <StatsCard
                  title="تحت التوصيل"
                  value="0"
                  icon={Truck}
                  description="قيد التوصيل"
                />
                <StatsCard
                  title="الإيرادات"
                  value="0"
                  icon={DollarSign}
                  description="من الحمولات"
                />
                <StatsCard
                  title="العملاء"
                  value="0"
                  icon={Users}
                  description="عملاء نشطين"
                />
              </div>
            </div>

            {/* Custody Statistics */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-teal-600" />
                إحصائيات العهد
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="المندوبين"
                  value="0"
                  icon={Users}
                  description="مندوبين نشطين"
                />
                <StatsCard
                  title="العهد المستلمة"
                  value="0"
                  icon={DollarSign}
                  description="إجمالي العهد"
                />
                <StatsCard
                  title="التحويلات"
                  value="0"
                  icon={TrendingUp}
                  description="هذا الشهر"
                />
                <StatsCard
                  title="المصروفات"
                  value="0"
                  icon={FileText}
                  description="مصروفات العهد"
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  </div>
);
};

export default Dashboard;
