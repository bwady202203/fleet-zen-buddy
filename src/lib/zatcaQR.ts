/**
 * ZATCA TLV Encoding Utility for Saudi Arabia VAT Compliance
 * Generates QR codes compliant with ZATCA (Zakat, Tax and Customs Authority) requirements
 */

/**
 * Encode TLV (Tag-Length-Value) format
 */
const encodeTLV = (tag: number, value: string): Uint8Array => {
  const textEncoder = new TextEncoder();
  const valueBytes = textEncoder.encode(value);
  if (valueBytes.length > 255) throw new Error(`قيمة الحقل ${tag} أطول من 255 بايت`);
  return new Uint8Array([
    tag,
    valueBytes.length,
    ...valueBytes,
  ]);
};

export interface ZATCAQRData {
  sellerName: string;      // اسم البائع (Tag 1)
  vatNumber: string;       // الرقم الضريبي (Tag 2)
  timestamp: string;       // التاريخ والوقت ISO 8601 (Tag 3)
  totalAmount: string;     // المبلغ الإجمالي (Tag 4)
  vatAmount: string;       // مبلغ الضريبة (Tag 5)
}

/**
 * Generate ZATCA compliant QR Base64 string
 * According to ZATCA Phase 1 requirements
 */
export const generateZATCAQRBase64 = ({
  sellerName,
  vatNumber,
  timestamp,
  totalAmount,
  vatAmount,
}: ZATCAQRData): string => {
  const missing = validateZATCAQRData({ sellerName, vatNumber, timestamp, totalAmount, vatAmount });
  if (missing.length) throw new Error("بيانات QR ناقصة: " + missing.join("، "));
  const tlvData = [
    encodeTLV(1, sellerName.trim()),    // Seller Name (اسم البائع)
    encodeTLV(2, normalizeVatNumber(vatNumber)),     // VAT Registration Number (الرقم الضريبي)
    encodeTLV(3, toZatcaTimestamp(timestamp)),     // Invoice Timestamp (تاريخ ووقت الفاتورة)
    encodeTLV(4, totalAmount),   // Invoice Total (المبلغ الإجمالي مع الضريبة)
    encodeTLV(5, vatAmount),     // VAT Amount (مبلغ الضريبة)
  ];

  // Merge all TLV arrays into one
  const mergedArray = Uint8Array.from(
    tlvData.flatMap(arr => Array.from(arr))
  );

  // Convert to Base64
  return btoa(
    String.fromCharCode(...mergedArray)
  );
};

/**
 * Format amount to 2 decimal places string
 */
export const formatAmount = (amount: number): string => {
  const n = Number(amount);
  return (Number.isFinite(n) ? Math.abs(n) : 0).toFixed(2);
};

/** الرقم الضريبي: أرقام فقط (15 رقمًا حسب الهيئة) */
export const normalizeVatNumber = (vat: string): string =>
  String(vat ?? "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, "");

/** يحوّل التاريخ إلى Date؛ التاريخ بدون وقت يُعتبر منتصف الليل بتوقيت الرياض */
const parseInvoiceDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  const v = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00+03:00`);
  return new Date(v);
};

/** طابع زمني ISO 8601 بتوقيت السعودية: YYYY-MM-DDTHH:mm:ss+03:00 */
export const toZatcaTimestamp = (value: string | Date): string => {
  const d = parseInvoiceDate(value);
  if (isNaN(d.getTime())) throw new Error("تاريخ الفاتورة غير صالح");
  const r = new Date(d.getTime() + 3 * 3600 * 1000);
  return r.toISOString().replace(/\.\d{3}Z$/, "+03:00");
};

/** يرجع أسماء الحقول الناقصة أو غير الصالحة */
export const validateZATCAQRData = (d: ZATCAQRData): string[] => {
  const m: string[] = [];
  if (!String(d.sellerName ?? "").trim()) m.push("اسم المورد");
  if (normalizeVatNumber(d.vatNumber).length !== 15) m.push("الرقم الضريبي (15 رقمًا)");
  if (!d.timestamp || isNaN(parseInvoiceDate(d.timestamp).getTime())) m.push("تاريخ الفاتورة");
  if (!/^\d+\.\d{2}$/.test(String(d.totalAmount ?? ""))) m.push("إجمالي الفاتورة");
  if (!/^\d+\.\d{2}$/.test(String(d.vatAmount ?? ""))) m.push("مبلغ الضريبة");
  return m;
};

/**
 * Get current ISO timestamp
 */
export const getISOTimestamp = (date?: Date): string => {
  return toZatcaTimestamp(date || new Date());
};
