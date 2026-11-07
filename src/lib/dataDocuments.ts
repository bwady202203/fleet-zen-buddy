export const DATA_DOCUMENTS_BUCKET = "data-documents";
export function orderDocuments<T extends { id: string }>(items: T[], order: string[]): T[] {
  const positions = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((a, b) => (positions.get(a.id) ?? order.length) - (positions.get(b.id) ?? order.length));
}
export function moveDocument(ids: string[], active: string, target: string): string[] {
  const from = ids.indexOf(active), to = ids.indexOf(target);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  next.splice(from, 1); next.splice(to, 0, active);
  return next;
}
export function documentMimeType(file: { type: string; name: string }) {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "application/pdf";
  if (["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/bmp"].includes(file.type)) return file.type;
  return null;
}
export function documentTitle(name: string) {
  return name.replace(/\.[^.]+$/, "").trim() || "مستند جديد";
}
export function downloadDocument(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}