/**
 * Escape a string for safe inclusion in HTML.
 * Use this for any user-sourced text that gets embedded into HTML
 * via innerHTML, dangerouslySetInnerHTML, or document.write.
 */
export const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
