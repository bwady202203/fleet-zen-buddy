import { FileCode2 } from "lucide-react";
import ZatcaPlaceholder from "./ZatcaPlaceholder";

const ZatcaXml = () => (
  <ZatcaPlaceholder
    title="صيغة XML / UBL 2.1"
    titleEn="XML / UBL 2.1 Generation"
    icon={FileCode2}
    description="تحويل الفواتير من صيغ PDF / Excel / JSON إلى صيغة XML المعتمدة وفق معيار UBL 2.1 الذي تتطلبه هيئة الزكاة."
    features={[
      "توليد XML متوافق مع PINT-SA (المخطط السعودي)",
      "تضمين كل عناصر الفاتورة: AccountingSupplierParty، AllowanceCharge، InvoiceLine",
      "تضمين التوقيع الرقمي (XAdES) داخل الـ XML",
      "حساب الـ Invoice Hash و Previous Invoice Hash تلقائياً",
      "تحويل الفواتير المخزنة لـ XML قابل للتحميل",
      "معاينة الـ XML المولّد قبل الإرسال للهيئة",
    ]}
  />
);

export default ZatcaXml;
