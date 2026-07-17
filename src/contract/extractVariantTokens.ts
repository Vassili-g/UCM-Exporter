/**
 * Extraction des tokens de couleur/contour de CHAQUE variant du composant.
 *
 * Résultat : l'arbre `variantTokens`, imbriqué selon les axes du set
 * (ex. couleur → variante → état), avec pour feuilles les tokens rangés
 * par rôle (background, foreground…). Les strokes sont exportés dans un arbre
 * parallèle afin que les consommateurs historiques de `variantTokens` gardent
 * partout des références de tokens sous forme de chaînes.
 */
import { variableAliases, VariableNameResolver } from '../variables';
import type { VariantEntry, VariantMatrix } from './componentTree';
import { getAllNodes, getBinding } from './nodeBindings';
import type {
  SlotStrokes,
  SlotTokens,
  StrokeAlignment,
  StrokeTokens,
  VariantStrokes,
  VariantTokens,
} from './types';

/** Propriétés Figma dont les variables liées portent une couleur ou un contour. */
const BOUND_FIELDS = ['fills', 'strokes'] as const;
const STROKE_WEIGHT_FIELDS = [
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
] as const;

/** Interface minimale utilisée pour rendre l'extraction testable sans Figma. */
type TokenResolver = Pick<VariableNameResolver, 'resolve'>;

/** Peintures et strokes d'un variant, séparés avant de construire les deux arbres UCS. */
export type VariantTokenLeaves = { paints: SlotTokens; strokes: SlotStrokes };

/**
 * Déduit le rôle d'un token depuis son dernier segment :
 * « …default.background » → « background ». Liste ouverte : tout rôle présent
 * dans le design system est capturé tel quel, rien n'est inventé.
 */
function tokenRole(token: string): string {
  const segments = token.split('.');
  return segments[segments.length - 1] || token;
}

/** Convertit la valeur d'alignement de l'API Figma en vocabulaire UCS. */
function strokeAlignment(node: SceneNode, warnings: string[]): StrokeAlignment | null {
  const raw = 'strokeAlign' in node ? (node as SceneNode & { strokeAlign?: unknown }).strokeAlign : null;
  if (raw === 'INSIDE') return 'inside';
  if (raw === 'CENTER') return 'center';
  if (raw === 'OUTSIDE') return 'outside';

  warnings.push(`Calque « ${node.name} » : alignement du stroke indisponible.`);
  return null;
}

/**
 * Résout la largeur d'un stroke. Figma peut exposer une liaison uniforme
 * (`strokeWeight`) ou quatre liaisons individuelles ; une largeur asymétrique
 * reste volontairement non exportée plutôt que d'être aplatie en silence.
 */
async function strokeWidth(
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
): Promise<string | null> {
  const uniform = await resolver.resolve(firstAlias(getBinding(node, 'strokeWeight')));
  if (uniform) return uniform;

  const sides = await Promise.all(
    STROKE_WEIGHT_FIELDS.map((field) => resolver.resolve(firstAlias(getBinding(node, field)))),
  );
  const uniqueSides = Array.from(new Set(sides.filter((token): token is string => Boolean(token))));
  if (uniqueSides.length === 1) return uniqueSides[0];
  if (uniqueSides.length > 1) {
    warnings.push(
      `Calque « ${node.name} » : largeurs de stroke asymétriques (${uniqueSides.join(', ')}).`,
    );
    return null;
  }

  warnings.push(`Calque « ${node.name} » : largeur du stroke sans variable liée (valeur brute ignorée).`);
  return null;
}

/** Extrait le premier alias d'une liaison simple ou tableau. */
function firstAlias(value: unknown): VariableAlias | null {
  return variableAliases(value)[0] ?? null;
}

/** Compare deux strokes pour signaler les collisions sans doublon. */
function sameStroke(left: StrokeTokens, right: StrokeTokens): boolean {
  return (
    left.color === right.color &&
    left.width === right.width &&
    left.align === right.align
  );
}

/** Ajoute une peinture en conservant le premier token et en rendant toute collision visible. */
function setPaintToken(
  paints: SlotTokens,
  role: string,
  token: string,
  node: SceneNode,
  warnings: string[],
): void {
  const existing = paints[role];
  if (!existing) {
    paints[role] = token;
    return;
  }
  if (existing !== token) {
    warnings.push(`Calque « ${node.name} » : plusieurs tokens pour le rôle « ${role} » ; premier conservé.`);
  }
}

/** Ajoute un stroke en conservant le premier et en rendant toute collision visible. */
function setStrokeToken(
  strokes: SlotStrokes,
  role: string,
  value: StrokeTokens,
  node: SceneNode,
  warnings: string[],
): void {
  const existing = strokes[role];
  if (!existing) {
    strokes[role] = value;
    return;
  }
  if (!sameStroke(existing, value)) {
    warnings.push(`Calque « ${node.name} » : plusieurs strokes pour le rôle « ${role} » ; premier conservé.`);
  }
}

/**
 * Récolte tous les tokens de couleur/contour liés n'importe où dans le
 * sous-arbre d'un variant, rangés par rôle.
 */
export async function getSlotTokens(
  component: ComponentNode,
  resolver: TokenResolver,
  warnings: string[] = [],
): Promise<VariantTokenLeaves> {
  const pending: Array<{
    node: SceneNode;
    field: (typeof BOUND_FIELDS)[number];
    promise: Promise<string | null>;
    stroke: Promise<{ width: string | null; align: StrokeAlignment | null }> | null;
  }> = [];
  const strokeStylesByNode = new Map<
    SceneNode,
    Promise<{ width: string | null; align: StrokeAlignment | null }>
  >();

  for (const node of getAllNodes(component)) {
    for (const field of BOUND_FIELDS) {
      for (const alias of variableAliases(getBinding(node, field))) {
        let stroke: Promise<{ width: string | null; align: StrokeAlignment | null }> | null = null;
        if (field === 'strokes') {
          stroke = strokeStylesByNode.get(node) ?? null;
          if (!stroke) {
            stroke = Promise.all([
              strokeWidth(node, resolver, warnings),
              Promise.resolve(strokeAlignment(node, warnings)),
            ]).then(([width, align]) => ({ width, align }));
            strokeStylesByNode.set(node, stroke);
          }
        }
        pending.push({ node, field, promise: resolver.resolve(alias), stroke });
      }
    }
  }

  const paints: SlotTokens = {};
  const strokes: SlotStrokes = {};
  const resolved = await Promise.all(
    pending.map(async (binding) => ({
      ...binding,
      token: await binding.promise,
      strokeStyle: binding.stroke ? await binding.stroke : null,
    })),
  );
  for (const binding of resolved) {
    if (!binding.token) continue;
    const role = tokenRole(binding.token);
    if (binding.field === 'strokes') {
      setStrokeToken(strokes, role, {
          color: binding.token,
          width: binding.strokeStyle?.width ?? null,
          align: binding.strokeStyle?.align ?? null,
        }, binding.node, warnings);
    } else {
      setPaintToken(paints, role, binding.token, binding.node, warnings);
    }
  }
  return { paints, strokes };
}

/**
 * Insère une feuille dans l'arbre en suivant l'ordre des axes.
 * Un axe sans valeur retombe sur la clé « default ».
 */
function insertVariant(
  tree: Record<string, unknown>,
  axes: string[],
  values: Record<string, string>,
  leaf: SlotTokens | SlotStrokes,
): void {
  let node = tree;
  axes.forEach((axis, index) => {
    const key = values[axis] || 'default';
    if (index === axes.length - 1) {
      node[key] = leaf;
      return;
    }
    if (!node[key] || typeof node[key] !== 'object' || Array.isArray(node[key])) node[key] = {};
    node = node[key] as Record<string, unknown>;
  });
}

/**
 * Point d'entrée : construit l'arbre complet des tokens de variantes
 * (tous les axes, tous les rôles). Chaque token rencontré est aussi ajouté
 * à `tokenNames` pour alimenter la liste `tokensUsed` du contrat.
 */
export async function extractVariantTokens(
  matrix: VariantMatrix,
  resolver: TokenResolver,
  tokenNames: Set<string>,
  warnings: string[],
): Promise<{ variantTokens: VariantTokens; variantStrokes: VariantStrokes }> {
  const variantTokens: VariantTokens = {};
  const variantStrokes: VariantStrokes = {};
  // Un Component Set a toujours au moins un axe, mais on se protège d'une
  // liste vide pour ne jamais perdre un variant en silence.
  const axes = matrix.axes.length > 0 ? matrix.axes : ['variant'];

  await Promise.all(
    matrix.variants.map(async (entry: VariantEntry) => {
      const leaf = await getSlotTokens(entry.component, resolver, warnings);
      if (Object.keys(leaf.paints).length === 0 && Object.keys(leaf.strokes).length === 0) {
        warnings.push(`Variant « ${entry.component.name} » : aucune variable de couleur/contour liée.`);
      }
      for (const token of Object.values(leaf.paints)) tokenNames.add(token);
      for (const stroke of Object.values(leaf.strokes)) {
        tokenNames.add(stroke.color);
        if (stroke.width) tokenNames.add(stroke.width);
      }
      const values = matrix.axes.length > 0 ? entry.values : { variant: entry.component.name };
      insertVariant(variantTokens, axes, values, leaf.paints);
      insertVariant(variantStrokes, axes, values, leaf.strokes);
    }),
  );

  return { variantTokens, variantStrokes };
}
