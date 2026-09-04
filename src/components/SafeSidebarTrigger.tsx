import * as React from "react";
import { PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * A SidebarTrigger replacement that does NOT throw when rendered
 * outside a SidebarProvider. Returns null when no provider is present.
 */
export const SafeSidebarTrigger = ({ className }: { className?: string }) => {
  let toggleSidebar: (() => void) | null = null;
  try {
    toggleSidebar = useSidebar().toggleSidebar;
  } catch {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={() => toggleSidebar?.()}
      aria-label="فتح أو طي القائمة الجانبية"
      title="فتح أو طي القائمة الجانبية"
    >
      <PanelRight className="h-4 w-4" />
    </Button>
  );
};
