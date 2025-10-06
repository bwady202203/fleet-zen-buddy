import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Printer, TrendingUp, TrendingDown } from "lucide-react";
import { useAccounting } from "@/contexts/AccountingContext";

const IncomeStatement = () => {
  const { accounts } = useAccounting();

  // حساب الإيرادات والمصروفات
  const revenues = accounts.filter(acc => acc.type === 'revenue' && acc.level >= 2);
  const expenses = accounts.filter(acc => acc.type === 'expense' && acc.level >= 2);

  const totalRevenues = revenues.reduce((sum, acc) => sum + Math.abs(acc.credit - acc.debit), 0);
  const totalExpenses = expenses.reduce((sum, acc) => sum + Math.abs(acc.debit - acc.credit), 0);
  const netIncome = totalRevenues - totalExpenses;

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
                <h1 className="text-3xl font-bold">قائمة الدخل</h1>
                <p className="text-muted-foreground mt-1">
                  عرض تفصيلي للإيرادات والمصروفات وصافي الربح
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
        <div className="max-w-4xl mx-auto space-y-8">
          {/* رأس التقرير */}
          <div className="text-center space-y-2 print:mb-8">
            <h2 className="text-4xl font-bold text-primary">قائمة الدخل</h2>
            <p className="text-lg text-muted-foreground">للفترة المنتهية في {currentDate}</p>
            <div className="h-1 w-32 bg-gradient-to-r from-primary to-primary/50 mx-auto rounded-full" />
          </div>

          {/* الإيرادات */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">الإيرادات</CardTitle>
                <TrendingUp className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {revenues.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">لا توجد إيرادات مسجلة</p>
              ) : (
                <>
                  {revenues.map(account => {
                    const amount = Math.abs(account.credit - account.debit);
                    return (
                      <div key={account.id} className="flex justify-between items-center py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium text-lg">{account.name}</p>
                          <p className="text-sm text-muted-foreground">{account.code}</p>
                        </div>
                        <p className="font-semibold text-lg text-emerald-600">
                          {amount.toLocaleString('ar-SA')} ر.س
                        </p>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t-2 border-emerald-600">
                    <div className="flex justify-between items-center">
                      <p className="text-xl font-bold">إجمالي الإيرادات</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {totalRevenues.toLocaleString('ar-SA')} ر.س
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* المصروفات */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-rose-500 to-rose-600 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">المصروفات</CardTitle>
                <TrendingDown className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {expenses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">لا توجد مصروفات مسجلة</p>
              ) : (
                <>
                  {expenses.map(account => {
                    const amount = Math.abs(account.debit - account.credit);
                    return (
                      <div key={account.id} className="flex justify-between items-center py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium text-lg">{account.name}</p>
                          <p className="text-sm text-muted-foreground">{account.code}</p>
                        </div>
                        <p className="font-semibold text-lg text-rose-600">
                          ({amount.toLocaleString('ar-SA')}) ر.س
                        </p>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t-2 border-rose-600">
                    <div className="flex justify-between items-center">
                      <p className="text-xl font-bold">إجمالي المصروفات</p>
                      <p className="text-2xl font-bold text-rose-600">
                        ({totalExpenses.toLocaleString('ar-SA')}) ر.س
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* صافي الربح / الخسارة */}
          <Card className={`shadow-lg border-4 ${netIncome >= 0 ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50'}`}>
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {netIncome >= 0 ? (
                    <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center">
                      <TrendingDown className="h-8 w-8 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold">
                      {netIncome >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      الفرق بين الإيرادات والمصروفات
                    </p>
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <p className={`text-4xl font-bold ${netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {netIncome >= 0 ? '' : '('}
                    {Math.abs(netIncome).toLocaleString('ar-SA')}
                    {netIncome >= 0 ? '' : ')'}
                    <span className="text-2xl mr-2">ر.س</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ملخص القائمة */}
          <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle>ملخص الأداء المالي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-muted-foreground mb-2">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {totalRevenues.toLocaleString('ar-SA')}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-muted-foreground mb-2">إجمالي المصروفات</p>
                  <p className="text-2xl font-bold text-rose-600">
                    {totalExpenses.toLocaleString('ar-SA')}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-muted-foreground mb-2">هامش الربح</p>
                  <p className="text-2xl font-bold text-primary">
                    {totalRevenues > 0 ? ((netIncome / totalRevenues) * 100).toFixed(1) : '0'}%
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

export default IncomeStatement;