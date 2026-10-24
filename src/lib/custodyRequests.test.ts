import { describe, expect, mock, test } from "bun:test";

let inserted: Record<string, unknown> | undefined;
const saved = { id: "request-1", request_number: "CR-2025-000002", request_date: "2025-12-13", amount: 5000, created_at: "2026-10-24" };
mock.module("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({
    insert: (values: Record<string, unknown>) => {
      inserted = values;
      return { select: () => ({ single: async () => ({ data: saved, error: null }) }) };
    },
  }) },
}));
const { saveCustodyRequest } = await import("./custodyRequests");

describe("custody request persistence", () => {
  test("uses the server-generated request number rather than a manual number", async () => {
    const result = await saveCustodyRequest("organization-1", 5000, "2025-12-13");
    expect(inserted?.request_number).toBe("");
    expect(result.request_number).toBe("CR-2025-000002");
  });
  test("saves the selected request date and company unchanged", async () => {
    await saveCustodyRequest("organization-1", 5000, "2025-12-13");
    expect(inserted?.request_date).toBe("2025-12-13");
    expect(inserted?.organization_id).toBe("organization-1");
    expect(inserted?.amount).toBe(5000);
  });
});