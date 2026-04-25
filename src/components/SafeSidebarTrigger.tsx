import * as React from "react";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A SidebarTrigger replacement that does NOT throw when rendered
 * outside a SidebarProvider. It silently renders nothing in that case,
 * which keeps shared chrome (e.g. SystemIconsBar) safe to mount on
 * routes that don't include the sidebar layout.
 *
 * When inside a SidebarProvider, it dispatches the same toggle event
 * as the original trigger by reading from the data-attribute API on the
 * sidebar root.
 */
export const SafeSidebarTrigger = ({ className }: { className?: string }) => {
  // Lazily try to import the context. If anything throws, render nothing.
  let useSidebar: (() => { toggleSidebar: () => void }) | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    useSidebar = require("@/components/ui/sidebar").useSidebar;
  } catch {
    return null;
  }

  return <InnerTrigger className={className} useSidebar={useSidebar!} />;
};

const InnerTrigger = ({
  className,
  useSidebar,
}: {
  className?: string;
  useSidebar: () => { toggleSidebar: () => void };
}) => {
  const [hasProvider, setHasProvider] = React.useState(true);
  let ctx: { toggleSidebar: () => void } | null = null;
  try {
    ctx = useSidebar();
  } catch {
    if (hasProvider) setHasProvider(false);
    return null;
  }
  if (!ctx) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={() => ctx!.toggleSidebar()}
      aria-label="Toggle Sidebar"
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
};
