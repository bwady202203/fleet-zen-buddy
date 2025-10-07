import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounting, JournalEntryLine } from "@/contexts/AccountingContext";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Printer, Eye, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  type: string;
  parent_id: string | null;
  is_active: boolean;
}

interface CostCenter {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface Project {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}


const JournalEntries = () => {
  const { 
    journalEntries, 
    addJournalEntry, 
    getNextEntryNumber
  } = useAccounting();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [displayedEntries, setDisplayedEntries] = useState<any[]>([]);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  
  useEffect(() => {
    fetchAccounts();
    fetchCostCenters();
    fetchProjects();
    fetchJournalEntries();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الحسابات",
        variant: "destructive",
      });
    }
  };

  const fetchCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      setCostCenters(data || []);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    }
  };

  const fetchJournalEntries = async () => {
    try {
      const { data: entries, error: entriesError } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_of_accounts (code, name_ar)
          )
        `)
        .order('date', { ascending: false })
        .order('entry_number', { ascending: false });

      if (entriesError) throw entriesError;

      const formattedEntries = entries?.map(entry => ({
        id: entry.id,
        entryNumber: entry.entry_number,
        date: entry.date,
        description: entry.description,
        lines: entry.journal_entry_lines.map((line: any) => ({
          id: line.id,
          accountId: line.account_id,
          accountCode: line.chart_of_accounts.code,
          accountName: line.chart_of_accounts.name_ar,
          description: line.description,
          debit: Number(line.debit),
          credit: Number(line.credit),
        })),
        totalDebit: entry.journal_entry_lines.reduce((sum: number, line: any) => sum + Number(line.debit), 0),
        totalCredit: entry.journal_entry_lines.reduce((sum: number, line: any) => sum + Number(line.credit), 0),
      })) || [];

      setDisplayedEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const calculateLevel = (account: Account): number => {
    const codeLength = account.code.replace(/[^0-9]/g, '').length;
    if (codeLength <= 1) return 1;
    if (codeLength <= 2) return 2;
    if (codeLength <= 4) return 3;
    return 4;
  };
  
  const createInitialEmptyLines = () => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `line-${Date.now()}-${i}`,
      accountId: "",
      accountCode: "",
      accountName: "",
      description: "",
      debit: 0,
      credit: 0,
      costCenter: "",
      projectName: "",
    }));
  };

  const [formData, setFormData] = useState({
    entryNumber: getNextEntryNumber(),
    date: new Date().toISOString().split('T')[0],
    description: "",
    lines: createInitialEmptyLines() as JournalEntryLine[],
  });

  const [searchStates, setSearchStates] = useState<{
    [key: string]: {
      accountSearch: string;
      showAccountSearch: boolean;
      costCenterSearch: string;
      showCostCenterSearch: boolean;
      projectSearch: string;
      showProjectSearch: boolean;
    };
  }>({});

  const getSearchState = (lineId: string) => {
    return searchStates[lineId] || {
      accountSearch: "",
      showAccountSearch: false,
      costCenterSearch: "",
      showCostCenterSearch: false,
      projectSearch: "",
      showProjectSearch: false,
    };
  };

  const updateSearchState = (lineId: string, updates: Partial<typeof searchStates[string]>) => {
    setSearchStates(prev => ({
      ...prev,
      [lineId]: {
        ...getSearchState(lineId),
        ...updates,
      },
    }));
  };

  const updateLine = (lineId: string, updates: Partial<JournalEntryLine>) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map(line => 
        line.id === lineId ? { ...line, ...updates } : line
      ),
    }));
  };

  const totalDebit = formData.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = formData.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = async () => {
    // Filter out empty lines
    const validLines = formData.lines.filter(line => line.accountId && (line.debit > 0 || line.credit > 0));

    if (validLines.length < 2) {
      toast({
        title: "خطأ",
        description: "يجب إضافة سطرين على الأقل مع حسابات ومبالغ",
        variant: "destructive",
      });
      return;
    }

    const validTotalDebit = validLines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const validTotalCredit = validLines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (validTotalDebit !== validTotalCredit || validTotalDebit === 0) {
      toast({
        title: "خطأ",
        description: "القيد غير متوازن. يجب أن يكون مجموع المدين مساوياً لمجموع الدائن",
        variant: "destructive",
      });
      return;
    }

    try {
      // حفظ القيد في جدول journal_entries
      const { data: journalEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          entry_number: formData.entryNumber,
          date: formData.date,
          description: formData.description,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // حفظ سطور القيد في جدول journal_entry_lines
      const lines = validLines.map(line => ({
        journal_entry_id: journalEntry.id,
        account_id: line.accountId,
        description: line.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
        cost_center_id: line.costCenter ? costCenters.find(cc => cc.code === line.costCenter)?.id : null,
        project_id: line.projectName ? projects.find(p => p.code === line.projectName)?.id : null,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) throw linesError;

      toast({
        title: "تم الحفظ بنجاح",
        description: `تم حفظ القيد رقم ${formData.entryNumber}`,
      });

      setDialogOpen(false);
      resetForm();
      fetchJournalEntries();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ القيد",
        variant: "destructive",
      });
    }
  };

  const createEmptyLines = () => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `line-${Date.now()}-${i}`,
      accountId: "",
      accountCode: "",
      accountName: "",
      description: "",
      debit: 0,
      credit: 0,
      costCenter: "",
      projectName: "",
    }));
  };

  const resetForm = () => {
    setFormData({
      entryNumber: getNextEntryNumber(),
      date: new Date().toISOString().split('T')[0],
      description: "",
      lines: createEmptyLines(),
    });
    setSearchStates({});
  };

  const handlePrint = (entry: any) => {
    window.print();
  };

  const handlePreview = (entry: any) => {
    setSelectedEntry(entry);
    setPreviewDialogOpen(true);
  };

  const filteredEntries = displayedEntries.filter(entry => {
    if (filterDate && entry.date !== filterDate) return false;
    if (filterAccount && !entry.lines.some((line: any) => 
      line.accountCode.includes(filterAccount) || line.accountName.includes(filterAccount)
    )) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/accounting" className="hover:text-primary transition-colors">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">القيود اليومية</h1>
                <p className="text-muted-foreground mt-1">
                  تسجيل ومتابعة القيود المحاسبية اليومية
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 ml-2" />
                  قيد جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>سند قيد يومية</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-accent/50 rounded-lg">
                    <div>
                      <Label className="text-sm">رقم القيد</Label>
                      <Input 
                        value={formData.entryNumber} 
                        onChange={(e) => setFormData({ ...formData, entryNumber: e.target.value })}
                        className="bg-background" 
                        placeholder="رقم القيد"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">التاريخ</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">البيان العام</Label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="بيان القيد"
                      />
                    </div>
                  </div>

                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right min-w-[250px]">الحساب</TableHead>
                              <TableHead className="text-right min-w-[200px]">البيان</TableHead>
                              <TableHead className="text-right min-w-[120px]">المدين</TableHead>
                              <TableHead className="text-right min-w-[120px]">الدائن</TableHead>
                              <TableHead className="text-right min-w-[180px]">مركز التكلفة</TableHead>
                              <TableHead className="text-right min-w-[180px]">المشروع</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                          {formData.lines.map((line) => {
                            const searchState = getSearchState(line.id);
                            
                            // البحث في الحسابات - عرض جميع الحسابات إذا لم يكن هناك بحث
                            const filteredAccounts = searchState.accountSearch.length > 0 
                              ? accounts.filter(acc => 
                                  acc.code.includes(searchState.accountSearch) || 
                                  acc.name_ar.includes(searchState.accountSearch) ||
                                  acc.name_en.toLowerCase().includes(searchState.accountSearch.toLowerCase())
                                )
                              : accounts; // عرض جميع الحسابات بدلاً من قائمة فارغة
                            
                            // البحث في مراكز التكلفة
                            const filteredCostCenters = searchState.costCenterSearch.length > 0
                              ? costCenters.filter(cc =>
                                  cc.code.includes(searchState.costCenterSearch) ||
                                  cc.name_ar.includes(searchState.costCenterSearch) ||
                                  cc.name_en.toLowerCase().includes(searchState.costCenterSearch.toLowerCase())
                                )
                              : [];
                            
                            // البحث في المشاريع
                            const filteredProjects = searchState.projectSearch.length > 0
                              ? projects.filter(prj =>
                                  prj.code.includes(searchState.projectSearch) ||
                                  prj.name_ar.includes(searchState.projectSearch) ||
                                  prj.name_en.toLowerCase().includes(searchState.projectSearch.toLowerCase())
                                )
                              : [];

                              return (
                                <TableRow key={line.id}>
                                  <TableCell>
                                    <div className="relative">
                                      <Input
                                        value={searchState.accountSearch || (line.accountCode ? `${line.accountCode} - ${line.accountName}` : "")}
                                        onChange={(e) => {
                                          updateSearchState(line.id, {
                                            accountSearch: e.target.value,
                                            showAccountSearch: true,
                                          });
                                        }}
                                        placeholder="ابحث بالرمز أو الاسم..."
                                        onFocus={() => updateSearchState(line.id, { showAccountSearch: true })}
                                        onBlur={() => setTimeout(() => updateSearchState(line.id, { showAccountSearch: false }), 200)}
                                        className="text-sm"
                                      />
                                      {searchState.showAccountSearch && filteredAccounts.length > 0 && (
                                        <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-card shadow-lg border">
                                          <CardContent className="p-2">
                                            {filteredAccounts.map(acc => (
                                              <div
                                                key={acc.id}
                                                className="p-2 hover:bg-accent cursor-pointer rounded text-sm"
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  updateLine(line.id, {
                                                    accountId: acc.id,
                                                    accountCode: acc.code,
                                                    accountName: acc.name_ar,
                                                  });
                                                  updateSearchState(line.id, {
                                                    accountSearch: "",
                                                    showAccountSearch: false,
                                                  });
                                                }}
                                              >
                                                <div className="font-medium">{acc.code} - {acc.name_ar}</div>
                                              </div>
                                            ))}
                                          </CardContent>
                                        </Card>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={line.description}
                                      onChange={(e) => updateLine(line.id, { description: e.target.value })}
                                      placeholder="البيان"
                                      className="text-sm"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={line.debit || ""}
                                      onChange={(e) => {
                                        const debit = parseFloat(e.target.value) || 0;
                                        updateLine(line.id, { debit, credit: 0 });
                                      }}
                                      placeholder="0.00"
                                      className="text-sm"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={line.credit || ""}
                                      onChange={(e) => {
                                        const credit = parseFloat(e.target.value) || 0;
                                        updateLine(line.id, { credit, debit: 0 });
                                      }}
                                      placeholder="0.00"
                                      className="text-sm"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="relative">
                                      <Input
                                        value={searchState.costCenterSearch || line.costCenter}
                                        onChange={(e) => {
                                          updateSearchState(line.id, {
                                            costCenterSearch: e.target.value,
                                            showCostCenterSearch: true,
                                          });
                                        }}
                                        placeholder="مركز التكلفة"
                                        onFocus={() => updateSearchState(line.id, { showCostCenterSearch: true })}
                                        onBlur={() => setTimeout(() => updateSearchState(line.id, { showCostCenterSearch: false }), 200)}
                                        className="text-sm"
                                      />
                                      {searchState.showCostCenterSearch && filteredCostCenters.length > 0 && (
                                        <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-card shadow-lg border">
                                          <CardContent className="p-2">
                                            {filteredCostCenters.map(cc => (
                                              <div
                                                key={cc.id}
                                                className="p-2 hover:bg-accent cursor-pointer rounded text-sm"
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  updateLine(line.id, { costCenter: cc.code });
                                                  updateSearchState(line.id, {
                                                    costCenterSearch: "",
                                                    showCostCenterSearch: false,
                                                  });
                                                }}
                                              >
                                                <div className="font-medium">{cc.code} - {cc.name_ar}</div>
                                              </div>
                                            ))}
                                          </CardContent>
                                        </Card>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="relative">
                                      <Input
                                        value={searchState.projectSearch || line.projectName}
                                        onChange={(e) => {
                                          updateSearchState(line.id, {
                                            projectSearch: e.target.value,
                                            showProjectSearch: true,
                                          });
                                        }}
                                        placeholder="المشروع"
                                        onFocus={() => updateSearchState(line.id, { showProjectSearch: true })}
                                        onBlur={() => setTimeout(() => updateSearchState(line.id, { showProjectSearch: false }), 200)}
                                        className="text-sm"
                                      />
                                      {searchState.showProjectSearch && filteredProjects.length > 0 && (
                                        <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-card shadow-lg border">
                                          <CardContent className="p-2">
                                            {filteredProjects.map(prj => (
                                              <div
                                                key={prj.id}
                                                className="p-2 hover:bg-accent cursor-pointer rounded text-sm"
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  updateLine(line.id, { projectName: prj.code });
                                                  updateSearchState(line.id, {
                                                    projectSearch: "",
                                                    showProjectSearch: false,
                                                  });
                                                }}
                                              >
                                                <div className="font-medium">{prj.code} - {prj.name_ar}</div>
                                              </div>
                                            ))}
                                          </CardContent>
                                        </Card>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell colSpan={2} className="text-left">
                                الإجمالي
                              </TableCell>
                              <TableCell className="text-red-600">
                                {totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-green-600">
                                {totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell colSpan={2}>
                                {isBalanced ? (
                                  <span className="text-green-600">✓ متوازن</span>
                                ) : totalDebit > 0 || totalCredit > 0 ? (
                                  <span className="text-red-600">✗ غير متوازن</span>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-4">
                    <Button onClick={handleSubmit} className="flex-1" disabled={!isBalanced}>
                      حفظ القيد
                    </Button>
                    <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                تصفية القيود
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              <div>
                <Label>الحساب</Label>
                <Input
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  placeholder="ابحث عن حساب..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>سجل القيود اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  لا توجد قيود حالياً
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم القيد</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">البيان</TableHead>
                    <TableHead className="text-right">المدين</TableHead>
                    <TableHead className="text-right">الدائن</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-red-600">
                        {entry.totalDebit.toLocaleString('ar-SA')} ريال
                      </TableCell>
                      <TableCell className="text-green-600">
                        {entry.totalCredit.toLocaleString('ar-SA')} ريال
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePreview(entry)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrint(entry)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>معاينة القيد</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-accent/50 rounded-lg">
                <div>
                  <Label className="text-sm">رقم القيد</Label>
                  <p className="font-medium">{selectedEntry.entryNumber}</p>
                </div>
                <div>
                  <Label className="text-sm">التاريخ</Label>
                  <p className="font-medium">{selectedEntry.date}</p>
                </div>
                <div>
                  <Label className="text-sm">البيان</Label>
                  <p className="font-medium">{selectedEntry.description}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الحساب</TableHead>
                    <TableHead className="text-right">البيان</TableHead>
                    <TableHead className="text-right">المدين</TableHead>
                    <TableHead className="text-right">الدائن</TableHead>
                    <TableHead className="text-right">مركز التكلفة</TableHead>
                    <TableHead className="text-right">المشروع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEntry.lines.map((line: any) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">
                        {line.accountCode} - {line.accountName}
                      </TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-red-600">
                        {line.debit > 0 ? line.debit.toLocaleString('ar-SA') : '-'}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {line.credit > 0 ? line.credit.toLocaleString('ar-SA') : '-'}
                      </TableCell>
                      <TableCell>{line.costCenter || '-'}</TableCell>
                      <TableCell>{line.projectName || '-'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2} className="text-left">
                      الإجمالي
                    </TableCell>
                    <TableCell className="text-red-600">
                      {selectedEntry.totalDebit.toLocaleString('ar-SA')} ريال
                    </TableCell>
                    <TableCell className="text-green-600">
                      {selectedEntry.totalCredit.toLocaleString('ar-SA')} ريال
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JournalEntries;
