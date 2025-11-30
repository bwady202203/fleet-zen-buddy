import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, PackagePlus, MapPin, FileText, Receipt, List, Truck, ClipboardList } from "lucide-react";
import DeliverySystemAuth from "@/components/DeliverySystemAuth";

const Loads = () => {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const sections = [
    {
      title: "تسجيل الحمولات",
      titleEn: "Loads Registration",
      description: "إضافة حمولات جديدة",
      descriptionEn: "Add New Loads",
      icon: PackagePlus,
      link: "/loads/register",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "سجل الشحنات",
      titleEn: "Loads List",
      description: "عرض وإدارة الشحنات",
      descriptionEn: "View and Manage Loads",
      icon: List,
      link: "/loads/list",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      title: "سجل الشحنات المطور",
      titleEn: "Advanced Loads List",
      description: "عرض متقدم مع فلاتر محسنة",
      descriptionEn: "Advanced View with Enhanced Filters",
      icon: ClipboardList,
      link: "/loads/advanced-list",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      title: "عرض الشحنات البسيط",
      titleEn: "Simple Loads View",
      description: "عرض بسيط بفلتر التاريخ والشركة",
      descriptionEn: "Simple View with Date and Company Filter",
      icon: List,
      link: "/loads/simple-list",
      color: "from-sky-500 to-sky-600"
    },
    {
      title: "السائقين",
      titleEn: "Drivers",
      description: "إدارة السائقين",
      descriptionEn: "Drivers Management",
      icon: MapPin,
      link: "/loads/drivers",
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "الشركات",
      titleEn: "Companies",
      description: "إدارة العملاء والشركات",
      descriptionEn: "Companies Management",
      icon: PackagePlus,
      link: "/loads/companies",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      title: "الفواتير",
      titleEn: "Invoices",
      description: "فواتير المبيعات",
      descriptionEn: "Sales Invoices",
      icon: Receipt,
      link: "/loads/invoices",
      color: "from-orange-500 to-orange-600"
    },
    {
      title: "سندات القبض",
      titleEn: "Receipts",
      description: "إدارة المقبوضات",
      descriptionEn: "Payment Receipts",
      icon: FileText,
      link: "/loads/receipts",
      color: "from-teal-500 to-teal-600"
    },
    {
      title: "الموردين",
      titleEn: "Suppliers",
      description: "إدارة الموردين",
      descriptionEn: "Suppliers Management",
      icon: Truck,
      link: "/loads/suppliers",
      color: "from-pink-500 to-pink-600"
    },
    {
      title: "التقارير",
      titleEn: "Reports",
      description: "تقارير السائقين والعمولات",
      descriptionEn: "Drivers and Commissions Reports",
      icon: FileText,
      link: "/loads/reports",
      color: "from-green-500 to-green-600"
    },
    {
      title: "سندات التسليم",
      titleEn: "Delivery Receipts",
      description: "إدارة سندات التسليم والاستلام",
      descriptionEn: "Manage Delivery Receipts",
      icon: ClipboardList,
      link: "#",
      color: "from-amber-500 to-amber-600",
      onClick: true
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
              <h1 className="text-3xl font-bold">إدارة الحمولات / Loads Management</h1>
              <p className="text-muted-foreground mt-1">
                تتبع وإدارة الشحنات والحمولات / Track and Manage Loads
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sections.map((section) => {
            if (section.onClick) {
              return (
                <div key={section.title} onClick={() => setAuthDialogOpen(true)} className="cursor-pointer">
                  <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full border-2 hover:border-primary/50">
                    <CardHeader>
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <section.icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {section.title}
                        <span className="block text-sm font-normal text-muted-foreground mt-1" dir="ltr">{section.titleEn}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{section.description}</p>
                      <p className="text-sm text-muted-foreground/80 mt-1" dir="ltr">{section.descriptionEn}</p>
                      <div className="mt-4 pt-4 border-t">
                        <span className="text-sm text-primary font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
                          فتح / Open
                          <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            }

            return (
              <Link key={section.title} to={section.link}>
                <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full border-2 hover:border-primary/50">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <section.icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {section.title}
                      <span className="block text-sm font-normal text-muted-foreground mt-1" dir="ltr">{section.titleEn}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{section.description}</p>
                    <p className="text-sm text-muted-foreground/80 mt-1" dir="ltr">{section.descriptionEn}</p>
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-sm text-primary font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
                        فتح / Open
                        <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>

      <DeliverySystemAuth open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
};

export default Loads;
