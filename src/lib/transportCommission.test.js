import { expect, test } from "bun:test";
import { calculateTransportCommission } from "./transportCommission";

test("entered weight below 25 tons applies the configured 40 riyal driver commission", () => {
  const rules = [{ min_weight: 0, max_weight: 25, amount: 40 }];
  expect(calculateTransportCommission("24.999", rules)).toBe(40);
  expect(calculateTransportCommission("25", rules)).toBeNull();
});

test("manual weight changes automatically select the matching configured bracket", () => {
  const rules = [{ min_weight: 0, max_weight: 25, amount: 40 }, { min_weight: 25, max_weight: null, amount: 80 }];
  expect(calculateTransportCommission("24", rules)).toBe(40);
  expect(calculateTransportCommission("25", rules)).toBe(80);
  expect(calculateTransportCommission("", rules)).toBeNull();
});

test("route-specific rule overrides the general bracket for the same weight", () => {
  const rules = [
    { min_weight: 0, max_weight: 25, amount: 40, from_location: null, to_location: null },
    { min_weight: 0, max_weight: 25, amount: 65, from_location: "الرياض", to_location: "جدة" },
  ];
  expect(calculateTransportCommission("20", rules, "الرياض", "جدة")).toBe(65);
  expect(calculateTransportCommission("20", rules, "الدمام", "جدة")).toBe(40);
  expect(calculateTransportCommission("20", rules)).toBe(40);
});

test("rule with only one route end matches loads on that end", () => {
  const rules = [{ min_weight: 0, max_weight: 30, amount: 55, from_location: "الرياض", to_location: null }];
  expect(calculateTransportCommission("28", rules, "الرياض", "أي مكان")).toBe(55);
  expect(calculateTransportCommission("28", rules, "جدة", "الرياض")).toBeNull();
});
