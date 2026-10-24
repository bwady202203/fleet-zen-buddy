import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { numberToWords } from "@/lib/numberToWords";
import omarSignature from "@/assets/omar-signature.png.asset.json";

interface CustodyRequestPrintProps {
  amount: number;
  date: string; // YYYY-MM-DD
  requestNo?: string;
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
export const CustodyRequestDocument = ({ amount, date, requestNo }: CustodyRequestPrintProps) => (
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
            marginBottom: "3mm",
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
        </div>

        {/* شريط رقم النموذج */}
        <div
          style={{
            border: `1.5px solid ${BLUE_BORDER}`,
            borderRadius: "6px",
            background: BLUE_LIGHT,
            padding: "1.5mm 4mm",
            marginBottom: "4mm",
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <span style={{ fontSize: "10px", color: BLUE, fontWeight: 700 }}>نموذج رقم: HR-01</span>
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

        {/* التاريخان ورقم الطلب: الميلادي يمين، رقم الطلب وسط، الهجري يسار */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            fontSize: "13px",
            marginBottom: "12mm",
            color: "#334155",
          }}
        >
          <div style={{ width: "33%" }}>
            <div style={{ fontWeight: 700, color: BLUE_DARK }}>التاريخ:</div>
            <div>{gregorianOf(date)} م</div>
          </div>
          <div style={{ width: "33%", textAlign: "center" }}>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "15px" }}>
              طلب رقم {requestNo || "⋯⋯"}
            </div>
          </div>
          <div style={{ width: "33%", textAlign: "left" }}>
            <div style={{ fontWeight: 700, color: BLUE_DARK }}>الموافق:</div>
            <div>{hijriOf(date)} هـ</div>
          </div>
        </div>

        {/* المخاطَب: السيد/المدير العام يمين وكلمة المحترم في الجهة الأخرى */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "16px",
            fontWeight: 700,
            marginBottom: "3mm",
          }}
        >
          <div>السيد / المدير العام</div>
          <div>المحترم</div>
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
          نأمل من سيادتكم صرف عهدة نقدية بمبلغ وقدره
          <br />
          <span style={{ fontWeight: 800, color: BLUE_DARK, fontSize: "17px" }}>
            {fmt(amount)} ريال سعودي
          </span>
          <br />
          <span style={{ fontWeight: 700 }}>({numberToWords(amount)})</span>
          ، وذلك للمصروفات الخاصة بالشركة.
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
          <div
            style={{
              background: BLUE_LIGHT,
              textAlign: "center",
              padding: "4mm",
              borderBottom: `1.5px solid ${BLUE}`,
            }}
          >
            <div style={{ fontSize: "11px", color: "#475569", marginBottom: "1.5mm" }}>
              المبلغ رقمًا
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: BLUE_DARK }}>
              {fmt(amount)}
            </div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: BLUE_DARK }}>ر.س</div>
          </div>
          <div style={{ padding: "4mm 5mm" }}>
            <div style={{ fontSize: "11px", color: "#475569", marginBottom: "1.5mm" }}>
              المبلغ كتابةً
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.9 }}>
              {numberToWords(amount)}
            </div>
          </div>
        </div>

        {/* الخاتمة */}
        <div style={{ fontSize: "14px", marginBottom: "10mm" }}>
          وتقبلوا خالص الشكر والتقدير،،،
        </div>

        {/* التوقيعات بالأسفل */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "auto",
            textAlign: "center",
            fontSize: "13px",
            padding: "0 8mm",
          }}
        >
          {["مقدم الطلب", "المدير المالي"].map((role) => (
            <div key={role} style={{ width: "38%" }}>
              <div style={{ fontWeight: 700, color: BLUE_DARK, marginBottom: "10mm" }}>{role}</div>
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
export const printCustodyRequest = (amount: number, date: string, requestNo?: string) => {
  const host = document.createElement("div");
  host.id = "custody-request-print-document";
  document.body.appendChild(host);

  const style = document.createElement("style");
  style.id = "custody-request-print-style";
  style.textContent = `
    #custody-request-print-document { display: none; }
    @page custody-request { size: A4 portrait; margin: 0; }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; height: auto !important; overflow: visible !important; }
      body > *:not(#custody-request-print-document) { display: none !important; }
      #custody-request-print-document {
        display: block !important; position: absolute; top: 0; left: 0;
        width: 210mm; height: 297mm; overflow: hidden; page: custody-request;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      #custody-request-print-document * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;
  document.head.appendChild(style);

  const root = createRoot(host);
  root.render(<CustodyRequestDocument amount={amount} date={date} requestNo={requestNo} />);

  const cleanup = () => {
    root.unmount();
    host.remove();
    style.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  const fontsReady = (document as any).fonts?.ready ?? Promise.resolve();
  Promise.resolve(fontsReady).then(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setTimeout(() => window.print(), 100);
    }));
  });
};

const CustodyRequestPrint = (props: CustodyRequestPrintProps) =>
  createPortal(<CustodyRequestDocument {...props} />, document.body);

export default CustodyRequestPrint;
