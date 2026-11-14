import { cn } from "@/lib/utils";

interface ManagerStampProps {
  className?: string;
}

/**
 * ختم المدير: مربع أزرق بحافة مزدوجة وداخله نص أحمر.
 * الطبقة الخارجية (shell) لا تحمل أي تنسيق حتى يتحكم المستدعي بموضعها.
 */
export function ManagerStamp({ className }: ManagerStampProps) {
  return (
    <div
      className={cn(className)}
      dir="ltr"
      role="img"
      aria-label="BY OMAT KHEDR — PRO MANAGER"
    >
      <div className="manager-stamp">
        <span className="manager-stamp-top">BY OMAT KHEDR</span>
        <span className="manager-stamp-bar" aria-hidden="true" />
        <span className="manager-stamp-bottom">PRO MANAGER</span>
      </div>
    </div>
  );
}
