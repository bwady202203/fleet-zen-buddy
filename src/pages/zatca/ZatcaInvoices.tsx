import { FileCheck2 } from "lucide-react";
import ZatcaPlaceholder from "./ZatcaPlaceholder";

const ZatcaInvoices = () => (
  <ZatcaPlaceholder
    title="الفواتير المعتمدة"
    titleEn="Approved e-Invoices"
    icon={FileCheck2}
    description="إدارة الفواتير الضريبية والمبسطة المتوافقة مع متطلبات هيئة الزكاة، مع QR Code معتمد ورقم UUID فريد لكل فاتورة."
    features={[
      "إنشاء فواتير ضريبية (Tax Invoice) للأعمال (B2B)",
      "إنشاء فواتير مبسطة (Simplified) للمستهلك (B2C)",
      "تطبيق ضريبة القيمة المضافة (15%) تلقائياً على البنود",
      "توليد QR Code بصيغة TLV/Base64 المعتمدة من ZATCA",
      "إنشاء UUID فريد + Hash تسلسلي لكل فاتورة (PIH/ICV)",
      "طباعة A4 بتصميم احترافي يحتوي كل الحقول الإلزامية",
      "حالة الفاتورة: مسودة / معتمدة / مرسلة / مقبولة / مرفوضة",
      "دعم فواتير الإلغاء والإشعارات الدائنة والمدينة",
    ]}
  />
);

export default ZatcaInvoices;
