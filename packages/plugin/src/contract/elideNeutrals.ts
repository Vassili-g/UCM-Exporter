/**
 * Élision des valeurs neutres du contrat publié.
 *
 * Une clé qui vaut `null`, `{}` ou `[]` n'apprend rien qu'une absence ne dirait
 * déjà : le type publié déclare ces clés facultatives, si bien que les deux
 * écritures disent exactement la même chose au consommateur. Écrire la valeur
 * vide coûte des tokens à chaque lecture, l'absence n'en coûte aucun.
 *
 * Quatre bornes, et elles portent tout :
 *
 * - seule une CLÉ D'OBJET disparaît, jamais un élément de tableau. Sous
 *   `paintPlacements`, un chemin vide `[]` désigne la RACINE du composant :
 *   c'est une donnée, et une liste qui perdrait ses éléments vides changerait
 *   de sens ;
 * - `false`, `0` et la chaîne vide restent. Ce sont des valeurs, pas des
 *   silences — `default: false` n'est pas `default: null` ;
 * - **sous un dictionnaire, la CLÉ est une donnée.** Retirer l'entrée
 *   `stateModel.states.default` parce que l'état par défaut n'a aucun sélecteur
 *   ne retirerait pas un silence : ça retirerait l'ÉTAT, que `precedence`
 *   continue de citer, et un consommateur refuserait alors une valeur d'axe
 *   parfaitement légitime. Les endroits où une valeur de dictionnaire peut
 *   légitimement être vide sont énumérés dans `ENTREES_PROTEGEES`, et un test
 *   les confronte au JSON Schema pour prouver que la liste est complète ;
 * - un seul passage par sous-arbre, JAMAIS de point fixe. Une valeur qui EST
 *   vide n'est pas écrite ; une valeur qui CONTIENT du vide est écrite sans lui
 *   et reste. Un second passage rouvrirait le trou que la borne précédente
 *   ferme, cette fois sur un objet vidé en chemin.
 */

/**
 * Entrées de dictionnaire dont la valeur peut être vide, et qui doivent
 * survivre : c'est leur CLÉ qui porte l'information.
 *
 * `*` remplace un segment quelconque. La liste se lit sur `types.ts` — tout
 * `Record<string, X>` dont `X` peut être vide — et `tests/elideNeutrals.test.ts`
 * la confronte au JSON Schema, pour qu'un `Record` ajouté demain ne puisse pas
 * passer inaperçu.
 */
export const ENTREES_PROTEGEES: readonly string[] = [
  // Un état sans déclencheur — l'état par défaut — vaut `{}`. Le retirer
  // retirerait l'état, que `precedence` cite encore.
  'stateModel.states.*',
  // Une taille dont Figma ne relie aucune dimension vaut `{}`. Le retirer
  // retirerait la taille de la liste de celles que le composant expose.
  'structure.sizes.*',
  // Une clé de peinture sans cible vaudrait `[]` ; la clé nomme la couleur.
  'viewPaintPlacements.*.fills.*',
  'viewPaintPlacements.*.strokes.*',
  // Les six suivantes ne sont jamais vides en pratique — `compactVariants`
  // ne catalogue pas une partie vide, et un axe sans valeur n'existe pas. Elles
  // sont protégées quand même : leur clé est citée AILLEURS, par
  // `variantViews[].*`, `variants[].sample` ou `structure.variantAxes`, et une
  // entrée retirée laisserait un renvoi qui ne pointe sur rien.
  'viewTypographies.*',
  'viewComposes.*',
  'viewIcons.*',
  'viewPaintPlacements.*',
  'samples.*',
  'figmaVariantLabels.values.*',
];

/** Vrai pour les trois écritures du vide : `null`, `{}`, `[]`. */
export function isNeutral(value: unknown): boolean {
  if (value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === 'object' && value !== undefined
    && Object.keys(value as object).length === 0;
}

/** Vrai si ce chemin désigne une entrée de dictionnaire à protéger. */
export function estProtege(path: string): boolean {
  const segments = path.split('.');
  return ENTREES_PROTEGEES.some((motif) => {
    const attendus = motif.split('.');
    if (attendus.length !== segments.length) return false;
    return attendus.every((attendu, index) => attendu === '*' || attendu === segments[index]);
  });
}

/**
 * Retire les clés dont la valeur est vide, et descend dans ce qui reste.
 *
 * L'ordre compte : la neutralité se décide sur la valeur TELLE QU'ELLE ARRIVE,
 * avant d'en retirer quoi que ce soit. Un objet devenu vide sous nos mains
 * reste donc écrit, `{}`, et sa clé survit.
 *
 * `path` situe la valeur dans le contrat. Les index de tableau n'y entrent pas :
 * un élément de tableau n'est jamais retiré, seul son contenu est élidé, et les
 * motifs protégés n'en citent aucun.
 */
export function elideNeutrals<T>(value: T, path = ''): T {
  if (Array.isArray(value)) return value.map((item) => elideNeutrals(item, path)) as unknown as T;
  if (value === null || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const chemin = path ? `${path}.${key}` : key;
    if (isNeutral(item) && !estProtege(chemin)) continue;
    Object.defineProperty(result, key, {
      value: elideNeutrals(item, chemin),
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
 * ranger. Les repasser retirerait un objet vidé au PREMIER passage —
 * `padding: {}` — c'est-à-dire le point fixe que ce module refuse. Ils
 * traversent donc tels quels ; seule leur clé de premier niveau tombe si le
 * catalogue lui-même est vide.
 */
export function elideContract<T extends object>(contract: T, dejaElides: readonly string[]): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(contract)) {
    if (isNeutral(value)) continue;
    Object.defineProperty(result, key, {
      value: dejaElides.includes(key) ? value : elideNeutrals(value, key),
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
