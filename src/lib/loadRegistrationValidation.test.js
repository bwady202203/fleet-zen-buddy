import { describe, expect, test } from "bun:test";
import { premiumLoadRegistrationSchema, standardLoadRegistrationSchema, requiredLoadFieldLabels } from "./loadRegistrationValidation";

const valid = {
  loadNumber: "TEST-125", invoiceDate: "2026-11-12",
  companyId: "12345678-1234-4234-8234-123456789001",
  loadTypeId: "12345678-1234-4234-8234-123456789002",
  driverId: "12345678-1234-4234-8234-123456789003",
  truckNumber: "أ ب ج 1234", quantity: "42.5", unloadQuantity: "42.1",
  commissions: "0", deliveryFrom: "الكسارة", deliveryTo: "الرياض",
};

describe("arrow-marked load registration fields", () => {
  for (const field of Object.keys(requiredLoadFieldLabels)) {
    test(`${field} is mandatory`, () => {
      const result = premiumLoadRegistrationSchema.safeParse({ ...valid, [field]: "  " });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    });
  }
  test("complete data allows zero commission and optional unmarked fields", () => {
    expect(premiumLoadRegistrationSchema.parse(valid).commissions).toBe(0);
  });
  test("numeric values are validated without silently accepting partial numbers", () => {
    expect(premiumLoadRegistrationSchema.safeParse({ ...valid, quantity: "42abc" }).success).toBe(false);
    expect(premiumLoadRegistrationSchema.parse({ ...valid, quantity: "42,5" }).quantity).toBe(42.5);
  });
});

describe("standard load registration", () => {
  const standard = { ...valid, driverCommission: "0", deliveryCommission: "0", unitPrice: "12.5" };
  for (const field of [...Object.keys(requiredLoadFieldLabels).filter((field) => field !== "commissions"), "driverCommission", "deliveryCommission", "unitPrice"]) {
    test(`${field} is mandatory on standard registration`, () => {
      expect(standardLoadRegistrationSchema.safeParse({ ...standard, [field]: "" }).success).toBe(false);
    });
  }
  test("complete standard registration preserves numeric values", () => {
    const parsed = standardLoadRegistrationSchema.parse(standard);
    expect(parsed.unitPrice).toBe(12.5);
    expect(parsed.unloadQuantity).toBe(42.1);
    expect(parsed.driverCommission).toBe(0);
  });
});