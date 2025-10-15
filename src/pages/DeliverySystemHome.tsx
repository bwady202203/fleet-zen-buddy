import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, FileText, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function DeliverySystemHome() {
  const navigate = useNavigate();

  useEffect(() => {
    const isDeliveryMode = sessionStorage.getItem("delivery_system_mode");
    if (!isDeliveryMode) {
      navigate("/ds");
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("delivery_system_mode");
    sessionStorage.removeItem("delivery_system_user");
    toast.success("تم تسجيل الخروج بنجاح");
    navigate("/ds");
  };

  const username = sessionStorage.getItem("delivery_system_user");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5" dir="rtl">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">نظام سندات التسليم</h1>
              <p className="text-sm text-muted-foreground">Delivery Receipt System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">المستخدم</p>
              <p className="font-semibold">{username}</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card 
            className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 hover:border-primary/50"
            onClick={() => navigate("/loads/delivery-receipts")}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                تسجيل سند جديد
              </CardTitle>
              <CardDescription className="text-base">
                New Receipt Entry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                إضافة وتسجيل سند تسليم جديد مع جميع البيانات المطلوبة
              </p>
              <p className="text-sm text-muted-foreground/80 mt-2">
                Create and register a new delivery receipt
              </p>
              <div className="mt-4 pt-4 border-t">
                <span className="text-sm text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  فتح / Open
                  <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
                </span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 hover:border-primary/50"
            onClick={() => navigate("/loads/delivery-receipts")}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                عرض السندات
              </CardTitle>
              <CardDescription className="text-base">
                View Receipts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                عرض وطباعة جميع سندات التسليم المسجلة في النظام
              </p>
              <p className="text-sm text-muted-foreground/80 mt-2">
                View and print all registered delivery receipts
              </p>
              <div className="mt-4 pt-4 border-t">
                <span className="text-sm text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  فتح / Open
                  <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}