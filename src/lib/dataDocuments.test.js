import { describe, expect, test } from "bun:test";
import { documentMimeType, documentTitle, moveDocument, orderDocuments } from "./dataDocuments.ts";
describe("Data Documents accepted files", () => {
  test("accepts pasted images", () => expect(documentMimeType({ type: "image/png", name: "image.png" })).toBe("image/png"));
  test("accepts PDF files even without clipboard MIME", () => expect(documentMimeType({ type: "", name: "report.PDF" })).toBe("application/pdf"));
  test("rejects HTML files", () => expect(documentMimeType({ type: "text/html", name: "report.html" })).toBeNull());
  test("uses the file name as editable title", () => expect(documentTitle("تقرير الشركة.pdf")).toBe("تقرير الشركة"));
});
describe("document ordering", () => {
  test("moves a card without removing other cards", () => expect(moveDocument(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]));
  test("restores saved order and retains newly added documents", () => expect(orderDocuments([{ id: "a" }, { id: "b" }, { id: "c" }], ["b", "a"]).map(row => row.id)).toEqual(["b", "a", "c"]));
  test("ignores missing drag targets", () => expect(moveDocument(["a", "b"], "a", "missing")).toEqual(["a", "b"]));
});