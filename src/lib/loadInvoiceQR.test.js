import { describe, it, expect } from "bun:test";
import { buildLoadInvoiceTimestamp, formatLoadInvoiceAmount, generateLoadInvoiceQR, decodeLoadInvoiceQR } from "./loadInvoiceQR";

const sample = { sellerName: "مؤسسة ناجي حمد للنقليات", vatNumber: "302143987800003", timestamp: "2026-10-31T14:25:10+03:00", total: "13429.24", vat: "1751.64" };
describe("Uploaded standalone QR logic for load invoices", () => {
  it("matches the exact uploaded Python sample bytes and all five values", () => {
    const base64 = generateLoadInvoiceQR(sample);
    expect(base64).toBe("ASvZhdik2LPYs9ipINmG2KfYrNmKINit2YXYryDZhNmE2YbZgtmE2YrYp9iqAg8zMDIxNDM5ODc4MDAwMDMDGTIwMjYtMTAtMzFUMTQ6MjU6MTArMDM6MDAECDEzNDI5LjI0BQcxNzUxLjY0");
    expect(decodeLoadInvoiceQR(base64)).toEqual({ 1: sample.sellerName, 2: sample.vatNumber, 3: sample.timestamp, 4: sample.total, 5: sample.vat });
  });
  it("rounds halves upward instead of silently changing negative or invalid amounts", () => {
    expect(formatLoadInvoiceAmount(1.005)).toBe("1.01");
    expect(formatLoadInvoiceAmount(13429.24)).toBe("13429.24");
    expect(() => formatLoadInvoiceAmount(-40)).toThrow();
    expect(() => formatLoadInvoiceAmount(NaN)).toThrow();
    expect(() => formatLoadInvoiceAmount("")).toThrow();
  });
  it("requires fifteen VAT digits starting and ending in 3", () => {
    expect(() => generateLoadInvoiceQR({ ...sample, vatNumber: "202143987800003" })).toThrow();
    expect(() => generateLoadInvoiceQR({ ...sample, vatNumber: "302143987800002" })).toThrow();
  });
  it("rejects VAT greater than the invoice total", () => {
    expect(() => generateLoadInvoiceQR({ ...sample, vat: "13429.25" })).toThrow();
  });
  it("rejects impossible dates, missing time zones and normalized 24-hour times", () => {
    for (const timestamp of ["2026-02-30T12:00:00+03:00", "2026-10-31T24:00:00+03:00", "2026-10-31T12:00:00"]) {
      expect(() => generateLoadInvoiceQR({ ...sample, timestamp })).toThrow();
    }
  });
  it("retains historical invoice dates and explicit issue timestamps", () => {
    expect(buildLoadInvoiceTimestamp("2026-10-31")).toBe("2026-10-31T00:00:00+03:00");
    expect(buildLoadInvoiceTimestamp(sample.timestamp)).toBe(sample.timestamp);
  });
  it("enforces UTF-8 byte lengths and refuses truncated or extra TLV data", () => {
    expect(() => generateLoadInvoiceQR({ ...sample, sellerName: "ع".repeat(128) })).toThrow();
    const encoded = generateLoadInvoiceQR(sample);
    expect(() => decodeLoadInvoiceQR(btoa(atob(encoded).slice(0, -1)))).toThrow();
    expect(() => decodeLoadInvoiceQR(btoa(atob(encoded) + "x"))).toThrow();
  });
});