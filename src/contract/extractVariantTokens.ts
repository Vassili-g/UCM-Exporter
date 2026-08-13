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
 */
export function insertVariantLeaf<T>(
  tree: Record<string, unknown>,
  axes: string[],
  values: Record<string, string>,
  leaf: T,
  warnings: string[],
): void {
  let node = tree;
  axes.forEach((axis, index) => {
    const key = values[axis] || 'default';
    if (index === axes.length - 1) {
      // Deux variants aux mêmes valeurs d'axes : on conserve le premier et on
      // le signale — ne jamais perdre d'information en silence.
      if (node[key]) {
        warnings.push(
          `Variants « ${axes.map((a) => values[a] || 'default').join(' / ')} » : deux ` +
            `variants portent les mêmes valeurs une fois normalisées (majuscules et ` +
            `espaces ignorés). Seul le premier est exporté ; renommez l'un des deux.`,
        );
        return;
      }
      node[key] = leaf;
      return;
    }
    if (!node[key] || typeof node[key] !== 'object' || Array.isArray(node[key])) node[key] = {};
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
): Promise<{ variantTokens: VariantTokens; variantStrokes: VariantStrokes }> {
  const variantTokens: VariantTokens = {};
  const variantStrokes: VariantStrokes = {};
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
      const leaf = await getSlotTokens(entry.component, resolver, variantWarnings, composed);
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
    insertVariantLeaf(variantTokens, axes, values, leaf.paints, warnings);
    insertVariantLeaf(variantStrokes, axes, values, leaf.strokes, warnings);
  }

  return { variantTokens, variantStrokes };
}
