import { BarChart3 } from "lucide-react";
import ZatcaPlaceholder from "./ZatcaPlaceholder";

const ZatcaReports = () => (
  <ZatcaPlaceholder
    title="التقارير الضريبية"
    titleEn="Tax Reports & Dashboard"
    icon={BarChart3}
    description="لوحة تحكم متقدمة لمتابعة حالة الفواتير والتقارير الضريبية والإيرادات."
    features={[
      "إجمالي الفواتير الصادرة (شهري / ربعي / سنوي)",
      "إجمالي ضريبة القيمة المضافة (VAT) المحصلة",
      "نسبة الفواتير المقبولة مقابل المرفوضة",
      "تقرير الفواتير المعلقة (Pending) التي لم تُرسل",
      "تقرير حسب العميل / نوع الفاتورة / المنتج",
      "إقرار VAT الربعي جاهز للتقديم لهيئة الزكاة",
      "رسوم بيانية تفاعلية للأداء المالي",
      "تصدير التقارير لـ Excel / PDF",
    ]}
  />
);

export default ZatcaReports;
