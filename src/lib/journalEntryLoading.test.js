import { expect, test } from "bun:test";
import { fetchAllJournalPages, isJournalDateInRange, todayISODate, SEPTEMBER_2026_START } from "./journalEntryLoading";

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
test("September-through-today range keeps October and November 2026 entries", () => {
  const to = todayISODate(new Date(2026, 10, 2));
  expect(to).toBe("2026-11-02");
  expect(SEPTEMBER_2026_START).toBe("2026-09-01");
  expect(isJournalDateInRange("2026-09-01", SEPTEMBER_2026_START, to)).toBe(true);
  expect(isJournalDateInRange("2026-10-15", SEPTEMBER_2026_START, to)).toBe(true);
  expect(isJournalDateInRange("2026-11-02", SEPTEMBER_2026_START, to)).toBe(true);
  expect(isJournalDateInRange("2026-08-31", SEPTEMBER_2026_START, to)).toBe(false);
  expect(isJournalDateInRange("2026-11-03", SEPTEMBER_2026_START, to)).toBe(false);
});