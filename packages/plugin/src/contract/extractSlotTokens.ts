/**
 * Relevé des peintures et contours liés dans le sous-arbre d'un variant.
 *
 * Ce module dit QUELLES couleurs un variant porte et COMMENT chacune se peint.
 * Il ne décide pas de leur clé dans la feuille : `colorKeys.ts` en est l'unique
 * autorité, et la décide sur toute la matrice — une clé lue variant par variant
 * changerait d'un état à l'autre.
 */
import { toRef } from '@ucm-kit/core/format';
import { variableAliases } from '../variables';
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
import { paintSiteRole, roleKind } from './semantics';
import { isIconLayer } from './slotNames';
import type { StrokeAlignment, StrokeWidth } from '@ucm-kit/core/format';
export type { TokenResolver } from '../variables';

const BOUND_FIELDS = ['fills', 'strokes'] as const;

/**
 * Une couleur liée d'un variant, telle que Figma la porte.
 *
 * Aucun `SceneNode` n'en fait partie : seuls ses identifiants internes peuvent
 * franchir la frontière afin d'être convertis ensuite en chemins publics. Cela
 * évite aussi d'exposer au relevé des références les cycles
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
  warnings.push(`Layer « ${node.name} » : l’alignement du stroke est illisible. Le contrat ne dira pas s’il est inside, center ou outside. Vérifiez ce réglage dans Figma, puis réexportez.`);
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
 * Une comparaison d'identité suffit pour une largeur en chaîne. Détaillée par
 * bord, elle produit un objet neuf à chaque lecture : deux calques réglés
 * exactement pareil déclencheraient un avertissement qu'AUCUN geste du designer
 * ne ferait disparaître.
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
 * **Le site tranche la nature, le nom précise à l'intérieur de cette nature.**
 * Ce que la couleur peint se lit sur le calque qui la porte : un fill peint un
 * fill, un stroke peint un contour, et aucun nom de token ne peut dire le
 * contraire — un `…/foreground` posé en contour peint un contour, et le moteur
 * n'a pas à décider que le design system s'est trompé de mot.
 *
 * Un dernier segment qui NOMME un rôle partagé reste une déclaration du
 * designer, mais seulement là où elle ajoute quelque chose : entre deux rôles
 * de MÊME nature. C'est le seul moyen de distinguer un `ring` d'un `border`, et
 * c'est ce qui fait qu'un `…/ring` publié sous une clé allongée conserve son
 * `outline-*` et son `fallback: box-shadow`.
 *
 * Le rôle obtenu se publie ensuite dans `rendering.keyRoles`, du côté de
 * l'arbre où la clé vit : c'est là, et non dans le vocabulaire partagé, qu'une
 * clé nommée `foreground` peut annoncer qu'elle se rend en contour.
 */
function colorRole(
  token: string,
  site: { isStroke: boolean; isText: boolean; isIconTarget: boolean },
): string {
  const base = tokenKey(token);
  const observe = paintSiteRole(site);
  return roleKind(base) === roleKind(observe) ? base : observe;
}

/**
 * Vrai si cette peinture met réellement de l'encre sur le calque.
 *
 * Les réserves sont ce qui distingue un diagnostic d'un rapport qu'on cesse de
 * lire, et elles valent dans les DEUX sens : un paint masqué ou d'opacité nulle
 * ne réclame aucune variable, et la couleur qu'il porterait n'appartient à aucun
 * calque du contrat. Une peinture non SOLID n'est de toute façon liable à
 * aucune variable de couleur — `unsupportedProperties` la signale ailleurs, et
 * le geste demandé ici n'existerait pas.
 */
function peint(paint: unknown): paint is SolidPaint {
  return Boolean(
    paint
      && typeof paint === 'object'
      && (paint as Paint).type === 'SOLID'
      && (paint as Paint).visible !== false
      && ((paint as SolidPaint).opacity ?? 1) > 0,
  );
}

/** La variable qu'une peinture porte elle-même, ou `null`. */
function aliasDuPaint(paint: unknown): VariableAlias | null {
  const bound = (paint as { boundVariables?: { color?: unknown } } | null)?.boundVariables?.color;
  return variableAliases(bound)[0] ?? null;
}

/**
 * Ce qu'un champ de peintures apporte au contrat : les variables à relever, et
 * le nombre de peintures qu'aucune ne tient.
 *
 * Les deux réponses sortent de la MÊME lecture, et c'est tout l'objet de cette
 * fonction. Un relevé qui lirait `node.boundVariables` pendant que
 * l'avertissement compte les paints laisserait un calque porter un fill visible
 * posé à la main ET un fill masqué relié : les deux comptes s'équilibreraient,
 * rien ne serait dit, et le contrat publierait la couleur de la peinture
 * MASQUÉE comme si elle peignait le calque. Deux lectures d'une même chose
 * finissent toujours par se contredire.
 *
 * La lecture exacte est celle de la peinture : chacune porte sa propre liaison
 * (`SolidPaint.boundVariables.color`), seule à associer une variable à un paint
 * précis. `node.boundVariables[field]` reste une liste que Figma n'aligne pas
 * sur `fills` — sa documentation ne le promet que pour `inferredVariables` — et
 * un index supposé accuserait le mauvais paint.
 *
 * Le repli rend exactement le comportement d'avant quand cette lecture ne peut
 * rien conclure : champ « mixed » ou absent, et surtout liste du node plus
 * riche que ce que les peintures déclarent. Ne perdre aucune couleur passe
 * avant gagner un diagnostic — c'est la seule chose qu'on ne s'autorise pas.
 */
function lirePeintures(
  node: SceneNode,
  field: (typeof BOUND_FIELDS)[number],
): { aliases: VariableAlias[]; libres: number } {
  const duNode = variableAliases(getBinding(node, field));
  const values = node as unknown as Record<string, unknown>;
  const liste = values[field];
  // `figma.mixed` ou champ absent : rien de lisible, donc rien à réclamer.
  if (!Array.isArray(liste)) return { aliases: duNode, libres: 0 };
  // Un contour d'épaisseur nulle ne trace rien. Ce qu'il PUBLIE ne change pas
  // pour autant : la réserve porte sur le geste demandé, pas sur le relevé.
  if (field === 'strokes' && values.strokeWeight === 0) return { aliases: duNode, libres: 0 };
  // Le node connaît une liaison qu'aucune peinture ne déclare : la lecture
  // exacte est incomplète, et seul le repli garantit qu'aucune ne se perd.
  if (liste.filter((paint) => aliasDuPaint(paint)).length < duNode.length) {
    return { aliases: duNode, libres: 0 };
  }

  const aliases: VariableAlias[] = [];
  let libres = 0;
  for (const paint of liste) {
    if (!peint(paint)) continue;
    const alias = aliasDuPaint(paint);
    if (alias) aliases.push(alias);
    else libres += 1;
  }
  return { aliases, libres };
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
function warnPeinturesLibres(
  node: SceneNode,
  field: (typeof BOUND_FIELDS)[number],
  libres: number,
  warnings: string[],
): void {
  if (libres === 0) return;
  const stroke = field === 'strokes';
  const plusieurs = libres > 1;
  const nom = `${stroke ? 'stroke' : 'fill'}${plusieurs ? 's' : ''}`;
  warnings.push(
    `Layer « ${node.name} » : ${plusieurs ? `${libres} ${nom} ne sont reliés` : `son ${nom} n’est relié`} `
      + `à aucune variable Figma. Le contrat ne publie que les couleurs liées, et le `
      + `développeur rendra donc ce layer sans ${stroke ? 'ce contour' : 'cette couleur'}. `
      + `Reliez ${plusieurs ? 'ces' : 'ce'} ${nom} à une variable, puis réexportez.`,
  );
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
    for (const field of BOUND_FIELDS) {
      const { aliases, libres } = lirePeintures(node, field);
      warnPeinturesLibres(node, field, libres, warnings);
      for (const alias of aliases) {
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
