/**
 * Lecture commune des liaisons portées par les nodes Figma.
 *
 * Un champ composé n'est exporté que si une représentation complète converge
 * vers un token. Le parcours des nodes rendables vit séparément dans
 * `exportableNodes.ts`.
 */
import { firstVariableAlias, toRef } from '../variables';
import type { TokenResolver } from '../variables';
import { containerSizing, fixedDimensions, sizeBoundFields } from './flexLayout';
import type { ContainerSizing, SizeBounds, SlotSize } from './types';

/** Une liste d'alternatives ; tous les champs d'une alternative sont requis. */
export type FieldAlternatives = ReadonlyArray<ReadonlyArray<string>>;

/**
 * Représentations techniques des dimensions dans l'API Figma.
 * Centralisées ici pour que layout, tailles et strokes exigent exactement la
 * même complétude, sans vocabulaire propre à un composant.
 */
export const BINDING_PATTERNS = {
  gap: [['itemSpacing']],
  paddingX: [['paddingLeft', 'paddingRight']],
  paddingY: [['paddingTop', 'paddingBottom']],
  radius: [
    ['cornerRadius'],
    ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'],
  ],
  // Un carré, pour une icône : les deux côtés doivent citer la MÊME variable.
  slotSize: [['width', 'height']],
  // Les deux côtés lus séparément : une largeur figée et une hauteur qui hug
  // est un réglage courant, qu'un groupe conjoint refuserait. Ils servent aux
  // slots comme au composant lui-même — la dimension d'un axe se lit de la même
  // façon quel que soit le calque qui la porte.
  width: [['width']],
  height: [['height']],
  // Les quatre bornes, lues chacune pour elle-même : Figma laisse poser un
  // `max width` sans `min width`, et exiger la paire refuserait le réglage le
  // plus courant.
  minWidth: [['minWidth']],
  maxWidth: [['maxWidth']],
  minHeight: [['minHeight']],
  maxHeight: [['maxHeight']],
  fontSize: [['fontSize']],
  strokeWidth: [
    ['strokeWeight'],
    ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'],
  ],
} as const satisfies Record<string, FieldAlternatives>;

/**
 * Libellé Figma de chaque propriété citée dans un avertissement.
 *
 * Ce sont les intitulés que Figma affiche, repris tels quels : un designer doit
 * pouvoir chercher dans son écran le mot que le message emploie. Les champs de
 * l'API qui n'apparaissent nulle part dans le panneau (`paddingLeft`,
 * `strokeTopWeight`) sont rendus par ce que ce panneau montre à leur place.
 */
const FIELD_LABELS: Record<string, string> = {
  itemSpacing: 'gap',
  paddingLeft: 'left padding',
  paddingRight: 'right padding',
  paddingTop: 'top padding',
  paddingBottom: 'bottom padding',
  cornerRadius: 'corner radius',
  topLeftRadius: 'top left corner radius',
  topRightRadius: 'top right corner radius',
  bottomLeftRadius: 'bottom left corner radius',
  bottomRightRadius: 'bottom right corner radius',
  width: 'width',
  height: 'height',
  minWidth: 'min width',
  maxWidth: 'max width',
  minHeight: 'min height',
  maxHeight: 'max height',
  strokeWeight: 'stroke weight',
  strokeTopWeight: 'top stroke weight',
  strokeRightWeight: 'right stroke weight',
  strokeBottomWeight: 'bottom stroke weight',
  strokeLeftWeight: 'left stroke weight',
  fontSize: 'font size',
  fills: 'fill',
  strokes: 'stroke',
};

/**
 * Valeurs Figma qui n'ont aucun effet visuel et que le contrat sait déjà
 * représenter par l'absence du champ. Elles ne demandent donc pas de token.
 *
 * La table est volontairement portée par les propriétés de l'API, et non par
 * les libellés d'export (`gap`, `padding.x`...) : tous les appelants de
 * `resolveTokenName` profitent de la même règle. Une propriété absente n'est
 * pas assimilée à sa valeur par défaut : Figma doit l'avoir effectivement
 * fournie.
 */
const IMPLICIT_DEFAULTS: Readonly<Record<string, number>> = {
  itemSpacing: 0,
  paddingLeft: 0,
  paddingRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  cornerRadius: 0,
  topLeftRadius: 0,
  topRightRadius: 0,
  bottomLeftRadius: 0,
  bottomRightRadius: 0,
};

/**
 * Champs qui n'existent QUE sous un auto-layout. Sans lui, Figma ne les
 * applique pas : leur absence du contrat ne vaut pas zéro, elle veut dire que
 * la question ne se pose pas. Les distinguer des valeurs neutres ci-dessus est
 * ce qui permet à un consommateur d'interpréter une absence.
 */
const AUTO_LAYOUT_FIELDS: ReadonlySet<string> = new Set([
  'itemSpacing',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
]);

/** Raison pour laquelle Figma ne peut pas porter une valeur contractuelle. */
type InapplicableReason = 'no-auto-layout' | 'space-between' | 'grid';

/** Vrai si le node dispose réellement ses enfants (auto-layout ou grille). */
function distributesChildren(node: SceneNode): boolean {
  const mode = (node as unknown as Record<string, unknown>).layoutMode;
  return typeof mode === 'string' && mode !== 'NONE';
}

/**
 * Vrai pour l'auto layout en grille. Figma y espace les enfants par le gap des
 * lignes et des colonnes (`gridRowGap`, `gridColumnGap`) : `itemSpacing` reste
 * lisible mais n'a plus aucun effet, exactement comme sous un espacement
 * « Auto ». Une liaison qui y survit exporterait un écart que le rendu n'a pas.
 */
function distributesAsGrid(node: SceneNode): boolean {
  return (node as unknown as Record<string, unknown>).layoutMode === 'GRID';
}

/**
 * Vrai si Figma répartit l'espace lui-même. `itemSpacing` est alors ignoré :
 * l'exporter ferait affirmer au contrat un écart fixe que le rendu n'a pas, et
 * conseiller de le relier à une variable n'y changerait rien.
 */
function distributesBySpaceBetween(node: SceneNode): boolean {
  const alignment = (node as unknown as Record<string, unknown>).primaryAxisAlignItems;
  return alignment === 'SPACE_BETWEEN';
}

/**
 * Dit si Figma peut porter cette dimension sur ce node, avant même de regarder
 * les liaisons. Une liaison survit à la désactivation de l'auto-layout : sans
 * ce contrôle en tête, un `itemSpacing` resté lié exporterait un gap sans
 * aucun effet visuel.
 */
function inapplicableReason(
  node: SceneNode,
  alternatives: FieldAlternatives,
): InapplicableReason | null {
  const fields = alternatives.flat();
  if (!fields.some((field) => AUTO_LAYOUT_FIELDS.has(field))) return null;
  if (!distributesChildren(node)) return 'no-auto-layout';
  if (fields.includes('itemSpacing')) {
    if (distributesAsGrid(node)) return 'grid';
    if (distributesBySpaceBetween(node)) return 'space-between';
  }
  return null;
}

/** Nom lisible d'une propriété Figma, ou le champ brut s'il n'en a pas. */
export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/**
 * Liaison de variable d'un champ (ex. `fills`, `itemSpacing`).
 * `boundVariables` n'est pas typé champ par champ dans l'API, d'où le
 * passage par un Record générique.
 */
export function getBinding(node: SceneNode, field: string): unknown {
  const bindings = node.boundVariables as unknown as Record<string, unknown> | undefined;
  return bindings?.[field];
}

/**
 * Vrai si une représentation entière porte uniquement ses valeurs neutres
 * par défaut. Le champ reste absent du contrat, mais ne produit pas un
 * avertissement demandant un token qui ne changerait pas le rendu.
 */
function hasImplicitDefaultValue(node: SceneNode, alternatives: FieldAlternatives): boolean {
  const values = node as unknown as Record<string, unknown>;
  return alternatives.some((fields) =>
    fields.every((field) => field in IMPLICIT_DEFAULTS && values[field] === IMPLICIT_DEFAULTS[field]),
  );
}

/**
 * Vrai lorsqu'au moins une représentation technique d'une dimension est
 * entièrement liée. La détection du porteur de layout utilise ainsi
 * exactement les mêmes groupes que l'extraction : quatre coins liés comptent
 * comme un radius, tandis qu'un padding gauche isolé ne prétend pas décrire X.
 */
export function hasCompleteBinding(
  node: SceneNode,
  alternatives: FieldAlternatives,
): boolean {
  // Une liaison que Figma n'applique pas ne fait pas de ce node un porteur de
  // layout : l'élection et l'extraction doivent voir la même chose, sinon le
  // node élu n'exporte rien.
  if (inapplicableReason(node, alternatives)) return false;
  return alternatives.some((fields) =>
    fields.every((field) => Boolean(firstVariableAlias(getBinding(node, field)))),
  );
}

type AlternativeResolution = {
  fields: ReadonlyArray<string>;
  aliases: Array<VariableAlias | null>;
  tokens: Array<string | null>;
};

/**
 * Résout une valeur Figma qui peut avoir plusieurs représentations.
 *
 * Le tableau extérieur décrit des alternatives (`cornerRadius` OU quatre
 * coins) ; chaque tableau intérieur est une conjonction (gauche ET droite).
 * Une représentation partielle ou asymétrique vaut `null` : conserver le
 * premier token ferait affirmer au contrat une valeur que Figma ne prouve pas.
 */
export async function resolveTokenName(
  node: SceneNode,
  alternatives: FieldAlternatives,
  label: string,
  resolver: TokenResolver,
  warnings: string[],
): Promise<string | null> {
  // Avant toute liaison : Figma applique-t-il seulement cette dimension ici ?
  const inapplicable = inapplicableReason(node, alternatives);
  if (inapplicable === 'no-auto-layout') {
    // Volontairement sans `label` : les trois appels (gap, padding X, padding Y)
    // produisent le même texte et la déduplication n'en garde qu'un. Le geste à
    // faire est le même pour les trois.
    warnings.push(
      `Layer « ${node.name} » : ce layer n'utilise pas d'auto layout. Son gap et ses ` +
        `paddings n'existent pas dans Figma et restent absents du contrat — leur absence ` +
        `ne veut donc pas dire zéro. Appliquez un auto layout au layer si son espacement ` +
        `doit être contractuel, puis réexportez.`,
    );
    return null;
  }
  if (inapplicable === 'grid') {
    warnings.push(
      `Layer « ${node.name} » : son auto layout est une grille. Figma y règle l'espacement par ` +
        `le gap des lignes et des colonnes, que le contrat ne lit pas : aucun gap n'est exporté ` +
        `pour ce layer, et son absence ne veut donc pas dire zéro. Passez ce layer en auto ` +
        `layout horizontal ou vertical si son espacement doit être contractuel, puis réexportez.`,
    );
    return null;
  }
  if (inapplicable === 'space-between') {
    // La répartition est désormais publiée par `structure.justifyContent`.
    // `itemSpacing` reste inapplicable : son éventuelle liaison ne doit ni
    // élire ce node comme porteur de dimensions, ni produire un gap fixe.
    return null;
  }

  const resolved: AlternativeResolution[] = await Promise.all(
    alternatives.map(async (fields) => {
      const aliases = fields.map((field) => firstVariableAlias(getBinding(node, field)));
      const tokens = await Promise.all(
        aliases.map((alias, index) =>
          resolver.resolve(alias, {
            nodeName: node.name,
            field: `${label} — ${fieldLabel(fields[index])}`,
          }),
        ),
      );
      return { fields, aliases, tokens };
    }),
  );

  const complete = resolved.filter(
    (entry) => entry.aliases.every(Boolean) && entry.tokens.every(Boolean),
  );
  if (complete.length > 0) {
    const tokensByAlternative = complete.map((entry) =>
      Array.from(new Set(entry.tokens.filter((token): token is string => Boolean(token)))),
    );
    const asymmetric = tokensByAlternative.find((tokens) => tokens.length > 1);
    if (asymmetric) {
      warnings.push(
        `Layer « ${node.name} » — ${label} : les côtés ne sont pas reliés à la même ` +
          `variable (${asymmetric.join(', ')}). Rien n'est exporté pour cette valeur. ` +
          `Reliez-les toutes à la même variable, puis réexportez.`,
      );
      return null;
    }

    const candidates = Array.from(new Set(tokensByAlternative.flat()));
    if (candidates.length > 1) {
      warnings.push(
        `Layer « ${node.name} » — ${label} : deux réglages Figma se contredisent ` +
          `(${candidates.join(', ')}). Rien n'est exporté pour cette valeur. Ne définissez ` +
          `cette valeur que d'une seule façon, puis réexportez.`,
      );
      return null;
    }
    return candidates[0] ?? null;
  }

  const withBindings = resolved.filter((entry) => entry.aliases.some(Boolean));
  if (withBindings.length === 0) {
    if (hasImplicitDefaultValue(node, alternatives)) return null;
    warnings.push(
      `Layer « ${node.name} » — ${label} : aucune variable Figma n'est reliée. La valeur ` +
        `fixe n'est pas exportée. Reliez-la à une variable, puis réexportez.`,
    );
    return null;
  }

  // Le groupe le plus renseigné donne le diagnostic le plus utile au designer.
  const best = [...withBindings].sort((left, right) => {
    const score = (entry: AlternativeResolution) =>
      entry.tokens.filter(Boolean).length * 2 + entry.aliases.filter(Boolean).length;
    return score(right) - score(left);
  })[0];
  const missing = best.fields.filter((_, index) => !best.aliases[index]);
  const unresolved = best.fields.filter(
    (_, index) => Boolean(best.aliases[index]) && !best.tokens[index],
  );
  const details = [
    missing.length > 0
      ? `sans variable : ${missing.map(fieldLabel).join(', ')}`
      : null,
    unresolved.length > 0
      ? `variable introuvable : ${unresolved.map(fieldLabel).join(', ')}`
      : null,
  ].filter((detail): detail is string => Boolean(detail));

  warnings.push(
    `Layer « ${node.name} » — ${label} : la définition est incomplète ` +
      `(${details.join(' ; ')}). Rien n'est exporté pour cette valeur. Reliez les ` +
      `variables manquantes, puis réexportez.`,
  );
  return null;
}

/** Résout un groupe complet et l'enrobe en référence de contrat. */
export async function resolveField(
  node: SceneNode,
  alternatives: FieldAlternatives,
  label: string,
  resolver: TokenResolver,
  warnings: string[],
): Promise<string | null> {
  const token = await resolveTokenName(node, alternatives, label, resolver, warnings);
  return token ? toRef(token) : null;
}

/**
 * Dimension figée d'un slot, relevée axe par axe.
 *
 * Le menu de dimensionnement décide de ce qu'on lit : un axe en `Hug` ou en
 * `Fill` est déjà décrit ailleurs et ne demande aucune variable — le lui
 * réclamer produirait un avertissement pour une valeur que le contrat n'a pas
 * à porter. Un axe figé, en revanche, doit citer une variable : sans elle, la
 * dimension disparaîtrait en silence et l'absence ne voudrait plus rien dire.
 *
 * Un carré garde la forme courte : c'est la même valeur, et l'objet
 * n'apprendrait rien de plus au consommateur.
 */
export async function resolveSlotSize(
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
): Promise<SlotSize | null> {
  const fixed = fixedDimensions(node);
  const [width, height] = await Promise.all([
    fixed.width
      ? resolveField(node, BINDING_PATTERNS.width, 'width', resolver, warnings)
      : null,
    fixed.height
      ? resolveField(node, BINDING_PATTERNS.height, 'height', resolver, warnings)
      : null,
  ]);

  if (!width && !height) return null;
  if (width && width === height) return width;
  return {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
}

/**
 * Bornes de taille d'un node, chacune tokenisée ou avertie.
 *
 * Une borne n'est pas une taille : elle survit au menu de dimensionnement et
 * s'applique aussi bien à un axe en `Fill` qu'à un axe figé. Elle est donc lue
 * inconditionnellement, là où `resolveSlotSize` ne lit que ce que le menu tient
 * en `Fixed`.
 *
 * Le silence, en revanche, suit la même règle que partout : une borne écrite à
 * la main est une mesure de maquette, une borne reliée à une variable est une
 * décision du design system. La première avertit — le geste demandé est de
 * relier la variable, non de retirer la borne : elle appartient au design, et
 * c'est au contrat de savoir la porter.
 */
export async function resolveSizeBounds(
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
): Promise<SizeBounds | null> {
  const fields = sizeBoundFields(node);
  if (fields.length === 0) return null;

  const bound = fields.filter((field) => Boolean(firstVariableAlias(getBinding(node, field))));
  const unbound = fields.filter((field) => !bound.includes(field));
  if (unbound.length > 0) {
    warnings.push(
      `Layer « ${node.name} » : il fixe ${unbound.map(fieldLabel).join(', ')} sans variable ` +
        `Figma. Le contrat ne publie que les bornes reliées à une variable — un nombre écrit à ` +
        `la main est une mesure de maquette, pas une décision du design system — et le ` +
        `développeur rendra donc ce layer sans elles. Reliez ces bornes à une variable, puis ` +
        `réexportez.`,
    );
  }

  const references = await Promise.all(
    bound.map((field) =>
      resolveField(node, BINDING_PATTERNS[field], fieldLabel(field), resolver, warnings)),
  );
  const bounds: SizeBounds = {};
  bound.forEach((field, index) => {
    const reference = references[index];
    if (reference) bounds[field] = reference;
  });
  return Object.keys(bounds).length > 0 ? bounds : null;
}

/**
 * Token d'un axe du composant, relevé seulement là où Figma en porte un.
 *
 * La différence avec un slot tient au silence : un axe figé que le designer n'a
 * relié à aucune variable est une taille de maquette assumée, décrite par le
 * `stretch` de `containerSizing`, et rien ne manque au contrat. Réclamer une
 * variable ici avertirait sur presque tous les component sets, dont le cadre
 * fixe est la norme. Une liaison présente mais irrésolue avertit en revanche
 * par `resolveField` : le designer a bien désigné une variable, et le contrat
 * n'a pas su la nommer.
 */
async function resolveComponentAxis(
  node: SceneNode,
  field: 'width' | 'height',
  isFixed: boolean,
  resolver: TokenResolver,
  warnings: string[],
): Promise<string | null> {
  if (!isFixed) return null;
  if (!firstVariableAlias(getBinding(node, field))) return null;
  return resolveField(node, BINDING_PATTERNS[field], field, resolver, warnings);
}

/**
 * Dimensionnement du composant, où un token l'emporte sur le menu.
 *
 * `containerSizing` lit le menu seul et ramène toute dimension figée à
 * `stretch`, faute de pouvoir distinguer une taille de maquette d'une décision
 * de design. La liaison de variable est ce qui les sépare — le même signal que
 * pour un gap, un padding ou la taille d'un slot : un nombre brut n'est jamais
 * contractuel, une variable liée l'est toujours. Un axe figé qui cite une
 * variable publie donc sa référence, et le composant porte enfin la taille que
 * le design system lui donne, quel que soit le conteneur qui l'accueillera.
 */
export async function resolveContainerSizing(
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
): Promise<ContainerSizing> {
  const menu = containerSizing(node);
  const fixed = fixedDimensions(node);
  const [width, height] = await Promise.all([
    resolveComponentAxis(node, 'width', fixed.width, resolver, warnings),
    resolveComponentAxis(node, 'height', fixed.height, resolver, warnings),
  ]);
  return { width: width ?? menu.width, height: height ?? menu.height };
}
