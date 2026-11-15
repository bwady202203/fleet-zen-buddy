import { z } from "zod";

const requiredText = z.string().trim().min(1, "هذا الحقل مطلوب");
const amount = z.string().trim().min(1, "هذا الحقل مطلوب")
  .transform((value) => Number(value.replace(/,/g, ".")))
  .pipe(z.number().finite("أدخل رقماً صحيحاً"));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "أدخل التاريخ")
  .refine((value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, "التاريخ غير صحيح");

export const transportLoadSchema = z.object({
  supplier_name: requiredText,
  commission: amount.pipe(z.number().min(0, "العمولة لا تكون سالبة")),
  delivery_weight: amount.pipe(z.number().positive("وزن التسليم أكبر من صفر")),
  driver_name: requiredText,
  vehicle_number: requiredText,
  invoice_number: requiredText,
  delivery_date: date,
  loading_date: date,
});

export const transportLoadFields = [
  { key: "supplier_name", label: "المورد", type: "text" },
  { key: "commission", label: "عمولة", type: "decimal" },
  { key: "delivery_weight", label: "وزن التسليم", type: "decimal" },
  { key: "driver_name", label: "اسم السائق", type: "text" },
  { key: "vehicle_number", label: "رقم السيارة", type: "text" },
  { key: "invoice_number", label: "رقم الفاتورة", type: "text" },
  { key: "delivery_date", label: "تاريخ التسليم", type: "date" },
  { key: "loading_date", label: "تاريخ التحميل", type: "date" },
] as const;

export type TransportLoadForm = Record<(typeof transportLoadFields)[number]["key"], string>;
export const emptyTransportLoad: TransportLoadForm = {
  supplier_name: "", commission: "", delivery_weight: "", driver_name: "",
  vehicle_number: "", invoice_number: "", delivery_date: "", loading_date: "",
};