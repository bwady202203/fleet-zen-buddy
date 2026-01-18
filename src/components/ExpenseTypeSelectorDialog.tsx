import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Receipt, Fuel, Wrench, Car, Truck, Phone, Zap, Droplets, Coffee, FileText, Package, DollarSign } from 'lucide-react';

interface ExpenseType {
  id: string;
  name_ar: string;
  code: string;
}

interface ExpenseTypeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseTypes: ExpenseType[];
  onSelect: (expenseType: ExpenseType) => void;
  selectedId?: string;
}

// Map expense codes/names to icons
const getExpenseIcon = (name: string, code: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('وقود') || lowerName.includes('بنزين') || lowerName.includes('ديزل')) {
    return Fuel;
  }
  if (lowerName.includes('صيانة') || lowerName.includes('إصلاح')) {
    return Wrench;
  }
  if (lowerName.includes('سيارة') || lowerName.includes('مركبة')) {
    return Car;
  }
  if (lowerName.includes('نقل') || lowerName.includes('شحن')) {
    return Truck;
  }
  if (lowerName.includes('اتصال') || lowerName.includes('هاتف') || lowerName.includes('جوال')) {
    return Phone;
  }
  if (lowerName.includes('كهرباء')) {
    return Zap;
  }
  if (lowerName.includes('مياه') || lowerName.includes('ماء')) {
    return Droplets;
  }
  if (lowerName.includes('ضيافة') || lowerName.includes('طعام') || lowerName.includes('مشروب')) {
    return Coffee;
  }
  if (lowerName.includes('مستند') || lowerName.includes('وثيقة') || lowerName.includes('رسوم')) {
    return FileText;
  }
  if (lowerName.includes('مواد') || lowerName.includes('مستلزمات')) {
    return Package;
  }
  // Default icon
  return Receipt;
};

// Color palette for expense cards
const cardColors = [
  'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700',
  'bg-green-50 hover:bg-green-100 border-green-200 text-green-700',
  'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700',
  'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700',
  'bg-pink-50 hover:bg-pink-100 border-pink-200 text-pink-700',
  'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700',
  'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700',
  'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700',
  'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700',
  'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700',
];

const ExpenseTypeSelectorDialog = ({
  open,
  onOpenChange,
  expenseTypes,
  onSelect,
  selectedId
}: ExpenseTypeSelectorDialogProps) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const columnsCount = 4; // md:grid-cols-4

  // Reset focused index when dialog opens
  useEffect(() => {
    if (open) {
      setFocusedIndex(0);
      // Focus first button after a short delay
      setTimeout(() => {
        buttonsRef.current[0]?.focus();
      }, 100);
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = expenseTypes.length;
    if (totalItems === 0) return;

    let newIndex = focusedIndex;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        // RTL: right arrow goes to previous item
        newIndex = focusedIndex > 0 ? focusedIndex - 1 : totalItems - 1;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        // RTL: left arrow goes to next item
        newIndex = focusedIndex < totalItems - 1 ? focusedIndex + 1 : 0;
        break;
      case 'ArrowUp':
        e.preventDefault();
        newIndex = focusedIndex - columnsCount >= 0 ? focusedIndex - columnsCount : focusedIndex;
        break;
      case 'ArrowDown':
        e.preventDefault();
        newIndex = focusedIndex + columnsCount < totalItems ? focusedIndex + columnsCount : focusedIndex;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (expenseTypes[focusedIndex]) {
          onSelect(expenseTypes[focusedIndex]);
          onOpenChange(false);
        }
        break;
    }

    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      buttonsRef.current[newIndex]?.focus();
    }
  }, [focusedIndex, expenseTypes, onSelect, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" dir="rtl" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">اختر نوع المصروف</DialogTitle>
          <p className="text-sm text-center text-muted-foreground">استخدم الأسهم للتنقل و Enter للاختيار</p>
        </DialogHeader>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
          {expenseTypes.map((type, index) => {
            const Icon = getExpenseIcon(type.name_ar, type.code);
            const colorClass = cardColors[index % cardColors.length];
            const isSelected = selectedId === type.id;
            const isFocused = focusedIndex === index;
            
            return (
              <button
                key={type.id}
                ref={(el) => { buttonsRef.current[index] = el; }}
                onClick={() => {
                  onSelect(type);
                  onOpenChange(false);
                }}
                onFocus={() => setFocusedIndex(index)}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer min-h-[120px] outline-none",
                  colorClass,
                  isSelected && "ring-2 ring-primary ring-offset-2 scale-105",
                  isFocused && "ring-2 ring-primary ring-offset-2 scale-105 shadow-lg"
                )}
              >
                <Icon className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium text-center leading-tight">
                  {type.name_ar}
                </span>
                <span className="text-xs opacity-60 mt-1">
                  {type.code}
                </span>
              </button>
            );
          })}
        </div>
        
        {expenseTypes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد أنواع مصروفات متاحة</p>
            <p className="text-sm">تحقق من حساب مصروفات التشغيل (5104)</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseTypeSelectorDialog;
