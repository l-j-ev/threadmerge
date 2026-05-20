/**
 * Strip HTML to plain text. Conservative — preserves line breaks at block boundaries
 * and converts common HTML entities. Used for redaction offset calculations.
 */
export function htmlToPlainText(html: string): string {
  // Replace block-level breaks with newlines
  let text = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  // Decode common entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // Collapse runs of whitespace
  text = text.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Escape plain text for safe inclusion in HTML.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Apply redactions to a plain text body. Replaces character ranges with the marker.
 * Redactions are applied in reverse order to avoid offset shifts.
 */
export function applyRedactions(
  plainText: string,
  ranges: { start: number; end: number }[]
): string {
  if (ranges.length === 0) return plainText;

  // Sort by start position descending, apply right-to-left to preserve offsets
  const sorted = [...ranges].sort((a, b) => b.start - a.start);
  let result = plainText;
  for (const r of sorted) {
    if (r.start < 0 || r.end > result.length || r.start >= r.end) continue;
    result = result.slice(0, r.start) + '[EMAIL REDACTED BY SENDER]' + result.slice(r.end);
  }
  return result;
}
