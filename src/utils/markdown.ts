export function extractDescription(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return '';
  }

  const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  const firstLine = trimmed.split('\n')[0].trim();
  return firstLine || '';
}

