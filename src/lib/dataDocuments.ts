export const DATA_DOCUMENTS_BUCKET = "data-documents";
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