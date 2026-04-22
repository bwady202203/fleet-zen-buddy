import { Sparkles } from "lucide-react";
import ZatcaPlaceholder from "./ZatcaPlaceholder";

const ZatcaAiAssistant = () => (
  <ZatcaPlaceholder
    title="المساعد الذكي"
    titleEn="AI Compliance Assistant"
    icon={Sparkles}
    description="مساعد ذكاء اصطناعي يستخدم نماذج Lovable AI لاكتشاف الأخطاء قبل إرسال الفواتير، واقتراح الإصلاحات تلقائياً."
    features={[
      "اكتشاف الأخطاء الإملائية والمنطقية في بيانات الفاتورة",
      "اقتراح تصحيحات تلقائية للحقول الناقصة أو الخاطئة",
      "تحليل أنماط الرفض السابقة من الهيئة لتجنب تكرارها",
      "تنبيهات استباقية قبل انتهاء صلاحية الشهادات",
      "إجابة الأسئلة حول متطلبات الهيئة والامتثال",
      "تحليل الأداء المالي واقتراح تحسينات ضريبية",
      "ملخص ذكي لتقارير VAT الدورية",
    ]}
  />
);

export default ZatcaAiAssistant;
