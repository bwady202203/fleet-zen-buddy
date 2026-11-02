import { expect, test } from "bun:test";
import { canUseCompanyDrive, DRIVE_OWNER_ID } from "./access";

test("company storage accepts the connected company administrator", () => {
  expect(canUseCompanyDrive(DRIVE_OWNER_ID, true)).toBe(true);
});
test("company storage rejects other users and non-administrators", () => {
  expect(canUseCompanyDrive("other-user", true)).toBe(false);
  expect(canUseCompanyDrive(DRIVE_OWNER_ID, false)).toBe(false);
});