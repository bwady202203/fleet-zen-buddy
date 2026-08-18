import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Shield, Building2, Lock, Settings, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const SETTINGS_CODE = "363636";

const items = [
  {
    title: "المستوى المميز",
    description: "أدوات القيود الذكية والبنوك المحمية",
    icon: Crown,
    color: "from-amber-500 to-yellow-600",
    link: "/accounting?premium=1",
  },
  {
    title: "إدارة المستخدمين والصلاحيات",
    description: "إضافة المستخدمين وتحديد الأدوار والصلاحيات",
    icon: Shield,
    color: "from-red-500 to-red-600",
    link: "/users",
  },
  {
    title: "إدارة المنشآت",
    description: "بيانات المنشآت والمؤسسات",
    icon: Building2,
    color: "from-blue-500 to-blue-600",
    link: "/organizations",
  },
];

export default function SettingsHub() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");

  const tryUnlock = () => {
    if (code === SETTINGS_CODE) {
      setUnlocked(true);
      toast.success("تم فتح الإعدادات");
    } else {
      toast.error("كلمة المرور غير صحيحة");
      setCode("");
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-sm border-2">
          <CardContent className="p-8 space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">الإعدادات محمية</h1>
            <p className="text-sm text-muted-foreground">أدخل كلمة المرور للدخول</p>
            <Input
              type="password"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
              placeholder="******"
              className="text-center tracking-[0.5em] text-lg"
              autoFocus
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={tryUnlock}>دخول</Button>
              <Button variant="outline" onClick={() => navigate(-1)}>رجوع</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6" dir="rtl">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Settings className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">الإعدادات</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/")}>
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.title} onClick={() => navigate(item.link)} className="text-right">
                <Card className="group h-full border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6 space-y-3">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h2 className="text-lg font-bold group-hover:text-primary transition-colors">{item.title}</h2>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
