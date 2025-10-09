import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Building2, LogIn, Sparkles } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyNameEn, setCompanyNameEn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('بيانات الدخول غير صحيحة');
      } else {
        toast.error('حدث خطأ أثناء تسجيل الدخول');
      }
    } else {
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/');
    }
  };

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName || !companyName) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create user account
      const { error: signUpError } = await signUp(email, password, fullName);
      
      if (signUpError) {
        toast.error('فشل إنشاء الحساب: ' + signUpError.message);
        setIsLoading(false);
        return;
      }

      // 2. Sign in to get session
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        toast.error('فشل تسجيل الدخول');
        setIsLoading(false);
        return;
      }

      // 3. Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        toast.error('فشل الحصول على بيانات المستخدم');
        setIsLoading(false);
        return;
      }

      // 4. Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ 
          name: companyName,
          name_en: companyNameEn || null
        })
        .select()
        .single();

      if (orgError) {
        toast.error('فشل إنشاء الشركة');
        console.error(orgError);
        setIsLoading(false);
        return;
      }

      // 5. Link user to organization
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: currentUser.id,
          organization_id: org.id
        });

      if (userOrgError) {
        toast.error('فشل ربط المستخدم بالشركة');
        console.error(userOrgError);
        setIsLoading(false);
        return;
      }

      // 6. Assign admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: currentUser.id,
          role: 'admin',
          organization_id: org.id
        });

      if (roleError) {
        toast.error('فشل إضافة صلاحيات المدير');
        console.error(roleError);
        setIsLoading(false);
        return;
      }

      toast.success('تم إنشاء الشركة والحساب بنجاح!');
      navigate('/');
      
    } catch (error) {
      console.error('Error during company registration:', error);
      toast.error('حدث خطأ أثناء التسجيل');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 mb-4 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
            نظام الإدارة المتكامل
          </h1>
          <p className="text-muted-foreground">
            إدارة شاملة لجميع عمليات المؤسسة
          </p>
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader>
            <CardTitle className="text-2xl text-center">مرحباً بك</CardTitle>
            <CardDescription className="text-center">
              سجل دخولك أو أنشئ شركة جديدة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  تسجيل الدخول
                </TabsTrigger>
                <TabsTrigger value="register" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  شركة جديدة
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">البريد الإلكتروني</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="admin@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="text-right"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">كلمة المرور</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      dir="ltr"
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                    <LogIn className="h-4 w-4" />
                    {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegisterCompany} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">اسم الشركة (عربي) *</Label>
                    <Input
                      id="company-name"
                      type="text"
                      placeholder="مؤسسة الأعمال المتطورة"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled={isLoading}
                      required
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-name-en">اسم الشركة (إنجليزي)</Label>
                    <Input
                      id="company-name-en"
                      type="text"
                      placeholder="Advanced Business Corp"
                      value={companyNameEn}
                      onChange={(e) => setCompanyNameEn(e.target.value)}
                      disabled={isLoading}
                      dir="ltr"
                    />
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold mb-3 text-muted-foreground">بيانات المدير الرئيسي</p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="register-name">الاسم الكامل *</Label>
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="أحمد محمد"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={isLoading}
                          required
                          className="text-right"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-email">البريد الإلكتروني *</Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="admin@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                          required
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password">كلمة المرور *</Label>
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                          required
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                    <Building2 className="h-4 w-4" />
                    {isLoading ? 'جاري التسجيل...' : 'إنشاء الشركة'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          جميع الحقوق محفوظة © 2025
        </p>
      </div>
    </div>
  );
};

export default Auth;
