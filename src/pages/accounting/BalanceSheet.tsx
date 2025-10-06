import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Printer } from "lucide-react";
import { useAccounting } from "@/contexts/AccountingContext";

const BalanceSheet = () => {
  const { accounts } = useAccounting();

  // حساب الأرصدة
  const getAccountsByType = (type: string) => {
    return accounts.filter(acc => acc.type === type && acc.level >= 2);
  };

  const calculateTotal = (accountsList: any[]) => {
    return accountsList.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
  };

  const assets = getAccountsByType('asset');
  const liabilities = getAccountsByType('liability');
  const equity = getAccountsByType('equity');

  const totalAssets = calculateTotal(assets);
  const totalLiabilities = calculateTotal(liabilities);
  const totalEquity = calculateTotal(equity);

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card print:hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/accounting" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">الميزانية العمومية</h1>
                <p className="text-muted-foreground mt-1">
                  عرض تفصيلي للأصول والخصوم وحقوق الملكية
                </p>
              </div>
            </div>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-5 w-5" />
              طباعة
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* رأس التقرير */}
          <div className="text-center space-y-2 print:mb-8">
            <h2 className="text-4xl font-bold text-primary">الميزانية العمومية</h2>
            <p className="text-lg text-muted-foreground">كما في {currentDate}</p>
            <div className="h-1 w-32 bg-gradient-to-r from-primary to-primary/50 mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* الأصول */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <CardTitle className="text-2xl">الأصول</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {assets.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">لا توجد حسابات أصول</p>
                ) : (
                  <>
                    {assets.map(account => (
                      <div key={account.id} className="flex justify-between items-center py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">{account.code}</p>
                        </div>
                        <p className="font-semibold text-lg">
                          {Math.abs(account.balance).toLocaleString('ar-SA')} ر.س
                        </p>
                      </div>
                    ))}
                    <div className="pt-4 border-t-2 border-primary/20">
                      <div className="flex justify-between items-center">
                        <p className="text-xl font-bold">إجمالي الأصول</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {totalAssets.toLocaleString('ar-SA')} ر.س
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* الخصوم وحقوق الملكية */}
            <div className="space-y-8">
              {/* الخصوم */}
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-rose-500 to-rose-600 text-white">
                  <CardTitle className="text-2xl">الخصوم</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {liabilities.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">لا توجد خصوم</p>
                  ) : (
                    <>
                      {liabilities.map(account => (
                        <div key={account.id} className="flex justify-between items-center py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-sm text-muted-foreground">{account.code}</p>
                          </div>
                          <p className="font-semibold">
                            {Math.abs(account.balance).toLocaleString('ar-SA')} ر.س
                          </p>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-primary/20">
                        <div className="flex justify-between items-center">
                          <p className="font-bold">إجمالي الخصوم</p>
                          <p className="font-bold text-rose-600">
                            {totalLiabilities.toLocaleString('ar-SA')} ر.س
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* حقوق الملكية */}
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardTitle className="text-2xl">حقوق الملكية</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {equity.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">لا توجد حقوق ملكية</p>
                  ) : (
                    <>
                      {equity.map(account => (
                        <div key={account.id} className="flex justify-between items-center py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-sm text-muted-foreground">{account.code}</p>
                          </div>
                          <p className="font-semibold">
                            {Math.abs(account.balance).toLocaleString('ar-SA')} ر.س
                          </p>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-primary/20">
                        <div className="flex justify-between items-center">
                          <p className="font-bold">إجمالي حقوق الملكية</p>
                          <p className="font-bold text-blue-600">
                            {totalEquity.toLocaleString('ar-SA')} ر.س
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* المجموع الكلي */}
              <Card className="shadow-lg border-2 border-primary">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xl font-bold">إجمالي الخصوم وحقوق الملكية</p>
                    <p className="text-2xl font-bold text-primary">
                      {(totalLiabilities + totalEquity).toLocaleString('ar-SA')} ر.س
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* التحقق من التوازن */}
          <Card className={`shadow-lg ${totalAssets === (totalLiabilities + totalEquity) ? 'border-2 border-emerald-500 bg-emerald-50' : 'border-2 border-amber-500 bg-amber-50'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">حالة الميزانية</p>
                  <p className="text-sm text-muted-foreground">
                    {totalAssets === (totalLiabilities + totalEquity) 
                      ? 'الميزانية متوازنة ✓' 
                      : 'الميزانية غير متوازنة - يرجى مراجعة القيود'}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">الفرق</p>
                  <p className={`text-2xl font-bold ${totalAssets === (totalLiabilities + totalEquity) ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {Math.abs(totalAssets - (totalLiabilities + totalEquity)).toLocaleString('ar-SA')} ر.س
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          main, main * {
            visibility: visible;
          }
          main {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:mb-8 {
            margin-bottom: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BalanceSheet;