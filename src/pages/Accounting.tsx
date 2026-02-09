import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, FileText, BarChart3, DollarSign, Receipt, Wallet, ShoppingCart, Package, RotateCcw, Target, FolderKanban, FileBarChart, Download, ClipboardList, Sparkles, Calendar, Printer, FileDown, Send } from "lucide-react";
 import { SendHorizontal } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const Accounting = () => {
  const { userRole, user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Get today's dates
  const today = new Date();
  const gregorianDate = format(today, 'yyyy/MM/dd', { locale: ar });
  const dayName = format(today, 'EEEE', { locale: ar });

  // Simple Hijri approximation
  const getHijriDate = (date: Date) => {
    const gregorianYear = date.getFullYear();
    const gregorianMonth = date.getMonth();
    const gregorianDay = date.getDate();
    
    const julianDay = Math.floor(365.25 * (gregorianYear + 4716)) + 
                      Math.floor(30.6001 * (gregorianMonth + 1 + 1)) + 
                      gregorianDay - 1524.5;
    
    const l = Math.floor(julianDay - 1948439.5 + 10632);
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + 
              Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - 
               Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const hijriMonth = Math.floor((24 * l3) / 709);
    const hijriDay = l3 - Math.floor((709 * hijriMonth) / 24);
    const hijriYear = 30 * n + j - 30;
    
    return `${hijriDay}/${hijriMonth}/${hijriYear}`;
  };

  const hijriDate = getHijriDate(today);

  const handlePrint = () => window.print();

  const convertToCSV = (data: any[], headers: string[]) => {
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Handle null/undefined
        if (value === null || value === undefined) return '';
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
          ? `"${escaped}"` 
          : escaped;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      toast({
        title: "جاري تصدير البيانات...",
        description: "قد تستغرق هذه العملية بضع دقائق",
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("غير مصرح");
      }

      // Fetch all accounting-related data
      const [
        accounts,
        journalEntries,
        journalLines,
        costCenters,
        projects,
        branches,
        invoices,
        invoiceItems,
      ] = await Promise.all([
        supabase.from('chart_of_accounts').select('*'),
        supabase.from('journal_entries').select('*'),
        supabase.from('journal_entry_lines').select('*'),
        supabase.from('cost_centers').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('branches').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('invoice_items').select('*'),
      ]);

      // Create metadata file describing the structure
      const metadata = {
        export_date: new Date().toISOString(),
        description: 'نظام المحاسبة - تصدير كامل للبيانات',
        tables: {
          chart_of_accounts: {
            description: 'دليل الحسابات',
            columns: 'id, code, name_ar, name_en, type, parent_id, balance, is_active, created_at, updated_at',
            relationships: 'parent_id -> chart_of_accounts.id (self-reference for hierarchical structure)'
          },
          journal_entries: {
            description: 'القيود اليومية',
            columns: 'id, entry_number, date, description, reference, created_by, created_at, updated_at',
            relationships: 'created_by -> auth.users.id'
          },
          journal_entry_lines: {
            description: 'سطور القيود اليومية',
            columns: 'id, journal_entry_id, account_id, debit, credit, description, cost_center_id, project_id, branch_id, created_at',
            relationships: [
              'journal_entry_id -> journal_entries.id',
              'account_id -> chart_of_accounts.id',
              'cost_center_id -> cost_centers.id (optional)',
              'project_id -> projects.id (optional)',
              'branch_id -> branches.id (optional)'
            ]
          },
          cost_centers: {
            description: 'مراكز التكلفة',
            columns: 'id, code, name_ar, name_en, is_active, created_at, updated_at',
            relationships: 'none'
          },
          projects: {
            description: 'المشاريع',
            columns: 'id, code, name_ar, name_en, start_date, end_date, is_active, created_at, updated_at',
            relationships: 'none'
          },
          branches: {
            description: 'الفروع',
            columns: 'id, code, name_ar, name_en, address, phone, manager_name, is_active, created_at, updated_at',
            relationships: 'none'
          },
          invoices: {
            description: 'الفواتير',
            columns: 'id, invoice_number, type, date, customer_supplier, total_amount, tax_amount, discount_amount, net_amount, status, notes, created_by, created_at, updated_at',
            relationships: 'created_by -> auth.users.id'
          },
          invoice_items: {
            description: 'بنود الفواتير',
            columns: 'id, invoice_id, description, quantity, unit_price, total, account_id, created_at',
            relationships: [
              'invoice_id -> invoices.id',
              'account_id -> chart_of_accounts.id'
            ]
          }
        },
        notes: [
          'CSV files use UTF-8 encoding with BOM for Arabic text compatibility',
          'All date fields are in ISO 8601 format (YYYY-MM-DD)',
          'All UUID fields represent unique identifiers for records',
          'Null values are represented as empty fields in CSV',
          'Relationships are described in the metadata for AI understanding'
        ]
      };

      // Create CSV files
      const files: { [key: string]: string } = {};
      
      if (accounts.data && accounts.data.length > 0) {
        const headers = ['id', 'code', 'name_ar', 'name_en', 'type', 'parent_id', 'balance', 'is_active', 'created_at', 'updated_at'];
        files['chart_of_accounts.csv'] = convertToCSV(accounts.data, headers);
      }

      if (journalEntries.data && journalEntries.data.length > 0) {
        const headers = ['id', 'entry_number', 'date', 'description', 'reference', 'created_by', 'created_at', 'updated_at'];
        files['journal_entries.csv'] = convertToCSV(journalEntries.data, headers);
      }

      if (journalLines.data && journalLines.data.length > 0) {
        const headers = ['id', 'journal_entry_id', 'account_id', 'debit', 'credit', 'description', 'cost_center_id', 'project_id', 'branch_id', 'created_at'];
        files['journal_entry_lines.csv'] = convertToCSV(journalLines.data, headers);
      }

      if (costCenters.data && costCenters.data.length > 0) {
        const headers = ['id', 'code', 'name_ar', 'name_en', 'is_active', 'created_at', 'updated_at'];
        files['cost_centers.csv'] = convertToCSV(costCenters.data, headers);
      }

      if (projects.data && projects.data.length > 0) {
        const headers = ['id', 'code', 'name_ar', 'name_en', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at'];
        files['projects.csv'] = convertToCSV(projects.data, headers);
      }

      if (branches.data && branches.data.length > 0) {
        const headers = ['id', 'code', 'name_ar', 'name_en', 'address', 'phone', 'manager_name', 'is_active', 'created_at', 'updated_at'];
        files['branches.csv'] = convertToCSV(branches.data, headers);
      }

      if (invoices.data && invoices.data.length > 0) {
        const headers = ['id', 'invoice_number', 'type', 'date', 'customer_supplier', 'total_amount', 'tax_amount', 'discount_amount', 'net_amount', 'status', 'notes', 'created_by', 'created_at', 'updated_at'];
        files['invoices.csv'] = convertToCSV(invoices.data, headers);
      }

      if (invoiceItems.data && invoiceItems.data.length > 0) {
        const headers = ['id', 'invoice_id', 'description', 'quantity', 'unit_price', 'total', 'account_id', 'created_at'];
        files['invoice_items.csv'] = convertToCSV(invoiceItems.data, headers);
      }

      // Add metadata as JSON
      files['_metadata.json'] = JSON.stringify(metadata, null, 2);

      // Create downloads
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Download metadata first
      const metadataBlob = new Blob(['\ufeff' + files['_metadata.json']], { type: 'application/json;charset=utf-8;' });
      const metadataUrl = URL.createObjectURL(metadataBlob);
      const metadataLink = document.createElement('a');
      metadataLink.href = metadataUrl;
      metadataLink.download = `accounting-export-${timestamp}_metadata.json`;
      document.body.appendChild(metadataLink);
      metadataLink.click();
      document.body.removeChild(metadataLink);
      URL.revokeObjectURL(metadataUrl);

      // Download each CSV file with UTF-8 BOM for Excel compatibility
      const csvFiles = Object.entries(files).filter(([name]) => name.endsWith('.csv'));
      for (let i = 0; i < csvFiles.length; i++) {
        const [name, content] = csvFiles[i];
        await new Promise(resolve => setTimeout(resolve, 100 * i));
        
        // Add UTF-8 BOM for better Excel compatibility with Arabic text
        const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `accounting-export-${timestamp}_${name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "تم التصدير بنجاح",
        description: `تم تحميل ${csvFiles.length} ملف CSV + ملف الوصف`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "خطأ في التصدير",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const sections = [
    {
      title: "قيود ذكية",
      description: "إنشاء قيود سريعة باختيار الحسابات مباشرة",
      icon: Sparkles,
      link: "/accounting/smart-journal",
      color: "from-gradient-start to-gradient-end"
    },
    {
      title: "استيراد كشف بنكي",
      description: "استيراد وتحليل كشوف الحسابات البنكية",
      icon: FileBarChart,
      link: "/accounting/bank-statement",
      color: "from-teal-500 to-teal-600"
    },
    {
      title: "طلبات التحويل",
      description: "إدارة وتسجيل طلبات التحويل المالية",
      icon: SendHorizontal,
      link: "/accounting/transfer-requests",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      title: "شجرة الحسابات",
      description: "إدارة الدليل المحاسبي - 4 مستويات",
      icon: BookOpen,
      link: "/accounting/chart-of-accounts",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      title: "القيود اليومية",
      description: "تسجيل وعرض القيود اليومية",
      icon: FileText,
      link: "/accounting/journal-entries",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "سندات الصرف",
      description: "إدارة سندات الصرف",
      icon: Receipt,
      link: "/accounting/payment-vouchers",
      color: "from-red-500 to-red-600"
    },
    {
      title: "سندات القبض",
      description: "إدارة سندات القبض المحاسبية",
      icon: Wallet,
      link: "/accounting/collection-receipts",
      color: "from-green-500 to-green-600"
    },
    {
      title: "طلبات الشراء",
      description: "إدارة طلبات الشراء من الموردين",
      icon: ClipboardList,
      link: "/accounting/purchase-order",
      color: "from-lime-500 to-lime-600"
    },
    {
      title: "تقارير القيود اليومية",
      description: "تقارير تفصيلية مع فلاتر متقدمة",
      icon: FileBarChart,
      link: "/accounting/journal-entries-reports",
      color: "from-slate-500 to-slate-600"
    },
    {
      title: "دفتر الأستاذ",
      description: "عرض دفتر الأستاذ لأي حساب",
      icon: BarChart3,
      link: "/accounting/ledger",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      title: "دفتر الأستاذ الجديد",
      description: "دفتر أستاذ محسّن مع بيانات دقيقة",
      icon: BarChart3,
      link: "/accounting/ledger-new",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      title: "ميزان المراجعة",
      description: "عرض ميزان المراجعة",
      icon: DollarSign,
      link: "/accounting/trial-balance",
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "ميزان المراجعة الجديد",
      description: "ميزان محسّن مع بيانات دقيقة ومعاينة دفتر الأستاذ",
      icon: DollarSign,
      link: "/accounting/trial-balance-new",
      color: "from-violet-500 to-violet-600"
    },
    {
      title: "الميزانية العمومية",
      description: "عرض الميزانية العمومية",
      icon: DollarSign,
      link: "/accounting/balance-sheet",
      color: "from-green-500 to-green-600"
    },
    {
      title: "قائمة الدخل",
      description: "عرض قائمة الدخل",
      icon: Receipt,
      link: "/accounting/income-statement",
      color: "from-teal-500 to-teal-600"
    },
    {
      title: "السندات والعهد",
      description: "سندات القبض والصرف وإدارة العهد",
      icon: Wallet,
      link: "/accounting/vouchers",
      color: "from-orange-500 to-orange-600"
    },
    {
      title: "فواتير المبيعات",
      description: "إدارة فواتير المبيعات",
      icon: ShoppingCart,
      link: "/accounting/sales-invoice",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      title: "فواتير المشتريات",
      description: "إدارة فواتير المشتريات",
      icon: Package,
      link: "/accounting/purchase-invoice",
      color: "from-amber-500 to-amber-600"
    },
    {
      title: "مرتجعات المبيعات",
      description: "إدارة مرتجعات المبيعات",
      icon: RotateCcw,
      link: "/accounting/sales-return",
      color: "from-rose-500 to-rose-600"
    },
    {
      title: "مرتجعات المشتريات",
      description: "إدارة مرتجعات المشتريات",
      icon: RotateCcw,
      link: "/accounting/purchase-return",
      color: "from-pink-500 to-pink-600"
    },
    {
      title: "مراكز التكلفة",
      description: "إدارة مراكز التكلفة",
      icon: Target,
      link: "/accounting/cost-centers",
      color: "from-violet-500 to-violet-600"
    },
    {
      title: "الفروع",
      description: "إدارة الفروع",
      icon: Target,
      link: "/accounting/branches",
      color: "from-sky-500 to-sky-600"
    },
    {
      title: "المشاريع",
      description: "إدارة المشاريع",
      icon: FolderKanban,
      link: "/accounting/projects",
      color: "from-fuchsia-500 to-fuchsia-600"
    },
    {
      title: "أرصدة المستوى الرابع",
      description: "عرض أرصدة حسابات المستوى الرابع مع كشف الحساب",
      icon: BarChart3,
      link: "/accounting/level4-balances",
      color: "from-amber-500 to-amber-600"
    }
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          {/* عرض المستخدم الحالي */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-lg">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-medium text-sm">{user?.email || 'مستخدم'}</p>
                <p className="text-xs text-muted-foreground">
                  {userRole === 'admin' ? 'مدير النظام' : 
                   userRole === 'manager' ? 'مدير' :
                   userRole === 'accountant' ? 'محاسب' :
                   userRole === 'employee' ? 'موظف' : 'مستخدم'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">المحاسبة المالية</h1>
                <p className="text-muted-foreground mt-1">
                  إدارة شاملة للعمليات المحاسبية والتقارير المالية
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date Display */}
              <div className="hidden sm:flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium">{dayName}</span>
                <span className="text-muted-foreground">|</span>
                <span>{gregorianDate}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-primary">{hijriDate} هـ</span>
              </div>
              
              {/* Action Icons */}
              <Button variant="outline" size="icon" onClick={handlePrint} title="معاينة الطباعة">
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="تحميل PDF">
                <FileDown className="h-4 w-4" />
              </Button>
              
              {userRole === 'admin' && (
              <Button
                onClick={handleExportData}
                disabled={isExporting}
                variant="outline"
                className="gap-2"
              >
                <Download className={cn("h-4 w-4", isExporting && "animate-bounce")} />
                {isExporting ? "جاري التصدير..." : "تصدير البيانات"}
              </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Link key={section.title} to={section.link}>
              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full border-2 hover:border-primary/50">
                <CardHeader>
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <section.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{section.description}</p>
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm text-primary font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
                      فتح
                      <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Accounting;
