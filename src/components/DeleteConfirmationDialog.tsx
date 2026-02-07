import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const SECURITY_CODE = '363636';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title = 'تأكيد الحذف',
  description = 'هل أنت متأكد من حذف هذا العنصر؟ هذا الإجراء لا يمكن التراجع عنه.',
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleConfirm = () => {
    if (code === SECURITY_CODE) {
      setCode('');
      setError('');
      onConfirm();
      onOpenChange(false);
    } else {
      setError('كود الأمان غير صحيح');
      toast({
        title: 'خطأ',
        description: 'كود الأمان غير صحيح',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setCode('');
    setError('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-right">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-right">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <Label htmlFor="security-code" className="text-right block mb-2">
            أدخل كود الأمان للمتابعة
          </Label>
          <Input
            id="security-code"
            type="password"
            placeholder="أدخل كود الأمان"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError('');
            }}
            className={`text-center text-lg tracking-widest ${error ? 'border-red-500' : ''}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              }
            }}
          />
          {error && (
            <p className="text-red-500 text-sm mt-2 text-right">{error}</p>
          )}
        </div>

        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel onClick={handleClose}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            تأكيد الحذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const useDeleteConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [dialogProps, setDialogProps] = useState<{
    title?: string;
    description?: string;
  }>({});

  const requestDelete = (
    action: () => void,
    options?: { title?: string; description?: string }
  ) => {
    setPendingAction(() => action);
    setDialogProps(options || {});
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleClose = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setPendingAction(null);
    }
  };

  const DeleteDialog = () => (
    <DeleteConfirmationDialog
      open={isOpen}
      onOpenChange={handleClose}
      onConfirm={handleConfirm}
      title={dialogProps.title}
      description={dialogProps.description}
    />
  );

  return { requestDelete, DeleteDialog };
};
