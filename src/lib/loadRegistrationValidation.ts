import { z } from "zod";

export const requiredLoadFieldLabels = {
  loadNumber: "رقم الشحنة",
  invoiceDate: "تاريخ الفاتورة",
  companyId: "اسم العميل",
  loadTypeId: "نوع الحمولة",
  driverId: "اسم السائق",
  truckNumber: "رقم الشاحنة",
  quantity: "كمية التحميل",
  unloadQuantity: "كمية التنزيل",
  commissions: "عمولات",
  deliveryFrom: "التوصيل من",
  deliveryTo: "التوصيل الى",
} as const;

export type RequiredLoadField = keyof typeof requiredLoadFieldLabels;

const requiredText = (label: string, max = 200) => z.string().trim()
  .min(1, `يرجى إدخال ${label}`).max(max, `${label}: النص أطول من المسموح`);
const requiredId = (label: string) => requiredText(label).uuid(`يرجى اختيار ${label}`);
const requiredAmount = (label: string) => requiredText(label, 30)
  .transform((value) => value.replace(/,/g, "."))
  .refine((value) => /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)), `يرجى إدخال رقم صحيح في ${label}`)
  .transform(Number);

export const premiumLoadRegistrationSchema = z.object({
  loadNumber: requiredText(requiredLoadFieldLabels.loadNumber, 100),
  invoiceDate: requiredText(requiredLoadFieldLabels.invoiceDate, 10)
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, "يرجى إدخال تاريخ فاتورة صحيح"),
  companyId: requiredId(requiredLoadFieldLabels.companyId),
  loadTypeId: requiredId(requiredLoadFieldLabels.loadTypeId),
  driverId: requiredId(requiredLoadFieldLabels.driverId),
  truckNumber: requiredText(requiredLoadFieldLabels.truckNumber, 100),
  quantity: requiredAmount(requiredLoadFieldLabels.quantity),
  unloadQuantity: requiredAmount(requiredLoadFieldLabels.unloadQuantity),
  commissions: requiredAmount(requiredLoadFieldLabels.commissions),
  deliveryFrom: requiredText(requiredLoadFieldLabels.deliveryFrom),
  deliveryTo: requiredText(requiredLoadFieldLabels.deliveryTo),
});