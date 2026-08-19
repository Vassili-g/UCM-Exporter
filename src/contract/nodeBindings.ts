/**
 * Lecture commune des liaisons portées par les nodes Figma.
 *
 * Un champ composé n'est exporté que si une représentation complète converge
 * vers un token. Le parcours des nodes rendables vit séparément dans
 * `exportableNodes.ts`.
 */
import { firstVariableAlias, toRef } from '../variables';
import type { TokenResolver } from '../variables';
import {
  containerSizing,
  fixedDimensions,
  gridCellSizedAxes,
  gridHugAxes,
  sizeBoundFields,
} from './flexLayout';
import type { ContainerSizing, GridStructuralSize, SizeBounds, SlotSize } from './types';

/** Une liste d'alternatives ; tous les champs d'une alternative sont requis. */
export type FieldAlternatives = ReadonlyArray<ReadonlyArray<string>>;

/**
 * Représentations techniques des dimensions dans l'API Figma.
 * Centralisées ici pour que layout, tailles et strokes exigent exactement la
 * même complétude, sans vocabulaire propre à un composant.
 */
export const BINDING_PATTERNS = {
  gap: [['itemSpacing']],
  // L'espace entre les LIGNES d'un conteneur qui passe à la ligne. Figma scinde
  // alors son champ gap en deux, et n'applique celui-ci que sous `WRAP`.
  rowGap: [['counterAxisSpacing']],
  // Les deux gaps d'une grille. Figma les expose séparément d'`itemSpacing`,
  // qu'il ignore sous `GRID`, et tous deux se relient à une variable : une
  // grille tokenisée est donc aussi contractuelle qu'une rangée.
  gridRowGap: [['gridRowGap']],
  gridColumnGap: [['gridColumnGap']],
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
  counterAxisSpacing: 'vertical gap',
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
  counterAxisSpacing: 0,
  gridRowGap: 0,
  gridColumnGap: 0,
  paddingLeft: 0,
  paddingRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  cornerRadius: 0,
  topLeftRadius: 0,
  topRightRadius: 0,
  bottomLeftRadius: 0,
  bottomRightRadius: 0,
  strokeTopWeight: 0,
  strokeRightWeight: 0,
  strokeBottomWeight: 0,
  strokeLeftWeight: 0,
};

/**
 * Champs qui n'existent QUE sous un auto-layout. Sans lui, Figma ne les
 * applique pas : leur absence du contrat ne vaut pas zéro, elle veut dire que
 * la question ne se pose pas. Les distinguer des valeurs neutres ci-dessus est
 * ce qui permet à un consommateur d'interpréter une absence.
 */
const AUTO_LAYOUT_FIELDS: ReadonlySet<string> = new Set([
  'itemSpacing',
  'counterAxisSpacing',
  'gridRowGap',
  'gridColumnGap',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
]);

/** Raison pour laquelle Figma ne peut pas porter une valeur contractuelle. */
type InapplicableReason =
  | 'no-auto-layout'
  | 'space-between'
  | 'grid'
  | 'no-grid'
  | 'no-wrap'
  | 'rows-space-between';

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

/** Vrai si l'auto layout passe à la ligne. Sans wrap, il n'y a aucune ligne à espacer. */
function wrapsChildren(node: SceneNode): boolean {
  return (node as unknown as Record<string, unknown>).layoutWrap === 'WRAP';
}

/**
 * Vrai si Figma répartit les LIGNES lui-même. Le champ « vertical gap » affiche
 * alors « Auto » : `counterAxisSpacing` reste lisible sans aucun effet, comme
 * `itemSpacing` sous un espacement « Auto » de l'axe principal.
 */
function distributesRowsBySpaceBetween(node: SceneNode): boolean {
  return (node as unknown as Record<string, unknown>).counterAxisAlignContent === 'SPACE_BETWEEN';
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
  if (fields.includes('counterAxisSpacing')) {
    if (!wrapsChildren(node)) return 'no-wrap';
    if (distributesRowsBySpaceBetween(node)) return 'rows-space-between';
  }
  // Les gaps de grille n'existent que sous une grille. Une liaison qui survit
  // au passage en auto layout linéaire ne doit rien exporter, exactement comme
  // un `itemSpacing` resté lié sous une grille.
  if ((fields.includes('gridRowGap') || fields.includes('gridColumnGap'))
    && !distributesAsGrid(node)) {
    return 'no-grid';
  }
  return null;
}

/**
 * Vrai si Figma expose au moins un des champs de cette dimension sur ce node.
 *
 * Trois états, et non deux : la valeur neutre (`IMPLICIT_DEFAULTS`), la valeur
 * écrite à la main qui réclame sa variable, et la propriété qui N'EXISTE PAS
 * sur ce type de layer. Depuis que le contrat décrit les conteneurs à toute
 * profondeur, il rencontre le troisième cas — un GROUP n'a ni coins ni
 * padding — et lui réclamer une variable enverrait le designer chercher un
 * champ que son panneau ne montre pas.
 */
export function exposesAnyField(node: SceneNode, alternatives: FieldAlternatives): boolean {
  const values = node as unknown as Record<string, unknown>;
  return alternatives.some((fields) => fields.some((field) => values[field] !== undefined))
    || alternatives.some((fields) =>
      fields.some((field) => Boolean(firstVariableAlias(getBinding(node, field)))));
}

/**
 * Vrai si Figma expose un corner radius sur ce node.
 *
 * Un GROUP, une LINE ou un SLICE n'en ont pas : la propriété n'existe pas, elle
 * n'est donc ni absente ni écrite à la main. Depuis que le contrat décrit les
 * conteneurs à toute profondeur, il en rencontre ; leur réclamer une variable
 * enverrait le designer chercher un champ que son panneau ne montre pas.
 */
export function hasCornerRadiusProperty(node: SceneNode): boolean {
  return exposesAnyField(node, BINDING_PATTERNS.radius);
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

/**
 * Correspondance entre le champ Figma d'un côté et la clé que le contrat publie.
 *
 * Elle n'existe que pour les groupes dont chaque côté peut porter SA décision :
 * les deux paddings, les quatre coins, les quatre bords d'un contour. Les autres
 * groupes composés — `slotSize` en particulier, où les deux côtés d'un carré
 * doivent citer la même variable — n'en ont pas, et gardent l'exigence d'une
 * variable unique.
 *
 * Les clés publiées sont celles de CSS, dans l'ordre de CSS : un consommateur
 * écrit `border-radius: topLeft topRight bottomRight bottomLeft` sans réordonner.
 */
export const SIDE_KEYS = {
  paddingX: { paddingLeft: 'left', paddingRight: 'right' },
  paddingY: { paddingTop: 'top', paddingBottom: 'bottom' },
  radius: {
    topLeftRadius: 'topLeft',
    topRightRadius: 'topRight',
    bottomRightRadius: 'bottomRight',
    bottomLeftRadius: 'bottomLeft',
  },
  strokeWidth: {
    strokeTopWeight: 'top',
    strokeRightWeight: 'right',
    strokeBottomWeight: 'bottom',
    strokeLeftWeight: 'left',
  },
} as const;

/** Un groupe résolu : une valeur unique, ou le détail par côté. */
type GroupResolution<K extends string> = string | Partial<Record<K, string>> | null;

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
 * Une représentation partielle sans sémantique de côtés vaut `null`. Pour un
 * groupe latéral, seuls les côtés réellement résolus peuvent être publiés :
 * conserver le premier token pour les autres ferait
 * affirmer au contrat une valeur que Figma ne prouve pas.
 *
 * Des côtés complets mais reliés à des variables différentes valent `null` eux
 * aussi, SAUF pour les groupes qui savent les publier séparément — `sides` les
 * désigne. C'est la seule dérogation, et elle ne concerne pas les groupes dont
 * les champs ne sont pas des côtés.
 */
async function resolveGroup<K extends string>(
  node: SceneNode,
  alternatives: FieldAlternatives,
  label: string,
  resolver: TokenResolver,
  warnings: string[],
  // Fourni pour les seuls groupes dont chaque côté porte sa propre décision.
  // Sans lui, des côtés qui citent deux variables restent une contradiction.
  sides?: Readonly<Record<string, K>>,
): Promise<GroupResolution<K>> {
  // Avant toute liaison : Figma applique-t-il seulement cette dimension ici ?
  const inapplicable = inapplicableReason(node, alternatives);
  if (inapplicable === 'no-auto-layout') {
    // Volontairement sans `label` : les trois appels (gap, padding X, padding Y)
    // produisent le même texte et la déduplication n'en garde qu'un. Le geste à
    // faire est le même pour les trois.
    warnings.push(
      `Layer « ${node.name} » : ce layer n'utilise pas d'auto layout. Son gap et ses ` +
        `paddings n'existent pas dans Figma et restent absents du contrat. Leur absence ` +
        `ne veut donc pas dire zéro. Appliquez un auto layout au layer si son espacement ` +
        `doit être contractuel, puis réexportez.`,
    );
    return null;
  }
  if (inapplicable === 'grid') {
    // Figma ignore `itemSpacing` sous une grille : ses deux gaps propres sont
    // publiés à part (`columnGap`, `rowGap`), et il n'y a donc rien à signaler.
    return null;
  }
  if (inapplicable === 'no-grid') {
    // Symétrique : une liaison de gap de grille survit au passage en auto
    // layout linéaire, où Figma ne l'applique plus.
    return null;
  }
  if (inapplicable === 'no-wrap') {
    // Sans wrap, il n'y a pas de deuxième ligne : rien ne manque au contrat, et
    // une liaison qui survit au retrait du wrap ne doit rien exporter.
    return null;
  }
  if (inapplicable === 'rows-space-between') {
    warnings.push(
      `Layer « ${node.name} » : son vertical gap est réglé sur « Auto », donc Figma répartit ` +
        `lui-même l'espace entre ses lignes. Le contrat ne sait pas décrire cette répartition : ` +
        `aucun gap entre les lignes n'est exporté, et son absence ne veut donc pas dire zéro. ` +
        `Donnez une valeur reliée à une variable au vertical gap si cet espacement doit être ` +
        `contractuel, puis réexportez.`,
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
            field: `${label}, ${fieldLabel(fields[index])}`,
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
    const asymmetricIndex = tokensByAlternative.findIndex((tokens) => tokens.length > 1);
    if (asymmetricIndex !== -1) {
      const entry = complete[asymmetricIndex];
      // Chaque côté cite SA variable. Le design system les nomme déjà
      // séparément : le contrat publie le détail au lieu de tout perdre.
      // Deux représentations complètes à la fois restent une contradiction —
      // `cornerRadius` ET quatre coins ne se départagent pas.
      const publiable = sides && complete.length === 1
        && entry.fields.every((field) => sides[field] !== undefined);
      if (publiable) {
        const detail = {} as Record<K, string>;
        entry.fields.forEach((field, index) => {
          detail[sides[field]] = entry.tokens[index] as string;
        });
        return detail;
      }
      warnings.push(
        `Layer « ${node.name} », ${label} : les côtés ne sont pas reliés à la même ` +
          `variable (${tokensByAlternative[asymmetricIndex].join(', ')}). Rien n'est exporté ` +
          `pour cette valeur. Reliez-les toutes à la même variable, puis réexportez.`,
      );
      return null;
    }

    const candidates = Array.from(new Set(tokensByAlternative.flat()));
    if (candidates.length > 1) {
      warnings.push(
        `Layer « ${node.name} », ${label} : deux réglages Figma se contredisent ` +
          `(${candidates.join(', ')}). Rien n'est exporté pour cette valeur. Ne définissez ` +
          `cette valeur que d'une seule façon, puis réexportez.`,
      );
      return null;
    }
    return candidates[0] ?? null;
  }

  // Une valeur réglable côté par côté peut être volontairement clairsemée :
  // deux coins arrondis et deux coins à zéro, ou un seul bord visible. Les
  // côtés neutres n'ont rien à tokeniser ; les côtés liés restent publiables.
  if (sides) {
    const sided = resolved.find((entry) => (
      entry.fields.every((field) => sides[field] !== undefined)
      && entry.aliases.some(Boolean)
    ));
    if (sided) {
      const detail: Partial<Record<K, string>> = {};
      const missing: string[] = [];
      const unresolved: string[] = [];
      const values = node as unknown as Record<string, unknown>;
      sided.fields.forEach((field, index) => {
        const alias = sided.aliases[index];
        const token = sided.tokens[index];
        if (alias && token) {
          detail[sides[field]] = token;
          return;
        }
        if (alias) {
          unresolved.push(field);
          return;
        }
        if (values[field] !== IMPLICIT_DEFAULTS[field]) missing.push(field);
      });
      const details = [
        missing.length > 0 ? `sans variable : ${missing.map(fieldLabel).join(', ')}` : null,
        unresolved.length > 0
          ? `variable introuvable : ${unresolved.map(fieldLabel).join(', ')}`
          : null,
      ].filter((value): value is string => Boolean(value));
      if (details.length > 0) {
        warnings.push(
          `Layer « ${node.name} », ${label} : les côtés tokenisés sont exportés, mais la `
            + `définition reste partielle (${details.join(' ; ')}). Reliez les valeurs non `
            + `neutres manquantes à des variables, puis réexportez.`,
        );
      }
      if (Object.keys(detail).length > 0) return detail;
    }
  }

  const withBindings = resolved.filter((entry) => entry.aliases.some(Boolean));
  if (withBindings.length === 0) {
    if (hasImplicitDefaultValue(node, alternatives)) return null;
    warnings.push(
      `Layer « ${node.name} », ${label} : aucune variable Figma n'est reliée. La valeur ` +
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
    `Layer « ${node.name} », ${label} : la définition est incomplète ` +
      `(${details.join(' ; ')}). Rien n'est exporté pour cette valeur. Reliez les ` +
      `variables manquantes, puis réexportez.`,
  );
  return null;
}

/**
 * Résout un groupe dont TOUS les côtés doivent citer la même variable.
 *
 * C'est le cas de `slotSize` : un carré dont les deux axes citeraient deux
 * variables n'est plus un carré, et le contrat le dit plutôt que d'inventer.
 */
export async function resolveTokenName(
  node: SceneNode,
  alternatives: FieldAlternatives,
  label: string,
  resolver: TokenResolver,
  warnings: string[],
): Promise<string | null> {
  return resolveGroup(node, alternatives, label, resolver, warnings) as Promise<string | null>;
}

/**
 * Résout un groupe dont chaque côté peut porter SA décision : une valeur unique
 * quand tous citent la même variable, le détail par côté sinon.
 *
 * Un groupe par côté peut être clairsemé : les côtés liés sont publiés, les
 * côtés à zéro restent absents, et les valeurs fixes non neutres avertissent.
 * `hasCompleteBinding` demeure volontairement plus strict pour l'élection du
 * node de layout : une valeur partielle se décrit sur un calque déjà publié,
 * mais ne suffit pas à en faire le wrapper de dimensions.
 */
export async function resolveSidedTokenNames<K extends string>(
  node: SceneNode,
  alternatives: FieldAlternatives,
  sides: Readonly<Record<string, K>>,
  label: string,
  resolver: TokenResolver,
  warnings: string[],
): Promise<GroupResolution<K>> {
  return resolveGroup(node, alternatives, label, resolver, warnings, sides);
}

/** Enrobe en référence de contrat une valeur unique ou détaillée par côté. */
export function toSidedRef<K extends string>(
  resolved: GroupResolution<K>,
): string | Partial<Record<K, string>> | null {
  if (resolved === null) return null;
  if (typeof resolved === 'string') return toRef(resolved);
  const refs: Partial<Record<K, string>> = {};
  for (const [side, token] of Object.entries(resolved) as Array<[K, string]>) {
    refs[side] = toRef(token);
  }
  return refs;
}

/** `resolveField`, pour un groupe dont les côtés peuvent différer. */
export async function resolveSidedField<K extends string>(
  node: SceneNode,
  alternatives: FieldAlternatives,
  sides: Readonly<Record<string, K>>,
  label: string,
  resolver: TokenResolver,
  warnings: string[],
): Promise<string | Partial<Record<K, string>> | null> {
  return toSidedRef(
    await resolveSidedTokenNames(node, alternatives, sides, label, resolver, warnings),
  );
}

/**
 * Intitulé du gap principal, tel que le panneau Figma l'affiche.
 *
 * Sous le wrap, Figma scinde son champ gap en deux — « horizontal gap » et
 * « vertical gap ». Un message qui dirait « gap » enverrait alors le designer
 * chercher un champ que son écran ne montre plus.
 */
export function gapLabel(node: SceneNode): string {
  return wrapsChildren(node) ? 'horizontal gap' : 'gap';
}

/**
 * Gap entre les LIGNES d'un conteneur qui passe à la ligne.
 *
 * Figma laisse ce champ synchronisé sur le gap principal, et son API ne dit pas
 * qu'il l'est : `counterAxisSpacing` ne renvoie jamais `null`, il renvoie la
 * valeur d'`itemSpacing` sans porter de liaison propre. Réclamer une variable
 * dans ce cas avertirait TOUS les conteneurs correctement tokenisés, dont le
 * gap unique décrit déjà les deux axes — et c'est aussi ce que dit le contrat :
 * sous `wrap`, un `rowGap` absent vaut le `gap`.
 *
 * Le contrat ne publie donc ce champ que sur une liaison PROPRE, et n'avertit
 * que lorsque la valeur diffère du gap principal : là, le designer a bien
 * dissocié ses deux espacements, et l'un des deux est écrit à la main.
 */
export async function resolveRowGap(
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
): Promise<string | null> {
  const values = node as unknown as Record<string, unknown>;
  const synchronise = !firstVariableAlias(getBinding(node, 'counterAxisSpacing'))
    && values.counterAxisSpacing === values.itemSpacing;
  if (synchronise) return null;
  return resolveField(node, BINDING_PATTERNS.rowGap, 'vertical gap', resolver, warnings);
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
  // La cellule d'une grille décide de la boîte de son enfant : le parent est
  // donc nécessaire pour savoir ce que ce calque possède vraiment.
  parent?: SceneNode,
): Promise<SlotSize | null> {
  const fixed = fixedDimensions(node);
  const cellule = parent ? gridCellSizedAxes(parent, node) : { width: false, height: false };
  const axe = (field: 'width' | 'height'): Promise<string | null> | null => {
    if (!fixed[field]) return null;
    // Sur un axe que la cellule décide, une dimension citant une variable reste
    // publiée — c'est une décision que le calque porte malgré la cellule — mais
    // son absence ne se réclame pas : la piste et l'étendue disent déjà la place.
    if (cellule[field]) return resolveBoundAxis(node, field, resolver, warnings);
    return resolveField(node, BINDING_PATTERNS[field], field, resolver, warnings);
  };
  const [width, height] = await Promise.all([axe('width'), axe('height')]);

  if (!width && !height) return null;
  if (width && width === height) return width;
  return {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
}

/**
 * Mesure qu'un enfant donne à une piste de grille qui hug.
 *
 * `size` reste strictement tokenisé : une variable liée y publie son token, et
 * cette fonction ne dit rien. Elle ne parle que là où le contrat n'a RIEN à
 * publier et où la piste retomberait à zéro — la cellule d'une piste `HUG`,
 * qu'aucune valeur ne décrit puisque `GridTrackSize.value` n'existe pas sur ce
 * type. La grille est déjà l'endroit où le contrat accepte un pixel structurel
 * pour une piste `FIXED` ; c'est la même exception, un cran plus bas.
 *
 * Aucun geste n'est demandé au designer : ces enfants sont en `Fill` dans le
 * panneau, et Figma n'expose pas ce remplissage sous une piste qui hug. Le
 * message part donc dans `infos`, et il nomme la GRILLE plutôt que chaque
 * enfant — douze tuiles produiraient douze fois le même constat, que le
 * dédoublonnage de l'export ramène à un seul.
 */
export function gridStructuralSize(
  node: SceneNode,
  parent: SceneNode | undefined,
  infos: string[],
): GridStructuralSize | null {
  if (!parent) return null;
  const hug = gridHugAxes(parent, node);
  if (!hug.width && !hug.height) return null;

  const fixed = fixedDimensions(node);
  const values = node as unknown as Record<string, unknown>;
  const mesure = (field: 'width' | 'height'): `${number}px` | null => {
    if (!hug[field] || !fixed[field]) return null;
    // Une variable liée décrit le design system et l'emporte : `resolveSlotSize`
    // la publie dans `size`, et publier ici la même dimension en pixels ferait
    // porter deux vérités au même axe.
    if (firstVariableAlias(getBinding(node, field))) return null;
    const value = values[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
    // Deux décimales : la mesure vient d'un calcul de Figma, et publier ses
    // dix-sept chiffres ferait bouger l'artefact d'un export à l'autre.
    return `${Math.round(value * 100) / 100}px`;
  };

  const width = mesure('width');
  const height = mesure('height');
  if (!width && !height) return null;

  const axes = [width ? 'colonnes' : null, height ? 'lignes' : null].filter(Boolean).join(' et ');
  infos.push(
    `Layer « ${parent.name} » : les enfants de ses ${axes} qui hug publient leur taille en `
      + `pixels, exception propre aux grilles. Figma n'expose pas leur remplissage sous une `
      + `piste qui hug et n'en rend que la taille résolue. Ces valeurs décrivent sa structure `
      + `Figma sans devenir des tokens ; aucune modification du design n'est demandée.`,
  );
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
        `Figma. Le contrat ne publie que les bornes reliées à une variable. Un nombre écrit à ` +
        `la main est une mesure de maquette, pas une décision du design system. Le ` +
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
 * Token d'un axe dont la dimension figée est déjà expliquée par ailleurs.
 *
 * Deux calques sont dans ce cas, pour la même raison. Le composant : un axe figé
 * sans variable est une taille de maquette assumée, décrite par le `stretch` de
 * `containerSizing`, et réclamer une variable avertirait sur presque tous les
 * component sets. Un enfant de grille : sa boîte est celle de sa cellule, que
 * les pistes et son étendue décrivent déjà. Dans les deux cas, le geste demandé
 * ne changerait rien au rendu.
 *
 * Une liaison présente mais irrésolue avertit en revanche par `resolveField` :
 * le designer a bien désigné une variable, et le contrat n'a pas su la nommer.
 */
async function resolveBoundAxis(
  node: SceneNode,
  field: 'width' | 'height',
  resolver: TokenResolver,
  warnings: string[],
): Promise<string | null> {
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
    fixed.width ? resolveBoundAxis(node, 'width', resolver, warnings) : null,
    fixed.height ? resolveBoundAxis(node, 'height', resolver, warnings) : null,
  ]);
  return { width: width ?? menu.width, height: height ?? menu.height };
}
