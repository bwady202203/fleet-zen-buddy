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