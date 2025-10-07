import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Edit, Search, ChevronDown, ChevronLeft } from "lucide-react";
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
  created_at: string;
  updated_at: string;
}

const ChartOfAccounts = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name_ar: "",
    name_en: "",
    parent_id: null as string | null,
    type: "asset",
    is_active: true,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Auto-expand all accounts after loading
  useEffect(() => {
    if (accounts.length > 0) {
      const allAccountIds = new Set(accounts.map(acc => acc.id));
      setExpandedAccounts(allAccountIds);
    }
  }, [accounts]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('code');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل الحسابات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = searchQuery 
    ? accounts.filter(acc => 
        acc.code.includes(searchQuery) || 
        acc.name_ar.includes(searchQuery) || 
        acc.name_en.includes(searchQuery)
      )
    : accounts;

  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAccount) {
        const { error } = await supabase
          .from('chart_of_accounts')
          .update(formData)
          .eq('id', editingAccount.id);

        if (error) throw error;

        toast({
          title: "تم التحديث بنجاح",
          description: "تم تحديث بيانات الحساب",
        });
      } else {
        const { error } = await supabase
          .from('chart_of_accounts')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "تم الإضافة بنجاح",
          description: "تم إضافة الحساب الجديد",
        });
      }
      
      setDialogOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حفظ الحساب",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name_ar: "",
      name_en: "",
      parent_id: null,
      type: "asset",
      is_active: true,
    });
    setEditingAccount(null);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name_ar: account.name_ar,
      name_en: account.name_en,
      parent_id: account.parent_id,
      type: account.type,
      is_active: account.is_active,
    });
    setDialogOpen(true);
  };

  const getAccountLevel = (account: Account): number => {
    if (!account.parent_id) return 1;
    const parent = accounts.find(a => a.id === account.parent_id);
    if (!parent) return 1;
    return getAccountLevel(parent) + 1;
  };

  const getLevel1Accounts = () => {
    return filteredAccounts.filter(acc => !acc.parent_id);
  };

  const getLevel2Accounts = (level1Id: string) => {
    return filteredAccounts.filter(acc => acc.parent_id === level1Id);
  };

  const getLevel3Accounts = (level2Id: string) => {
    return filteredAccounts.filter(acc => acc.parent_id === level2Id);
  };

  const getLevel4Accounts = (level3Id: string) => {
    return filteredAccounts.filter(acc => acc.parent_id === level3Id);
  };

  const renderAccountsTable = () => {
    const level1Accounts = getLevel1Accounts();
    
    return level1Accounts.map(level1 => {
      const level2Accounts = getLevel2Accounts(level1.id);
      
      if (level2Accounts.length === 0) {
        return (
          <TableRow key={level1.id} className="hover:bg-accent/50">
            <TableCell>
              <div className="font-bold text-primary">
                {level1.code} - {level1.name_ar}
              </div>
            </TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell className="text-center">
              {level1.type === 'asset' && 'أصول'}
              {level1.type === 'liability' && 'خصوم'}
              {level1.type === 'equity' && 'حقوق ملكية'}
              {level1.type === 'revenue' && 'إيرادات'}
              {level1.type === 'expense' && 'مصروفات'}
            </TableCell>
            <TableCell className="text-center">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(level1)}>
                <Edit className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        );
      }

      return level2Accounts.map((level2, idx2) => {
        const level3Accounts = getLevel3Accounts(level2.id);
        
        if (level3Accounts.length === 0) {
          return (
            <TableRow key={level2.id} className="hover:bg-accent/50">
              {idx2 === 0 ? (
                <TableCell rowSpan={level2Accounts.reduce((sum, l2) => {
                  const l3s = getLevel3Accounts(l2.id);
                  if (l3s.length === 0) return sum + 1;
                  return sum + l3s.reduce((s, l3) => s + Math.max(1, getLevel4Accounts(l3.id).length), 0);
                }, 0)} className="border-l">
                  <div className="font-bold text-primary">
                    {level1.code} - {level1.name_ar}
                  </div>
                </TableCell>
              ) : null}
              <TableCell>
                <div className="font-semibold text-secondary-foreground">
                  {level2.code} - {level2.name_ar}
                </div>
              </TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell className="text-center">
                {level2.type === 'asset' && 'أصول'}
                {level2.type === 'liability' && 'خصوم'}
                {level2.type === 'equity' && 'حقوق ملكية'}
                {level2.type === 'revenue' && 'إيرادات'}
                {level2.type === 'expense' && 'مصروفات'}
              </TableCell>
              <TableCell className="text-center">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(level2)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        }

        return level3Accounts.map((level3, idx3) => {
          const level4Accounts = getLevel4Accounts(level3.id);
          
          if (level4Accounts.length === 0) {
            return (
              <TableRow key={level3.id} className="hover:bg-accent/50">
                {idx2 === 0 && idx3 === 0 ? (
                  <TableCell rowSpan={level2Accounts.reduce((sum, l2) => {
                    const l3s = getLevel3Accounts(l2.id);
                    return sum + l3s.reduce((s, l3) => s + Math.max(1, getLevel4Accounts(l3.id).length), 0);
                  }, 0)} className="border-l">
                    <div className="font-bold text-primary">
                      {level1.code} - {level1.name_ar}
                    </div>
                  </TableCell>
                ) : null}
                {idx3 === 0 ? (
                  <TableCell rowSpan={level3Accounts.reduce((sum, l3) => sum + Math.max(1, getLevel4Accounts(l3.id).length), 0)} className="border-l">
                    <div className="font-semibold text-secondary-foreground">
                      {level2.code} - {level2.name_ar}
                    </div>
                  </TableCell>
                ) : null}
                <TableCell>
                  <div className="pr-2">
                    {level3.code} - {level3.name_ar}
                  </div>
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="text-center">
                  {level3.type === 'asset' && 'أصول'}
                  {level3.type === 'liability' && 'خصوم'}
                  {level3.type === 'equity' && 'حقوق ملكية'}
                  {level3.type === 'revenue' && 'إيرادات'}
                  {level3.type === 'expense' && 'مصروفات'}
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(level3)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          }

          return level4Accounts.map((level4, idx4) => (
            <TableRow key={level4.id} className="hover:bg-accent/50">
              {idx2 === 0 && idx3 === 0 && idx4 === 0 ? (
                <TableCell rowSpan={level2Accounts.reduce((sum, l2) => {
                  const l3s = getLevel3Accounts(l2.id);
                  return sum + l3s.reduce((s, l3) => s + Math.max(1, getLevel4Accounts(l3.id).length), 0);
                }, 0)} className="border-l">
                  <div className="font-bold text-primary">
                    {level1.code} - {level1.name_ar}
                  </div>
                </TableCell>
              ) : null}
              {idx3 === 0 && idx4 === 0 ? (
                <TableCell rowSpan={level3Accounts.reduce((sum, l3) => sum + Math.max(1, getLevel4Accounts(l3.id).length), 0)} className="border-l">
                  <div className="font-semibold text-secondary-foreground">
                    {level2.code} - {level2.name_ar}
                  </div>
                </TableCell>
              ) : null}
              {idx4 === 0 ? (
                <TableCell rowSpan={level4Accounts.length} className="border-l">
                  <div className="pr-2">
                    {level3.code} - {level3.name_ar}
                  </div>
                </TableCell>
              ) : null}
              <TableCell>
                <div className="pr-4">
                  {level4.code} - {level4.name_ar}
                </div>
              </TableCell>
              <TableCell className="text-center">
                {level4.type === 'asset' && 'أصول'}
                {level4.type === 'liability' && 'خصوم'}
                {level4.type === 'equity' && 'حقوق ملكية'}
                {level4.type === 'revenue' && 'إيرادات'}
                {level4.type === 'expense' && 'مصروفات'}
              </TableCell>
              <TableCell className="text-center">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(level4)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ));
        });
      });
    });
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-lg">جاري تحميل الحسابات...</p>
        </div>
      </div>
    );
  }

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
                    <Label>اسم الحساب (عربي)</Label>
                    <Input
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      placeholder="مثال: الصندوق"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>اسم الحساب (إنجليزي)</Label>
                    <Input
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      placeholder="Example: Cash Box"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>نوع الحساب</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
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
                    
                    <div>
                      <Label>الحساب الرئيسي</Label>
                      <Select
                        value={formData.parent_id || "none"}
                        onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? null : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="بدون حساب رئيسي" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون حساب رئيسي</SelectItem>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name_ar}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                  <TableHead className="text-right w-1/5">المستوى الأول</TableHead>
                  <TableHead className="text-right w-1/5">المستوى الثاني</TableHead>
                  <TableHead className="text-right w-1/5">المستوى الثالث</TableHead>
                  <TableHead className="text-right w-1/5">المستوى الرابع</TableHead>
                  <TableHead className="text-center w-1/10">النوع</TableHead>
                  <TableHead className="text-center w-1/10">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderAccountsTable()}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ChartOfAccounts;
