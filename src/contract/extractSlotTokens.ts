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

/** Une couleur retenue pour une clé, et le calque qui l'a posée. */
type KeyedPaint<T> = { value: T; node: SceneNode };

/**
 * Message d'une clé que deux couleurs se disputent.
 *
 * La feuille d'un variant n'a qu'une entrée par clé, et le contrat garde la
 * première. Le geste à faire dépend de qui porte les deux : un seul calque a un
 * fill de trop, deux calques ont deux surfaces distinctes que la même clé ne
 * sait pas séparer. Leur demander de n'en garder qu'une ferait perdre une
 * couleur — c'est l'erreur que la 5.1 a fermée côté nommage, et la refaire dans
 * un message la rouvrirait.
 */
function collisionWarning(
  field: 'fills' | 'strokes',
  key: string,
  existing: { token: string; node: SceneNode },
  incoming: { token: string; node: SceneNode },
): string {
  if (existing.node === incoming.node) {
    return `Layer « ${incoming.node.name} » : deux ${field} portent la même clé « ${key} ». ` +
      `Seul ${existing.token} est exporté, ${incoming.token} est ignoré. Ne gardez qu'un ` +
      `${field === 'fills' ? 'fill' : 'stroke'} par clé.`;
  }
  return `Layer « ${incoming.node.name} » : sa couleur ${incoming.token} porte la même clé ` +
    `« ${key} » que celle du layer « ${existing.node.name} » (${existing.token}) — la clé est le ` +
    `dernier segment du nom de la variable. Le contrat n'en garde qu'une par variant et exporte ` +
    `${existing.token} : la couleur de ce layer manquera au développeur. Donnez à l'une des deux ` +
    `variables un dernier segment différent, puis réexportez.`;
}

/**
 * Ajoute une peinture en rendant visible toute collision.
 *
 * Les clés se lisent sur le dernier segment d'un nom de variable Figma :
 * l'accumulateur est une `Map`, sans clé héritée. Un objet littéral rendrait
 * `Object` pour une clé « constructor », et le token serait écarté sous un
 * avertissement de collision que rien ne justifie.
 */
function setPaintToken(
  paints: Map<string, KeyedPaint<string>>,
  key: string,
  token: string,
  node: SceneNode,
  warnings: string[],
): void {
  const existing = paints.get(key);
  if (!existing) {
    paints.set(key, { value: token, node });
    return;
  }
  if (existing.value === token) return;
  warnings.push(collisionWarning('fills', key, { token: existing.value, node: existing.node }, { token, node }));
}

/** Ajoute un contour en rendant visible toute collision. Même `Map` que `setPaintToken`, et pour la même raison. */
function setStrokeToken(
  strokes: Map<string, KeyedPaint<StrokeTokens>>,
  key: string,
  value: StrokeTokens,
  node: SceneNode,
  warnings: string[],
): void {
  const existing = strokes.get(key);
  if (!existing) {
    strokes.set(key, { value, node });
    return;
  }
  if (existing.value.color !== value.color) {
    warnings.push(collisionWarning(
      'strokes',
      key,
      { token: existing.value.color, node: existing.node },
      { token: value.color, node },
    ));
    return;
  }
  // Même couleur, géométrie différente : citer deux fois le même token ne
  // dirait rien au designer. C'est la largeur ou l'alignement qu'il doit voir.
  if (existing.value.width === value.width && existing.value.align === value.align) return;
  warnings.push(
    `Layer « ${node.name} » : son stroke ${value.color} porte la même clé « ${key} » que celui ` +
      `du layer « ${existing.node.name} », avec une stroke weight ou un alignement différents. ` +
      `Le contrat n'en garde qu'un par variant et exporte celui de « ${existing.node.name} » : ` +
      `la géométrie de ce layer manquera au développeur. Réglez les deux strokes de la même ` +
      `façon, ou donnez à l'une des deux variables un dernier segment différent, puis réexportez.`,
  );
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
    // `getAllNodes` conserve l'instance d'un composant unifié pour que la
    // structure puisse la décrire comme un slot. Ses couleurs, elles, ne sont
    // pas les nôtres : elles appartiennent à son propre contrat, et les relever
    // ici les ferait entrer dans `variantTokens` et dans `tokensUsed` du parent
    // — jusqu'à évincer, sur la même clé, une couleur que ce contrat possède.
    if (composed.has(node.id)) continue;
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

  const paints = new Map<string, KeyedPaint<string>>();
  const strokes = new Map<string, KeyedPaint<StrokeTokens>>();
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
  const leafOf = <T>(retenus: Map<string, KeyedPaint<T>>): Record<string, T> =>
    Object.fromEntries(Array.from(retenus, ([key, retenu]) => [key, retenu.value]));
  return { paints: leafOf(paints), strokes: leafOf(strokes), roles };
}
