import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Landmark, Banknote, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Vouchers = () => {
  const sections = [
    {
      title: "سند صرف - بنك الرياض",
      description: "سندات الصرف من بنك الرياض مع قيد تلقائي",
      icon: Building2,
      color: "from-blue-700 to-sky-600",
      link: "/accounting/bank-payment-voucher?bank=riyadh",
    },
    {
      title: "سند صرف - بنك الراجحي",
      description: "سندات الصرف من بنك الراجحي مع قيد تلقائي",
      icon: Landmark,
      color: "from-emerald-700 to-green-600",
      link: "/accounting/bank-payment-voucher?bank=rajhi",
    },
    {
      title: "مصروفات العهد",
      description: "تسجيل وإدارة مصروفات المندوبين",
      icon: Banknote,
      color: "from-red-500 to-red-600",
      link: "/custody/expenses",
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                إدارة السندات
              </h1>
              <p className="text-muted-foreground mt-1">سندات الصرف البنكية ومصروفات العهد</p>
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

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((s) => (
            <Link key={s.title} to={s.link}>
              <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 h-full border-2 hover:border-primary/50">
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <s.icon className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{s.title}</h2>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Vouchers;
