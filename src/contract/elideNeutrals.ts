/**
 * Élision des valeurs neutres du contrat publié.
 *
 * Une clé qui vaut `null`, `{}` ou `[]` n'apprend rien qu'une absence ne dirait
 * déjà : le type publié déclare ces clés facultatives ET nullables, si bien que
 * les deux écritures disent exactement la même chose au consommateur. Écrire la
 * valeur vide coûte des tokens à chaque lecture, l'absence n'en coûte aucun.
 *
 * Trois bornes, et elles portent tout :
 *
 * - seule une CLÉ D'OBJET disparaît, jamais un élément de tableau. Sous
 *   `paintPlacements`, un chemin vide `[]` désigne la RACINE du composant :
 *   c'est une donnée, et une liste qui perdrait ses éléments vides changerait
 *   de sens ;
 * - `false`, `0` et la chaîne vide restent. Ce sont des valeurs, pas des
 *   silences — `default: false` n'est pas `default: null` ;
 * - un seul passage, JAMAIS de point fixe. Une valeur qui EST vide n'est pas
 *   écrite ; une valeur qui CONTIENT du vide est écrite sans lui, et reste. La
 *   différence n'est pas cosmétique : sous un dictionnaire, la clé est elle-même
 *   une donnée. `stateModel.states.default` vaut `{}` pour l'état que rien ne
 *   déclenche, et un second passage supprimerait l'ÉTAT au lieu de son silence.
 *   Le contrat perdrait alors un état que `precedence` continue de citer.
 *
 */

/** Vrai pour les trois écritures du vide : `null`, `{}`, `[]`. */
export function isNeutral(value: unknown): boolean {
  if (value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === 'object' && value !== undefined
    && Object.keys(value as object).length === 0;
}

/**
 * Retire les clés dont la valeur est vide, et descend dans ce qui reste.
 *
 * L'ordre compte : la neutralité se décide sur la valeur TELLE QU'ELLE ARRIVE,
 * avant d'en retirer quoi que ce soit. Un objet devenu vide sous nos mains
 * reste donc écrit, `{}`, et sa clé survit.
 */
export function elideNeutrals<T>(value: T): T {
  if (Array.isArray(value)) return value.map(elideNeutrals) as unknown as T;
  if (value === null || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (isNeutral(item)) continue;
    Object.defineProperty(result, key, {
      value: elideNeutrals(item),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return result as unknown as T;
}

/**
 * Élide le contrat en n'appliquant le passage QU'UNE fois à chaque sous-arbre.
 *
 * Les catalogues de vues sont déjà élidés quand ils arrivent ici :
 * `compactVariants` a dû le faire pour décider s'il avait quelque chose à
 * ranger. Les repasser retirerait un objet devenu vide AU PREMIER passage —
 * `padding: {}`, `states.default: {}` — c'est-à-dire exactement le point fixe
 * que ce module refuse. Ils traversent donc tels quels ; seule leur clé de
 * premier niveau tombe si le catalogue lui-même est vide.
 */
export function elideContract<T extends object>(contract: T, dejaElides: readonly string[]): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(contract)) {
    if (isNeutral(value)) continue;
    Object.defineProperty(result, key, {
      value: dejaElides.includes(key) ? value : elideNeutrals(value),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return result as T;
}

/** Les champs que `compactVariants` a déjà élidés, partie par partie. */
export const CATALOGUES_DE_VUES = [
  'viewStructures', 'viewTypographies', 'viewComposes', 'viewIcons', 'viewPaintPlacements',
] as const;

export default elideNeutrals;
