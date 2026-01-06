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
  const tlvData = [
    encodeTLV(1, sellerName),    // Seller Name (اسم البائع)
    encodeTLV(2, vatNumber),     // VAT Registration Number (الرقم الضريبي)
    encodeTLV(3, timestamp),     // Invoice Timestamp (تاريخ ووقت الفاتورة)
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
  return amount.toFixed(2);
};

/**
 * Get current ISO timestamp
 */
export const getISOTimestamp = (date?: Date): string => {
  return (date || new Date()).toISOString();
};
