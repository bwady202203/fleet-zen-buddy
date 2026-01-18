import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Receipt, ReceiptText } from 'lucide-react';

interface TaxOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (withTax: boolean) => void;
}

const TaxOptionDialog = ({
  open,
  onOpenChange,
  onSelect
}: TaxOptionDialogProps) => {
  const [focusedIndex, setFocusedIndex] = useState(0); // 0 = with tax, 1 = without tax
  const withTaxRef = useRef<HTMLButtonElement>(null);
  const withoutTaxRef = useRef<HTMLButtonElement>(null);

  // Reset and focus when dialog opens
  useEffect(() => {
    if (open) {
      setFocusedIndex(0);
      setTimeout(() => {
        withTaxRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        // RTL: right = previous (with tax)
        setFocusedIndex(0);
        withTaxRef.current?.focus();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        // RTL: left = next (without tax)
        setFocusedIndex(1);
        withoutTaxRef.current?.focus();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        e.preventDefault();
        // Toggle between the two
        const newIndex = focusedIndex === 0 ? 1 : 0;
        setFocusedIndex(newIndex);
        if (newIndex === 0) {
          withTaxRef.current?.focus();
        } else {
          withoutTaxRef.current?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(focusedIndex === 0);
        onOpenChange(false);
        break;
    }
  }, [focusedIndex, onSelect, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">هل المبلغ يشمل الضريبة؟</DialogTitle>
          <p className="text-sm text-center text-muted-foreground">استخدم الأسهم للتنقل و Enter للاختيار</p>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 p-4">
          {/* With Tax Option */}
          <button
            ref={withTaxRef}
            onClick={() => {
              onSelect(true);
              onOpenChange(false);
            }}
            onFocus={() => setFocusedIndex(0)}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer min-h-[140px] outline-none",
              "bg-green-50 hover:bg-green-100 border-green-300 hover:border-green-400",
              focusedIndex === 0 && "ring-2 ring-green-500 ring-offset-2 scale-105 shadow-lg border-green-500"
            )}
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <ReceiptText className="h-8 w-8 text-green-600" />
            </div>
            <span className="text-lg font-bold text-green-700">مع الضريبة</span>
            <span className="text-sm text-green-600 mt-1">15% ضريبة</span>
          </button>

          {/* Without Tax Option */}
          <button
            ref={withoutTaxRef}
            onClick={() => {
              onSelect(false);
              onOpenChange(false);
            }}
            onFocus={() => setFocusedIndex(1)}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer min-h-[140px] outline-none",
              "bg-blue-50 hover:bg-blue-100 border-blue-300 hover:border-blue-400",
              focusedIndex === 1 && "ring-2 ring-blue-500 ring-offset-2 scale-105 shadow-lg border-blue-500"
            )}
          >
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <Receipt className="h-8 w-8 text-blue-600" />
            </div>
            <span className="text-lg font-bold text-blue-700">بدون ضريبة</span>
            <span className="text-sm text-blue-600 mt-1">المبلغ فقط</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaxOptionDialog;
