export const SHEET_ID = "1IPhZ2--0wjGZcZfqXoOlYJZytPR6J-CwLoOQTzwb2_o";
export function normalizeResidence(value: unknown): string {
  return String(value ?? "").replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776)).trim();
}
export function canAccessSheet(callerId: string, ownerId: string, isAdmin: boolean): boolean {
  return Boolean(ownerId) && callerId === ownerId && isAdmin;
}
export function findViolations(values: unknown[][], residence: string) {
  const headers = (values[0] ?? []).map(v => String(v ?? "").trim());
  const index = headers.indexOf("رقم الاقامة");
  if (index < 0) throw new Error("لم يتم العثور على عمود رقم الاقامة في الشيت");
  const matches = values.slice(1).filter(row => normalizeResidence(row[index]) === normalizeResidence(residence));
  const amountIndex = headers.indexOf("إجمالي مبلغ المخالفة");
  const total = matches.reduce((sum, row) => {
    const value = Number(normalizeResidence(row[amountIndex]).replace(/[,٬]/g, "").replace(/٫/g, "."));
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  return { headers, rows: matches.map(row => headers.map((_, i) => String(row[i] ?? ""))), total, count: matches.length };
}