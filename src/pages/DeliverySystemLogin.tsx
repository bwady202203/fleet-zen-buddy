import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, Lock, User } from "lucide-react";

export default function DeliverySystemLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("الرجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("verify_delivery_system_user", {
        p_username: username,
        p_password: password,
      });

      if (error) throw error;

      if (data) {
        // Store delivery system login flag
        sessionStorage.setItem("delivery_system_mode", "true");
        sessionStorage.setItem("delivery_system_user", username);
        
        toast.success("تم تسجيل الدخول بنجاح");
        navigate("/ds/home");
      } else {
        toast.error("اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    } catch (error: any) {
      toast.error("خطأ في تسجيل الدخول: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-2">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center shadow-lg">
              <ClipboardList className="h-10 w-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                نظام سندات التسليم
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                Delivery Receipt System
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-right flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  اسم المستخدم
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="h-12 text-lg"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-right flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4" />
                  كلمة المرور
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="h-12 text-lg"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري التحقق...
                  </span>
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>
            </form>
            
            <div className="mt-8 pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground">
                نظام إدارة سندات التسليم والاستلام
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Powered by Remal Industrial Company
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}