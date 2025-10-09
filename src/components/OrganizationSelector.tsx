import { useState } from 'react';
import { Building2, Plus, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export const OrganizationSelector = () => {
  const { currentOrganization, organizations, setCurrentOrganization, createOrganization } = useOrganization();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم الشركة');
      return;
    }

    setLoading(true);
    const { error } = await createOrganization(name, nameEn || undefined);
    setLoading(false);

    if (error) {
      toast.error('فشل إنشاء الشركة');
      console.error(error);
      return;
    }

    toast.success('تم إنشاء الشركة بنجاح');
    setShowCreateDialog(false);
    setName('');
    setNameEn('');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span>{currentOrganization?.name || 'اختر شركة'}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => setCurrentOrganization(org)}
              className={currentOrganization?.id === org.id ? 'bg-accent' : ''}
            >
              <Building2 className="ml-2 h-4 w-4" />
              {org.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => setShowCreateDialog(true)} className="text-primary">
            <Plus className="ml-2 h-4 w-4" />
            إنشاء شركة جديدة
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء شركة جديدة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">اسم الشركة (عربي) *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسم الشركة"
                required
              />
            </div>
            <div>
              <Label htmlFor="nameEn">اسم الشركة (إنجليزي)</Label>
              <Input
                id="nameEn"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={loading}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'جاري الإنشاء...' : 'إنشاء'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
