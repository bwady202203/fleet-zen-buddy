import { cn } from "@/lib/utils";

interface ManagerStampProps {
  className?: string;
}

/**
 * ختم المدير: مربع أزرق بحافة مزدوجة وداخله نص أحمر.
 */
export function ManagerStamp({ className }: ManagerStampProps) {
  return (
    <div
      className={cn("manager-stamp", className)}
      dir="ltr"
      role="img"
      aria-label="BY OMAT KHEDR — PRO MANAGER"
    >
      <span className="manager-stamp-top">BY OMAT KHEDR</span>
      <span className="manager-stamp-bar" aria-hidden="true" />
      <span className="manager-stamp-bottom">PRO MANAGER</span>
    </div>
  );
}
