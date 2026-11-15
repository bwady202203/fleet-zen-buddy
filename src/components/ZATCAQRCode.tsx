import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { generateZATCAQRBase64, ZATCAQRData, formatAmount, validateZATCAQRData } from "@/lib/zatcaQR";

interface ZATCAQRCodeProps {
  sellerName: string;
  vatNumber: string;
  totalAmount: number;
  vatAmount: number;
  invoiceDate?: Date | string;
  size?: number;
}

/**
 * ZATCA Compliant QR Code Component
 * Generates QR codes according to Saudi ZATCA (Zakat, Tax and Customs Authority) requirements
 */
const ZATCAQRCode: React.FC<ZATCAQRCodeProps> = ({
  sellerName,
  vatNumber,
  totalAmount,
  vatAmount,
  invoiceDate,
  size = 120,
}) => {
  const timestamp = invoiceDate instanceof Date ? (isNaN(invoiceDate.getTime()) ? "" : invoiceDate.toISOString()) : (invoiceDate ?? "");

  const qrData: ZATCAQRData = {
    sellerName,
    vatNumber,
    timestamp,
    totalAmount: formatAmount(totalAmount),
    vatAmount: formatAmount(vatAmount),
  };

  const missing = validateZATCAQRData(qrData);
  if (missing.length) {
    return (
      <div className="text-center text-xs text-destructive border border-destructive rounded p-2" style={{ width: size }}>
        لا يمكن إنشاء رمز QR — بيانات ناقصة: {missing.join("، ")}
      </div>
    );
  }
  const qrValue = generateZATCAQRBase64(qrData);

  return (
    <div className="text-center">
      <QRCodeCanvas
        value={qrValue}
        size={size}
        level="M"
        includeMargin
        style={{ 
          border: '2px solid #2563eb', 
          padding: '4px',
          borderRadius: '4px'
        }}
      />
    </div>
  );
};

export default ZATCAQRCode;
