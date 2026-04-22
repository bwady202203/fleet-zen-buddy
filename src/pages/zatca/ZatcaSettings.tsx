import { Settings2 } from "lucide-react";
import ZatcaPlaceholder from "./ZatcaPlaceholder";

const ZatcaSettings = () => (
  <ZatcaPlaceholder
    title="إعدادات الفوترة الإلكترونية"
    titleEn="ZATCA Settings"
    icon={Settings2}
    description="إعداد بيانات المنشأة الضريبية المطلوبة من هيئة الزكاة لإصدار الفواتير المعتمدة. يتم القراءة الافتراضية من إعدادات الشركة."
    features={[
      "اسم المنشأة (عربي + إنجليزي)",
      "الرقم الضريبي (VAT Number) - 15 رقم",
      "السجل التجاري (CRN)",
      "العنوان التفصيلي: المبنى، الشارع، الحي، المدينة، الرمز البريدي، الرمز الإضافي",
      "شعار المنشأة للطباعة على الفواتير",
      "بادئة ورقم تسلسل الفواتير (Invoice Counter Value - ICV)",
      "اختيار البيئة (Sandbox / Simulation / Production)",
      "إعدادات الجهاز (Common Name / Serial Number)",
    ]}
  />
);

export default ZatcaSettings;
