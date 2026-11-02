import { expect, test } from "bun:test";
import { fetchAllJournalPages, isJournalDateInRange } from "./journalEntryLoading";

test("loads all 3205 entries beyond the API row limit without duplicates", async () => {
  const source = Array.from({ length: 3205 }, (_, id) => ({ id }));
  const rows = await fetchAllJournalPages(async (from, to) => ({ data: source.slice(from, to + 1), error: null }));
  expect(rows.length).toBe(3205);
  expect(new Set(rows.map(row => row.id)).size).toBe(3205);
  expect(rows.at(-1)?.id).toBe(3204);
});
test("includes all dates January through September 2026 and excludes neighboring months", () => {
  expect(isJournalDateInRange("2026-01-01", "2026-01-01", "2026-09-30")).toBe(true);
  expect(isJournalDateInRange("2026-09-30", "2026-01-01", "2026-09-30")).toBe(true);
  expect(isJournalDateInRange("2025-12-31", "2026-01-01", "2026-09-30")).toBe(false);
  expect(isJournalDateInRange("2026-10-01", "2026-01-01", "2026-09-30")).toBe(false);
});
test("fails explicitly rather than returning incomplete pages", async () => {
  expect(fetchAllJournalPages(async () => ({ data: null, error: new Error("failed") }))).rejects.toThrow("failed");
});