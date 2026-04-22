import { Link } from "react-router-dom";
import { ArrowRight, Construction, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ZatcaPlaceholderProps {
  title: string;
  titleEn: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

/**
 * صفحة عامة لأقسام ZATCA قيد التطوير.
 * تعرض هيكل القسم وقائمة المتطلبات الجاهزة للتنفيذ لاحقاً.
 */
const ZatcaPlaceholder = ({
  title,
  titleEn,
  description,
  icon: Icon,
  features,
}: ZatcaPlaceholderProps) => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/zatca" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
              <p
                className="text-muted-foreground mt-0.5 text-xs sm:text-sm"
                dir="ltr"
              >
                {titleEn}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-dashed border-2">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Construction className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">قسم قيد التطوير</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              {description}
            </p>

            <div className="text-right max-w-2xl mx-auto bg-muted/30 rounded-lg p-5 mb-6">
              <h3 className="text-sm font-semibold mb-3 text-foreground">
                الميزات المخططة:
              </h3>
              <ul className="space-y-2">
                {features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-foreground/80"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link to="/zatca">
              <Button variant="outline">العودة للقائمة الرئيسية</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ZatcaPlaceholder;
