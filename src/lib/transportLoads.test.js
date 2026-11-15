import { describe, expect, test } from "bun:test";
import { transportLoadSchema } from "./transportLoads";

describe("transport load values from the supplied example", () => {
  test("preserves commission, delivery weight, vehicle and invoice identifiers", () => {
    const result = transportLoadSchema.parse({
      supplier_name: "آفاق الاتحاد-مؤسسة بدر", commission: "250", delivery_weight: "36.02",
      driver_name: "محمد أمجد بخش", vehicle_number: "4587", invoice_number: "1184",
      delivery_date: "2026-11-02", loading_date: "2026-10-30",
    });
    expect(result.commission).toBe(250);
    expect(result.delivery_weight).toBe(36.02);
    expect(result.vehicle_number).toBe("4587");
    expect(result.invoice_number).toBe("1184");
    expect(result.delivery_date).toBe("2026-11-02");
    expect(result.loading_date).toBe("2026-10-30");
  });
});