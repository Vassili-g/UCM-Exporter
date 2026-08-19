/**
 * Relevé des peintures et contours liés dans le sous-arbre d'un variant.
 *
 * Ce module dit QUELLES couleurs un variant porte et COMMENT chacune se peint.
 * Il ne décide pas de leur clé dans la feuille : `colorKeys.ts` en est l'unique
 * autorité, et la décide sur toute la matrice — une clé lue variant par variant
 * changerait d'un état à l'autre.
 */
import { toRef, variableAliases } from '../variables';
import type { TokenResolver } from '../variables';
import { tokenKey } from './colorKeys';
import { getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import {
  BINDING_PATTERNS,
  fieldLabel,
  getBinding,
  resolveSidedTokenNames,
  SIDE_KEYS,
  toSidedRef,
} from './nodeBindings';
import { isRenderableRole, paintSiteRole } from './semantics';
import { isIconLayer } from './slotNames';
import type { StrokeAlignment, StrokeWidth } from './types';
export type { TokenResolver } from '../variables';

const BOUND_FIELDS = ['fills', 'strokes'] as const;

/**
 * Une couleur liée d'un variant, telle que Figma la porte.
 *
 * Aucun `SceneNode` n'en fait partie : seuls ses identifiants internes peuvent
 * franchir la frontière afin d'être convertis ensuite en chemins publics. Cela
 * évite aussi d'exposer à `collectTokenReferences` les cycles
 * `parent` ↔ `children` de l'arbre Figma.
 */
export type VariantColor = {
  /** Nom NU du token, sans accolades : la clé s'en déduit. */
  token: string;
  /** Rôle de rendu : déclaré par le dernier segment, sinon déduit du calque. */
  role: string;
  /** Identifiants internes des calques qui portent ce token dans ce variant. */
  nodeIds?: string[];
};

/** Une couleur de contour, avec la géométrie que le contrat publie à côté. */
export type VariantStrokeColor = VariantColor & {
  width: StrokeWidth | null;
  align: StrokeAlignment | null;
};

/** Ce qu'un variant porte comme couleurs, dans l'ordre du parcours des calques. */
export type VariantTokenLeaves = {
  paints: VariantColor[];
  strokes: VariantStrokeColor[];
};

/** Convertit l'alignement Figma dans le vocabulaire partagé du contrat. */
function strokeAlignment(node: SceneNode, warnings: string[]): StrokeAlignment | null {
  const raw = 'strokeAlign' in node ? (node as SceneNode & { strokeAlign?: unknown }).strokeAlign : null;
  if (raw === 'INSIDE') return 'inside';
  if (raw === 'CENTER') return 'center';
  if (raw === 'OUTSIDE') return 'outside';
  warnings.push(`Layer « ${node.name} » : l’alignement du stroke est illisible. Le contrat ne dira pas s’il est inside, center ou outside.`);
  return null;
}

/**
 * Résout l'épaisseur d'un contour : une valeur quand les quatre bords partagent
 * leur variable, le détail par bord sinon. Les tokens sont NUS ici ; l'enrobage
 * en référence a lieu au moment de publier la feuille.
 */
async function strokeWidth(
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
): Promise<StrokeWidth | null> {
  return resolveSidedTokenNames(
    node,
    BINDING_PATTERNS.strokeWidth,
    SIDE_KEYS.strokeWidth,
    'stroke weight',
    resolver,
    warnings,
  );
}

/**
 * Vrai si deux largeurs de contour décrivent la même géométrie.
 *
 * Une comparaison d'identité suffisait tant qu'une largeur était une chaîne ;
 * détaillée par bord, elle produit un objet neuf à chaque lecture, et deux
 * calques réglés exactement pareil auraient déclenché un avertissement que
 * AUCUN geste du designer n'aurait fait disparaître.
 */
function memeLargeur(left: StrokeWidth | null, right: StrokeWidth | null): boolean {
  if (left === null || right === null) return left === right;
  if (typeof left === 'string' || typeof right === 'string') return left === right;
  const sides = new Set([...Object.keys(left), ...Object.keys(right)]);
  return Array.from(sides).every(
    (side) => (left as Record<string, string>)[side] === (right as Record<string, string>)[side],
  );
}

/**
 * Rôle de rendu d'une couleur.
 *
 * Un dernier segment qui NOMME un rôle partagé est une déclaration du designer
 * et l'emporte : c'est le seul moyen de distinguer un `ring` d'un `border`, et
 * c'est ce qui fait qu'un `…/ring` publié sous une clé allongée conserve son
 * `outline-*` et son `fallback: box-shadow`. Sinon, ce que la couleur peint se
 * lit sur le calque qui la porte.
 */
function colorRole(
  token: string,
  site: { isStroke: boolean; isText: boolean; isIconTarget: boolean },
): string {
  const base = tokenKey(token);
  return isRenderableRole(base) ? base : paintSiteRole(site);
}

/**
 * Nombre de peintures VISIBLES qu'un calque porte sans les relier à une
 * variable, pour un champ donné.
 *
 * On compte au lieu d'indexer : `boundVariables.fills` est un tableau que Figma
 * n'aligne pas sur `fills`, et un index supposé accuserait le mauvais paint.
 *
 * Les réserves sont ce qui distingue ce diagnostic d'un rapport qu'on cesse de
 * lire. Un paint masqué ou d'opacité nulle ne peint rien ; un stroke d'épaisseur
 * zéro non plus ; et une peinture non SOLID n'est de toute façon liable à aucune
 * variable de couleur — le geste demandé n'existerait pas.
 */
function unboundPaintCount(node: SceneNode, field: (typeof BOUND_FIELDS)[number]): number {
  const values = node as unknown as Record<string, unknown>;
  const paints = values[field];
  // `figma.mixed` ou champ absent : rien de lisible, donc rien à réclamer.
  if (!Array.isArray(paints)) return 0;
  if (field === 'strokes' && values.strokeWeight === 0) return 0;
  const visibles = paints.filter((paint): paint is SolidPaint => Boolean(
    paint
      && typeof paint === 'object'
      && (paint as Paint).type === 'SOLID'
      && (paint as Paint).visible !== false
      && ((paint as SolidPaint).opacity ?? 1) > 0,
  ));
  const liees = variableAliases(getBinding(node, field)).length;
  return Math.max(visibles.length - liees, 0);
}

/**
 * Signale les peintures qu'un calque porte à la main.
 *
 * Le contrat ne publie que les couleurs LIÉES : une couleur écrite en dur
 * disparaissait donc sans un mot, et `coverage.portable` continuait d'annoncer
 * `complete`. Le consommateur, à qui l'on interdit de déduire une cible du nom
 * d'une clé, laissait alors le calque sans encre — un seul variant sur quatre-
 * vingt-dix suffit à le rendre invisible en relecture.
 *
 * Le message part dans `warnings` : il demande un geste, et la couleur manque
 * réellement au développeur.
 */
function warnUnboundPaints(node: SceneNode, warnings: string[]): void {
  for (const field of BOUND_FIELDS) {
    const count = unboundPaintCount(node, field);
    if (count === 0) continue;
    const stroke = field === 'strokes';
    const plusieurs = count > 1;
    const nom = `${stroke ? 'stroke' : 'fill'}${plusieurs ? 's' : ''}`;
    warnings.push(
      `Layer « ${node.name} » : ${plusieurs ? `${count} ${nom} ne sont reliés` : `son ${nom} n’est relié`} `
        + `à aucune variable Figma. Le contrat ne publie que les couleurs liées, et le `
        + `développeur rendra donc ce layer sans ${stroke ? 'ce contour' : 'cette couleur'}. `
        + `Reliez ${plusieurs ? 'ces' : 'ce'} ${nom} à une variable, puis réexportez.`,
    );
  }
}

/**
 * Récolte toutes les couleurs liées d'un variant.
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
    stroke: Promise<{ width: StrokeWidth | null; align: StrokeAlignment | null }> | null;
  }> = [];
  const strokeStyles = new Map<
    SceneNode,
    Promise<{ width: StrokeWidth | null; align: StrokeAlignment | null }>
  >();

  for (const node of getAllNodes(component, warnings, composed)) {
    // `getAllNodes` conserve l'instance d'un composant unifié pour que la
    // structure puisse la décrire comme un slot. Ses couleurs, elles, ne sont
    // pas les nôtres : elles appartiennent à son propre contrat, et les relever
    // ici les ferait entrer dans `variantTokens` et dans `tokensUsed` du parent
    // — le contrat annoncerait une couleur qu'aucun de ses calques ne peint.
    if (composed.has(node.id)) continue;
    warnUnboundPaints(node, warnings);
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

  const paints: VariantColor[] = [];
  const strokes: VariantStrokeColor[] = [];
  // Une feuille n'a qu'une entrée par token : deux calques qui portent la même
  // couleur ne la publient qu'une fois, en silence — c'est la même couleur.
  const seenPaints = new Map<string, { node: SceneNode; role: string }>();
  const seenStrokes = new Map<string, { node: SceneNode; value: VariantStrokeColor }>();
  // Ce qu'un calque a déjà posé, par champ : toute paire de variables
  // distinctes y est empilée, même si leurs noms ne partagent aucune base.
  const stacked = new Map<SceneNode, Map<string, string>>();

  const resolved = await Promise.all(pending.map(async (binding) => ({
    ...binding,
    token: await binding.promise,
    strokeStyle: binding.stroke ? await binding.stroke : null,
  })));

  for (const binding of resolved) {
    if (!binding.token) continue;
    const isStroke = binding.field === 'strokes';
    const role = colorRole(binding.token, {
      isStroke,
      isText: binding.node.type === 'TEXT',
      isIconTarget: isIconLayer(binding.node, iconNames),
    });

    // Deux couleurs différentes empilées sur le même calque : le contrat les
    // publie toutes les deux — rien n'est perdu — mais il ne sait pas dire
    // laquelle est au-dessus. Un seul message par calque et par champ.
    const marker = binding.field;
    const posees = stacked.get(binding.node) ?? new Map<string, string>();
    stacked.set(binding.node, posees);
    const dessous = posees.get(marker);
    if (dessous === undefined) {
      posees.set(marker, binding.token);
    } else if (dessous !== binding.token && dessous !== '') {
      posees.set(marker, '');
      warnings.push(
        `Layer « ${binding.node.name} » : deux ${isStroke ? 'strokes' : 'fills'} ` +
          `y sont reliés à des variables différentes (${toRef(dessous)} et ` +
          `${toRef(binding.token)}). Les deux couleurs sont exportées, mais le contrat ne peut pas ` +
          `exprimer laquelle est au-dessus de l'autre. Ne gardez qu'un ` +
          `${isStroke ? 'stroke' : 'fill'} lié sur ce layer, puis réexportez.`,
      );
    }

    if (isStroke) {
      const width = binding.strokeStyle?.width ?? null;
      const value: VariantStrokeColor = {
        token: binding.token,
        role,
        width: toSidedRef(width),
        align: binding.strokeStyle?.align ?? null,
        ...(binding.node.id ? { nodeIds: [binding.node.id] } : {}),
      };
      const known = seenStrokes.get(binding.token);
      if (!known) {
        seenStrokes.set(binding.token, { node: binding.node, value });
        strokes.push(value);
        continue;
      }
      if (known.value.role !== value.role) {
        warnings.push(
          `Layer « ${binding.node.name} » : le stroke ${toRef(binding.token)} peint ici le rôle ` +
            `« ${value.role} », mais le layer « ${known.node.name} » lui donne déjà le rôle ` +
            `« ${known.value.role} ». Le contrat garde le premier rôle et ne représente pas le ` +
            `second. Reliez ces usages à deux variables distinctes, ` +
            `puis réexportez.`,
        );
      }
      // Même token, géométrie différente : la feuille n'a qu'une entrée par
      // token, ce cas reste réellement irreprésentable.
      if (memeLargeur(known.value.width, value.width) && known.value.align === value.align) {
        if (binding.node.id && !known.value.nodeIds?.includes(binding.node.id)) {
          known.value.nodeIds = [...(known.value.nodeIds ?? []), binding.node.id];
        }
        continue;
      }
      warnings.push(
        `Layer « ${binding.node.name} » : son stroke ${toRef(binding.token)} est déjà posé par le ` +
          `layer « ${known.node.name} », avec une stroke weight ou un alignement différents. Le ` +
          `contrat n'en garde qu'un par token et exporte celui de « ${known.node.name} » : la ` +
          `géométrie de ce layer manquera au développeur. Réglez les deux strokes de la même ` +
          `façon, ou reliez-les à deux variables différentes, puis réexportez.`,
      );
      continue;
    }

    const known = seenPaints.get(binding.token);
    if (known) {
      if (known.role !== role) {
        warnings.push(
            `Layer « ${binding.node.name} » : la couleur ${toRef(binding.token)} peint ici le rôle ` +
            `« ${role} », mais le layer « ${known.node.name} » lui donne déjà le rôle ` +
            `« ${known.role} ». Le contrat garde le premier rôle et ne représente pas le second. ` +
            `Reliez ces usages à deux variables distinctes, puis ` +
            `réexportez.`,
        );
      }
      if (binding.node.id) {
        const color = paints.find((candidate) => candidate.token === binding.token);
        if (color && !color.nodeIds?.includes(binding.node.id)) {
          color.nodeIds = [...(color.nodeIds ?? []), binding.node.id];
        }
      }
      continue;
    }
    seenPaints.set(binding.token, { node: binding.node, role });
    paints.push({
      token: binding.token,
      role,
      ...(binding.node.id ? { nodeIds: [binding.node.id] } : {}),
    });
  }

  return { paints, strokes };
}
