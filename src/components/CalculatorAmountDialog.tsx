import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Delete, Check, X, RotateCcw } from 'lucide-react';

interface CalculatorAmountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number) => void;
  onConfirmAndNew?: (amount: number) => void;
  withTax: boolean;
  expenseTypeName: string;
}

const CalculatorAmountDialog = ({
  open,
  onOpenChange,
  onConfirm,
  onConfirmAndNew,
  withTax,
  expenseTypeName
}: CalculatorAmountDialogProps) => {
  const [displayValue, setDisplayValue] = useState('0');

  const handleNumberClick = useCallback((num: string) => {
    setDisplayValue(prev => {
      if (prev === '0' && num !== '.') {
        return num;
      } else if (num === '.' && prev.includes('.')) {
        return prev;
      } else {
        // Limit decimal places to 2
        if (prev.includes('.')) {
          const parts = prev.split('.');
          if (parts[1] && parts[1].length >= 2) {
            return prev;
          }
        }
        return prev + num;
      }
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplayValue(prev => {
      if (prev.length === 1) {
        return '0';
      } else {
        return prev.slice(0, -1);
      }
    });
  }, []);

  const handleClear = useCallback(() => {
    setDisplayValue('0');
  }, []);

  const handleConfirm = useCallback(() => {
    const amount = parseFloat(displayValue);
    if (amount > 0) {
      onConfirm(amount);
      setDisplayValue('0');
      onOpenChange(false);
    }
  }, [displayValue, onConfirm, onOpenChange]);

  const handleConfirmAndNew = useCallback(() => {
    const amount = parseFloat(displayValue);
    if (amount > 0) {
      if (onConfirmAndNew) {
        onConfirmAndNew(amount);
      } else {
        onConfirm(amount);
      }
      setDisplayValue('0');
      // Don't close - will reopen expense type dialog
    }
  }, [displayValue, onConfirm, onConfirmAndNew]);

  // Keyboard event handler
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Numbers 0-9
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleNumberClick(e.key);
      }
      // Decimal point
      else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleNumberClick('.');
      }
      // Backspace
      else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
      // Delete or Escape - clear
      else if (e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
      // Enter - save
      else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
      // Shift - save and new
      else if (e.key === 'Shift') {
        e.preventDefault();
        handleConfirmAndNew();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleNumberClick, handleBackspace, handleClear, handleConfirm, handleConfirmAndNew]);

  const baseAmount = parseFloat(displayValue) || 0;
  const taxAmount = withTax ? baseAmount * 0.15 : 0;
  const totalAmount = baseAmount + taxAmount;

  const numpadButtons = [
    '7', '8', '9',
    '4', '5', '6',
    '1', '2', '3',
    '.', '0', 'backspace'
  ];

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) setDisplayValue('0');
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="p-4 bg-primary text-primary-foreground">
          <DialogTitle className="text-lg font-bold text-center">{expenseTypeName}</DialogTitle>
          <p className="text-sm text-center opacity-80">
            {withTax ? 'مع ضريبة 15%' : 'بدون ضريبة'}
          </p>
        </DialogHeader>
        
        {/* Display Area */}
        <div className="p-4 bg-muted/50">
          <div className="text-left bg-background rounded-lg p-4 border-2 border-primary/20 focus-within:border-primary">
            <p className="text-4xl font-bold text-foreground tracking-wider" dir="ltr">
              {parseFloat(displayValue).toLocaleString('en-US', { minimumFractionDigits: displayValue.includes('.') ? displayValue.split('.')[1]?.length || 0 : 0 })}
            </p>
            <p className="text-sm text-muted-foreground mt-1">ريال سعودي</p>
          </div>
          
          {/* Tax Summary */}
          {withTax && baseAmount > 0 && (
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>المبلغ الأساسي:</span>
                <span>{baseAmount.toLocaleString('ar-SA')} ر.س</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>الضريبة (15%):</span>
                <span>{taxAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
              </div>
              <div className="flex justify-between font-bold text-primary pt-1 border-t">
                <span>الإجمالي:</span>
                <span>{totalAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
              </div>
            </div>
          )}

          {/* Keyboard Hints */}
          <div className="mt-3 text-xs text-muted-foreground text-center space-x-4 space-x-reverse">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
              حفظ
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Shift</kbd>
              حفظ وإضافة جديد
            </span>
          </div>
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-background">
          {numpadButtons.map((btn) => (
            <Button
              key={btn}
              variant="outline"
              className={cn(
                "h-16 text-2xl font-bold transition-all",
                btn === 'backspace' && "bg-red-50 hover:bg-red-100 text-red-600 border-red-200",
                btn === '.' && "text-xl"
              )}
              onClick={() => {
                if (btn === 'backspace') {
                  handleBackspace();
                } else {
                  handleNumberClick(btn);
                }
              }}
            >
              {btn === 'backspace' ? <Delete className="h-6 w-6" /> : btn}
            </Button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 border-t">
          <Button
            variant="outline"
            className="h-14 text-base"
            onClick={() => {
              handleClear();
              onOpenChange(false);
            }}
          >
            <X className="h-5 w-5 ml-1" />
            إلغاء
          </Button>
          <Button
            variant="outline"
            className="h-14 text-base bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            onClick={handleConfirmAndNew}
            disabled={baseAmount <= 0}
          >
            <RotateCcw className="h-5 w-5 ml-1" />
            حفظ+جديد
          </Button>
          <Button
            className="h-14 text-base bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
            disabled={baseAmount <= 0}
          >
            <Check className="h-5 w-5 ml-1" />
            حفظ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalculatorAmountDialog;
