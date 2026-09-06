/**
 * Écriture d'un artefact JSON : une ligne par entrée, sur deux niveaux.
 */

/** Profondeur de découpage : au-delà, la valeur est écrite sur une seule ligne. */
export const PROFONDEUR_DE_DECOUPAGE = 2;

function ecrire(value: unknown, depth: number, indent: number): string {
  if (depth <= 0 || value === null || typeof value !== 'object') return JSON.stringify(value);
  const pad = '  '.repeat(indent);
  const inner = `${pad}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((item) => inner + ecrire(item, depth - 1, indent + 1));
    return `[\n${items.join(',\n')}\n${pad}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '{}';
  const items = entries.map(
    ([key, item]) => `${inner}${JSON.stringify(key)}:${ecrire(item, depth - 1, indent + 1)}`,
  );
  return `{\n${items.join(',\n')}\n${pad}}`;
}

/**
 * Sérialise un artefact du plugin. Le résultat est du JSON strict : le relire
 * avec `JSON.parse` redonne exactement la valeur passée. Le découpage fixe à
 * deux niveaux garde une entrée de collection par ligne, sans seuil dépendant
 * du nombre de variants qui reformaterait tout le fichier.
 */
export function serializeJson(value: unknown): string {
  return ecrire(value, PROFONDEUR_DE_DECOUPAGE, 0);
}

export default serializeJson;
