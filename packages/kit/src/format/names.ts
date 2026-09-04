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

/**
 * Transforme un nom Figma libre en identifiant de composant TypeScript stable.
 * Le nom affiché reste intact dans `contract.name` ; cet identifiant sert au
 * fichier, au dossier, à la fonction React et à l'interface `<Nom>Props`.
 *
 * @example codeIdentifier('Icon / Button') // → 'IconButton'
 * @example codeIdentifier('2e bouton') // → 'Component2eBouton'
 */
export function codeIdentifier(name: string): string {
  const ascii = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const words = ascii.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const identifier = words
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');
  const safe = identifier || 'Component';
  return /^[0-9]/.test(safe) ? `Component${safe}` : safe;
}
