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
import { isRenderableRole, paintSiteRole } from './semantics';
import { isIconLayer } from './slotNames';
import type { SlotStrokes, SlotTokens, StrokeAlignment, StrokeTokens } from './types';
export type { TokenResolver } from '../variables';

const BOUND_FIELDS = ['fills', 'strokes'] as const;
export type VariantTokenLeaves = {
  paints: SlotTokens;
  strokes: SlotStrokes;
  /**
   * Rôle de rendu déduit pour chaque clé qui n'en nomme aucun. L'appelant les
   * fusionne sur toute la matrice, puis `renderingSemanticsFor` les publie.
   */
  roles: Map<string, string>;
};

/**
 * Clé d'une couleur dans la feuille d'un variant : le dernier segment du nom
 * de la variable Figma.
 *
 * C'est une IDENTITÉ, pas un rôle. Ce que la couleur peint se lit sur le calque
 * qui la porte (`paintSiteRole`), jamais sur ce nom.
 */
function tokenKey(token: string): string {
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

/**
 * Ajoute une peinture en rendant visible toute collision.
 *
 * Les rôles se lisent sur le dernier segment d'un nom de variable Figma :
 * l'accumulateur est une `Map`, sans clé héritée. Un objet littéral rendrait
 * `Object` pour un rôle « constructor », et le token serait écarté sous un
 * avertissement de collision que rien ne justifie.
 */
function setPaintToken(
  paints: Map<string, string>,
  role: string,
  token: string,
  node: SceneNode,
  warnings: string[],
): void {
  const existing = paints.get(role);
  if (!existing) paints.set(role, token);
  else if (existing !== token) {
    warnings.push(
      `Layer « ${node.name} » : deux fills visent le même rôle « ${role} ». Seul ` +
        `${existing} est exporté, ${token} est ignoré. Ne gardez qu'un fill par rôle.`,
    );
  }
}

/** Ajoute un contour en rendant visible toute collision. Même `Map` que `setPaintToken`, et pour la même raison. */
function setStrokeToken(
  strokes: Map<string, StrokeTokens>,
  role: string,
  value: StrokeTokens,
  node: SceneNode,
  warnings: string[],
): void {
  const existing = strokes.get(role);
  if (!existing) {
    strokes.set(role, value);
    return;
  }
  if (existing.color !== value.color || existing.width !== value.width || existing.align !== value.align) {
    warnings.push(
      `Layer « ${node.name} » : deux strokes visent le même rôle « ${role} ». Seul ` +
        `${existing.color} est exporté, ${value.color} est ignoré. Ne gardez qu'un stroke par rôle.`,
    );
  }
}

/**
 * Récolte tous les tokens liés d'un variant, rangés par clé, et relève au
 * passage le rôle de rendu de chaque clé qui n'en nomme pas.
 *
 * `iconNames` porte les calques désignés par les règles `@icons`. C'est
 * `slotNames.isIconLayer` qui répond ici comme ailleurs à « ce calque est-il
 * une icône » : une seconde définition finirait par nommer `icon` un calque que
 * le rendu peindrait autrement.
 */
export async function getSlotTokens(
  component: ComponentNode,
  resolver: TokenResolver,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
  iconNames: ReadonlySet<string> = new Set(),
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

  const paints = new Map<string, string>();
  const strokes = new Map<string, StrokeTokens>();
  const roles = new Map<string, string>();
  const resolved = await Promise.all(pending.map(async (binding) => ({
    ...binding,
    token: await binding.promise,
    strokeStyle: binding.stroke ? await binding.stroke : null,
  })));
  for (const binding of resolved) {
    if (!binding.token) continue;
    // La clé se lit sur le nom NU (dernier segment) ; l'enrobage `{…}`
    // n'intervient qu'au moment où le token entre dans le contrat.
    const key = tokenKey(binding.token);
    const isStroke = binding.field === 'strokes';
    // Une clé qui nomme un rôle partagé n'a rien à déduire : le designer l'a
    // déclaré. `variantRoleWarnings` signale séparément celles qu'il a
    // déclarées du mauvais côté.
    if (!isRenderableRole(key) && !roles.has(key)) {
      roles.set(key, paintSiteRole({
        isStroke,
        isText: binding.node.type === 'TEXT',
        isIconTarget: isIconLayer(binding.node, iconNames),
      }));
    }
    if (isStroke) {
      const width = binding.strokeStyle?.width ?? null;
      setStrokeToken(strokes, key, {
        color: toRef(binding.token),
        width: width ? toRef(width) : null,
        align: binding.strokeStyle?.align ?? null,
      }, binding.node, warnings);
    } else {
      setPaintToken(paints, key, toRef(binding.token), binding.node, warnings);
    }
  }
  return { paints: Object.fromEntries(paints), strokes: Object.fromEntries(strokes), roles };
}
