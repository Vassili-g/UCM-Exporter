/**
 * Extraction des tokens de couleur/contour de CHAQUE variant du composant.
 *
 * Résultat : l'arbre `variantTokens`, imbriqué selon les axes du set
 * (ex. couleur → variante → état), avec pour feuilles les couleurs rangées par
 * clé. Les strokes sont exportés dans un arbre parallèle afin que les
 * consommateurs historiques de `variantTokens` gardent partout des références
 * de tokens sous forme de chaînes.
 *
 * Les clés se décident ici, une seule fois, sur TOUTE la matrice
 * (`colorKeys.ts`) : lues variant par variant, elles changeraient d'un état à
 * l'autre et plus rien ne serait indexable.
 */
import { resolveColorKeys } from './colorKeys';
import type { VariantEntry, VariantMatrix } from './componentTree';
import type { ComposedInstances } from './exportableNodes';
import { normalizePropValue } from './parsers';
import { getSlotTokens } from './extractSlotTokens';
import type { TokenResolver, VariantColor, VariantStrokeColor } from './extractSlotTokens';
import { isRenderableRole } from './semantics';
import { toRef } from '../variables';
import type { SlotStrokes, SlotTokens, VariantStrokes, VariantTokens } from './types';
export { getSlotTokens } from './extractSlotTokens';
export type { VariantTokenLeaves } from './extractSlotTokens';

/**
 * Insère une feuille dans l'arbre en suivant l'ordre des axes.
 * Un axe sans valeur retombe sur la clé « default ».
 *
 * Renvoie `false` quand un variant occupe déjà ces valeurs d'axes. L'arbre
 * historique ne peut représenter ce doublon, mais la liste exacte `variants`
 * conserve chacune des occurrences et leurs feuilles propres.
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
): boolean {
  const has = (node: Record<string, unknown>, key: string) =>
    Object.prototype.hasOwnProperty.call(node, key);
  const set = (node: Record<string, unknown>, key: string, value: unknown) => {
    Object.defineProperty(node, key, {
      value, enumerable: true, writable: true, configurable: true,
    });
  };

  let node = tree;
  let inserted = false;
  axes.forEach((axis, index) => {
    const key = values[axis] || 'default';
    if (index === axes.length - 1) {
      // Deux variants aux mêmes valeurs d'axes : on conserve le premier et on
      // le signale — ne jamais perdre d'information en silence.
      if (has(node, key)) {
        warnings.push(
          `Variants « ${axes.map((a) => values[a] || 'default').join(' / ')} » : deux ` +
            `variants portent les mêmes valeurs une fois normalisées (majuscules et ` +
            `espaces ignorés). Les deux restent dans la liste exacte « variants », mais ` +
            `l'arbre historique ne peut en indexer qu'un et garde le premier. Renommez ` +
            `l'un des deux pour rendre aussi cet index non ambigu.`,
        );
        return;
      }
      set(node, key, leaf);
      inserted = true;
      return;
    }
    const branch = has(node, key) ? node[key] : null;
    if (!branch || typeof branch !== 'object' || Array.isArray(branch)) set(node, key, {});
    node = node[key] as Record<string, unknown>;
  });
  return inserted;
}

/** Feuille de peintures : une référence de token par clé. */
function paintLeaf(colors: readonly VariantColor[], keys: ReadonlyMap<string, string>): SlotTokens {
  return Object.fromEntries(colors.map((color) => [keys.get(color.token), toRef(color.token)]));
}

/** Feuille de contours : la couleur et la géométrie que le contrat publie. */
function strokeLeaf(
  colors: readonly VariantStrokeColor[],
  keys: ReadonlyMap<string, string>,
): SlotStrokes {
  return Object.fromEntries(colors.map((color) => [
    keys.get(color.token),
    { color: toRef(color.token), width: color.width, align: color.align },
  ]));
}

/** Cibles Figma internes, converties ensuite en chemins par l'arbre déjà extrait. */
export type VariantPaintNodeIds = {
  fills: Record<string, string[]>;
  strokes: Record<string, string[]>;
};

function placementNodeIds(
  leaf: { paints: readonly VariantColor[]; strokes: readonly VariantStrokeColor[] },
  keys: ReadonlyMap<string, string>,
): VariantPaintNodeIds {
  return {
    fills: Object.fromEntries(leaf.paints.map((color) => [
      keys.get(color.token) ?? color.token,
      color.nodeIds ?? [],
    ])),
    strokes: Object.fromEntries(leaf.strokes.map((color) => [
      keys.get(color.token) ?? color.token,
      color.nodeIds ?? [],
    ])),
  };
}

/**
 * Point d'entrée : construit l'arbre complet des tokens de variantes
 * (tous les axes, toutes les couleurs).
 */
export async function extractVariantTokens(
  matrix: VariantMatrix,
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances = new Map(),
  iconNames: ReadonlySet<string> = new Set(),
  notices: string[] = warnings,
): Promise<{
  variantTokens: VariantTokens;
  variantStrokes: VariantStrokes;
  /** Feuille exacte de chaque node, y compris lorsque ses coordonnées sont dupliquées. */
  tokensByComponent: Map<ComponentNode, SlotTokens>;
  /** Strokes exacts de chaque node, avec la même garantie que `tokensByComponent`. */
  strokesByComponent: Map<ComponentNode, SlotStrokes>;
  /** Cibles internes de chaque clé, converties en chemins de slots par `extractStructure`. */
  paintNodeIdsByComponent: Map<ComponentNode, VariantPaintNodeIds>;
  /** Rôle de rendu déduit de chaque clé qui n'en nomme aucun, sur toute la matrice. */
  discoveredRoles: Map<string, string>;
}> {
  const variantTokens: VariantTokens = {};
  const variantStrokes: VariantStrokes = {};
  const tokensByComponent = new Map<ComponentNode, SlotTokens>();
  const strokesByComponent = new Map<ComponentNode, SlotStrokes>();
  const paintNodeIdsByComponent = new Map<ComponentNode, VariantPaintNodeIds>();
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

  // Première passe, séquentielle : c'est la matrice qui fixe l'ordre des clés,
  // celui des avertissements et le sens de « premier conservé » dans les seuls
  // arbres historiques. Aucun variant réel n'est écarté de la vue exacte.
  const reserved: Record<string, unknown> = {};
  const exact: Array<{
    entry: VariantEntry;
    leaf: (typeof collected)[number]['leaf'];
    values: Record<string, string>;
  }> = [];
  const retained: typeof exact = [];
  for (const { entry, leaf, variantWarnings } of collected) {
    warnings.push(...variantWarnings);
    if (leaf.paints.length === 0 && leaf.strokes.length === 0) {
      notices.push(`Variant « ${entry.component.name} » : aucun fill ni stroke n’est relié à une variable. Aucune couleur n’est exportée pour lui.`);
    }
    // La clé de repli suit la même normalisation que toutes les valeurs
    // d'axes : l'arbre reste homogène même sans axe déclaré.
    const values = matrix.axes.length > 0
      ? entry.values
      : { variant: normalizePropValue(entry.component.name) };
    const exactEntry = { entry, leaf, values };
    exact.push(exactEntry);
    // La v9 ne sérialise plus cet index : un doublon de coordonnées n'y perd
    // donc aucune donnée et ne demande plus de correction au designer. On garde
    // encore l'arbre en interne pour les extracteurs historiques et leurs tests.
    if (insertVariantLeaf(reserved, axes, values, true, [])) retained.push(exactEntry);
  }

  // Deuxième passe : les clés se décident sur TOUTES les feuilles exactes. Un
  // doublon de coordonnées reste un variant publié ; ses couleurs doivent donc
  // participer à la clé stable de toute la matrice.
  const keys = resolveColorKeys(
    exact.flatMap(({ leaf }) => [
      leaf.paints.map((color) => color.token),
      leaf.strokes.map((color) => color.token),
    ]),
  );

  // Troisième passe : les feuilles exactes et les rôles, toujours dans l'ordre
  // de la matrice. Les maps sont internes à l'orchestrateur et ne sont jamais
  // sérialisées telles quelles.
  for (const { entry, leaf } of exact) {
    tokensByComponent.set(entry.component, paintLeaf(leaf.paints, keys));
    strokesByComponent.set(entry.component, strokeLeaf(leaf.strokes, keys));
    paintNodeIdsByComponent.set(entry.component, placementNodeIds(leaf, keys));
    // Le rôle d'une clé est relevé sur toute la matrice. Une clé qui NOMME un
    // rôle partagé n'a rien à publier : le consommateur la résout directement.
    // Le même token posé sur des calques de natures différentes selon le variant
    // ne peut recevoir qu'un rendu : on garde le premier et on le dit, plutôt
    // que de laisser l'ordre des promesses trancher en silence.
    for (const color of [...leaf.paints, ...leaf.strokes]) {
      const key = keys.get(color.token) ?? color.token;
      if (isRenderableRole(key)) continue;
      const known = discoveredRoles.get(key);
      if (!known) {
        discoveredRoles.set(key, color.role);
        continue;
      }
      // Un seul message par clé : le même calque revient dans chaque variant, et
      // un Button en a 30.
      if (known === color.role || reportedRoleConflicts.has(key)) continue;
      reportedRoleConflicts.add(key);
      warnings.push(
        `Token ${toRef(color.token)} : il est appliqué à des layers de natures différentes selon ` +
          `les variants (${known}, ${color.role}). Le contrat ne peut décrire qu'une façon de le ` +
          `peindre et retient « ${known} ». Utilisez une variable par nature de layer.`,
      );
    }
  }

  // Les index historiques gardent leur forme : quand deux variants occupent la
  // même coordonnée, la première passe a déjà choisi et documenté le premier.
  for (const { entry, values } of retained) {
    insertVariantLeaf(variantTokens, axes, values, tokensByComponent.get(entry.component) ?? {}, []);
    insertVariantLeaf(variantStrokes, axes, values, strokesByComponent.get(entry.component) ?? {}, []);
  }

  return {
    variantTokens,
    variantStrokes,
    tokensByComponent,
    strokesByComponent,
    paintNodeIdsByComponent,
    discoveredRoles,
  };
}
