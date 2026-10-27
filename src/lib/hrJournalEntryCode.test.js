import { describe, expect, test } from "bun:test";
import { isHrJournalEntryCodeValid } from "./hrJournalEntryCode";

describe("automatic HR journal entry confirmation", () => {
  test("accepts the requested code", () => {
    expect(isHrJournalEntryCodeValid("474747")).toBe(true);
  });
  test("rejects empty, incorrect and partial codes", () => {
    for (const code of ["", "363636", "47474", "4747470"]) {
      expect(isHrJournalEntryCodeValid(code)).toBe(false);
    }
  });
});