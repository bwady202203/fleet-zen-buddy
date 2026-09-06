import type { SVGProps } from "react";

// أيقونات ثلاثية الأبعاد لشاشات إدارة الأسطول والورشة
type IconProps = SVGProps<SVGSVGElement>;

const Defs = () => (
  <defs>
    <linearGradient id="fi3d-t" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#8AF0E6" />
      <stop offset="55%" stopColor="#2EC4B6" />
      <stop offset="100%" stopColor="#128F86" />
    </linearGradient>
    <linearGradient id="fi3d-hi" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#fff" stopOpacity=".55" />
      <stop offset="100%" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
  </defs>
);

const base = (props: IconProps) => ({
  viewBox: "0 0 64 64",
  fill: "none",
  ...props,
});

const T = "url(#fi3d-t)";
const HI = "url(#fi3d-hi)";

const FleetDashboardIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <rect x="5" y="5" width="25" height="25" rx="7" fill={T} />
    <rect x="34" y="5" width="25" height="25" rx="7" fill={T} />
    <rect x="5" y="34" width="25" height="25" rx="7" fill={T} />
    <rect x="34" y="34" width="25" height="25" rx="7" fill={T} />
    <rect x="5" y="5" width="25" height="12" rx="7" fill={HI} />
    <rect x="34" y="5" width="25" height="12" rx="7" fill={HI} />
  </svg>
);

const VehiclesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <ellipse cx="32" cy="54" rx="18" ry="4" fill="#b7e8e3" opacity=".5" />
    <path d="M10 40c1-8 6-14 14-16l4-8h12l5 8c8 1 13 7 15 16H10z" fill={T} />
    <path d="M12 40h40c0 3-2 6-6 6H18c-4 0-6-3-6-6z" fill="#128F86" />
    <circle cx="20" cy="46" r="5.2" fill="#0d6b66" />
    <circle cx="20" cy="46" r="2.2" fill="#d9fffa" />
    <circle cx="44" cy="46" r="5.2" fill="#0d6b66" />
    <circle cx="44" cy="46" r="2.2" fill="#d9fffa" />
    <circle cx="48" cy="22" r="10" fill="#2EC4B6" />
    <circle cx="48" cy="22" r="10" fill={HI} />
    <path d="M44 22l3.2 3.2 6-6" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
  </svg>
);

const BulkVehiclesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <ellipse cx="32" cy="54" rx="20" ry="4" fill="#b7e8e3" opacity=".45" />
    <rect x="7" y="24" width="30" height="20" rx="4" fill={T} />
    <path d="M37 28h13l7 10v10H37V28z" fill="#15968d" />
    <rect x="10" y="18" width="18" height="8" rx="2" fill="#7ee8dc" />
    <circle cx="18" cy="46" r="5.5" fill="#0d6b66" />
    <circle cx="18" cy="46" r="2.3" fill="#e7fffc" />
    <circle cx="46" cy="46" r="5.5" fill="#0d6b66" />
    <circle cx="46" cy="46" r="2.3" fill="#e7fffc" />
    <rect x="7" y="24" width="30" height="8" rx="4" fill={HI} />
  </svg>
);

const EditVehiclesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <ellipse cx="32" cy="56" rx="16" ry="3.5" fill="#b7e8e3" opacity=".4" />
    <path d="M20 8c3-1 8 2 12 6 2 2 3 5 2 7l-16 16c-2 2-6 1-8-1-4-4-7-9-6-12 1-4 8-14 16-16z" fill={T} />
    <rect x="8" y="34" width="11" height="20" rx="3.5" transform="rotate(-42 8 34)" fill="#128F86" />
    <path d="M22 12c6 3 10 8 12 12" stroke="#fff" strokeOpacity=".35" strokeWidth="3" fill="none" />
  </svg>
);

const NewMaintenanceIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <path d="M16 10c3-1 8 2 11 6 2 2 3 5 2 7L15 38c-2 2-6 1-8-1-4-4-6-9-5-12 1-4 7-13 14-15z" fill={T} />
    <rect x="6" y="34" width="10" height="18" rx="3" transform="rotate(-42 6 34)" fill="#128F86" />
    <circle cx="44" cy="42" r="14" fill="#2EC4B6" />
    <circle cx="44" cy="42" r="14" fill={HI} />
    <path d="M44 34v16M36 42h16" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const MaintenanceLogIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <rect x="14" y="12" width="36" height="44" rx="6" fill={T} />
    <rect x="14" y="12" width="36" height="16" rx="6" fill={HI} />
    <rect x="24" y="8" width="16" height="9" rx="3" fill="#15968d" />
    <path d="M24 28l5 5 10-10" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <path d="M24 40l5 5 10-10" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <rect x="24" y="48" width="16" height="3" rx="1.5" fill="#fff" opacity=".8" />
  </svg>
);

const MaintenanceCostsIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <rect x="10" y="36" width="12" height="18" rx="3" fill="#8AF0E6" />
    <rect x="26" y="24" width="12" height="30" rx="3" fill="#2EC4B6" />
    <rect x="42" y="12" width="12" height="42" rx="3" fill="#128F86" />
    <rect x="10" y="36" width="12" height="7" rx="3" fill={HI} />
    <rect x="26" y="24" width="12" height="8" rx="3" fill={HI} />
    <rect x="42" y="12" width="12" height="10" rx="3" fill={HI} />
  </svg>
);

const SparePartsIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <path d="M14 22h36l-5 30H19L14 22z" fill={T} />
    <path d="M14 22h36l-3 10H17L14 22z" fill={HI} />
    <path d="M24 22v-7h16v7" stroke="#128F86" strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle cx="44" cy="44" r="11" fill="#15968d" />
    <circle cx="44" cy="44" r="6" fill="none" stroke="#fff" strokeWidth="2.4" />
    <circle cx="44" cy="44" r="2" fill="#fff" />
  </svg>
);

const BulkPartsIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <rect x="8" y="32" width="22" height="16" rx="3" fill="#7ee8dc" />
    <rect x="20" y="22" width="22" height="16" rx="3" fill="#2EC4B6" />
    <rect x="34" y="28" width="22" height="16" rx="3" fill="#128F86" />
    <rect x="20" y="22" width="22" height="7" rx="3" fill={HI} />
    <rect x="34" y="28" width="22" height="6" rx="3" fill={HI} />
  </svg>
);

const LowStockIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <circle cx="32" cy="34" r="22" fill={T} />
    <circle cx="32" cy="34" r="22" fill={HI} />
    <circle cx="32" cy="34" r="15" fill="#f7fffe" />
    <path d="M32 34l9-10" stroke="#128F86" strokeWidth="3.2" strokeLinecap="round" />
    <circle cx="32" cy="34" r="3.2" fill="#128F86" />
    <path d="M48 12l7 3-3 7z" fill="#e85d4c" />
    <path d="M51 16.5v3M51 21.2h.1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const PurchasesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <path d="M12 18h8l7 26h22" stroke={T} strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M27 44h22l5-16H22" stroke="#2EC4B6" strokeWidth="6" fill="none" strokeLinejoin="round" />
    <circle cx="30" cy="52" r="5" fill="#128F86" />
    <circle cx="48" cy="52" r="5" fill="#128F86" />
    <circle cx="30" cy="52" r="2" fill="#e7fffc" />
    <circle cx="48" cy="52" r="2" fill="#e7fffc" />
  </svg>
);

const PurchasePosIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <path d="M10 18h8l7 26h22" stroke={T} strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M25 44h22l5-16H20" stroke="#2EC4B6" strokeWidth="6" fill="none" />
    <circle cx="28" cy="52" r="5" fill="#128F86" />
    <circle cx="46" cy="52" r="5" fill="#128F86" />
    <rect x="40" y="6" width="18" height="22" rx="4" fill="#2EC4B6" />
    <rect x="40" y="6" width="18" height="10" rx="4" fill={HI} />
    <path d="M45 16h8M47 21h4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PriceHistoryIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <rect x="8" y="38" width="12" height="16" rx="3" fill="#8AF0E6" />
    <rect x="24" y="28" width="12" height="26" rx="3" fill="#2EC4B6" />
    <rect x="40" y="16" width="12" height="38" rx="3" fill="#128F86" />
    <path d="M12 22l16-10 20 12" stroke="#0d6b66" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <circle cx="48" cy="24" r="3.5" fill="#0d6b66" />
  </svg>
);

const PurchaseInvoicesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <rect x="16" y="6" width="32" height="50" rx="6" fill={T} />
    <rect x="16" y="6" width="32" height="16" rx="6" fill={HI} />
    <circle cx="32" cy="28" r="9" fill="#fff" />
    <text x="32" y="32.5" textAnchor="middle" fontSize="13" fontWeight="800" fill="#128F86">
      $
    </text>
    <rect x="23" y="42" width="18" height="3.2" rx="1.6" fill="#fff" />
    <rect x="23" y="48" width="12" height="3.2" rx="1.6" fill="#fff" />
  </svg>
);

const MaintenanceReportIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <rect x="16" y="6" width="32" height="50" rx="6" fill={T} />
    <rect x="16" y="6" width="32" height="14" rx="6" fill={HI} />
    <rect x="23" y="38" width="5" height="10" rx="1" fill="#fff" />
    <rect x="30" y="32" width="5" height="16" rx="1" fill="#fff" />
    <rect x="37" y="26" width="5" height="22" rx="1" fill="#fff" />
    <rect x="23" y="16" width="18" height="3" rx="1.5" fill="#fff" />
  </svg>
);

const CostReportIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <rect x="8" y="38" width="12" height="16" rx="3" fill="#8AF0E6" />
    <rect x="24" y="26" width="12" height="28" rx="3" fill="#2EC4B6" />
    <rect x="40" y="14" width="12" height="40" rx="3" fill="#128F86" />
    <path d="M10 24l18-12 18 10" stroke="#0d6b66" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <path d="M42 18l8-6 2 8" fill="#0d6b66" />
  </svg>
);

const StockMovementIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <rect x="22" y="14" width="20" height="16" rx="3" fill="#8AF0E6" />
    <rect x="10" y="28" width="20" height="16" rx="3" fill="#2EC4B6" />
    <rect x="34" y="28" width="20" height="16" rx="3" fill="#15968d" />
    <rect x="22" y="42" width="20" height="12" rx="3" fill="#128F86" />
    <rect x="22" y="14" width="20" height="6" rx="3" fill={HI} />
    <rect x="10" y="28" width="20" height="6" rx="3" fill={HI} />
  </svg>
);

const MileageIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Defs />
    <circle cx="32" cy="32" r="23" fill={T} />
    <circle cx="32" cy="32" r="23" fill={HI} />
    <circle cx="32" cy="32" r="16" fill="#f7fffe" />
    <path d="M32 32l11-9" stroke="#128F86" strokeWidth="3.3" strokeLinecap="round" />
    <circle cx="32" cy="32" r="3.4" fill="#128F86" />
    <path d="M32 12v4M32 48v4M12 32h4M48 32h4" stroke="#128F86" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// ربط عنوان الشاشة بالأيقونة المخصصة
export const fleetIconByTitle: Record<string, (props: IconProps) => JSX.Element> = {
  "لوحة الأسطول": FleetDashboardIcon,
  "السيارات": VehiclesIcon,
  "إضافة سيارات بالجملة": BulkVehiclesIcon,
  "تعديل السيارات": EditVehiclesIcon,
  "أمر صيانة جديد": NewMaintenanceIcon,
  "سجل أوامر الصيانة": MaintenanceLogIcon,
  "تكاليف الصيانة": MaintenanceCostsIcon,
  "قطع الغيار": SparePartsIcon,
  "إضافة قطع غيار بالجملة": BulkPartsIcon,
  "تنبيهات نقص المخزون": LowStockIcon,
  "المشتريات": PurchasesIcon,
  "نقطة بيع المشتريات": PurchasePosIcon,
  "سجل الأسعار": PriceHistoryIcon,
  "فواتير المشتريات": PurchaseInvoicesIcon,
  "تقرير الصيانة": MaintenanceReportIcon,
  "تقرير التكاليف": CostReportIcon,
  "تقرير الكيلومترات": MileageIcon,
  "حركة المخزون": StockMovementIcon,
  "المخزون والمستودعات": StockMovementIcon,
};

export default fleetIconByTitle;
