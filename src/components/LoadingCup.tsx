import { cn } from '@/lib/utils';
import plaqueAsset from '@/assets/manager-plaque.png.asset.json';

interface LoadingCupProps {
  text?: string;
  className?: string;
}

/**
 * علامة التحميل: لوحة «صُنِعَ بِإِتْقَان — عُمَر خَضِر ٢٠٢٦» بدل فنجان القهوة.
 * تحافظ على نفس واجهة الخصائص (text / className) حتى تعمل كل مواضع الاستخدام السابقة.
 */
const LoadingCup = ({ text = 'جاري التحميل...', className }: LoadingCupProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 gap-4", className)}>
      <img
        src={plaqueAsset.url}
        alt="صُنِعَ بِإِتْقَان — عُمَر خَضِر ٢٠٢٦"
        className="h-auto w-[152px] max-w-full select-none animate-pulse"
      />

      <p className="text-muted-foreground text-sm font-medium animate-pulse">{text}</p>
    </div>
  );
};

export default LoadingCup;
