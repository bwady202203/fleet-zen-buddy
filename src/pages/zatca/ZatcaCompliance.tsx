import { CheckCircle2 } from "lucide-react";
import ZatcaPlaceholder from "./ZatcaPlaceholder";

const ZatcaCompliance = () => (
  <ZatcaPlaceholder
    title="محرك الامتثال"
    titleEn="Compliance Engine"
    icon={CheckCircle2}
    description="التحقق من مطابقة الفواتير لكافة متطلبات هيئة الزكاة قبل الإرسال، وضمان عدم رفضها."
    features={[
      "التحقق من صحة الرقم الضريبي (15 رقم يبدأ وينتهي بـ 3)",
      "التحقق من الحقول الإلزامية: UUID، التاريخ والوقت، نوع الفاتورة",
      "التحقق من توازن المبالغ (الإجمالي = الصافي + الضريبة)",
      "التحقق من معلومات البائع والمشتري للفواتير الضريبية",
      "التحقق من صيغة XML المولدة وفق UBL 2.1",
      "التحقق من التوقيع الرقمي وسلامة الـ Hash",
      "تنبيهات فورية بالألوان عند وجود حقول ناقصة أو خاطئة",
    ]}
  />
);

export default ZatcaCompliance;
