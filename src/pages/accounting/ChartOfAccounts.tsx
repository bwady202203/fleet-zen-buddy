import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounting, Account } from "@/contexts/AccountingContext";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Edit, Search, ChevronDown, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ChartOfAccounts = () => {
  const { accounts, addAccount, updateAccount, getChildAccounts, searchAccounts } = useAccounting();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    nameEn: "",
    level: 1 as 1 | 2 | 3 | 4,
    parentId: null as string | null,
    type: "asset" as Account['type'],
    isActive: true,
  });

  const filteredAccounts = searchQuery ? searchAccounts(searchQuery) : accounts;
  const level1Accounts = filteredAccounts.filter(acc => acc.level === 1);

  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAccount) {
      updateAccount(editingAccount.id, formData);
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات الحساب",
      });
    } else {
      addAccount(formData);
      toast({
        title: "تم الإضافة بنجاح",
        description: "تم إضافة الحساب الجديد",
      });
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      nameEn: "",
      level: 1,
      parentId: null,
      type: "asset",
      isActive: true,
    });
    setEditingAccount(null);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      nameEn: account.nameEn,
      level: account.level,
      parentId: account.parentId,
      type: account.type,
      isActive: account.isActive,
    });
    setDialogOpen(true);
  };

  const renderAccountTree = (parentId: string | null, level: number = 1) => {
    const childAccounts = filteredAccounts.filter(acc => 
      acc.parentId === parentId && acc.level === level
    );

    return childAccounts.map(account => {
      const hasChildren = filteredAccounts.some(acc => acc.parentId === account.id);
      const isExpanded = expandedAccounts.has(account.id);
      const indent = (level - 1) * 32;

      return (
        <div key={account.id}>
          <TableRow className="hover:bg-accent/50">
            <TableCell style={{ paddingRight: `${indent + 16}px` }}>
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleExpand(account.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                )}
                {!hasChildren && <div className="w-6" />}
                <span className="font-medium">{account.code}</span>
              </div>
            </TableCell>
            <TableCell className="font-medium">{account.name}</TableCell>
            <TableCell className="text-muted-foreground">{account.nameEn}</TableCell>
            <TableCell className="text-center">{account.level}</TableCell>
            <TableCell className="text-center">
              {account.type === 'asset' && 'أصول'}
              {account.type === 'liability' && 'خصوم'}
              {account.type === 'equity' && 'حقوق ملكية'}
              {account.type === 'revenue' && 'إيرادات'}
              {account.type === 'expense' && 'مصروفات'}
            </TableCell>
            <TableCell className="text-left">
              {account.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(account)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
          {isExpanded && renderAccountTree(account.id, level + 1)}
        </div>
      );
    });
  };

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
                <h1 className="text-3xl font-bold">شجرة الحسابات</h1>
                <p className="text-muted-foreground mt-1">
                  إدارة الدليل المحاسبي - 4 مستويات
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة حساب جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingAccount ? "تعديل الحساب" : "إضافة حساب جديد"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>رمز الحساب</Label>
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="مثال: 1111"
                        required
                      />
                    </div>
                    <div>
                      <Label>المستوى</Label>
                      <Select
                        value={formData.level.toString()}
                        onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) as 1 | 2 | 3 | 4 })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">المستوى الأول</SelectItem>
                          <SelectItem value="2">المستوى الثاني</SelectItem>
                          <SelectItem value="3">المستوى الثالث</SelectItem>
                          <SelectItem value="4">المستوى الرابع</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>اسم الحساب (عربي)</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="مثال: الصندوق"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>اسم الحساب (إنجليزي)</Label>
                    <Input
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Example: Cash Box"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>نوع الحساب</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: Account['type']) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asset">أصول</SelectItem>
                          <SelectItem value="liability">خصوم</SelectItem>
                          <SelectItem value="equity">حقوق ملكية</SelectItem>
                          <SelectItem value="revenue">إيرادات</SelectItem>
                          <SelectItem value="expense">مصروفات</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.level > 1 && (
                      <div>
                        <Label>الحساب الرئيسي</Label>
                        <Select
                          value={formData.parentId || ""}
                          onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الحساب الرئيسي" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts
                              .filter(acc => acc.level < formData.level)
                              .map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.code} - {acc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button type="submit">
                      {editingAccount ? "تحديث" : "إضافة"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بالرمز أو الاسم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رمز الحساب</TableHead>
                  <TableHead className="text-right">اسم الحساب</TableHead>
                  <TableHead className="text-right">الاسم الإنجليزي</TableHead>
                  <TableHead className="text-center">المستوى</TableHead>
                  <TableHead className="text-center">النوع</TableHead>
                  <TableHead className="text-right">الرصيد</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderAccountTree(null, 1)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ChartOfAccounts;
