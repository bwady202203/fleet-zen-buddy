import { useLocation } from "react-router-dom";

/** Shipment programs sharing the crusher screens; data is separated by `program`. */
export const PROGRAMS = {
  crusher: { key: "crusher", name: "برنامج كسارة مطور", base: "/accounting/crusher-pro", shipments: "/accounting/crusher-shipments", data: "/accounting/crusher-data" },
  samman: { key: "samman", name: "برنامج الصمان", base: "/samman/new", shipments: "/samman/shipments", data: "/samman/data" },
} as const;

export function useCrusherProgram() {
  const { pathname } = useLocation();
  return pathname.startsWith("/samman") ? PROGRAMS.samman : PROGRAMS.crusher;
}
