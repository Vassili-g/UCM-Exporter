/**
 * Extraction des tokens de couleur/contour de CHAQUE variant du composant.
 *
 * Résultat : l'arbre `variantTokens`, imbriqué selon les axes du set
 * (ex. couleur → variante → état), avec pour feuilles les tokens rangés
 * par rôle (background, foreground, border, ring…).
 */
import { variableAliases, VariableNameResolver } from '../variables';
import type { VariantEntry, VariantMatrix } from './componentTree';
import { getAllNodes, getBinding } from './nodeBindings';
import type { SlotTokens, VariantTokens } from './types';

/** Propriétés Figma dont les variables liées portent une couleur ou un contour. */
const BOUND_FIELDS = ['fills', 'strokes'] as const;

/**
 * Déduit le rôle d'un token depuis son dernier segment :
 * « …default.background » → « background ». Liste ouverte : tout rôle présent
 * dans le design system est capturé tel quel, rien n'est inventé.
 */
function tokenRole(token: string): string {
  const segments = token.split('.');
  return segments[segments.length - 1] || token;
}

/**
 * Récolte tous les tokens de couleur/contour liés n'importe où dans le
 * sous-arbre d'un variant, rangés par rôle.
 */
export async function getSlotTokens(
  component: ComponentNode,
  resolver: VariableNameResolver,
): Promise<SlotTokens> {
  const pending: Array<Promise<string | null>> = [];

  for (const node of getAllNodes(component)) {
    for (const field of BOUND_FIELDS) {
      for (const alias of variableAliases(getBinding(node, field))) {
        pending.push(resolver.resolve(alias));
      }
    }
  }

  const resolved = await Promise.all(pending);
  const slot: SlotTokens = {};
  for (const token of resolved) {
    if (token) slot[tokenRole(token)] = token;
  }
  return slot;
}

/**
 * Insère une feuille dans l'arbre en suivant l'ordre des axes.
 * Un axe sans valeur retombe sur la clé « default ».
 */
function insertVariant(
  tree: VariantTokens,
  axes: string[],
  values: Record<string, string>,
  leaf: SlotTokens,
): void {
  let node = tree;
  axes.forEach((axis, index) => {
    const key = values[axis] || 'default';
    if (index === axes.length - 1) {
      node[key] = leaf;
      return;
    }
    if (!node[key] || isLeaf(node[key])) node[key] = {} as VariantTokens;
    node = node[key] as VariantTokens;
  });
}

/** Une feuille ne contient que des chaînes (rôle → token) ; un groupe contient des objets. */
function isLeaf(value: VariantTokens | SlotTokens): value is SlotTokens {
  return Object.values(value).every((child) => typeof child === 'string');
}

/**
 * Point d'entrée : construit l'arbre complet des tokens de variantes
 * (tous les axes, tous les rôles). Chaque token rencontré est aussi ajouté
 * à `tokenNames` pour alimenter la liste `tokensUsed` du contrat.
 */
export async function extractVariantTokens(
  matrix: VariantMatrix,
  resolver: VariableNameResolver,
  tokenNames: Set<string>,
  warnings: string[],
): Promise<VariantTokens> {
  const tree: VariantTokens = {};
  // Un Component Set a toujours au moins un axe, mais on se protège d'une
  // liste vide pour ne jamais perdre un variant en silence.
  const axes = matrix.axes.length > 0 ? matrix.axes : ['variant'];

  await Promise.all(
    matrix.variants.map(async (entry: VariantEntry) => {
      const leaf = await getSlotTokens(entry.component, resolver);
      if (Object.keys(leaf).length === 0) {
        warnings.push(`Variant « ${entry.component.name} » : aucune variable de couleur/contour liée.`);
      }
      for (const token of Object.values(leaf)) tokenNames.add(token);
      const values = matrix.axes.length > 0 ? entry.values : { variant: entry.component.name };
      insertVariant(tree, axes, values, leaf);
    }),
  );

  return tree;
}
