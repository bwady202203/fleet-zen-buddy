import { describe, it, expect } from "vitest";
import { generateZATCAQRBase64 } from "./zatcaQR";

const decode = (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const out = {};
  let i = 0;
  while (i < bytes.length) {
    const tag = bytes[i], len = bytes[i + 1];
    out[tag] = new TextDecoder().decode(bytes.slice(i + 2, i + 2 + len));
    i += 2 + len;
  }
  return out;
};

describe("ZATCA QR", () => {
  it("encodes the 5 required tags with ZATCA formats", () => {
    const t = decode(generateZATCAQRBase64({
      sellerName: " مؤسسة رمال ", vatNumber: "300 123-456700003",
      timestamp: "2025-03-01", totalAmount: "1150.00", vatAmount: "150.00",
    }));
    expect(t[1]).toBe("مؤسسة رمال");
    expect(t[2]).toBe("300123456700003");
    expect(t[3]).toBe("2025-03-01T00:00:00Z");
    expect(t[4]).toBe("1150.00");
    expect(t[5]).toBe("150.00");
  });
});
