/**
 * Extraction des peintures et contours liés dans le sous-arbre d'un variant.
 * Les collisions et valeurs brutes produisent des warnings sans interrompre
 * l'export du composant.
 */
import { toRef, variableAliases } from '../variables';
import type { TokenResolver } from '../variables';
import { getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import { BINDING_PATTERNS, fieldLabel, getBinding, resolveTokenName } from './nodeBindings';
import type { SlotStrokes, SlotTokens, StrokeAlignment, StrokeTokens } from './types';
export type { TokenResolver } from '../variables';

const BOUND_FIELDS = ['fills', 'strokes'] as const;
export type VariantTokenLeaves = { paints: SlotTokens; strokes: SlotStrokes };

/** Déduit le rôle d'un token depuis son dernier segment. */
function tokenRole(token: string): string {
  const segments = token.split('.');
  return segments[segments.length - 1] || token;
}

/** Convertit l'alignement Figma dans le vocabulaire partagé du contrat. */
function strokeAlignment(node: SceneNode, warnings: string[]): StrokeAlignment | null {
  const raw = 'strokeAlign' in node ? (node as SceneNode & { strokeAlign?: unknown }).strokeAlign : null;
  if (raw === 'INSIDE') return 'inside';
  if (raw === 'CENTER') return 'center';
  if (raw === 'OUTSIDE') return 'outside';
  warnings.push(`Layer « ${node.name} » : l’alignement du stroke est illisible. Le contrat ne dira pas s’il est inside, center ou outside.`);
  return null;
}

/** Résout une largeur uniforme sans aplatir des côtés asymétriques. */
async function strokeWidth(
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
): Promise<string | null> {
  return resolveTokenName(
    node,
    BINDING_PATTERNS.strokeWidth,
    'stroke weight',
    resolver,
    warnings,
  );
}

/** Ajoute une peinture en rendant visible toute collision. */
function setPaintToken(
  paints: SlotTokens,
  role: string,
  token: string,
  node: SceneNode,
  warnings: string[],
): void {
  const existing = paints[role];
  if (!existing) paints[role] = token;
  else if (existing !== token) {
    warnings.push(
      `Layer « ${node.name} » : deux fills visent le même rôle « ${role} ». Seul ` +
        `${existing} est exporté, ${token} est ignoré. Ne gardez qu'un fill par rôle.`,
    );
  }
}

/** Ajoute un contour en rendant visible toute collision. */
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
  if (existing.color !== value.color || existing.width !== value.width || existing.align !== value.align) {
    warnings.push(
      `Layer « ${node.name} » : deux strokes visent le même rôle « ${role} ». Seul ` +
        `${existing.color} est exporté, ${value.color} est ignoré. Ne gardez qu'un stroke par rôle.`,
    );
  }
}

/** Récolte tous les tokens liés et les range par rôle peinture ou contour. */
export async function getSlotTokens(
  component: ComponentNode,
  resolver: TokenResolver,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
): Promise<VariantTokenLeaves> {
  const pending: Array<{
    node: SceneNode;
    field: (typeof BOUND_FIELDS)[number];
    promise: Promise<string | null>;
    stroke: Promise<{ width: string | null; align: StrokeAlignment | null }> | null;
  }> = [];
  const strokeStyles = new Map<
    SceneNode,
    Promise<{ width: string | null; align: StrokeAlignment | null }>
  >();

  for (const node of getAllNodes(component, warnings, composed)) {
    for (const field of BOUND_FIELDS) {
      for (const alias of variableAliases(getBinding(node, field))) {
        let stroke = field === 'strokes' ? strokeStyles.get(node) ?? null : null;
        if (field === 'strokes' && !stroke) {
          stroke = Promise.all([
            strokeWidth(node, resolver, warnings),
            Promise.resolve(strokeAlignment(node, warnings)),
          ]).then(([width, align]) => ({ width, align }));
          strokeStyles.set(node, stroke);
        }
        pending.push({
          node,
          field,
          promise: resolver.resolve(alias, { nodeName: node.name, field: fieldLabel(field) }),
          stroke,
        });
      }
    }
  }

  const paints: SlotTokens = {};
  const strokes: SlotStrokes = {};
  const resolved = await Promise.all(pending.map(async (binding) => ({
    ...binding,
    token: await binding.promise,
    strokeStyle: binding.stroke ? await binding.stroke : null,
  })));
  for (const binding of resolved) {
    if (!binding.token) continue;
    // Le rôle se lit sur le nom NU (dernier segment) ; l'enrobage `{…}`
    // n'intervient qu'au moment où le token entre dans le contrat.
    const role = tokenRole(binding.token);
    if (binding.field === 'strokes') {
      const width = binding.strokeStyle?.width ?? null;
      setStrokeToken(strokes, role, {
        color: toRef(binding.token),
        width: width ? toRef(width) : null,
        align: binding.strokeStyle?.align ?? null,
      }, binding.node, warnings);
    } else {
      setPaintToken(paints, role, toRef(binding.token), binding.node, warnings);
    }
  }
  return { paints, strokes };
}
