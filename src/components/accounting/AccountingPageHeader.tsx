import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/contexts/PermissionsContext";
import { getAccountingReturnPath } from "@/lib/accountingNavigation";
import { cn } from "@/lib/utils";

interface AccountingPageHeaderProps {
  title: ReactNode;
  description: ReactNode;
  titleClassName?: string;
  className?: string;
  icon?: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}

/** The heading portion of a page; existing page containers and tools stay intact. */
export default function AccountingPageHeader({
  title, description, titleClassName, className, icon, eyebrow, children, actions,
}: AccountingPageHeaderProps) {
  const { isSammanOnly } = usePermissions();

  return (
    <div dir="rtl" data-accounting-page-header className={cn("flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4 print:hidden", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0 text-inherit" title="العودة إلى المحاسبة المالية">
          <Link to={getAccountingReturnPath(isSammanOnly)} aria-label="العودة إلى المحاسبة المالية">
            <ArrowRight className="h-6 w-6" />
          </Link>
        </Button>
        {icon}
        <div className="min-w-0 flex-1">
          {eyebrow}
          <h1 className={cn("break-words text-2xl font-bold", titleClassName)}>{title}</h1>
          {typeof description === "string" ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : description}
          {children}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}