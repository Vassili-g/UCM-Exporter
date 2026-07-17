/**
 * Convertit un chemin Figma (collection/variable) en nom de token canonique.
 * C'est LA règle de nommage du projet, partagée par les deux commandes :
 * un token s'écrit exactement pareil dans un contrat et dans tokens.json.
 *
 * Règles : « / » → « . », espaces d'un segment → « - », tout en minuscules.
 *
 * @example normalizeName('Brand Tokens/Primary/default')
 * // → 'brand-tokens.primary.default'
 */
export function normalizeName(name: string): string {
  return name
    .split('/')
    .map((segment) => segment.trim().replace(/\s+/g, '-').toLowerCase())
    .filter(Boolean)
    .join('.')
    .replace(/\.{2,}/g, '.');
}

export default normalizeName;
