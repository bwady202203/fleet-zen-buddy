import managerStampAsset from "@/assets/manager-stamp-2026.png.asset.json";
import { cn } from "@/lib/utils";

interface ManagerStampProps {
  className?: string;
}

/**
 * ختم المدير المصوّر؛ الطبقة الخارجية بلا تنسيق حتى يتحكم المستدعي بموضعها.
 */
export function ManagerStamp({ className }: ManagerStampProps) {
  return (
    <div className={cn(className)}>
      <img
        className="manager-stamp"
        src={managerStampAsset.url}
        alt="صنع بإتقان — عمر محمد خضران — 2026"
        draggable={false}
      />
    </div>
  );
}
