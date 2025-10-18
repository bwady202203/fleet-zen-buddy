import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SparePart {
  id: string;
  name: string;
  price: number;
  quantity: number;
  minQuantity: number;
  unit: string;
}

export interface Purchase {
  id: string;
  date: string;
  spareParts: { sparePartId: string; quantity: number; price: number }[];
  totalCost: number;
  supplier: string;
  notes: string;
}

export interface StockTransaction {
  id: string;
  date: string;
  sparePartId: string;
  type: "purchase" | "maintenance";
  quantity: number;
  balanceAfter: number;
  reference: string; // reference to purchase or maintenance ID
  notes: string;
}

interface SparePartsContextType {
  spareParts: SparePart[];
  purchases: Purchase[];
  stockTransactions: StockTransaction[];
  addSparePart: (part: Omit<SparePart, "id">) => Promise<void>;
  updateSparePart: (id: string, part: Partial<SparePart>) => Promise<void>;
  deleteSparePart: (id: string) => Promise<void>;
  addPurchase: (purchase: Omit<Purchase, "id">) => Promise<void>;
  updatePurchase: (id: string, purchase: Partial<Omit<Purchase, "id">>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  deductQuantity: (sparePartId: string, quantity: number, reference: string, notes: string) => Promise<boolean>;
}

const SparePartsContext = createContext<SparePartsContextType | undefined>(undefined);

export const SparePartsProvider = ({ children }: { children: ReactNode }) => {
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadSpareParts();
    loadPurchases();
    loadStockTransactions();
  }, []);

  const loadSpareParts = async () => {
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const mapped: SparePart[] = data.map(p => ({
          id: p.id,
          name: p.name,
          price: Number(p.unit_price) || 0,
          quantity: p.quantity || 0,
          minQuantity: p.min_quantity || 0,
          unit: 'قطعة',
        }));
        setSpareParts(mapped);
      }
    } catch (error) {
      console.error('Error loading spare parts:', error);
    }
  };

  const loadPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('spare_parts_purchases')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const grouped = data.reduce((acc: any, purchase: any) => {
          const date = purchase.purchase_date;
          const supplier = purchase.supplier || 'غير محدد';
          const key = `${date}-${supplier}`;
          
          if (!acc[key]) {
            acc[key] = {
              id: purchase.id,
              date,
              supplier,
              totalCost: 0,
              notes: '',
              spareParts: [],
            };
          }
          
          acc[key].spareParts.push({
            sparePartId: purchase.spare_part_id,
            quantity: purchase.quantity,
            price: Number(purchase.unit_price),
          });
          acc[key].totalCost += Number(purchase.total_price);
          
          return acc;
        }, {});
        
        setPurchases(Object.values(grouped));
      }
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const loadStockTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const mapped: StockTransaction[] = data.map(t => ({
          id: t.id,
          date: t.transaction_date,
          sparePartId: t.spare_part_id,
          type: t.type as 'purchase' | 'maintenance',
          quantity: t.quantity,
          balanceAfter: 0,
          reference: t.reference_id || '',
          notes: t.notes || '',
        }));
        setStockTransactions(mapped);
      }
    } catch (error) {
      console.error('Error loading stock transactions:', error);
    }
  };

  const addSparePart = async (part: Omit<SparePart, "id">) => {
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .insert({
          name: part.name,
          unit_price: part.price,
          quantity: part.quantity,
          min_quantity: part.minQuantity,
          code: `SP-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newPart: SparePart = {
          id: data.id,
          name: data.name,
          price: Number(data.unit_price),
          quantity: data.quantity,
          minQuantity: data.min_quantity,
          unit: part.unit,
        };
        setSpareParts((prev) => [...prev, newPart]);
        
        toast({
          title: 'تم الإضافة / Added',
          description: 'تم إضافة قطعة الغيار بنجاح / Spare part added successfully',
        });
      }
    } catch (error) {
      console.error('Error adding spare part:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل إضافة قطعة الغيار / Failed to add spare part',
        variant: 'destructive',
      });
    }
  };

  const updateSparePart = async (id: string, part: Partial<SparePart>) => {
    try {
      const updates: any = {};
      if (part.name) updates.name = part.name;
      if (part.price !== undefined) updates.unit_price = part.price;
      if (part.quantity !== undefined) updates.quantity = part.quantity;
      if (part.minQuantity !== undefined) updates.min_quantity = part.minQuantity;

      const { error } = await supabase
        .from('spare_parts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setSpareParts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...part } : p))
      );
      
      toast({
        title: 'تم التحديث / Updated',
        description: 'تم تحديث قطعة الغيار بنجاح / Spare part updated successfully',
      });
    } catch (error) {
      console.error('Error updating spare part:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل تحديث قطعة الغيار / Failed to update spare part',
        variant: 'destructive',
      });
    }
  };

  const deleteSparePart = async (id: string) => {
    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSpareParts((prev) => prev.filter((p) => p.id !== id));
      
      toast({
        title: 'تم الحذف / Deleted',
        description: 'تم حذف قطعة الغيار بنجاح / Spare part deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting spare part:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل حذف قطعة الغيار / Failed to delete spare part',
        variant: 'destructive',
      });
    }
  };

  const addPurchase = async (purchase: Omit<Purchase, "id">) => {
    try {
      // توليد رقم فاتورة فريد إذا لم يكن موجود
      const invoiceNum = `INV-${Date.now()}`;
      
      // إضافة سجلات الشراء
      const purchaseRecords = purchase.spareParts.map(item => ({
        spare_part_id: item.sparePartId,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.quantity * item.price,
        purchase_date: purchase.date,
        supplier: purchase.supplier,
        invoice_number: invoiceNum,
      }));

      const { error: purchaseError } = await supabase
        .from('spare_parts_purchases')
        .insert(purchaseRecords);

      if (purchaseError) throw purchaseError;

      // تحديث الكميات وإضافة حركات المخزون
      for (const item of purchase.spareParts) {
        const part = spareParts.find(p => p.id === item.sparePartId);
        if (!part) continue;

        const newQuantity = part.quantity + item.quantity;

        // تحديث الكمية
        await supabase
          .from('spare_parts')
          .update({ quantity: newQuantity })
          .eq('id', item.sparePartId);

        // إضافة حركة المخزون
        await supabase
          .from('stock_transactions')
          .insert({
            spare_part_id: item.sparePartId,
            type: 'purchase',
            quantity: item.quantity,
            transaction_date: purchase.date,
            reference_type: 'purchase',
            notes: `شراء من ${purchase.supplier}`,
          });
      }

      await loadSpareParts();
      await loadPurchases();
      await loadStockTransactions();

      toast({
        title: 'تم التسجيل / Recorded',
        description: 'تم تسجيل عملية الشراء بنجاح / Purchase recorded successfully',
      });
    } catch (error) {
      console.error('Error adding purchase:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل تسجيل عملية الشراء / Failed to record purchase',
        variant: 'destructive',
      });
    }
  };

  const deductQuantity = async (sparePartId: string, quantity: number, reference: string, notes: string): Promise<boolean> => {
    try {
      const part = spareParts.find((p) => p.id === sparePartId);
      if (!part || part.quantity < quantity) {
        return false;
      }

      const newQuantity = part.quantity - quantity;

      // تحديث الكمية
      const { error: updateError } = await supabase
        .from('spare_parts')
        .update({ quantity: newQuantity })
        .eq('id', sparePartId);

      if (updateError) throw updateError;

      // تسجيل حركة الصيانة
      const { error: transError } = await supabase
        .from('stock_transactions')
        .insert({
          spare_part_id: sparePartId,
          type: 'maintenance',
          quantity: -quantity,
          transaction_date: new Date().toISOString().split('T')[0],
          reference_id: reference,
          reference_type: 'maintenance',
          notes,
        });

      if (transError) throw transError;

      setSpareParts((prev) =>
        prev.map((p) =>
          p.id === sparePartId ? { ...p, quantity: newQuantity } : p
        )
      );
      
      await loadStockTransactions();
      
      return true;
    } catch (error) {
      console.error('Error deducting quantity:', error);
      return false;
    }
  };

  const updatePurchase = async (id: string, updatedData: Partial<Omit<Purchase, "id">>) => {
    try {
      // Delete old purchase records
      const { error: deleteError } = await supabase
        .from('spare_parts_purchases')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // If spareParts are being updated, insert new records
      if (updatedData.spareParts) {
        const purchaseRecords = updatedData.spareParts.map(item => ({
          spare_part_id: item.sparePartId,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.quantity * item.price,
          supplier: updatedData.supplier || purchases.find(p => p.id === id)?.supplier,
          purchase_date: updatedData.date || purchases.find(p => p.id === id)?.date,
          invoice_number: `INV-${Date.now()}`,
        }));

        const { error: insertError } = await supabase
          .from('spare_parts_purchases')
          .insert(purchaseRecords);

        if (insertError) throw insertError;

        // Update spare parts quantities
        for (const item of updatedData.spareParts) {
          const part = spareParts.find(p => p.id === item.sparePartId);
          if (part) {
            const { error: updateError } = await supabase
              .from('spare_parts')
              .update({ quantity: part.quantity + item.quantity })
              .eq('id', item.sparePartId);

            if (updateError) throw updateError;
          }
        }
      }

      await loadPurchases();
      await loadSpareParts();

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث عملية الشراء بنجاح',
      });
    } catch (error) {
      console.error('Error updating purchase:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث عملية الشراء',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      const { error } = await supabase
        .from('spare_parts_purchases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadPurchases();

      toast({
        title: 'تم الحذف',
        description: 'تم حذف عملية الشراء بنجاح',
      });
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف عملية الشراء',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <SparePartsContext.Provider
      value={{
        spareParts,
        purchases,
        stockTransactions,
        addSparePart,
        updateSparePart,
        deleteSparePart,
        addPurchase,
        updatePurchase,
        deletePurchase,
        deductQuantity,
      }}
    >
      {children}
    </SparePartsContext.Provider>
  );
};

export const useSpareParts = () => {
  const context = useContext(SparePartsContext);
  if (!context) {
    throw new Error("useSpareParts must be used within SparePartsProvider");
  }
  return context;
};
