import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { KeyRound, Calculator, Loader2 } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // 1) Error returned in hash (e.g. expired link)
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const queryParams = searchParams;
        const hashError = hashParams.get('error_description') || hashParams.get('error');
        if (hashError) {
          setErrorMsg(decodeURIComponent(hashError));
          setChecking(false);
          return;
        }

        // 2) New-style link with token_hash in query string
        const tokenHash = queryParams.get('token_hash') || hashParams.get('token_hash');
        const type = queryParams.get('type') || hashParams.get('type');
        if (tokenHash && type === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
          if (error) {
            setErrorMsg(error.message);
            setChecking(false);
            return;
          }
          if (mounted) {
            setIsValidSession(true);
            setChecking(false);
          }
          return;
        }

        // 3) Old-style link: access_token in hash → supabase-js sets session automatically
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (mounted) {
            setIsValidSession(true);
            setChecking(false);
          }
          return;
        }

        // 4) Wait for PASSWORD_RECOVERY event
        const timeout = setTimeout(() => {
          if (mounted) setChecking(false);
        }, 1500);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
          if (event === 'PASSWORD_RECOVERY' || sess) {
            if (mounted) {
              setIsValidSession(true);
              setChecking(false);
              clearTimeout(timeout);
            }
          }
        });

        return () => {
          subscription.unsubscribe();
          clearTimeout(timeout);
        };
      } catch (e: any) {
        setErrorMsg(e?.message ?? 'حدث خطأ غير متوقع');
        setChecking(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      const msg = error.message?.toLowerCase() ?? '';
      if (msg.includes('different from the old')) {
        toast.error('كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة');
      } else if (msg.includes('weak') || msg.includes('password')) {
        toast.error('كلمة المرور ضعيفة، استخدم كلمة أقوى');
      } else if (msg.includes('session') || msg.includes('jwt')) {
        toast.error('انتهت صلاحية الجلسة، اطلب رابط إعادة تعيين جديد');
      } else {
        toast.error('حدث خطأ أثناء تحديث كلمة المرور: ' + error.message);
      }
      console.error(error);
    } else {
      toast.success('تم تحديث كلمة المرور بنجاح');
      await supabase.auth.signOut();
      navigate('/auth');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-8 text-center flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">جاري التحقق من رابط إعادة التعيين...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-foreground text-lg font-semibold">رابط إعادة التعيين غير صالح أو منتهي الصلاحية</p>
            {errorMsg && <p className="text-sm text-muted-foreground">{errorMsg}</p>}
            <p className="text-sm text-muted-foreground">
              قد يكون السبب: تم استخدام الرابط من قبل، أو انتهت صلاحيته (الروابط صالحة لساعة واحدة فقط)، أو تم فتحه في متصفح مختلف.
            </p>
            <Button className="mt-2" onClick={() => navigate('/auth')}>العودة لتسجيل الدخول وطلب رابط جديد</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 mb-6 shadow-2xl">
            <Calculator className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">إعادة تعيين كلمة المرور</h1>
        </div>

        <Card className="shadow-2xl border-2 backdrop-blur-sm bg-card/95">
          <CardHeader>
            <CardTitle className="text-2xl text-center">كلمة مرور جديدة</CardTitle>
            <CardDescription className="text-center">أدخل كلمة المرور الجديدة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-base">كلمة المرور الجديدة</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-base">تأكيد كلمة المرور</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11"
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full h-11 gap-2 text-base font-semibold" disabled={isLoading}>
                <KeyRound className="h-5 w-5" />
                {isLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
