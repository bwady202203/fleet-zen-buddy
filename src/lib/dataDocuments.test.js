import { describe, expect, test } from "bun:test";
import { documentMimeType, documentTitle } from "./dataDocuments.ts";
describe("Data Documents accepted files", () => {
  test("accepts pasted images", () => expect(documentMimeType({ type: "image/png", name: "image.png" })).toBe("image/png"));
  test("accepts PDF files even without clipboard MIME", () => expect(documentMimeType({ type: "", name: "report.PDF" })).toBe("application/pdf"));
  test("rejects HTML files", () => expect(documentMimeType({ type: "text/html", name: "report.html" })).toBeNull());
  test("uses the file name as editable title", () => expect(documentTitle("تقرير الشركة.pdf")).toBe("تقرير الشركة"));
});