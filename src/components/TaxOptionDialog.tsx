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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">هل المبلغ يشمل الضريبة؟</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 p-4">
          {/* With Tax Option */}
          <button
            onClick={() => {
              onSelect(true);
              onOpenChange(false);
            }}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer min-h-[140px]",
              "bg-green-50 hover:bg-green-100 border-green-300 hover:border-green-400"
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
            onClick={() => {
              onSelect(false);
              onOpenChange(false);
            }}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer min-h-[140px]",
              "bg-blue-50 hover:bg-blue-100 border-blue-300 hover:border-blue-400"
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
