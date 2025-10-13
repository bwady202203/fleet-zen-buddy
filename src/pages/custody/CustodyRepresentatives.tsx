import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserPlus, Trash2, Edit, Calculator } from 'lucide-react';
import CustodyNavbar from '@/components/CustodyNavbar';

interface RepresentativeAccount {
  id: string;
  name_ar: string;
  code: string;
  balance: number;
  debit_total: number;
  credit_total: number;
}

const CustodyRepresentatives = () => {
  const [representatives, setRepresentatives] = useState<RepresentativeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<RepresentativeAccount | null>(null);
  const [newRepName, setNewRepName] = useState('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [custodyParentId, setCustodyParentId] = useState<string | null>(null);

  useEffect(() => {
    fetchRepresentatives();
  }, []);

  const fetchRepresentatives = async () => {
    try {
      setLoading(true);
      
      // Find the custody parent account (العهد) by code 1111
      const { data: custodyAccount, error: custodyError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('code', '1111')
        .maybeSingle();

      if (custodyError) throw custodyError;
      
      if (!custodyAccount) {
        toast.error('لم يتم العثور على حساب العهد في الدليل المحاسبي');
        setLoading(false);
        return;
      }

      setCustodyParentId(custodyAccount.id);

      // Fetch all sub-accounts under custody account
      const { data: subAccounts, error: subAccountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, name_ar, code, balance')
        .eq('parent_id', custodyAccount.id)
        .order('code');

      if (subAccountsError) throw subAccountsError;

      // Fetch journal entry lines for each account to calculate debit/credit totals
      const accountsWithBalances = await Promise.all(
        (subAccounts || []).map(async (account) => {
          const { data: entries, error: entriesError } = await supabase
            .from('journal_entry_lines')
            .select('debit, credit')
            .eq('account_id', account.id);

          if (entriesError) throw entriesError;

          const debit_total = entries?.reduce((sum, e) => sum + Number(e.debit || 0), 0) || 0;
          const credit_total = entries?.reduce((sum, e) => sum + Number(e.credit || 0), 0) || 0;
          const balance = debit_total - credit_total;

          return {
            ...account,
            debit_total,
            credit_total,
            balance,
          };
        })
      );

      setRepresentatives(accountsWithBalances);
    } catch (error: any) {
      console.error('Error fetching representatives:', error);
      toast.error('حدث خطأ في جلب بيانات المندوبين');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRepresentative = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRepName.trim()) {
      toast.error('الرجاء إدخال اسم المندوب');
      return;
    }

    if (!custodyParentId) {
      toast.error('لم يتم العثور على حساب العهد الرئيسي');
      return;
    }

    try {
      // Get the next account code
      const { data: existingAccounts, error: existingError } = await supabase
        .from('chart_of_accounts')
        .select('code')
        .eq('parent_id', custodyParentId)
        .order('code', { ascending: false })
        .limit(1);

      if (existingError) throw existingError;

      let nextCode = '110201';
      if (existingAccounts && existingAccounts.length > 0) {
        const lastCode = parseInt(existingAccounts[0].code);
        nextCode = (lastCode + 1).toString();
      }

      // Create account in chart of accounts
      const { error: insertError } = await supabase
        .from('chart_of_accounts')
        .insert({
          code: nextCode,
          name_ar: `عهدة ${newRepName}`,
          name_en: `${newRepName} Custody`,
          type: 'asset',
          parent_id: custodyParentId,
          balance: 0
        });

      if (insertError) throw insertError;

      toast.success('تم إضافة المندوب بنجاح');
      setIsAddDialogOpen(false);
      setNewRepName('');
      fetchRepresentatives();
    } catch (error: any) {
      console.error('Error adding representative:', error);
      toast.error('حدث خطأ في إضافة المندوب');
    }
  };

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAccount) return;

    if (!editName.trim()) {
      toast.error('الرجاء إدخال اسم الحساب');
      return;
    }

    if (!editCode.trim()) {
      toast.error('الرجاء إدخال رمز الحساب');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('chart_of_accounts')
        .update({
          name_ar: editName,
          code: editCode,
        })
        .eq('id', editingAccount.id);

      if (updateError) throw updateError;

      toast.success('تم تحديث الحساب بنجاح');
      setIsEditDialogOpen(false);
      setEditingAccount(null);
      setEditName('');
      setEditCode('');
      fetchRepresentatives();
    } catch (error: any) {
      console.error('Error updating account:', error);
      toast.error('حدث خطأ في تحديث الحساب');
    }
  };

  const openEditDialog = (account: RepresentativeAccount) => {
    setEditingAccount(account);
    setEditName(account.name_ar);
    setEditCode(account.code);
    setIsEditDialogOpen(true);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;

    try {
      // Check if account has any journal entries
      const { data: entries, error: entriesError } = await supabase
        .from('journal_entry_lines')
        .select('id')
        .eq('account_id', id)
        .limit(1);

      if (entriesError) throw entriesError;

      if (entries && entries.length > 0) {
        toast.error('لا يمكن حذف الحساب لوجود قيود محاسبية مرتبطة به');
        return;
      }

      const { error } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف الحساب بنجاح');
      fetchRepresentatives();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('حدث خطأ في حذف الحساب');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold">إدارة العهد - المندوبين</h1>
            <p className="text-muted-foreground mt-1">
              عرض وإدارة المندوبين وعهدهم من الدليل المحاسبي
            </p>
          </div>
        </div>
      </header>

      <CustodyNavbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="ml-2 h-4 w-4" />
                إضافة مندوب جديد
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة مندوب جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddRepresentative} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم المندوب</Label>
                  <Input
                    id="name"
                    value={newRepName}
                    onChange={(e) => setNewRepName(e.target.value)}
                    placeholder="أدخل اسم المندوب"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  إضافة المندوب
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل بيانات الحساب</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">اسم الحساب</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="أدخل اسم الحساب"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-code">رمز الحساب</Label>
                <Input
                  id="edit-code"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="أدخل رمز الحساب"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">
                  حفظ التعديلات
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {representatives.map((rep) => (
            <Card key={rep.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{rep.name_ar}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">كود: {rep.code}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(rep)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteAccount(rep.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-green-600" />
                    <span className="font-medium">إجمالي المدين</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {rep.debit_total.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-red-600" />
                    <span className="font-medium">إجمالي الدائن</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {rep.credit_total.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                  </span>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  rep.balance >= 0 ? 'bg-primary/10' : 'bg-orange-500/10'
                }`}>
                  <div className="flex items-center gap-2">
                    <Calculator className={`h-5 w-5 ${rep.balance >= 0 ? 'text-primary' : 'text-orange-600'}`} />
                    <span className="font-medium">الرصيد الختامي</span>
                  </div>
                  <span className={`text-lg font-bold ${rep.balance >= 0 ? 'text-primary' : 'text-orange-600'}`}>
                    {rep.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {representatives.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">
                لا يوجد مندوبين حالياً. قم بإضافة مندوب جديد للبدء.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CustodyRepresentatives;
