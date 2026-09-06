import type { SVGProps } from "react";

// أيقونات مخصصة لشاشات إدارة الأسطول والورشة (SVG متدرجة)
type IconProps = SVGProps<SVGSVGElement>;

const Grad = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#7ee8dc" />
      <stop offset="100%" stopColor="#1aa89c" />
    </linearGradient>
  </defs>
);

const base = (props: IconProps) => ({
  viewBox: "0 0 64 64",
  fill: "none",
  ...props,
});

const FleetDashboardIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-dash" />
    <rect x="6" y="6" width="24" height="24" rx="6" fill="url(#fi-dash)" />
    <rect x="34" y="6" width="24" height="24" rx="6" fill="url(#fi-dash)" />
    <rect x="6" y="34" width="24" height="24" rx="6" fill="url(#fi-dash)" />
    <rect x="34" y="34" width="24" height="24" rx="6" fill="url(#fi-dash)" />
  </svg>
);

const VehiclesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-veh" />
    <path d="M10 42h36l6-14H28l-4-8H14l-4 22z" fill="url(#fi-veh)" stroke="#148f86" strokeWidth="1.5" />
    <circle cx="20" cy="46" r="5" fill="#148f86" />
    <circle cx="42" cy="46" r="5" fill="#148f86" />
    <path d="M40 18l8 8h-8z" fill="#1aa89c" />
    <circle cx="48" cy="22" r="10" fill="#2ec4b6" />
    <path d="M44 22l3 3 6-6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </svg>
);

const BulkVehiclesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-bulkveh" />
    <rect x="8" y="22" width="28" height="18" rx="3" fill="url(#fi-bulkveh)" />
    <path d="M36 28h12l6 8v8H36V28z" fill="#1aa89c" />
    <rect x="10" y="18" width="18" height="8" rx="2" fill="#2ec4b6" />
    <circle cx="18" cy="44" r="5" fill="#148f86" />
    <circle cx="46" cy="44" r="5" fill="#148f86" />
  </svg>
);

const EditVehiclesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-editveh" />
    <path d="M22 10l8 8-18 18-8-8 18-18z" fill="url(#fi-editveh)" />
    <rect x="10" y="34" width="10" height="18" rx="2" transform="rotate(-45 10 34)" fill="#1aa89c" />
    <circle cx="44" cy="44" r="10" fill="#2ec4b6" />
  </svg>
);

const NewMaintenanceIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-newmnt" />
    <path d="M18 12l8 8-16 16-8-8 16-16z" fill="url(#fi-newmnt)" />
    <rect x="8" y="34" width="10" height="16" rx="2" transform="rotate(-45 8 34)" fill="#1aa89c" />
    <circle cx="44" cy="44" r="12" fill="#2ec4b6" />
    <path d="M44 38v12M38 44h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const MaintenanceLogIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-mntlog" />
    <rect x="16" y="10" width="32" height="44" rx="4" fill="url(#fi-mntlog)" />
    <rect x="24" y="6" width="16" height="8" rx="2" fill="#1aa89c" />
    <path d="M24 24l4 4 8-8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M24 36l4 4 8-8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    <rect x="24" y="46" width="16" height="3" rx="1.5" fill="#fff" />
  </svg>
);

const MaintenanceCostsIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="12" y="34" width="10" height="18" rx="2" fill="#7ee8dc" />
    <rect x="27" y="24" width="10" height="28" rx="2" fill="#2ec4b6" />
    <rect x="42" y="14" width="10" height="38" rx="2" fill="#1aa89c" />
  </svg>
);

const SparePartsIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-parts" />
    <path d="M16 22h32l-4 28H20L16 22z" fill="url(#fi-parts)" />
    <path d="M24 22V16h16v6" stroke="#148f86" strokeWidth="3" fill="none" />
    <circle cx="44" cy="44" r="10" fill="#1aa89c" />
    <path d="M44 39v6l4 2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

const BulkPartsIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="10" y="30" width="20" height="16" rx="3" fill="#7ee8dc" />
    <rect x="22" y="22" width="20" height="16" rx="3" fill="#2ec4b6" />
    <rect x="34" y="28" width="20" height="16" rx="3" fill="#1aa89c" />
  </svg>
);

const LowStockIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-lowstock" />
    <circle cx="32" cy="34" r="20" fill="url(#fi-lowstock)" />
    <circle cx="32" cy="34" r="14" fill="#f4f7fb" />
    <path d="M32 34l8-8" stroke="#1aa89c" strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="34" r="3" fill="#1aa89c" />
    <path d="M44 14l6 2-2 6" fill="#e85d4c" />
  </svg>
);

const PurchasesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-purch" />
    <path
      d="M12 20h6l6 24h22l6-16H24"
      stroke="url(#fi-purch)"
      strokeWidth="5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="28" cy="50" r="4" fill="#1aa89c" />
    <circle cx="44" cy="50" r="4" fill="#1aa89c" />
  </svg>
);

const PurchasePosIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-pos" />
    <path
      d="M12 20h6l6 24h22l6-16H24"
      stroke="url(#fi-pos)"
      strokeWidth="5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="28" cy="50" r="4" fill="#1aa89c" />
    <circle cx="44" cy="50" r="4" fill="#1aa89c" />
    <rect x="40" y="8" width="16" height="20" rx="3" fill="#2ec4b6" />
    <path d="M44 16h8M46 21h4" stroke="#fff" strokeWidth="2" />
  </svg>
);

const PriceHistoryIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="10" y="36" width="10" height="16" rx="2" fill="#7ee8dc" />
    <rect x="24" y="26" width="10" height="26" rx="2" fill="#2ec4b6" />
    <rect x="38" y="16" width="10" height="36" rx="2" fill="#1aa89c" />
    <path d="M14 20l16-8 20 10" stroke="#148f86" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

const PurchaseInvoicesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-inv" />
    <rect x="16" y="8" width="32" height="48" rx="4" fill="url(#fi-inv)" />
    <circle cx="32" cy="28" r="8" fill="#fff" />
    <text x="32" y="32" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1aa89c">
      $
    </text>
    <rect x="22" y="42" width="20" height="3" rx="1.5" fill="#fff" />
    <rect x="22" y="48" width="14" height="3" rx="1.5" fill="#fff" />
  </svg>
);

const MaintenanceReportIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-mntrep" />
    <rect x="16" y="8" width="32" height="48" rx="4" fill="url(#fi-mntrep)" />
    <rect x="22" y="36" width="5" height="10" fill="#fff" />
    <rect x="30" y="30" width="5" height="16" fill="#fff" />
    <rect x="38" y="24" width="5" height="22" fill="#fff" />
    <rect x="22" y="16" width="20" height="3" rx="1.5" fill="#fff" />
  </svg>
);

const CostReportIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="10" y="38" width="10" height="14" rx="2" fill="#7ee8dc" />
    <rect x="24" y="28" width="10" height="24" rx="2" fill="#2ec4b6" />
    <rect x="38" y="16" width="10" height="36" rx="2" fill="#1aa89c" />
    <path d="M12 22l18-10 16 8" stroke="#148f86" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

const StockMovementIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="12" y="34" width="16" height="14" rx="2" fill="#7ee8dc" />
    <rect x="24" y="24" width="16" height="14" rx="2" fill="#2ec4b6" />
    <rect x="36" y="30" width="16" height="14" rx="2" fill="#1aa89c" />
    <rect x="20" y="42" width="16" height="10" rx="2" fill="#148f86" />
  </svg>
);

const MileageIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <Grad id="fi-mile" />
    <circle cx="32" cy="32" r="22" fill="url(#fi-mile)" />
    <circle cx="32" cy="32" r="16" fill="#f4f7fb" />
    <path d="M32 32L44 24" stroke="#1aa89c" strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="32" r="3" fill="#1aa89c" />
    <path d="M32 14v4M32 46v4M14 32h4M46 32h4" stroke="#1aa89c" strokeWidth="2" />
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
