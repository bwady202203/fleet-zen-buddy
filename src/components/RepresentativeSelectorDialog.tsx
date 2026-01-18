import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { User, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface Representative {
  id: string;
  name_ar: string;
  code: string;
  balance: number;
  debit_total: number;
  credit_total: number;
}

interface RepresentativeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representatives: Representative[];
  onSelect: (representative: Representative) => void;
  selectedId?: string;
}

// Color palette for representative cards
const cardColors = [
  'bg-slate-50 hover:bg-slate-100 border-slate-200',
  'bg-zinc-50 hover:bg-zinc-100 border-zinc-200',
  'bg-stone-50 hover:bg-stone-100 border-stone-200',
  'bg-neutral-50 hover:bg-neutral-100 border-neutral-200',
  'bg-gray-50 hover:bg-gray-100 border-gray-200',
];

const RepresentativeSelectorDialog = ({
  open,
  onOpenChange,
  representatives,
  onSelect,
  selectedId
}: RepresentativeSelectorDialogProps) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const columns = 3; // Number of columns in the grid

  // Reset focused index when dialog opens
  useEffect(() => {
    if (open) {
      const currentIndex = representatives.findIndex(r => r.id === selectedId);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [open, selectedId, representatives]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open || representatives.length === 0) return;

    const totalItems = representatives.length;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          const newIndex = prev - columns;
          return newIndex >= 0 ? newIndex : prev;
        });
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => {
          const newIndex = prev + columns;
          return newIndex < totalItems ? newIndex : prev;
        });
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (representatives[focusedIndex]) {
          onSelect(representatives[focusedIndex]);
          onOpenChange(false);
        }
        break;
    }
  }, [open, representatives, focusedIndex, columns, onSelect, onOpenChange]);

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">اختر المندوب</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
          {representatives.map((rep, index) => {
            const colorClass = cardColors[index % cardColors.length];
            const isSelected = selectedId === rep.id;
            const isFocused = focusedIndex === index;
            const balance = rep.balance || 0;
            
            return (
              <button
                key={rep.id}
                onClick={() => {
                  onSelect(rep);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex flex-col p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer text-right",
                  colorClass,
                  isSelected && "ring-2 ring-primary ring-offset-2 scale-[1.02] border-primary",
                  isFocused && "ring-2 ring-blue-500 ring-offset-2 scale-[1.02] shadow-lg"
                )}
              >
                {/* Header with icon and name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground">{rep.name_ar}</h3>
                    <p className="text-sm text-muted-foreground">كود: {rep.code}</p>
                  </div>
                </div>
                
                {/* Balance info */}
                <div className="space-y-2 mt-2 pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      مدين
                    </span>
                    <span className="font-medium text-green-600">
                      {(rep.debit_total || 0).toLocaleString('ar-SA')} ر.س
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-red-600">
                      <TrendingDown className="h-3 w-3" />
                      دائن
                    </span>
                    <span className="font-medium text-red-600">
                      {(rep.credit_total || 0).toLocaleString('ar-SA')} ر.س
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="flex items-center gap-1 font-medium">
                      <Wallet className="h-4 w-4" />
                      الرصيد
                    </span>
                    <span className={cn(
                      "font-bold text-lg",
                      balance >= 0 ? "text-primary" : "text-orange-600"
                    )}>
                      {balance.toLocaleString('ar-SA')} ر.س
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        {representatives.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>لا يوجد مندوبين متاحين</p>
            <p className="text-sm">تحقق من حساب العهد (1111)</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RepresentativeSelectorDialog;
