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
import { ArrowRight, Plus, Edit, Search, ChevronDown, ChevronLeft, List, Table2, Trash2, Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  type: string;
  parent_id: string | null;
  is_active: boolean;
  balance: number;
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
  const [viewMode, setViewMode] = useState<"tree" | "table">("table");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAccounts, setBulkAccounts] = useState<Array<{code: string; name_ar: string; name_en: string; type: string; parent_id: string | null}>>([]);
  const [formData, setFormData] = useState({
    code: "",
    name_ar: "",
    name_en: "",
    parent_id: null as string | null,
    type: "asset",
    is_active: true,
    balance: 0,
  });

  useEffect(() => {
    fetchAccounts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('chart-of-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chart_of_accounts'
        },
        (payload) => {
          console.log('Chart of accounts changed:', payload);
          fetchAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const generateAccountCode = (parentId: string | null = null): string => {
    if (!parentId) {
      // For root accounts, find the next available number
      const rootAccounts = accounts.filter(acc => !acc.parent_id);
      const maxCode = rootAccounts.reduce((max, acc) => {
        const codeNum = parseInt(acc.code) || 0;
        return Math.max(max, codeNum);
      }, 0);
      return String(maxCode + 1);
    } else {
      // For sub-accounts, use parent code + sequence number based on last existing sub-account
      const parent = accounts.find(acc => acc.id === parentId);
      if (!parent) return "1";
      
      const siblings = accounts.filter(acc => acc.parent_id === parentId);
      const maxSubCode = siblings.reduce((max, acc) => {
        if (acc.code.startsWith(parent.code)) {
          const suffix = acc.code.substring(parent.code.length);
          const num = parseInt(suffix) || 0;
          return Math.max(max, num);
        }
        return max;
      }, 0);
      
      return `${parent.code}${String(maxSubCode + 1).padStart(2, '0')}`;
    }
  };

  // Update account code when parent changes
  useEffect(() => {
    if (!editingAccount && dialogOpen) {
      const newCode = generateAccountCode(formData.parent_id);
      setFormData(prev => ({ ...prev, code: newCode }));
    }
  }, [formData.parent_id, dialogOpen, editingAccount]);

  const resetForm = (parentId: string | null = null) => {
    setFormData({
      code: generateAccountCode(parentId),
      name_ar: "",
      name_en: "",
      parent_id: parentId,
      type: "asset",
      is_active: true,
      balance: 0,
    });
    setEditingAccount(null);
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;
    
    try {
      // Check if account has children
      const hasChildren = accounts.some(acc => acc.parent_id === accountToDelete.id);
      if (hasChildren) {
        toast({
          title: "لا يمكن الحذف / Cannot Delete",
          description: "لا يمكن حذف حساب له حسابات فرعية / Cannot delete account with sub-accounts",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', accountToDelete.id);

      if (error) throw error;

      toast({
        title: "تم الحذف بنجاح / Deleted Successfully",
        description: "تم حذف الحساب / Account has been deleted",
      });
      
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "خطأ / Error",
        description: "حدث خطأ في حذف الحساب / Error deleting account",
        variant: "destructive",
      });
    }
  };

  const handleAddSubAccount = (parentAccount: Account) => {
    resetForm(parentAccount.id);
    setDialogOpen(true);
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
      balance: account.balance,
    });
    setDialogOpen(true);
  };

  const confirmDelete = (account: Account) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const exportToExcel = () => {
    const exportData = accounts.map(acc => ({
      'رمز الحساب / Code': acc.code,
      'الاسم بالعربي / Name (AR)': acc.name_ar,
      'الاسم بالإنجليزي / Name (EN)': acc.name_en,
      'النوع / Type': acc.type === 'asset' ? 'أصول / Assets' :
                      acc.type === 'liability' ? 'خصوم / Liabilities' :
                      acc.type === 'equity' ? 'حقوق ملكية / Equity' :
                      acc.type === 'revenue' ? 'إيرادات / Revenue' : 'مصروفات / Expenses',
      'الرصيد / Balance': acc.balance,
      'الحساب الرئيسي / Parent': acc.parent_id ? accounts.find(a => a.id === acc.parent_id)?.code : '',
      'نشط / Active': acc.is_active ? 'نعم / Yes' : 'لا / No'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chart of Accounts");
    
    // Auto-size columns
    const maxWidth = exportData.reduce((w, r) => Math.max(w, String(r['الاسم بالعربي / Name (AR)']).length), 10);
    ws['!cols'] = [
      { wch: 15 }, { wch: maxWidth }, { wch: maxWidth }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
    ];
    
    XLSX.writeFile(wb, `شجرة_الحسابات_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "تم التحميل بنجاح",
      description: "تم تحميل ملف Excel بنجاح",
    });
  };

  const handleBulkAdd = () => {
    setBulkAccounts([{
      code: generateAccountCode(),
      name_ar: '',
      name_en: '',
      type: 'asset',
      parent_id: null
    }]);
    setBulkDialogOpen(true);
  };

  const addBulkRow = () => {
    const lastAccount = bulkAccounts[bulkAccounts.length - 1];
    setBulkAccounts([...bulkAccounts, {
      code: generateAccountCode(lastAccount.parent_id),
      name_ar: '',
      name_en: '',
      type: lastAccount.type,
      parent_id: lastAccount.parent_id
    }]);
  };

  const updateBulkAccount = (index: number, field: string, value: any) => {
    const updated = [...bulkAccounts];
    updated[index] = { ...updated[index], [field]: value };
    setBulkAccounts(updated);
  };

  const removeBulkRow = (index: number) => {
    setBulkAccounts(bulkAccounts.filter((_, i) => i !== index));
  };

  const handleBulkSubmit = async () => {
    try {
      const validAccounts = bulkAccounts.filter(acc => acc.code && acc.name_ar);
      
      if (validAccounts.length === 0) {
        toast({
          title: "خطأ",
          description: "يجب إدخال بيانات صحيحة",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('chart_of_accounts')
        .insert(validAccounts.map(acc => ({
          ...acc,
          is_active: true,
          balance: 0
        })));

      if (error) throw error;

      toast({
        title: "تم الإضافة بنجاح",
        description: `تم إضافة ${validAccounts.length} حساب بنجاح`,
      });

      setBulkDialogOpen(false);
      setBulkAccounts([]);
      fetchAccounts();
    } catch (error) {
      console.error('Error bulk adding accounts:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في إضافة الحسابات",
        variant: "destructive",
      });
    }
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

  const renderTreeView = () => {
    const renderAccount = (account: Account, level: number = 0) => {
      const children = filteredAccounts.filter(acc => acc.parent_id === account.id);
      const isExpanded = expandedAccounts.has(account.id);
      
      return (
        <div key={account.id}>
          <div 
            className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-lg cursor-pointer"
            style={{ paddingRight: `${level * 2}rem` }}
          >
            {children.length > 0 && (
              <button onClick={() => toggleExpand(account.id)} className="p-1">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            )}
            <div className="flex-1 flex items-center gap-4">
              <span className="font-semibold">{account.code}</span>
              <span>{account.name_ar}</span>
              <span className="text-muted-foreground text-sm" dir="ltr">{account.name_en}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">
                {account.balance.toLocaleString('ar-SA')} ر.س
              </span>
              <span className="text-sm text-muted-foreground">
                {account.type === 'asset' && 'أصول / Assets'}
                {account.type === 'liability' && 'خصوم / Liabilities'}
                {account.type === 'equity' && 'حقوق ملكية / Equity'}
                {account.type === 'revenue' && 'إيرادات / Revenue'}
                {account.type === 'expense' && 'مصروفات / Expenses'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddSubAccount(account)}
                title="إضافة حساب فرعي / Add Sub-Account"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(account)}
                title="تعديل / Edit"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => confirmDelete(account)}
                title="حذف / Delete"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {isExpanded && children.length > 0 && (
            <div>
              {children.map(child => renderAccount(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    const rootAccounts = filteredAccounts.filter(acc => !acc.parent_id);
    return rootAccounts.map(account => renderAccount(account));
  };

  const renderAccountsTable = () => {
    const level1Accounts = getLevel1Accounts();
    
    return level1Accounts.map(level1 => {
      const level2Accounts = getLevel2Accounts(level1.id);
      
      if (level2Accounts.length === 0) {
        return (
          <TableRow key={level1.id} className="hover:bg-accent/50">
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="font-bold text-primary">
                  {level1.code} - {level1.name_ar}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleAddSubAccount(level1)}
                  title="إضافة حساب فرعي"
                >
                  <Plus className="h-3 w-3 text-primary" />
              </Button>
            </div>
          </TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell className="text-center font-semibold text-primary">
            {level1.balance.toLocaleString('ar-SA')}
          </TableCell>
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
            <Button variant="ghost" size="sm" onClick={() => confirmDelete(level1)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
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
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-primary">
                      {level1.code} - {level1.name_ar}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleAddSubAccount(level1)}
                      title="إضافة حساب فرعي"
                    >
                      <Plus className="h-3 w-3 text-primary" />
                    </Button>
                  </div>
                </TableCell>
              ) : null}
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-secondary-foreground">
                    {level2.code} - {level2.name_ar}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleAddSubAccount(level2)}
                    title="إضافة حساب فرعي"
                  >
                    <Plus className="h-3 w-3 text-secondary-foreground" />
                  </Button>
                </div>
            </TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell className="text-center font-semibold text-primary">
              {level2.balance.toLocaleString('ar-SA')}
            </TableCell>
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
              <Button variant="ghost" size="sm" onClick={() => confirmDelete(level2)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
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
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-primary">
                      {level1.code} - {level1.name_ar}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleAddSubAccount(level1)}
                      title="إضافة حساب فرعي"
                    >
                      <Plus className="h-3 w-3 text-primary" />
                    </Button>
                  </div>
                </TableCell>
              ) : null}
              {idx3 === 0 ? (
                <TableCell rowSpan={level3Accounts.reduce((sum, l3) => sum + Math.max(1, getLevel4Accounts(l3.id).length), 0)} className="border-l">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-secondary-foreground">
                      {level2.code} - {level2.name_ar}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleAddSubAccount(level2)}
                      title="إضافة حساب فرعي"
                    >
                      <Plus className="h-3 w-3 text-secondary-foreground" />
                    </Button>
                  </div>
                </TableCell>
              ) : null}
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="pr-2">
                    {level3.code} - {level3.name_ar}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleAddSubAccount(level3)}
                    title="إضافة حساب فرعي"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
                <TableCell></TableCell>
                <TableCell className="text-center font-semibold text-primary">
                  {level3.balance.toLocaleString('ar-SA')}
                </TableCell>
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
                  <Button variant="ghost" size="sm" onClick={() => confirmDelete(level3)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
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
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-primary">
                      {level1.code} - {level1.name_ar}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleAddSubAccount(level1)}
                      title="إضافة حساب فرعي"
                    >
                      <Plus className="h-3 w-3 text-primary" />
                    </Button>
                  </div>
                </TableCell>
              ) : null}
              {idx3 === 0 && idx4 === 0 ? (
                <TableCell rowSpan={level3Accounts.reduce((sum, l3) => sum + Math.max(1, getLevel4Accounts(l3.id).length), 0)} className="border-l">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-secondary-foreground">
                      {level2.code} - {level2.name_ar}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleAddSubAccount(level2)}
                      title="إضافة حساب فرعي"
                    >
                      <Plus className="h-3 w-3 text-secondary-foreground" />
                    </Button>
                  </div>
                </TableCell>
              ) : null}
              {idx4 === 0 ? (
                <TableCell rowSpan={level4Accounts.length} className="border-l">
                  <div className="flex items-center gap-2">
                    <div className="pr-2">
                      {level3.code} - {level3.name_ar}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleAddSubAccount(level3)}
                      title="إضافة حساب فرعي"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              ) : null}
              <TableCell>
                <div className="pr-4">
                  {level4.code} - {level4.name_ar}
                </div>
              </TableCell>
              <TableCell className="text-center font-semibold text-primary">
                {level4.balance.toLocaleString('ar-SA')}
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
                <Button variant="ghost" size="sm" onClick={() => confirmDelete(level4)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
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
                <h1 className="text-3xl font-bold">شجرة الحسابات / Chart of Accounts</h1>
                <p className="text-muted-foreground mt-1">
                  إدارة الدليل المحاسبي - 4 مستويات / Manage Chart of Accounts - 4 Levels
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToExcel} variant="outline">
                <Download className="h-4 w-4 ml-2" />
                تحميل Excel
              </Button>
              <Button onClick={handleBulkAdd} variant="outline">
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                إضافة دفعة
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة حساب جديد / Add New Account
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingAccount ? "تعديل الحساب / Edit Account" : "إضافة حساب جديد / Add New Account"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>نوع الحساب / Account Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asset">أصول / Assets</SelectItem>
                          <SelectItem value="liability">خصوم / Liabilities</SelectItem>
                          <SelectItem value="equity">حقوق ملكية / Equity</SelectItem>
                          <SelectItem value="revenue">إيرادات / Revenue</SelectItem>
                          <SelectItem value="expense">مصروفات / Expenses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>الحساب الرئيسي / Parent Account</Label>
                      <Select
                        value={formData.parent_id || "none"}
                        onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? null : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="بدون حساب رئيسي / No Parent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون حساب رئيسي / No Parent</SelectItem>
                          {accounts
                            .filter(acc => {
                              // Filter by type
                              if (acc.type !== formData.type) return false;
                              // Calculate level and exclude level 4 accounts
                              const level = getAccountLevel(acc);
                              return level < 4;
                            })
                            .map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name_ar}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>رمز الحساب / Account Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="مثال: 1111 / Example: 1111"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>اسم الحساب (عربي) / Account Name (Arabic)</Label>
                    <Input
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      placeholder="مثال: الصندوق / Example: Cash"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>اسم الحساب (إنجليزي) / Account Name (English)</Label>
                    <Input
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      placeholder="Example: Cash Box"
                    />
                  </div>
                  
                  <div>
                    <Label>الرصيد الافتتاحي / Opening Balance</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      إلغاء / Cancel
                    </Button>
                    <Button type="submit">
                      {editingAccount ? "تحديث / Update" : "إضافة / Add"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
              </Dialog>
            </div>
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
                    placeholder="ابحث بالرمز أو الاسم... / Search by code or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "tree" | "table")} className="w-auto">
                <TabsList>
                  <TabsTrigger value="table" className="gap-2">
                    <Table2 className="h-4 w-4" />
                    <span>جدول / Table</span>
                  </TabsTrigger>
                  <TabsTrigger value="tree" className="gap-2">
                    <List className="h-4 w-4" />
                    <span>شجرة / Tree</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "table" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-1/5">المستوى الأول / Level 1</TableHead>
                    <TableHead className="text-right w-1/5">المستوى الثاني / Level 2</TableHead>
                    <TableHead className="text-right w-1/5">المستوى الثالث / Level 3</TableHead>
                    <TableHead className="text-right w-1/5">المستوى الرابع / Level 4</TableHead>
                    <TableHead className="text-center w-1/12">الرصيد / Balance</TableHead>
                    <TableHead className="text-center w-1/12">النوع / Type</TableHead>
                    <TableHead className="text-center w-1/12">إجراءات / Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderAccountsTable()}
                </TableBody>
              </Table>
            ) : (
              <div className="space-y-2">
                {renderTreeView()}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف / Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف الحساب "{accountToDelete?.name_ar}"؟ لا يمكن التراجع عن هذا الإجراء.
                <br />
                Are you sure you want to delete the account "{accountToDelete?.name_en}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء / Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                حذف / Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة حسابات متعددة / Add Multiple Accounts</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رمز الحساب / Code</TableHead>
                    <TableHead className="text-right">الاسم عربي / Name AR</TableHead>
                    <TableHead className="text-right">الاسم إنجليزي / Name EN</TableHead>
                    <TableHead className="text-right">النوع / Type</TableHead>
                    <TableHead className="text-right">الحساب الرئيسي / Parent</TableHead>
                    <TableHead className="text-center">حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkAccounts.map((account, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={account.code}
                          onChange={(e) => updateBulkAccount(index, 'code', e.target.value)}
                          placeholder="1111"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={account.name_ar}
                          onChange={(e) => updateBulkAccount(index, 'name_ar', e.target.value)}
                          placeholder="اسم الحساب"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={account.name_en}
                          onChange={(e) => updateBulkAccount(index, 'name_en', e.target.value)}
                          placeholder="Account Name"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={account.type}
                          onValueChange={(value) => updateBulkAccount(index, 'type', value)}
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
                      </TableCell>
                      <TableCell>
                        <Select
                          value={account.parent_id || "none"}
                          onValueChange={(value) => updateBulkAccount(index, 'parent_id', value === "none" ? null : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="لا يوجد" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">لا يوجد</SelectItem>
                            {accounts.map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name_ar}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBulkRow(index)}
                          disabled={bulkAccounts.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={addBulkRow}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة صف / Add Row
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setBulkDialogOpen(false)}>
                    إلغاء / Cancel
                  </Button>
                  <Button type="button" onClick={handleBulkSubmit}>
                    حفظ الكل / Save All
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ChartOfAccounts;
