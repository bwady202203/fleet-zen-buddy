// Fixed keyword → account-code rules used by the Riyadh bank smart entries screen.
// A rule wins only when its account actually exists in the caller's chart of accounts.

export interface KeywordRuleAccount {
  id: string;
  code: string;
}

export interface KeywordRule {
  words: string[];
  code: string;
}

export const normalizeArabic = (s: string): string =>
  (s || "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const BANK_KEYWORD_RULES: KeywordRule[] = [
  // محمد عبد الله (مندوب المشتريات)
  { words: ["بكرشوم", "باكرشوم"], code: "111104" },
  // عمر محمد عمر عهدة
  { words: ["عهدة عمر", "عهده عمر"], code: "111106" },
  // قطع غيار كسارة المجمعة
  { words: ["مشتريات الكسارة", "مشتريات الكساره"], code: "51010" },
  // تذاكر سفر وانتقالات
  { words: ["تاكسي", "تكسي", "taxi"], code: "510405" },
];

export const findAccountByKeywordRules = <T extends KeywordRuleAccount>(
  accounts: T[],
  texts: string[]
): string | null => {
  const hay = normalizeArabic((texts || []).join(" "));
  if (!hay) return null;
  for (const rule of BANK_KEYWORD_RULES) {
    if (rule.words.some((w) => hay.includes(normalizeArabic(w)))) {
      const account = accounts.find((a) => a.code === rule.code);
      if (account) return account.id;
    }
  }
  return null;
};
