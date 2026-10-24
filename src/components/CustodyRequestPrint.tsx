import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { numberToWords } from "@/lib/numberToWords";

interface CustodyRequestPrintProps {
  amount: number;
  date: string; // YYYY-MM-DD
}

const hijriOf = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso + "T12:00:00"));
  } catch {
    return "";
  }
};

const gregorianOf = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso + "T12:00:00"));
  } catch {
    return iso;
  }
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** مستند طباعة طلب عهدة — مقاس A4 */
export const CustodyRequestDocument = ({ amount, date }: CustodyRequestPrintProps) => (
  <div
    dir="rtl"
    style={{
      width: "210mm",
      minHeight: "297mm",
      padding: "14mm 16mm",
      background: "#ffffff",
      color: "#1e293b",
      fontFamily: "'Cairo', sans-serif",
      boxSizing: "border-box",
    }}
  >
    {/* إطار خارجي مزدوج */}
    <div
      style={{
        border: "2.5px solid #0f4c5c",
        borderRadius: "10px",
        padding: "3px",
        minHeight: "268mm",
      }}
    >
      <div
        style={{
          border: "1px solid #0f4c5c",
          borderRadius: "7px",
          padding: "10mm 12mm",
          minHeight: "262mm",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* الرأس */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f4c5c 0%, #136f63 100%)",
            borderRadius: "8px",
            padding: "10mm 8mm",
            textAlign: "center",
            color: "#ffffff",
            marginBottom: "8mm",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: "2px", opacity: 0.85, marginBottom: "3mm" }}>
            شركة رمال المتحدة للنقليات
          </div>
          <div style={{ fontSize: "26px", fontWeight: 800 }}>طلب صرف عهدة</div>
          <div
            style={{
              width: "45mm",
              height: "2px",
              background: "#f4a261",
              margin: "4mm auto 0",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* التاريخ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13px",
            marginBottom: "10mm",
            color: "#334155",
          }}
        >
          <div>
            <span style={{ fontWeight: 700, color: "#0f4c5c" }}>التاريخ: </span>
            {gregorianOf(date)} م
          </div>
          <div>
            <span style={{ fontWeight: 700, color: "#0f4c5c" }}>الموافق: </span>
            {hijriOf(date)} هـ
          </div>
        </div>

        {/* المخاطَب */}
        <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "2mm" }}>
          السيد / المدير العام المحترم
        </div>
        <div style={{ fontSize: "14px", marginBottom: "8mm", color: "#334155" }}>
          السلام عليكم ورحمة الله وبركاته، وبعد:
        </div>

        {/* نص الطلب */}
        <div
          style={{
            fontSize: "15px",
            lineHeight: 2.4,
            textAlign: "justify",
            marginBottom: "8mm",
          }}
        >
          نأمل من سيادتكم صرف عهدة نقدية بمبلغ وقدره{" "}
          <span style={{ fontWeight: 800, color: "#0f4c5c" }}>{fmt(amount)} ريال سعودي</span>{" "}
          <span style={{ fontWeight: 700 }}>({numberToWords(amount)})</span>، وذلك للمصروفات
          الخاصة بالشركة.
        </div>

        {/* صندوق المبلغ */}
        <div
          style={{
            border: "1.5px solid #0f4c5c",
            borderRadius: "8px",
            overflow: "hidden",
            marginBottom: "10mm",
          }}
        >
          <div
            style={{
              background: "#0f4c5c",
              color: "#ffffff",
              textAlign: "center",
              padding: "2.5mm",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            تفاصيل المبلغ المطلوب
          </div>
          <div style={{ display: "flex" }}>
            <div
              style={{
                flex: 1,
                padding: "5mm 4mm",
                textAlign: "center",
                borderLeft: "1.5px solid #0f4c5c",
              }}
            >
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "1.5mm" }}>
                المبلغ رقمًا
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f4c5c" }}>
                {fmt(amount)} <span style={{ fontSize: "13px" }}>ر.س</span>
              </div>
            </div>
            <div style={{ flex: 2, padding: "5mm 4mm" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "1.5mm" }}>
                المبلغ كتابةً
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.9 }}>
                {numberToWords(amount)}
              </div>
            </div>
          </div>
        </div>

        {/* الخاتمة */}
        <div style={{ fontSize: "14px", marginBottom: "14mm" }}>
          وتقبلوا خالص الشكر والتقدير،،،
        </div>

        {/* التوقيعات */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "auto",
            textAlign: "center",
            fontSize: "13px",
          }}
        >
          {["مقدم الطلب", "المدير المالي", "المدير العام"].map((role) => (
            <div key={role} style={{ width: "30%" }}>
              <div style={{ fontWeight: 700, color: "#0f4c5c", marginBottom: "12mm" }}>{role}</div>
              <div
                style={{
                  borderTop: "1.5px dashed #94a3b8",
                  paddingTop: "2mm",
                  color: "#64748b",
                  fontSize: "11px",
                }}
              >
                الاسم والتوقيع
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/** طباعة طلب العهدة عبر مستند معزول في body */
export const printCustodyRequest = (amount: number, date: string) => {
  const host = document.createElement("div");
  host.id = "custody-request-print-document";
  document.body.appendChild(host);

  const style = document.createElement("style");
  style.id = "custody-request-print-style";
  style.textContent = `
    @page custody-request { size: A4 portrait; margin: 0; }
    @media print {
      body * { display: none !important; }
      #custody-request-print-document, #custody-request-print-document * { display: block !important; }
      #custody-request-print-document { position: absolute; top: 0; right: 0; }
      @page { size: A4 portrait; margin: 0; }
    }
  `;
  document.head.appendChild(style);

  const root = createRoot(host);
  root.render(<CustodyRequestDocument amount={amount} date={date} />);

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      root.unmount();
      host.remove();
      style.remove();
    }, 500);
  }, 300);
};

const CustodyRequestPrint = (props: CustodyRequestPrintProps) =>
  createPortal(<CustodyRequestDocument {...props} />, document.body);

export default CustodyRequestPrint;
