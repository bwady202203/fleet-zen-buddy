import { cn } from '@/lib/utils';

interface LoadingCupProps {
  text?: string;
  className?: string;
}

const LoadingCup = ({ text = 'جاري التحميل...', className }: LoadingCupProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 gap-4", className)}>
      {/* Coffee Cup */}
      <div className="relative">
        {/* Steam */}
        <div className="flex justify-center gap-1 mb-1">
          <div className="w-1 h-4 bg-muted-foreground/30 rounded-full animate-steam-1" />
          <div className="w-1 h-5 bg-muted-foreground/20 rounded-full animate-steam-2" />
          <div className="w-1 h-3 bg-muted-foreground/30 rounded-full animate-steam-3" />
        </div>
        
        {/* Cup body */}
        <div className="relative w-16 h-14 bg-card border-2 border-border rounded-b-xl overflow-hidden">
          {/* Liquid filling animation */}
          <div className="absolute bottom-0 left-0 right-0 bg-primary/80 animate-fill-cup rounded-b-lg">
            {/* Wave effect */}
            <div className="absolute top-0 left-0 right-0 h-2 overflow-hidden">
              <div className="w-[200%] h-full bg-primary/60 rounded-[40%] animate-wave" />
            </div>
          </div>
        </div>
        
        {/* Cup handle */}
        <div className="absolute top-3 -right-3 w-4 h-8 border-2 border-border rounded-r-full bg-transparent" />
        
        {/* Saucer */}
        <div className="w-20 h-2 bg-muted border border-border rounded-full mx-auto -mt-0.5" />
      </div>
      
      <p className="text-muted-foreground text-sm font-medium animate-pulse">{text}</p>
    </div>
  );
};

export default LoadingCup;
