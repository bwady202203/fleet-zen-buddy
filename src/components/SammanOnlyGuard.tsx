import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePermissions } from "@/contexts/PermissionsContext";

// الشاشات المسموح بها لحساب «الصمان فقط»: الرئيسية + شاشات برنامج الصمان
const SAMMAN_ALLOWED_PATHS = [
  "/",
  "/samman",
  "/accounting/crusher-pro",
  "/accounting/crusher-shipments",
  "/accounting/crusher-data",
];

const isAllowed = (pathname: string) =>
  SAMMAN_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * يمنع حساب «الصمان فقط» من فتح أي شاشة أخرى حتى لو كتب رابطها مباشرة.
 */
const SammanOnlyGuard = ({ children }: { children: ReactNode }) => {
  const { isSammanOnly } = usePermissions();
  const { pathname } = useLocation();

  if (isSammanOnly && !isAllowed(pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default SammanOnlyGuard;
