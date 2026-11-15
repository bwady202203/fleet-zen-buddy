import { expect, test } from "bun:test";
import { summarizeTransportDrivers } from "./transportDriverReport";
const rows = [
  { driver_name: "أحمد", delivery_date: "2026-11-01", delivery_weight: 24, commission: 40 },
  { driver_name: "أحمد", delivery_date: "2026-11-15", delivery_weight: 30, commission: 80 },
  { driver_name: "محمد", delivery_date: "2026-11-15", delivery_weight: 20, commission: 40 },
];
test("each driver's earned commission totals saved load commissions", () => {
  const result = summarizeTransportDrivers(rows);
  expect(result.summaries.find(row => row.driver === "أحمد")).toEqual({ driver: "أحمد", count: 2, weight: 54, commission: 120 });
  expect(result.commission).toBe(160);
});
test("driver and inclusive delivery-date filters determine commission due", () => {
  const result = summarizeTransportDrivers(rows, "2026-11-15", "2026-11-15", "أحمد");
  expect(result.count).toBe(1); expect(result.commission).toBe(80);
});