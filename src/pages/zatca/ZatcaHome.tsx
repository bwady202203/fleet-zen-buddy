import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Settings2,
  KeyRound,
  ScrollText,
  BarChart3,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Languages,
  FileCode2,
} from "lucide-react";

const ZatcaHome = () => {
  const sections = [
    {
      title: "الفواتير المعتمدة",
      titleEn: "Approved e-Invoices",
      description: "إصدار وعرض الفواتير الضريبية والمبسطة المتوافقة",
      icon: FileCheck2,
      link: "/zatca/invoices",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "الإرسال للهيئة",
      titleEn: "Submit to ZATCA",
      description: "ربط مباشر مع منصة هيئة الزكاة (Clearance / Reporting)",
      icon: ShieldCheck,
      link: "/zatca/submission",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "محرك الامتثال",
      titleEn: "Compliance Engine",
      description: "التحقق من الحقول الإلزامية و UUID و XML قبل الإرسال",
      icon: CheckCircle2,
      link: "/zatca/compliance",
      color: "from-violet-500 to-violet-600",
    },
    {
      title: "صيغة XML / UBL 2.1",
      titleEn: "XML / UBL 2.1",
      description: "تحويل الفواتير لصيغة UBL 2.1 المعتمدة مع التوقيع الرقمي",
      icon: FileCode2,
      link: "/zatca/xml",
      color: "from-cyan-500 to-cyan-600",
    },
    {
      title: "الشهادات الرقمية",
      titleEn: "Digital Certificates",
      description: "إنشاء وإدارة شهادات التوقيع (CSID / PCSID)",
      icon: KeyRound,
      link: "/zatca/certificates",
      color: "from-amber-500 to-amber-600",
    },
    {
      title: "إعدادات الفوترة",
      titleEn: "ZATCA Settings",
      description: "بيانات المنشأة، الرقم الضريبي، العنوان، الشعار، التسلسل",
      icon: Settings2,
      link: "/zatca/settings",
      color: "from-slate-500 to-slate-600",
    },
    {
      title: "سجل التدقيق",
      titleEn: "Audit Log",
      description: "سجل كامل لجميع العمليات والإرسالات والاستجابات",
      icon: ScrollText,
      link: "/zatca/audit-log",
      color: "from-pink-500 to-pink-600",
    },
    {
      title: "التقارير الضريبية",
      titleEn: "Tax Reports",
      description: "تقارير VAT، الفواتير المقبولة والمرفوضة، تحليل الأداء",
      icon: BarChart3,
      link: "/zatca/reports",
      color: "from-orange-500 to-orange-600",
    },
    {
      title: "المساعد الذكي",
      titleEn: "AI Assistant",
      description: "اكتشاف الأخطاء واقتراح التصحيحات قبل الإرسال",
      icon: Sparkles,
      link: "/zatca/ai-assistant",
      color: "from-fuchsia-500 to-fuchsia-600",
    },
  ];

  const features = [
    { icon: Lock, label: "تشفير عالي المستوى" },
    { icon: ShieldCheck, label: "متوافق مع متطلبات الهيئة" },
    { icon: Languages, label: "دعم العربية والإنجليزية" },
    { icon: AlertTriangle, label: "تنبيهات فورية للأخطاء" },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero Header */}
      <header className="border-b bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                فواتير الزكاة المعتمدة
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base" dir="ltr">
                ZATCA E-Invoicing Integration
              </p>
            </div>
          </div>

          {/* Brief description */}
          <div className="max-w-4xl">
            <p className="text-base sm:text-lg leading-relaxed text-foreground/80">
              برنامج ذكي متكامل يعتمد على تقنيات الذكاء الاصطناعي لتمكين الشركات من
              إدارة الفواتير الإلكترونية وربطها تلقائياً مع نظام هيئة الزكاة والضريبة
              والجمارك وفق متطلبات الفوترة الإلكترونية (مرحلة الربط والتكامل).
            </p>
          </div>

          {/* Feature highlights strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {features.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-card border"
              >
                <f.icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Sections grid */}
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-1">أقسام النظام</h2>
          <p className="text-sm text-muted-foreground">
            اختر القسم المطلوب لإدارة الفوترة الإلكترونية المعتمدة
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sections.map((section) => (
            <Link key={section.title} to={section.link}>
              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full border-2 hover:border-primary/50">
                <CardHeader>
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-md`}
                  >
                    <section.icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {section.title}
                    <span
                      className="block text-xs font-normal text-muted-foreground mt-1"
                      dir="ltr"
                    >
                      {section.titleEn}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {section.description}
                  </p>
                  <div className="mt-4 pt-3 border-t">
                    <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                      فتح القسم
                      <span className="group-hover:translate-x-[-4px] transition-transform">
                        ←
                      </span>
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

export default ZatcaHome;
