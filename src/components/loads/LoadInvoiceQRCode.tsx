import { QRCodeCanvas } from "qrcode.react";
import { buildLoadInvoiceTimestamp, formatLoadInvoiceAmount, generateLoadInvoiceQR } from "@/lib/loadInvoiceQR";

interface Props {
  sellerName?: string;
  vatNumber?: string;
  totalAmount: number | string;
  vatAmount: number | string;
  invoiceDate?: string | Date;
  size?: number;
}

export default function LoadInvoiceQRCode({ sellerName, vatNumber, totalAmount, vatAmount, invoiceDate, size = 112 }: Props) {
  let value: string;
  try {
    value = generateLoadInvoiceQR({
      sellerName: String(sellerName ?? "").trim(),
      vatNumber: String(vatNumber ?? "").trim(),
      timestamp: buildLoadInvoiceTimestamp(invoiceDate),
      total: formatLoadInvoiceAmount(totalAmount),
      vat: formatLoadInvoiceAmount(vatAmount),
    });
  } catch (error) {
    return <div role="alert" className="max-w-56 rounded border border-destructive p-2 text-center text-xs text-destructive">
      لا يمكن إنشاء رمز QR: {error instanceof Error ? error.message : "بيانات الفاتورة غير صالحة"}
    </div>;
  }
  return <QRCodeCanvas aria-label="رمز QR للفاتورة الضريبية" value={value} size={size} level="M" marginSize={4} />;
}