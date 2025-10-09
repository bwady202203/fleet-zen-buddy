import { useState } from 'react';
import { Building2, Plus, ChevronDown, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export const OrganizationSelector = () => {
  const { currentOrganization, organizations, setCurrentOrganization, createOrganization, updateOrganization } = useOrganization();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [commercialReg, setCommercialReg] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم الشركة');
      return;
    }

    setLoading(true);
    const { error } = await createOrganization({
      name,
      name_en: nameEn || undefined,
      address: address || undefined,
      tax_number: taxNumber || undefined,
      commercial_registration: commercialReg || undefined,
      phone: phone || undefined,
      email: email || undefined
    });
    setLoading(false);

    if (error) {
      toast.error('فشل إنشاء الشركة');
      return;
    }

    toast.success('تم إنشاء الشركة بنجاح');
    setShowCreateDialog(false);
    resetForm();
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setLoading(true);
    const { error } = await updateOrganization(currentOrganization.id, {
      name,
      name_en: nameEn || undefined,
      address: address || undefined,
      tax_number: taxNumber || undefined,
      commercial_registration: commercialReg || undefined,
      phone: phone || undefined,
      email: email || undefined
    });
    setLoading(false);

    if (error) {
      toast.error('فشل تحديث إعدادات الشركة');
      return;
    }

    toast.success('تم تحديث إعدادات الشركة');
    setShowSettingsDialog(false);
  };

  const openSettings = () => {
    if (currentOrganization) {
      setName(currentOrganization.name);
      setNameEn(currentOrganization.name_en || '');
      setAddress(currentOrganization.address || '');
      setTaxNumber(currentOrganization.tax_number || '');
      setCommercialReg(currentOrganization.commercial_registration || '');
      setPhone(currentOrganization.phone || '');
      setEmail(currentOrganization.email || '');
      setShowSettingsDialog(true);
    }
  };

  const resetForm = () => {
    setName('');
    setNameEn('');
    setAddress('');
    setTaxNumber('');
    setCommercialReg('');
    setPhone('');
    setEmail('');
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
        <DropdownMenuContent align="end" className="w-56 bg-card z-50">
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openSettings} className="text-primary">
            <Settings className="ml-2 h-4 w-4" />
            إعدادات الشركة
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { resetForm(); setShowCreateDialog(true); }} className="text-primary">
            <Plus className="ml-2 h-4 w-4" />
            إنشاء شركة جديدة
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء شركة جديدة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الشركة (عربي) *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">اسم الشركة (إنجليزي)</Label>
                <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">العنوان</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxNumber">الرقم الضريبي</Label>
                <Input id="taxNumber" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commercialReg">السجل التجاري</Label>
                <Input id="commercialReg" value={commercialReg} onChange={(e) => setCommercialReg(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">الهاتف</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} disabled={loading}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'جاري الإنشاء...' : 'إنشاء'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إعدادات الشركة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settingsName">اسم الشركة (عربي) *</Label>
                <Input id="settingsName" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settingsNameEn">اسم الشركة (إنجليزي)</Label>
                <Input id="settingsNameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settingsAddress">العنوان</Label>
              <Input id="settingsAddress" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settingsTaxNumber">الرقم الضريبي</Label>
                <Input id="settingsTaxNumber" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settingsCommercialReg">السجل التجاري</Label>
                <Input id="settingsCommercialReg" value={commercialReg} onChange={(e) => setCommercialReg(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settingsPhone">الهاتف</Label>
                <Input id="settingsPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settingsEmail">البريد الإلكتروني</Label>
                <Input id="settingsEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowSettingsDialog(false)} disabled={loading}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
