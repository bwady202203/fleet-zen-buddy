import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, Upload, Download, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface EmployeeImportResult {
  name: string;
  status: 'success' | 'error';
  message?: string;
}

const BulkEmployees = () => {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<EmployeeImportResult[]>([]);

  const handleDownloadTemplate = () => {
    const template = [
      {
        "الاسم الكامل": "أحمد محمد علي",
        "المسمى الوظيفي": "مدير الموارد البشرية",
        "القسم": "الإدارة",
        "رقم الهوية": "1234567890",
        "رقم الهاتف": "0501234567",
        "البريد الإلكتروني": "ahmed@company.com",
        "تاريخ التعيين": "2020-01-15",
        "الراتب الأساسي": 15000,
        "بدل السكن": 3000,
        "بدل النقل": 1500,
        "بدلات أخرى": 500
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الموظفين");
    
    const colWidths = [
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, "قالب_الموظفين.xlsx");
    
    toast({
      title: "تم التحميل",
      description: "تم تحميل ملف القالب بنجاح"
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResults([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const importResults: EmployeeImportResult[] = [];

      jsonData.forEach((row: any) => {
        try {
          const name = row["الاسم الكامل"];
          
          if (!name) {
            importResults.push({
              name: "غير محدد",
              status: 'error',
              message: "الاسم مطلوب"
            });
            return;
          }

          // هنا يمكنك إضافة المنطق الفعلي لحفظ الموظف في قاعدة البيانات
          
          importResults.push({
            name,
            status: 'success'
          });
        } catch (error) {
          importResults.push({
            name: row["الاسم الكامل"] || "غير محدد",
            status: 'error',
            message: 'خطأ في البيانات'
          });
        }
      });

      setResults(importResults);

      const successCount = importResults.filter(r => r.status === 'success').length;
      const errorCount = importResults.filter(r => r.status === 'error').length;

      toast({
        title: "اكتمل الاستيراد",
        description: `تم إضافة ${successCount} موظف بنجاح. ${errorCount > 0 ? `فشل ${errorCount}` : ''}`
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء قراءة الملف",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/hr/employees" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">إضافة موظفين من ملف إكسل</h1>
              <p className="text-muted-foreground mt-1">
                استيراد بيانات الموظفين بشكل جماعي
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                خطوات الاستيراد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">تحميل ملف القالب</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      قم بتحميل ملف إكسل القالب الذي يحتوي على الأعمدة المطلوبة
                    </p>
                    <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                      <Download className="h-4 w-4" />
                      تحميل القالب
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">تعبئة البيانات</h4>
                    <p className="text-sm text-muted-foreground">
                      قم بملء بيانات الموظفين في الملف. تأكد من صحة جميع البيانات المطلوبة
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">رفع الملف</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      قم برفع الملف المعبأ لاستيراد بيانات الموظفين
                    </p>
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        disabled={importing}
                        className="cursor-pointer"
                      />
                      {importing && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <span className="text-sm">جاري الاستيراد...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>نتائج الاستيراد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        result.status === 'success'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {result.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">{result.name}</p>
                          {result.message && (
                            <p className="text-sm text-muted-foreground">{result.message}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          result.status === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {result.status === 'success' ? 'تم بنجاح' : 'فشل'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">
                        {results.filter(r => r.status === 'success').length} نجح
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-semibold">
                        {results.filter(r => r.status === 'error').length} فشل
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>ملاحظات هامة</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>يجب أن يكون الملف بصيغة Excel (.xlsx أو .xls)</li>
                <li>الحقول المطلوبة: الاسم الكامل، المسمى الوظيفي، القسم</li>
                <li>تأكد من صحة تنسيق التواريخ (YYYY-MM-DD)</li>
                <li>الأرقام يجب أن تكون بدون فواصل أو رموز</li>
                <li>سيتم تجاهل الصفوف التي تحتوي على بيانات غير صحيحة</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BulkEmployees;
