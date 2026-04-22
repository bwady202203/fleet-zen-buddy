import { ScrollText } from "lucide-react";
import ZatcaPlaceholder from "./ZatcaPlaceholder";

const ZatcaAuditLog = () => (
  <ZatcaPlaceholder
    title="سجل التدقيق"
    titleEn="Audit Log"
    icon={ScrollText}
    description="سجل كامل وغير قابل للتعديل لجميع العمليات المتعلقة بالفوترة الإلكترونية، يلبي متطلبات الهيئة في حفظ السجلات."
    features={[
      "تسجيل كل عمليات الإصدار والإرسال والاستلام",
      "تسجيل من قام بالعملية (User ID) والتاريخ والوقت بالثانية",
      "حفظ كامل لرسائل الطلب والاستجابة (Request/Response)",
      "تتبع تغييرات الحالة لكل فاتورة",
      "بحث متقدم وفلترة حسب التاريخ، المستخدم، نوع العملية",
      "تصدير السجل بصيغة CSV / PDF لأغراض المراجعة",
      "حماية السجل من الحذف أو التعديل",
    ]}
  />
);

export default ZatcaAuditLog;
