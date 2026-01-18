import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Delete, Check, X } from 'lucide-react';

interface CalculatorAmountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number) => void;
  withTax: boolean;
  expenseTypeName: string;
}

const CalculatorAmountDialog = ({
  open,
  onOpenChange,
  onConfirm,
  withTax,
  expenseTypeName
}: CalculatorAmountDialogProps) => {
  const [displayValue, setDisplayValue] = useState('0');

  const handleNumberClick = (num: string) => {
    if (displayValue === '0' && num !== '.') {
      setDisplayValue(num);
    } else if (num === '.' && displayValue.includes('.')) {
      return;
    } else {
      // Limit decimal places to 2
      if (displayValue.includes('.')) {
        const parts = displayValue.split('.');
        if (parts[1] && parts[1].length >= 2) {
          return;
        }
      }
      setDisplayValue(displayValue + num);
    }
  };

  const handleBackspace = () => {
    if (displayValue.length === 1) {
      setDisplayValue('0');
    } else {
      setDisplayValue(displayValue.slice(0, -1));
    }
  };

  const handleClear = () => {
    setDisplayValue('0');
  };

  const handleConfirm = () => {
    const amount = parseFloat(displayValue);
    if (amount > 0) {
      onConfirm(amount);
      setDisplayValue('0');
      onOpenChange(false);
    }
  };

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
          <div className="text-left bg-background rounded-lg p-4 border-2 border-primary/20">
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
        <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 border-t">
          <Button
            variant="outline"
            className="h-14 text-lg"
            onClick={() => {
              handleClear();
              onOpenChange(false);
            }}
          >
            <X className="h-5 w-5 ml-2" />
            إلغاء
          </Button>
          <Button
            className="h-14 text-lg bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
            disabled={baseAmount <= 0}
          >
            <Check className="h-5 w-5 ml-2" />
            حفظ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalculatorAmountDialog;
