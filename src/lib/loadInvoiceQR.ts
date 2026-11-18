/** Adapted from the supplied standalone ZATCA modules; five-tag Phase 1 payload. */
export interface LoadInvoiceQRData {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: string;
  vat: string;
}

export function formatLoadInvoiceAmount(value: number | string): string {
  if (value == null || String(value).trim() === "") throw new Error("قيمة مالية غير صالحة");
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error("قيمة مالية غير صالحة");
  const [coefficient, exponent = "0"] = String(n).split("e");
  const cents = Math.round(Number(`${coefficient}e${Number(exponent) + 2}`));
  if (!Number.isSafeInteger(cents)) throw new Error("قيمة مالية غير صالحة");
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function buildLoadInvoiceTimestamp(value?: string | Date): string {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error("تاريخ ووقت الإصدار غير صالحين");
    return new Date(value.getTime() + 3 * 3600000).toISOString().replace(/\.\d{3}Z$/, "+03:00");
  }
  const text = String(value ?? "").trim();
  // Legacy invoices store a date only: retain that date, never invent the current time.
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00+03:00` : text;
}

export function validateLoadInvoiceQRData(data: LoadInvoiceQRData): string[] {
  const errors: string[] = [];
  if (!String(data.sellerName || "").trim()) errors.push("اسم المنشأة مطلوب");
  if (!/^3\d{13}3$/.test(data.vatNumber)) errors.push("الرقم الضريبي للبائع يجب أن يتكون من 15 رقمًا ويبدأ وينتهي بـ 3");
  const match = data.timestamp.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
  const date = match ? new Date(`${match[1]}T00:00:00Z`) : new Date(NaN);
  if (!match || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== match[1] ||
      Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59 ||
      !Number.isFinite(new Date(data.timestamp).getTime())) errors.push("تاريخ ووقت الإصدار غير صالحين");
  for (const [label, amount] of [["الإجمالي", data.total], ["الضريبة", data.vat]]) {
    if (!/^\d+\.\d{2}$/.test(amount) || !Number.isFinite(Number(amount))) errors.push(`${label} غير صالح`);
  }
  if (Number(data.vat) > Number(data.total)) errors.push("الضريبة أكبر من الإجمالي");
  return errors;
}

export function decodeLoadInvoiceQR(base64: string): Record<number, string> {
  if (!base64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) throw new Error("ترميز Base64 غير صالح");
  const binary = atob(base64);
  if (btoa(binary) !== base64) throw new Error("ترميز Base64 غير قياسي");
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const tags: Record<number, string> = {};
  let offset = 0;
  for (let tag = 1; tag <= 5; tag++) {
    if (offset + 2 > bytes.length || bytes[offset] !== tag) throw new Error("ترتيب Tags 1 إلى 5 غير صالح");
    const length = bytes[offset + 1];
    offset += 2;
    if (!length || offset + length > bytes.length) throw new Error("طول قيمة TLV غير صالح");
    tags[tag] = new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(offset, offset + length));
    offset += length;
  }
  if (offset !== bytes.length) throw new Error("بيانات إضافية بعد Tag 5");
  return tags;
}

export function generateLoadInvoiceQR(data: LoadInvoiceQRData): string {
  const errors = validateLoadInvoiceQRData(data);
  if (errors.length) throw new Error(errors.join("؛ "));
  const values = [data.sellerName, data.vatNumber, data.timestamp, data.total, data.vat];
  const bytes = values.flatMap((value, index) => {
    const encoded = new TextEncoder().encode(value);
    if (encoded.length > 255) throw new Error(`قيمة Tag ${index + 1} تتجاوز 255 بايت`);
    return [index + 1, encoded.length, ...encoded];
  });
  const base64 = btoa(String.fromCharCode(...bytes));
  const tags = decodeLoadInvoiceQR(base64);
  values.forEach((value, index) => {
    if (tags[index + 1] !== value) throw new Error(`Tag ${index + 1} لا يطابق الفاتورة`);
  });
  return base64;
}