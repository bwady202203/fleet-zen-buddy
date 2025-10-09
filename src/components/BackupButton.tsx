import { useState } from 'react';
import { Database, Download } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export const BackupButton = () => {
  const [loading, setLoading] = useState(false);
  const { currentOrganization } = useOrganization();

  const handleBackup = async () => {
    if (!currentOrganization) {
      toast.error('لم يتم اختيار شركة');
      return;
    }

    setLoading(true);
    toast.info('جاري إنشاء النسخة الاحتياطية...');

    try {
      const backupData: Record<string, any> = {
        organization: currentOrganization,
        backup_date: new Date().toISOString(),
        tables: {}
      };

      // Fetch data from main tables
      const fetchTable = async (tableName: string) => {
        try {
          const { data, error } = await supabase.from(tableName as any).select('*');
          if (!error && data) {
            backupData.tables[tableName] = data;
          }
        } catch (err) {
          console.error(`Error backing up ${tableName}:`, err);
        }
      };

      await Promise.all([
        fetchTable('chart_of_accounts'),
        fetchTable('journal_entries'),
        fetchTable('journal_entry_lines'),
        fetchTable('invoices'),
        fetchTable('invoice_items'),
        fetchTable('employees'),
        fetchTable('employee_transactions'),
        fetchTable('vehicles'),
        fetchTable('loads'),
        fetchTable('companies'),
        fetchTable('drivers'),
        fetchTable('spare_parts'),
        fetchTable('cost_centers'),
        fetchTable('projects')
      ]);

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${currentOrganization.name}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('تم إنشاء النسخة الاحتياطية بنجاح');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('فشل إنشاء النسخة الاحتياطية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleBackup}
      disabled={loading}
      className="gap-2"
    >
      <Database className="h-4 w-4" />
      {loading ? 'جاري النسخ...' : 'نسخ احتياطي'}
      <Download className="h-4 w-4" />
    </Button>
  );
};
