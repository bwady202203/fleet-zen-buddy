import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { numberToWords } from "@/lib/numberToWords";

interface CustodyRequestPrintProps {
  amount: number;
  date: string; // YYYY-MM-DD
}

const BLUE_DARK = "#1e3a8a";
const BLUE = "#1d4ed8";
const BLUE_LIGHT = "#dbeafe";
const BLUE_BORDER = "#93c5fd";

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

/** مستند طباعة طلب عهدة — مقاس A4 (210×297mm) بحدود مضبوطة */
export const CustodyRequestDocument = ({ amount, date }: CustodyRequestPrintProps) => (
  <div
    dir="rtl"
    style={{
      width: "210mm",
      height: "297mm",
      padding: "10mm 12mm",
      background: "#ffffff",
      color: "#1e293b",
      fontFamily: "'Cairo', sans-serif",
      boxSizing: "border-box",
      overflow: "hidden",
    }}
  >
    {/* إطار خارجي مزدوج */}
    <div
      style={{
        border: `2.5px solid ${BLUE_DARK}`,
        borderRadius: "10px",
        padding: "3px",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          border: `1px solid ${BLUE}`,
          borderRadius: "7px",
          padding: "8mm 10mm",
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* الرأس العلوي: اسم الشركة على الجانب */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "5mm",
          }}
        >
          <div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: BLUE_DARK }}>
              شركة الرمال الناعمة الصناعية
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1mm", letterSpacing: "1px" }}>
              Soft Sand Industrial Company
            </div>
          </div>
          <div
            style={{
              border: `1.5px solid ${BLUE_BORDER}`,
              borderRadius: "6px",
              padding: "1.5mm 4mm",
              fontSize: "10px",
              color: BLUE,
              fontWeight: 700,
              background: BLUE_LIGHT,
            }}
          >
            نموذج رقم: HR-01
          </div>
        </div>

        {/* شريط العنوان */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`,
            borderRadius: "8px",
            padding: "5mm 8mm",
            textAlign: "center",
            color: "#ffffff",
            marginBottom: "6mm",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 800 }}>طلب صرف عهدة</div>
          <div
            style={{
              width: "40mm",
              height: "2px",
              background: BLUE_BORDER,
              margin: "3mm auto 0",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* التاريخان: الميلادي في جانب والهجري في الجهة المقابلة */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13px",
            marginBottom: "8mm",
            color: "#334155",
          }}
        >
          <div>
            <span style={{ fontWeight: 700, color: BLUE_DARK }}>التاريخ: </span>
            {gregorianOf(date)} م
          </div>
          <div>
            <span style={{ fontWeight: 700, color: BLUE_DARK }}>الموافق: </span>
            {hijriOf(date)} هـ
          </div>
        </div>

        {/* المخاطَب */}
        <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "2mm" }}>
          السيد / المدير العام المحترم
        </div>
        <div style={{ fontSize: "14px", marginBottom: "7mm", color: "#334155" }}>
          السلام عليكم ورحمة الله وبركاته، وبعد:
        </div>

        {/* نص الطلب */}
        <div
          style={{
            fontSize: "15px",
            lineHeight: 2.3,
            textAlign: "justify",
            marginBottom: "7mm",
          }}
        >
          نأمل من سيادتكم صرف عهدة نقدية بمبلغ وقدره{" "}
          <span style={{ fontWeight: 800, color: BLUE_DARK }}>{fmt(amount)} ريال سعودي</span>{" "}
          <span style={{ fontWeight: 700 }}>({numberToWords(amount)})</span>، وذلك للمصروفات
          الخاصة بالشركة.
        </div>

        {/* صندوق المبلغ */}
        <div
          style={{
            border: `1.5px solid ${BLUE}`,
            borderRadius: "8px",
            overflow: "hidden",
            marginBottom: "8mm",
          }}
        >
          <div
            style={{
              background: BLUE_DARK,
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
                padding: "4mm 4mm",
                textAlign: "center",
                borderLeft: `1.5px solid ${BLUE}`,
                background: BLUE_LIGHT,
              }}
            >
              <div style={{ fontSize: "11px", color: "#475569", marginBottom: "1.5mm" }}>
                المبلغ رقمًا
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: BLUE_DARK }}>
                {fmt(amount)} <span style={{ fontSize: "13px" }}>ر.س</span>
              </div>
            </div>
            <div style={{ flex: 2, padding: "4mm 4mm" }}>
              <div style={{ fontSize: "11px", color: "#475569", marginBottom: "1.5mm" }}>
                المبلغ كتابةً
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.9 }}>
                {numberToWords(amount)}
              </div>
            </div>
          </div>
        </div>

        {/* الخاتمة */}
        <div style={{ fontSize: "14px", marginBottom: "10mm" }}>
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
              <div style={{ fontWeight: 700, color: BLUE_DARK, marginBottom: "12mm" }}>{role}</div>
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
