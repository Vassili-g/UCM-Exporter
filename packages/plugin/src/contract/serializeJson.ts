/**
 * Écriture d'un artefact JSON : une ligne par entrée, sur deux niveaux.
 *
 * L'indentation à deux espaces coûtait un tiers du fichier. Chaque valeur y
 * vivait sur sa propre ligne, précédée de six, huit ou dix espaces, et ces
 * retours-espaces sont facturés à chaque lecture par un agent. Les retirer ne
 * change pas un octet de DONNÉE : `JSON.parse` rend le même objet.
 *
 * Le découpage s'arrête à la profondeur 2, et c'est le seul réglage :
 *
 * - profondeur 1 seule (tout sur une ligne par clé de premier niveau) coûte
 *   0,9 point de moins, mais produit des lignes de 50 000 caractères — le
 *   corpus est commité et relu en pull request, un tel diff n'est pas lisible ;
 * - profondeur 3 rend la ligne la plus longue à peine plus courte pour 2 470
 *   tokens de plus.
 *
 * À la profondeur 2, une ligne = une entrée d'une collection de premier niveau :
 * un variant, une vue, une structure, un échantillon. C'est l'unité que le
 * designer et le relecteur reconnaissent.
 *
 * Aucun seuil sur le nombre d'entrées : la forme du fichier ne doit pas dépendre
 * de la taille du composant, sans quoi un variant ajouté reformate tout le
 * fichier et produit un diff intégral sans qu'aucun design ait changé.
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
 * avec `JSON.parse` redonne exactement la valeur passée.
 */
export function serializeJson(value: unknown): string {
  return ecrire(value, PROFONDEUR_DE_DECOUPAGE, 0);
}

export default serializeJson;
