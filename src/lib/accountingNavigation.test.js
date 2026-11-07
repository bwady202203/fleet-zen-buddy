import { describe, expect, test } from "bun:test";
import { ACCOUNTING_DASHBOARD_PATH, getAccountingReturnPath } from "./accountingNavigation";

describe("accounting header navigation", () => {
  test("always returns directly to the accounting dashboard", () => {
    expect(ACCOUNTING_DASHBOARD_PATH).toBe("/?tab=accounting");
    expect(getAccountingReturnPath()).toBe("/?tab=accounting");
    expect(getAccountingReturnPath(false)).toBe("/?tab=accounting");
  });
  test("preserves the restricted Samman user's home", () => {
    expect(getAccountingReturnPath(true)).toBe("/");
  });
});