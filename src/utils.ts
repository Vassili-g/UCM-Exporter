export function normalizeName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  // Split on slashes to segments, trim segments
  const segments = name.split('/').map(s => s.trim()).filter(Boolean);
  const normalized = segments.map(seg => {
    // replace spaces with dashes inside segment, collapse multiple spaces
    const withDashes = seg.replace(/\s+/g, '-');
    // lowercase
    return withDashes.toLowerCase();
  }).join('.');
  // collapse repeated dots
  return normalized.replace(/\.\.+/g, '.');
}

// quick default export
export default normalizeName;
