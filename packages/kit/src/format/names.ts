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

/**
 * Projette un nom de token — son CHEMIN — sur la propriété personnalisée CSS
 * qui le porte. C'est la troisième et dernière projection de nom du format,
 * après `normalizeName` (Figma → token) et `codeIdentifier` (Figma → code).
 *
 * **Elle est l'unique autorité.** Elle vivait auparavant en trois exemplaires
 * — `tokenVar` chez le consommateur, le `name/kebab` de Style Dictionary dans
 * la chaîne de build, et un troisième dans `check-contract.mjs` — qu'aucun test
 * ne comparait. Elles divergeaient, et le défaut qu'elles produisaient est le
 * pire de tous : muet. `tokenVar` rendait `var(--layouts-sizing-0,5)`, où la
 * virgule sépare en CSS une variable de sa valeur de repli ; le navigateur
 * lisait « variable `--layouts-sizing-0`, repli `5` », trouvait cette variable,
 * et rendait `0px` là où le contrat demandait `2px`. Pas d'erreur, pas de
 * repli, une valeur fausse et plausible.
 *
 * La règle, en une phrase : **minuscules, et toute suite de caractères qui
 * n'est ni une lettre ni un chiffre devient un seul tiret**, les tirets de
 * bord retirés. Les points du chemin y passent comme le reste.
 *
 * Ce qu'elle N'EST PAS, et c'est délibéré : le `kebabCase` d'une bibliothèque
 * de casse. Celui de Style Dictionary coupe aussi sur les bosses de casse —
 * `semiBold` y devient `semi-bold` — un comportement qui appartient à une
 * bibliothèque JavaScript, pas au format. Un preset iOS ou une chaîne écrite
 * dans une autre langue doit pouvoir tenir cette règle sans importer
 * `change-case` ; c'est pourquoi elle s'énonce en une phrase. Sur le corpus
 * réel de 721 tokens, les deux rendent aujourd'hui exactement les mêmes noms :
 * ce choix ne renomme rien, il décide seulement de qui tranchera demain.
 *
 * *Borne connue :* la projection n'est pas une bijection. `50%` et `50`
 * rendent tous deux `50`, et le second l'emporterait en silence. Le format ne
 * peut pas l'empêcher — un nom CSS n'accepte pas tout —, donc le consommateur
 * le contrôle : un test d'accord compare les deux sens et refuse deux chemins
 * distincts qui se rejoignent sur une même variable.
 *
 * @example tokenCssVariable('components.button.sizes.medium.gap')
 * // → '--components-button-sizes-medium-gap'
 * @example tokenCssVariable('layouts.sizing.0,5') // → '--layouts-sizing-0-5'
 */
export function tokenCssVariable(path: string): string {
  const kebab = path
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return `--${kebab}`;
}
