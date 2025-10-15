import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface DeliverySystemAuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeliverySystemAuth({ open, onOpenChange }: DeliverySystemAuthProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error("الرجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);
    try {
      // Verify credentials using Supabase function
      const { data, error } = await supabase.rpc("verify_delivery_system_user", {
        p_username: username,
        p_password: password,
      });

      if (error) throw error;

      if (data) {
        toast.success("تم تسجيل الدخول بنجاح");
        onOpenChange(false);
        navigate("/loads/delivery-receipts");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">تسجيل الدخول - نظام سندات التسليم</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-right block mb-2">
              اسم المستخدم
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-right block mb-2">
              كلمة المرور
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              إلغاء
            </Button>
            <Button onClick={handleLogin} disabled={loading}>
              {loading ? "جاري التحقق..." : "تسجيل الدخول"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}