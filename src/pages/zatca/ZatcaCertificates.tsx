import { KeyRound } from "lucide-react";
import ZatcaPlaceholder from "./ZatcaPlaceholder";

const ZatcaCertificates = () => (
  <ZatcaPlaceholder
    title="الشهادات الرقمية"
    titleEn="Digital Certificates"
    icon={KeyRound}
    description="إدارة شهادات التوقيع الرقمي المطلوبة من هيئة الزكاة لاعتماد الفواتير وتشفير البيانات."
    features={[
      "إنشاء مفتاح خاص (Private Key) ECDSA secp256k1",
      "توليد طلب توقيع شهادة (CSR) بكامل بيانات المنشأة",
      "استخراج Compliance CSID من بيئة الاختبار",
      "استخراج Production CSID للبيئة الفعلية",
      "إدارة عدة شهادات لعدة أجهزة/فروع (Multi-device)",
      "تجديد الشهادات قبل انتهاء الصلاحية",
      "تخزين آمن ومشفر للمفاتيح (Encrypted at rest)",
    ]}
  />
);

export default ZatcaCertificates;
