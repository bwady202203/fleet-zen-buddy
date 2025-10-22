import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "react-router-dom";
import { ArrowRight, FileDown, Filter, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface CostCenter {
  id: string;
  code: string;
  name_ar: string;
}

interface Project {
  id: string;
  code: string;
  name_ar: string;
}

interface Branch {
  id: string;
  code: string;
  name_ar: string;
}

interface ReportLine {
  entryNumber: string;
  entryDate: string;
  entryDescription: string;
  accountCode: string;
  accountName: string;
  lineDescription: string;
  debit: number;
  credit: number;
  costCenter: string;
  project: string;
  branch: string;
}

const JournalEntriesReports = () => {
  const { toast } = useToast();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [reportData, setReportData] = useState<ReportLine[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    costCenterId: "all",
    projectId: "all",
    branchId: "all",
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [costCentersRes, projectsRes, branchesRes] = await Promise.all([
        supabase.from('cost_centers').select('*').eq('is_active', true).order('code'),
        supabase.from('projects').select('*').eq('is_active', true).order('code'),
        supabase.from('branches').select('*').eq('is_active', true).order('code'),
      ]);

      if (costCentersRes.data) setCostCenters(costCentersRes.data);
      if (projectsRes.data) setProjects(projectsRes.data);
      if (branchesRes.data) setBranches(branchesRes.data);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('journal_entries')
        .select(`
          entry_number,
          date,
          description,
          journal_entry_lines (
            description,
            debit,
            credit,
            chart_of_accounts (code, name_ar),
            cost_centers (id, code, name_ar),
            projects (id, code, name_ar),
            branches (id, code, name_ar)
          )
        `)
        .order('date', { ascending: true })
        .order('entry_number', { ascending: true });

      // Apply date filters
      if (filters.fromDate) {
        query = query.gte('date', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('date', filters.toDate);
      }

      const { data: entries, error } = await query;

      if (error) throw error;

      // Process and filter data
      const lines: ReportLine[] = [];
      entries?.forEach((entry: any) => {
        entry.journal_entry_lines?.forEach((line: any) => {
          // Apply cost center filter
          if (filters.costCenterId && filters.costCenterId !== 'all') {
            if (!line.cost_centers || line.cost_centers.id !== filters.costCenterId) {
              return;
            }
          }

          // Apply project filter
          if (filters.projectId && filters.projectId !== 'all') {
            if (!line.projects || line.projects.id !== filters.projectId) {
              return;
            }
          }

          // Apply branch filter - only filter when a specific branch is selected
          if (filters.branchId && filters.branchId !== 'all') {
            if (!line.branches || line.branches.id !== filters.branchId) {
              return;
            }
          }

          lines.push({
            entryNumber: entry.entry_number,
            entryDate: entry.date,
            entryDescription: entry.description || '',
            accountCode: line.chart_of_accounts?.code || '',
            accountName: line.chart_of_accounts?.name_ar || '',
            lineDescription: line.description || '',
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
            costCenter: line.cost_centers?.name_ar || '-',
            project: line.projects?.name_ar || '-',
            branch: line.branches?.name_ar || '-',
          });
        });
      });

      setReportData(lines);

      if (lines.length === 0) {
        toast({
          title: "لا توجد بيانات",
          description: "لا توجد قيود تطابق معايير البحث",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء التقرير",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const exportData = reportData.map(line => ({
      'رقم القيد': line.entryNumber,
      'التاريخ': format(new Date(line.entryDate), 'dd/MM/yyyy'),
      'بيان القيد': line.entryDescription,
      'رمز الحساب': line.accountCode,
      'اسم الحساب': line.accountName,
      'البيان التفصيلي': line.lineDescription,
      'مركز التكلفة': line.costCenter,
      'المشروع': line.project,
      'المدين': line.debit,
      'الدائن': line.credit,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير القيود');

    const wscols = [
      { wch: 15 }, // رقم القيد
      { wch: 12 }, // التاريخ
      { wch: 25 }, // بيان القيد
      { wch: 12 }, // رمز الحساب
      { wch: 30 }, // اسم الحساب
      { wch: 25 }, // البيان التفصيلي
      { wch: 20 }, // مركز التكلفة
      { wch: 20 }, // المشروع
      { wch: 12 }, // المدين
      { wch: 12 }, // الدائن
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `تقرير_القيود_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);

    toast({
      title: "تم التصدير",
      description: "تم تصدير التقرير إلى Excel بنجاح",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const totalDebit = reportData.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = reportData.reduce((sum, line) => sum + line.credit, 0);

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="min-h-screen bg-background" dir="rtl">
        <header className="border-b bg-card no-print">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/accounting" className="hover:text-primary transition-colors">
                  <ArrowRight className="h-6 w-6" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold">تقارير القيود اليومية</h1>
                  <p className="text-muted-foreground mt-1">
                    تقارير تفصيلية للقيود المحاسبية
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Filters Card */}
          <Card className="mb-6 no-print">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                معايير التقرير / Report Criteria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>من تاريخ / From Date</Label>
                  <Input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>إلى تاريخ / To Date</Label>
                  <Input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>مركز التكلفة / Cost Center</Label>
                  <Select value={filters.costCenterId} onValueChange={(value) => setFilters({ ...filters, costCenterId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مركز التكلفة / Select Cost Center" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل / All</SelectItem>
                      {costCenters.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.code} - {cc.name_ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المشروع / Project</Label>
                  <Select value={filters.projectId} onValueChange={(value) => setFilters({ ...filters, projectId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المشروع / Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل / All</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.code} - {project.name_ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الفرع / Branch</Label>
                  <Select value={filters.branchId} onValueChange={(value) => setFilters({ ...filters, branchId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفرع / Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل / All</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.code} - {branch.name_ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <Button onClick={generateReport} disabled={loading}>
                  <Filter className="h-4 w-4 ml-2" />
                  {loading ? 'جاري التحميل...' : 'إنشاء التقرير'}
                </Button>
                {reportData.length > 0 && (
                  <>
                    <Button variant="outline" onClick={exportToExcel}>
                      <FileDown className="h-4 w-4 ml-2" />
                      تصدير Excel
                    </Button>
                    <Button variant="outline" onClick={handlePrint}>
                      <Printer className="h-4 w-4 ml-2" />
                      طباعة
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Report Results */}
          {reportData.length > 0 && (
            <Card className="print-area">
              <CardHeader>
                <CardTitle>نتائج التقرير</CardTitle>
                <div className="text-sm text-muted-foreground">
                  إجمالي السجلات: {reportData.length}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم القيد</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">رمز الحساب</TableHead>
                        <TableHead className="text-right">اسم الحساب</TableHead>
                        <TableHead className="text-right">البيان</TableHead>
                        <TableHead className="text-right">مركز التكلفة</TableHead>
                        <TableHead className="text-right">المشروع</TableHead>
                        <TableHead className="text-right">المدين</TableHead>
                        <TableHead className="text-right">الدائن</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{line.entryNumber}</TableCell>
                          <TableCell>{format(new Date(line.entryDate), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-mono text-sm">{line.accountCode}</TableCell>
                          <TableCell>{line.accountName}</TableCell>
                          <TableCell className="text-muted-foreground">{line.lineDescription}</TableCell>
                          <TableCell>{line.costCenter}</TableCell>
                          <TableCell>{line.project}</TableCell>
                          <TableCell className="text-red-600 font-semibold">
                            {line.debit > 0 ? line.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                          </TableCell>
                          <TableCell className="text-green-600 font-semibold">
                            {line.credit > 0 ? line.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={7} className="text-left">
                          الإجمالي / Total
                        </TableCell>
                        <TableCell className="text-red-600">
                          {totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-green-600">
                          {totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </>
  );
};

export default JournalEntriesReports;
