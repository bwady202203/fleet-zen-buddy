import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounting, JournalEntryLine } from "@/contexts/AccountingContext";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Trash2, Printer, Eye, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const JournalEntries = () => {
  const { journalEntries, addJournalEntry, searchAccounts, getNextEntryNumber, accounts } = useAccounting();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    lines: [] as JournalEntryLine[],
  });

  const [currentLine, setCurrentLine] = useState({
    accountId: "",
    description: "",
    debit: 0,
    credit: 0,
    costCenter: "",
    projectName: "",
  });

  const [accountSearch, setAccountSearch] = useState("");
  const [showAccountSearch, setShowAccountSearch] = useState(false);

  const filteredAccounts = accountSearch ? searchAccounts(accountSearch) : [];
  const level4Accounts = filteredAccounts.filter(acc => acc.level === 4);

  const addLine = () => {
    if (!currentLine.accountId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار حساب",
        variant: "destructive",
      });
      return;
    }

    if (currentLine.debit === 0 && currentLine.credit === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ في المدين أو الدائن",
        variant: "destructive",
      });
      return;
    }

    const account = accounts.find(acc => acc.id === currentLine.accountId);
    if (!account) return;

    const newLine: JournalEntryLine = {
      id: `line${Date.now()}`,
      accountId: currentLine.accountId,
      accountCode: account.code,
      accountName: account.name,
      description: currentLine.description,
      debit: currentLine.debit,
      credit: currentLine.credit,
      costCenter: currentLine.costCenter,
      projectName: currentLine.projectName,
    };

    setFormData({
      ...formData,
      lines: [...formData.lines, newLine],
    });

    setCurrentLine({
      accountId: "",
      description: "",
      debit: 0,
      credit: 0,
      costCenter: "",
      projectName: "",
    });
    setAccountSearch("");
  };

  const removeLine = (lineId: string) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter(line => line.id !== lineId),
    });
  };

  const totalDebit = formData.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = formData.lines.reduce((sum, line) => sum + line.credit, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = () => {
    if (!isBalanced) {
      toast({
        title: "خطأ",
        description: "القيد غير متوازن. يجب أن يكون مجموع المدين مساوياً لمجموع الدائن",
        variant: "destructive",
      });
      return;
    }

    if (formData.lines.length < 2) {
      toast({
        title: "خطأ",
        description: "يجب إضافة سطرين على الأقل",
        variant: "destructive",
      });
      return;
    }

    addJournalEntry({
      date: formData.date,
      description: formData.description,
      lines: formData.lines,
      totalDebit,
      totalCredit,
      createdBy: "النظام",
    });

    toast({
      title: "تم الحفظ بنجاح",
      description: `تم حفظ القيد رقم ${getNextEntryNumber()}`,
    });

    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: "",
      lines: [],
    });
  };

  const handlePrint = (entry: any) => {
    window.print();
  };

  const handlePreview = (entry: any) => {
    setSelectedEntry(entry);
    setPreviewDialogOpen(true);
  };

  const filteredEntries = journalEntries.filter(entry => {
    if (filterDate && entry.date !== filterDate) return false;
    if (filterAccount && !entry.lines.some(line => line.accountId === filterAccount)) return false;
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
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>سند قيد يومية</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-accent/50 rounded-lg">
                    <div>
                      <Label className="text-sm">رقم القيد</Label>
                      <Input value={getNextEntryNumber()} disabled className="bg-background" />
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
                    <CardHeader>
                      <CardTitle className="text-lg">إضافة سطر جديد</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <Label>الحساب</Label>
                          <Input
                            value={accountSearch}
                            onChange={(e) => {
                              setAccountSearch(e.target.value);
                              setShowAccountSearch(true);
                            }}
                            placeholder="ابحث بالرمز أو الاسم..."
                            onFocus={() => setShowAccountSearch(true)}
                          />
                          {showAccountSearch && level4Accounts.length > 0 && (
                            <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto">
                              <CardContent className="p-2">
                                {level4Accounts.map(acc => (
                                  <div
                                    key={acc.id}
                                    className="p-2 hover:bg-accent cursor-pointer rounded"
                                    onClick={() => {
                                      setCurrentLine({ ...currentLine, accountId: acc.id });
                                      setAccountSearch(`${acc.code} - ${acc.name}`);
                                      setShowAccountSearch(false);
                                    }}
                                  >
                                    <div className="font-medium">{acc.code} - {acc.name}</div>
                                    <div className="text-sm text-muted-foreground">{acc.nameEn}</div>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          )}
                        </div>
                        <div>
                          <Label>البيان</Label>
                          <Input
                            value={currentLine.description}
                            onChange={(e) => setCurrentLine({ ...currentLine, description: e.target.value })}
                            placeholder="بيان العملية"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label>المدين</Label>
                          <Input
                            type="number"
                            value={currentLine.debit || ""}
                            onChange={(e) => setCurrentLine({ ...currentLine, debit: parseFloat(e.target.value) || 0, credit: 0 })}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label>الدائن</Label>
                          <Input
                            type="number"
                            value={currentLine.credit || ""}
                            onChange={(e) => setCurrentLine({ ...currentLine, credit: parseFloat(e.target.value) || 0, debit: 0 })}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label>مركز التكلفة</Label>
                          <Input
                            value={currentLine.costCenter}
                            onChange={(e) => setCurrentLine({ ...currentLine, costCenter: e.target.value })}
                            placeholder="اختياري"
                          />
                        </div>
                        <div>
                          <Label>اسم المشروع</Label>
                          <Input
                            value={currentLine.projectName}
                            onChange={(e) => setCurrentLine({ ...currentLine, projectName: e.target.value })}
                            placeholder="اختياري"
                          />
                        </div>
                      </div>
                      
                      <Button type="button" onClick={addLine} className="w-full">
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة السطر
                      </Button>
                    </CardContent>
                  </Card>

                  {formData.lines.length > 0 && (
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right">الحساب</TableHead>
                              <TableHead className="text-right">البيان</TableHead>
                              <TableHead className="text-right">المدين</TableHead>
                              <TableHead className="text-right">الدائن</TableHead>
                              <TableHead className="text-right">مركز التكلفة</TableHead>
                              <TableHead className="text-right">المشروع</TableHead>
                              <TableHead className="text-center">حذف</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.lines.map(line => (
                              <TableRow key={line.id}>
                                <TableCell className="font-medium">
                                  {line.accountCode} - {line.accountName}
                                </TableCell>
                                <TableCell>{line.description}</TableCell>
                                <TableCell className="text-left font-medium">
                                  {line.debit > 0 ? line.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                                </TableCell>
                                <TableCell className="text-left font-medium">
                                  {line.credit > 0 ? line.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                                </TableCell>
                                <TableCell>{line.costCenter || '-'}</TableCell>
                                <TableCell>{line.projectName || '-'}</TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeLine(line.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-bold bg-accent/50">
                              <TableCell colSpan={2} className="text-right">الإجمالي</TableCell>
                              <TableCell className="text-left">
                                {totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-left">
                                {totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell colSpan={3}>
                                {isBalanced ? (
                                  <span className="text-green-600">✓ القيد متوازن</span>
                                ) : (
                                  <span className="text-destructive">✗ القيد غير متوازن</span>
                                )}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={!isBalanced}>
                      حفظ القيد
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
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              فلترة القيود
            </CardTitle>
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
                <Select value={filterAccount} onValueChange={setFilterAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الحسابات" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(acc => acc.level === 4).map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterAccount && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFilterAccount("")}
                    className="mt-1 text-xs"
                  >
                    إلغاء الفلتر
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
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
                {filteredEntries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                    <TableCell>{new Date(entry.date).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-left font-medium">
                      {entry.totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left font-medium">
                      {entry.totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(entry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
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
          </CardContent>
        </Card>
      </main>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>معاينة القيد - {selectedEntry?.entryNumber}</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-accent/50 rounded-lg">
                <div>
                  <span className="font-medium">رقم القيد:</span> {selectedEntry.entryNumber}
                </div>
                <div>
                  <span className="font-medium">التاريخ:</span> {new Date(selectedEntry.date).toLocaleDateString('ar-SA')}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">البيان:</span> {selectedEntry.description}
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الحساب</TableHead>
                    <TableHead className="text-right">البيان</TableHead>
                    <TableHead className="text-right">المدين</TableHead>
                    <TableHead className="text-right">الدائن</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEntry.lines.map((line: JournalEntryLine) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.accountCode} - {line.accountName}</TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-left">
                        {line.debit > 0 ? line.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                      </TableCell>
                      <TableCell className="text-left">
                        {line.credit > 0 ? line.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-accent/50">
                    <TableCell colSpan={2}>الإجمالي</TableCell>
                    <TableCell className="text-left">
                      {selectedEntry.totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-left">
                      {selectedEntry.totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </TableCell>
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
