/**
 * Extraction des tokens de couleur/contour de CHAQUE variant du composant.
 *
 * Résultat : l'arbre `variantTokens`, imbriqué selon les axes du set
 * (ex. couleur → variante → état), avec pour feuilles les tokens rangés
 * par rôle (background, foreground…). Les strokes sont exportés dans un arbre
 * parallèle afin que les consommateurs historiques de `variantTokens` gardent
 * partout des références de tokens sous forme de chaînes.
 */
import type { VariantEntry, VariantMatrix } from './componentTree';
import type { ComposedInstances } from './exportableNodes';
import { normalizePropValue } from './parsers';
import { getSlotTokens } from './extractSlotTokens';
import type { TokenResolver } from './extractSlotTokens';
import type { SlotStrokes, SlotTokens, VariantStrokes, VariantTokens } from './types';
export { getSlotTokens } from './extractSlotTokens';
export type { VariantTokenLeaves } from './extractSlotTokens';

/**
 * Insère une feuille dans l'arbre en suivant l'ordre des axes.
 * Un axe sans valeur retombe sur la clé « default ».
 *
 * Les clés viennent de Figma : elles sont testées et écrites en propriétés
 * PROPRES. `constructor` ou `toString` passeraient sinon pour un doublon
 * inexistant, et `__proto__` écrirait dans le prototype — la branche
 * disparaîtrait du JSON sans un mot. Même précaution que `buildStateModel`.
 */
export function insertVariantLeaf<T>(
  tree: Record<string, unknown>,
  axes: string[],
  values: Record<string, string>,
  leaf: T,
  warnings: string[],
): void {
  const has = (node: Record<string, unknown>, key: string) =>
    Object.prototype.hasOwnProperty.call(node, key);
  const set = (node: Record<string, unknown>, key: string, value: unknown) => {
    Object.defineProperty(node, key, {
      value, enumerable: true, writable: true, configurable: true,
    });
  };

  let node = tree;
  axes.forEach((axis, index) => {
    const key = values[axis] || 'default';
    if (index === axes.length - 1) {
      // Deux variants aux mêmes valeurs d'axes : on conserve le premier et on
      // le signale — ne jamais perdre d'information en silence.
      if (has(node, key)) {
        warnings.push(
          `Variants « ${axes.map((a) => values[a] || 'default').join(' / ')} » : deux ` +
            `variants portent les mêmes valeurs une fois normalisées (majuscules et ` +
            `espaces ignorés). Seul le premier est exporté ; renommez l'un des deux.`,
        );
        return;
      }
      set(node, key, leaf);
      return;
    }
    const branch = has(node, key) ? node[key] : null;
    if (!branch || typeof branch !== 'object' || Array.isArray(branch)) set(node, key, {});
    node = node[key] as Record<string, unknown>;
  });
}

/**
 * Point d'entrée : construit l'arbre complet des tokens de variantes
 * (tous les axes, tous les rôles).
 */
export async function extractVariantTokens(
  matrix: VariantMatrix,
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances = new Map(),
  iconNames: ReadonlySet<string> = new Set(),
): Promise<{
  variantTokens: VariantTokens;
  variantStrokes: VariantStrokes;
  /** Rôle de rendu déduit de chaque clé qui n'en nomme aucun, sur toute la matrice. */
  discoveredRoles: Map<string, string>;
}> {
  const variantTokens: VariantTokens = {};
  const variantStrokes: VariantStrokes = {};
  const discoveredRoles = new Map<string, string>();
  const reportedRoleConflicts = new Set<string>();
  // Un Component Set a toujours au moins un axe, mais on se protège d'une
  // liste vide pour ne jamais perdre un variant en silence.
  const axes = matrix.axes.length > 0 ? matrix.axes : ['variant'];

  // Les appels à l'API Figma restent parallèles, mais RIEN n'est écrit ici —
  // chaque variant collecte même ses propres avertissements. L'ordre où les
  // promesses se règlent ne doit décider ni de l'ordre des clés, ni de quel
  // variant gagne un conflit : sinon deux exports d'un design inchangé
  // donneraient des JSON différents, donc une pull request pour rien.
  const collected = await Promise.all(
    matrix.variants.map(async (entry: VariantEntry) => {
      const variantWarnings: string[] = [];
      const leaf = await getSlotTokens(
        entry.component,
        resolver,
        variantWarnings,
        composed,
        iconNames,
      );
      return { entry, leaf, variantWarnings };
    }),
  );

  // Seconde phase, séquentielle : c'est la matrice qui fixe l'ordre des clés,
  // celui des avertissements et le sens de « premier conservé ».
  for (const { entry, leaf, variantWarnings } of collected) {
    warnings.push(...variantWarnings);
    if (Object.keys(leaf.paints).length === 0 && Object.keys(leaf.strokes).length === 0) {
      warnings.push(`Variant « ${entry.component.name} » : aucun fill ni stroke n’est relié à une variable. Aucune couleur n’est exportée pour lui.`);
    }
    // La clé de repli suit la même normalisation que toutes les valeurs
    // d'axes : l'arbre reste homogène même sans axe déclaré.
    const values = matrix.axes.length > 0
      ? entry.values
      : { variant: normalizePropValue(entry.component.name) };
    // Le rôle déduit d'une clé est relevé sur toute la matrice, dans l'ordre
    // des variants. Le même token posé sur des calques de natures différentes
    // selon le variant ne peut recevoir qu'un rendu : on garde le premier et on
    // le dit, plutôt que de laisser l'ordre des promesses trancher en silence.
    for (const [key, role] of leaf.roles) {
      const known = discoveredRoles.get(key);
      if (!known) {
        discoveredRoles.set(key, role);
        continue;
      }
      // Un seul message par clé : le même calque revient dans chaque variant, et
      // un Button en a 30.
      if (known === role || reportedRoleConflicts.has(key)) continue;
      reportedRoleConflicts.add(key);
      warnings.push(
        `Token « ${key} » : il est appliqué à des layers de natures différentes selon les ` +
          `variants (${known}, ${role}). Le contrat ne peut décrire qu'une façon de le ` +
          `peindre et retient « ${known} ». Utilisez une variable par nature de layer.`,
      );
    }
    insertVariantLeaf(variantTokens, axes, values, leaf.paints, warnings);
    insertVariantLeaf(variantStrokes, axes, values, leaf.strokes, warnings);
  }

  return { variantTokens, variantStrokes, discoveredRoles };
}
