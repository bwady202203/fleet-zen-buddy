import { describe, expect, test } from "bun:test";
import { canAccessSheet, findViolations, normalizeResidence } from "./lookup";
describe("employee violation lookup", () => {
  test("matches residence column, never offender identity", () => {
    const result = findViolations([["هوية المخالف", "رقم الاقامة", "إجمالي مبلغ المخالفة"], ["7012237678", "2591589482", "500"], ["2591589482", "2563942271", "375"]], "2591589482");
    expect(result.count).toBe(1);
    expect(result.total).toBe(500);
    expect(result.rows[0][1]).toBe("2591589482");
  });
  test("normalizes Arabic and Persian digits without partial matching", () => {
    expect(normalizeResidence(" ٢۵٩١٥٨٩٤٨٢ ")).toBe("2591589482");
    expect(findViolations([["رقم الاقامة"], ["2591589482"]], "25915").count).toBe(0);
  });
  test("denies unrelated accounts even administrators", () => {
    expect(canAccessSheet("other", "owner", true)).toBe(false);
    expect(canAccessSheet("owner", "owner", false)).toBe(false);
    expect(canAccessSheet("owner", "owner", true)).toBe(true);
  });
});