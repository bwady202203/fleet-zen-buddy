import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { generateZATCAQRBase64, ZATCAQRData, formatAmount, getISOTimestamp } from "@/lib/zatcaQR";

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
  const timestamp = invoiceDate 
    ? (typeof invoiceDate === 'string' ? new Date(invoiceDate).toISOString() : invoiceDate.toISOString())
    : getISOTimestamp();

  const qrData: ZATCAQRData = {
    sellerName,
    vatNumber,
    timestamp,
    totalAmount: formatAmount(totalAmount),
    vatAmount: formatAmount(vatAmount),
  };

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
