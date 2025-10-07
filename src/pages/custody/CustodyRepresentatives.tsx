import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserPlus, Trash2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import CustodyNavbar from '@/components/CustodyNavbar';

interface Representative {
  id: string;
  name: string;
  total_custody: number;
  current_custody: number;
  remaining_custody: number;
}

const CustodyRepresentatives = () => {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRep, setNewRep] = useState({
    name: '',
    total_custody: 0
  });

  useEffect(() => {
    fetchRepresentatives();
  }, []);

  const fetchRepresentatives = async () => {
    try {
      const { data, error } = await supabase
        .from('custody_representatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRepresentatives(data || []);
    } catch (error) {
      console.error('Error fetching representatives:', error);
      toast.error('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRepresentative = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRep.name) {
      toast.error('الرجاء إدخال اسم المندوب');
      return;
    }

    try {
      const { error } = await supabase
        .from('custody_representatives')
        .insert([{
          name: newRep.name,
          total_custody: newRep.total_custody,
          current_custody: 0,
          remaining_custody: newRep.total_custody
        }]);

      if (error) throw error;

      toast.success('تم إضافة المندوب بنجاح');
      setIsAddDialogOpen(false);
      setNewRep({ name: '', total_custody: 0 });
      fetchRepresentatives();
    } catch (error) {
      console.error('Error adding representative:', error);
      toast.error('حدث خطأ أثناء إضافة المندوب');
    }
  };

  const handleDeleteRepresentative = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المندوب؟')) return;

    try {
      const { error } = await supabase
        .from('custody_representatives')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف المندوب بنجاح');
      fetchRepresentatives();
    } catch (error) {
      console.error('Error deleting representative:', error);
      toast.error('حدث خطأ أثناء حذف المندوب');
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
              عرض وإدارة المندوبين وعهدهم
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
                    value={newRep.name}
                    onChange={(e) => setNewRep({ ...newRep, name: e.target.value })}
                    placeholder="أدخل اسم المندوب"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total">إجمالي العهدة</Label>
                  <Input
                    id="total"
                    type="number"
                    step="0.01"
                    value={newRep.total_custody}
                    onChange={(e) => setNewRep({ ...newRep, total_custody: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <Button type="submit" className="w-full">
                  إضافة المندوب
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {representatives.map((rep) => (
            <Card key={rep.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{rep.name}</CardTitle>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRepresentative(rep.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <span className="font-medium">إجمالي العهدة</span>
                  </div>
                  <span className="text-lg font-bold">
                    {rep.total_custody.toLocaleString('ar-SA')} ريال
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-medium">العهدة الحالية</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {rep.current_custody.toLocaleString('ar-SA')} ريال
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">المتبقي</span>
                  </div>
                  <span className="text-lg font-bold text-orange-600">
                    {rep.remaining_custody.toLocaleString('ar-SA')} ريال
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