import { ShieldCheck } from "lucide-react";
import ZatcaPlaceholder from "./ZatcaPlaceholder";

const ZatcaSubmission = () => (
  <ZatcaPlaceholder
    title="الإرسال لهيئة الزكاة"
    titleEn="ZATCA Submission"
    icon={ShieldCheck}
    description="ربط مباشر (API Integration) مع منصة هيئة الزكاة والضريبة والجمارك لإرسال الفواتير وفق المرحلة الثانية من الفوترة الإلكترونية (الربط والتكامل)."
    features={[
      "إرسال الفواتير الضريبية عبر مسار Clearance (الإجازة المسبقة)",
      "إرسال الفواتير المبسطة عبر مسار Reporting (التبليغ خلال 24 ساعة)",
      "استلام رمز الاستجابة (Cleared Invoice) وختم التشفير من الهيئة",
      "إعادة المحاولة التلقائية عند فشل الإرسال (Retry Logic)",
      "متابعة حالة الإرسال (Pending / Cleared / Reported / Rejected)",
      "إعدادات بيئة الاختبار (Sandbox) والإنتاج (Production)",
      "سجل كامل لرسائل الطلب والاستجابة (Request/Response Log)",
    ]}
  />
);

export default ZatcaSubmission;
