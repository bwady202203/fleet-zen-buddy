import { describe, expect, test } from "bun:test";
import {
  BANK_KEYWORD_RULES,
  findAccountByKeywordRules,
  normalizeArabic,
} from "./bankEntryKeywordRules";

const accounts = [
  { id: "a104", code: "111104" },
  { id: "a106", code: "111106" },
  { id: "a51010", code: "51010" },
  { id: "a405", code: "510405" },
  { id: "a413", code: "510413" },
  { id: "a408", code: "510408" },
  { id: "a302", code: "520302" },
];

describe("bank entry keyword rules", () => {
  test("taxi lines go to travel and transport 510405", () => {
    expect(findAccountByKeywordRules(accounts, ["تاكسي", "", "", ""])).toBe("a405");
    expect(findAccountByKeywordRules(accounts, ["", "", "", "تكسي المطار"])).toBe("a405");
    expect(findAccountByKeywordRules(accounts, ["TAXI RIYADH"])).toBe("a405");
  });

  test("buyer, custody and crusher rules keep their accounts", () => {
    expect(findAccountByKeywordRules(accounts, ["بكرشوم", ""])).toBe("a104");
    expect(findAccountByKeywordRules(accounts, ["عهدة عمر"])).toBe("a106");
    expect(findAccountByKeywordRules(accounts, ["مشتريات الكساره"])).toBe("a51010");
  });

  test("batteries, tracking and medical insurance rules", () => {
    expect(findAccountByKeywordRules(accounts, ["شراء بطاريات"])).toBe("a413");
    expect(findAccountByKeywordRules(accounts, ["تتبع المركبات"])).toBe("a408");
    expect(findAccountByKeywordRules(accounts, ["تأمين طبي"])).toBe("a302");
  });

  test("unknown text matches nothing", () => {
    expect(findAccountByKeywordRules(accounts, ["شحن رصيد"])).toBeNull();
    expect(findAccountByKeywordRules(accounts, [""])).toBeNull();
    expect(findAccountByKeywordRules([], ["تاكسي"])).toBeNull();
  });

  test("every rule points at a real code", () => {
    expect(BANK_KEYWORD_RULES.map((r) => r.code).sort()).toEqual(
      ["111104", "111106", "51010", "510405", "510413", "510408", "520302"].sort()
    );
  });

  test("normalization folds alef, yaa and taa marbouta", () => {
    expect(normalizeArabic("مشتريات الكسارة")).toBe(normalizeArabic("مشتريات الكساره"));
    expect(normalizeArabic("  تاكسي  ")).toBe("تاكسي");
  });
});
