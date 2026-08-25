/**
 * Derive a filesystem-safe export file name from Markdown content:
 * the first heading when present, otherwise the leading plain text.
 */

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

/**
 * Returns a clean base name (without extension) for the exported file.
 */
export function getExportName(markdown: string, fallback = 'markie-export'): string {
  // First ATX heading (e.g. "# 标题" / "## Subtitle").
  const headingMatch = markdown.match(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/m);
  let name = headingMatch ? headingMatch[1] : '';

  // No heading: use the leading plain text (a few words of the content).
  if (!name.trim()) {
    name = markdown
      .replace(/^\s*#{1,6}\s+.+$/m, '') // drop stray headings
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ');
  }

  name = name
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links
    .replace(/[*_~]+/g, '') // emphasis markers
    .replace(INVALID_FILENAME_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/, '') // trailing dots/spaces are invalid on Windows
    .trim();

  if (!name) {
    return fallback;
  }

  const MAX_LENGTH = 40;
  const chars = Array.from(name);
  if (chars.length > MAX_LENGTH) {
    return chars.slice(0, MAX_LENGTH).join('').trim() + '…';
  }
  return name;
}
