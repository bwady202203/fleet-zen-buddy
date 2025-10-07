import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const LoadReports = () => {
  const [driverReports, setDriverReports] = useState<any[]>([]);

  useEffect(() => {
    loadDriverReports();
  }, []);

  const loadDriverReports = async () => {
    const { data: loads } = await supabase
      .from('loads')
      .select(`
        *,
        drivers(name),
        companies(name),
        load_types(name, commission_rate)
      `);

    if (loads) {
      const grouped = loads.reduce((acc: any, load: any) => {
        const driverName = load.drivers?.name || 'غير محدد';
        if (!acc[driverName]) {
          acc[driverName] = [];
        }
        acc[driverName].push(load);
        return acc;
      }, {});

      const reports = Object.entries(grouped).map(([driverName, loads]: [string, any]) => {
        const totalCommission = loads.reduce((sum: number, load: any) => sum + (load.commission_amount || 0), 0);
        return {
          driverName,
          loads,
          totalCommission
        };
      });

      setDriverReports(reports);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/loads" className="hover:text-primary transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">التقارير</h1>
              <p className="text-muted-foreground mt-1">تقارير الحمولات والعمولات</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              تقرير السائقين والعمولات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {driverReports.map((report) => (
              <div key={report.driverName} className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-xl font-bold">{report.driverName}</h3>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">إجمالي العمولات المستحقة</p>
                    <p className="text-2xl font-bold text-primary">
                      {report.totalCommission.toFixed(2)} ر.س
                    </p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الشحنة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>نوع الحمولة</TableHead>
                      <TableHead>المبلغ الإجمالي</TableHead>
                      <TableHead>العمولة المستحقة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.loads.map((load: any) => (
                      <TableRow key={load.id}>
                        <TableCell className="font-medium">{load.load_number}</TableCell>
                        <TableCell>{new Date(load.date).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>{load.companies?.name || '-'}</TableCell>
                        <TableCell>{load.load_types?.name || '-'}</TableCell>
                        <TableCell>{load.total_amount.toFixed(2)} ر.س</TableCell>
                        <TableCell className="font-bold text-primary">
                          {load.commission_amount.toFixed(2)} ر.س
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LoadReports;
