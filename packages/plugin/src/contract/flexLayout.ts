/**
 * Traduction prudente des propriétés Flex d'un auto-layout Figma.
 *
 * Les valeurs sont structurelles : elles ne sont ni des tokens, ni des
 * conventions de composant. Ce module est l'unique autorité qui les convertit
 * dans le vocabulaire CSS du contrat.
 */
import type {
  AlignItems,
  AlignSelf,
  AxisSizing,
  ContainerSizing,
  GridPlacement,
  GridTrack,
  JustifyContent,
  LayoutConstraints,
  LayoutInset,
  SizeBounds,
} from '@ucm-kit/core/format';

type FlexContainerProperties = {
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  wrap?: true;
};

type FlexItemProperties = {
  alignSelf?: AlignSelf;
  flexGrow?: 1;
  position?: 'absolute';
  constraints?: LayoutConstraints;
  inset?: LayoutInset;
};

type FigmaPropertyBag = Record<string, unknown>;

/** Vrai pour les deux auto-layouts que le contrat sait traduire en Flex. */
export function isLinearAutoLayout(node: SceneNode): boolean {
  const mode = (node as unknown as FigmaPropertyBag).layoutMode;
  return mode === 'HORIZONTAL' || mode === 'VERTICAL';
}

/**
 * Vrai pour l'auto layout en grille.
 *
 * Figma y dispose ses enfants en lignes et en colonnes, avec deux gaps propres
 * (`gridRowGap`, `gridColumnGap`) que le contrat sait citer comme des tokens :
 * ils sont tous deux liables à une variable. La grille n'est donc pas un repli
 * `flex-row` : c'est une disposition que le contrat décrit, avec son nombre de
 * pistes et la place de chaque enfant.
 */
export function isGridAutoLayout(node: SceneNode): boolean {
  return (node as unknown as FigmaPropertyBag).layoutMode === 'GRID';
}

/** Nombre de pistes d'une grille, quand Figma l'expose. */
export function gridTrackCounts(node: SceneNode): { columns?: number; rows?: number } {
  if (!isGridAutoLayout(node)) return {};
  const values = asPropertyBag(node);
  return {
    ...(typeof values.gridColumnCount === 'number' ? { columns: values.gridColumnCount } : {}),
    ...(typeof values.gridRowCount === 'number' ? { rows: values.gridRowCount } : {}),
  };
}

/**
 * Taille de chaque piste d'une grille, dans le vocabulaire de `grid-template-*`.
 *
 * Figma expose `gridRowSizes` / `gridColumnSizes` : un type (`FLEX`, `HUG`,
 * `FIXED`) et sa valeur. Les deux premiers sont des comportements, que CSS
 * écrit `1fr` et `fit-content(100%)`. Exception limitée à cette structure de
 * grille, une piste FIXED est publiée en pixels : ce n'est pas un token, et la
 * valeur figure bien dans le contrat. Rien ne manque et rien n'est à corriger,
 * donc le message part dans `infos` — le canal des constats sans action — et
 * non dans `warnings`, qui n'annonce que ce que l'export a dû laisser tomber.
 *
 * La lecture est défensive : un runtime qui n'expose pas ces champs ne publie
 * rien et n'avertit de rien. Une propriété absente n'est pas une valeur.
 *
 * Le message nomme la GRILLE et son axe, jamais l'index des pistes. Cette
 * fonction est appelée une fois par variant, et un même calque de grille n'a pas
 * les mêmes pistes FIXED partout : citer les index produisait deux constats qui
 * se contredisaient sur le même nom de calque — « la ligne 1 » ici, « les lignes
 * 1, 2, 3 » là — sans que rien ne dise de quel variant chacun parlait. Le
 * dédoublonnage de l'export les ramène désormais à un seul, et les valeurs
 * elles-mêmes se lisent dans `rowSizes` / `columnSizes`. C'est le choix déjà
 * fait par `gridStructuralSize`, qui nomme la grille plutôt que chacun de ses
 * enfants.
 */
export function gridTrackSizes(
  node: SceneNode,
  warnings: string[] = [],
  infos: string[] = warnings,
): { columnSizes?: GridTrack[]; rowSizes?: GridTrack[] } {
  if (!isGridAutoLayout(node)) return {};
  const values = asPropertyBag(node);
  const axe = (field: 'gridColumnSizes' | 'gridRowSizes', nom: string): GridTrack[] | undefined => {
    const tracks = values[field];
    if (!Array.isArray(tracks)) return undefined;
    let fixed = false;
    const sizes = (tracks as Array<{ type?: unknown; value?: unknown }>).map((track, index): GridTrack => {
      if (!track || typeof track !== 'object') {
        warnings.push(
          `Layer « ${node.name} » : la taille de la ${nom} ${index + 1} de sa grille est `
            + `illisible. Le contrat publie « auto » pour conserver la piste ; vérifiez ce `
            + `réglage dans Figma, puis réexportez.`,
        );
        return 'auto';
      }
      if (track.type === 'FLEX') {
        return `${typeof track.value === 'number' ? track.value : 1}fr`;
      }
      if (track.type === 'HUG') return 'fit-content(100%)';
      if (track.type === 'FIXED' && typeof track.value === 'number' && Number.isFinite(track.value)) {
        fixed = true;
        return `${track.value}px`;
      }
      warnings.push(
        `Layer « ${node.name} » : la taille de la ${nom} ${index + 1} de sa grille est `
          + `illisible. Le contrat publie « auto » pour conserver la piste ; vérifiez ce `
          + `réglage dans Figma, puis réexportez.`,
      );
      return 'auto';
    });
    if (fixed) {
      infos.push(
        `Layer « ${node.name} » : ses ${nom}s de taille fixe sont publiées en pixels, `
          + `exception propre aux pistes FIXED d'une grille. Ces valeurs décrivent sa structure `
          + `Figma sans devenir des tokens ; aucune modification du design n'est demandée.`,
      );
    }
    return sizes;
  };

  const columnSizes = axe('gridColumnSizes', 'colonne');
  const rowSizes = axe('gridRowSizes', 'ligne');
  return {
    ...(columnSizes ? { columnSizes } : {}),
    ...(rowSizes ? { rowSizes } : {}),
  };
}

/**
 * Axes dont la CELLULE décide, pour un enfant de grille resté dans le flux.
 *
 * Remplir sa cellule est le DÉFAUT d'un enfant de grille — `stretch` en CSS,
 * « Fill » dans le panneau de Figma — et son alignement vaut alors `AUTO`. Sa
 * boîte est celle de la cellule, que les pistes et son étendue décrivent déjà.
 *
 * Ce que l'API rend sur cet axe ne peut pas servir à en juger : Figma n'expose
 * pas de remplissage dans une piste qui hug, exactement comme une piste `FLEX`
 * est un état invalide sous un conteneur qui hug. Il rend alors la taille
 * CALCULÉE du calque là où le panneau affiche « Fill ». Lui réclamer une
 * variable envoie le designer vérifier un champ qui lui donne déjà raison.
 *
 * Un alignement explicite est la seule exception, et c'est le même mot en CSS :
 * un enfant en `center` ou en `flex-start` ne s'étire plus, sa dimension
 * redevient la sienne, et la règle commune s'applique.
 */
export function gridCellSizedAxes(
  parent: SceneNode,
  child: SceneNode,
): { width: boolean; height: boolean } {
  if (!isGridAutoLayout(parent) || isAbsolutePositioned(child)) {
    return { width: false, height: false };
  }
  const values = asPropertyBag(child);
  return {
    width: gridSelfAlignment(values.gridChildHorizontalAlign) === null,
    height: gridSelfAlignment(values.gridChildVerticalAlign) === null,
  };
}

/**
 * Axes sur lesquels TOUTES les pistes qu'un enfant couvre se dimensionnent sur
 * lui (`HUG`).
 *
 * Une piste qui hug ne peut pas étirer son contenu : c'est lui qui la mesure.
 * Figma n'y expose donc aucun remplissage et rend la taille RÉSOLUE de l'enfant
 * — la seule mesure qui existe, `GridTrackSize.value` n'étant applicable qu'aux
 * pistes `FIXED` et `FLEX`.
 *
 * Une seule piste non `HUG` sous l'étendue suffit à rendre l'axe indécis : la
 * place vient alors d'ailleurs, et la mesure de l'enfant ne la décrit plus.
 *
 * Fait de PISTES, et rien de plus : cette réponse ne dit pas si le contrat doit
 * publier la mesure. Un enfant explicitement aligné hug la même piste sans
 * remplir sa cellule, et `gridCellSizedAxes` est seul à en juger — c'est
 * `gridStructuralSize` qui croise les deux.
 *
 * La lecture reste défensive, comme dans `gridTrackSizes` : un runtime qui
 * n'expose pas ces champs ne répond rien, et le comportement ordinaire reprend.
 */
export function gridHugAxes(
  parent: SceneNode,
  child: SceneNode,
): { width: boolean; height: boolean } {
  if (!isGridAutoLayout(parent) || isAbsolutePositioned(child)) {
    return { width: false, height: false };
  }
  const tracksOf = asPropertyBag(parent);
  const placement = asPropertyBag(child);
  const axe = (
    field: 'gridColumnSizes' | 'gridRowSizes',
    anchor: 'gridColumnAnchorIndex' | 'gridRowAnchorIndex',
    span: 'gridColumnSpan' | 'gridRowSpan',
  ): boolean => {
    const tracks = tracksOf[field];
    const start = placement[anchor];
    if (!Array.isArray(tracks) || typeof start !== 'number') return false;
    const length = typeof placement[span] === 'number' && (placement[span] as number) > 1
      ? placement[span] as number
      : 1;
    const couvertes = tracks.slice(start, start + length);
    if (couvertes.length !== length) return false;
    return couvertes.every((track) => (
      Boolean(track) && typeof track === 'object' && (track as { type?: unknown }).type === 'HUG'
    ));
  };
  return {
    width: axe('gridColumnSizes', 'gridColumnAnchorIndex', 'gridColumnSpan'),
    height: axe('gridRowSizes', 'gridRowAnchorIndex', 'gridRowSpan'),
  };
}

/** Alignement d'un enfant de grille dans sa cellule ; `AUTO` est la valeur neutre. */
function gridSelfAlignment(value: unknown): AlignSelf | null {
  if (value === 'MIN') return 'flex-start';
  if (value === 'CENTER') return 'center';
  if (value === 'MAX') return 'flex-end';
  return null;
}

/**
 * Place d'un enfant dans la grille de son parent : son étendue et son
 * alignement dans sa cellule.
 *
 * Une étendue de 1 est la valeur neutre — c'est la cellule elle-même — et reste
 * absente, comme `INHERIT` et `0` du côté Flex. `AUTO` en est l'équivalent pour
 * les alignements : l'enfant suit alors la règle de la grille.
 */
export function gridItemProperties(parent: SceneNode, child: SceneNode): GridPlacement {
  if (!isGridAutoLayout(parent)) return {};
  const values = asPropertyBag(child);
  const placement: GridPlacement = {};

  // L'ancre, elle, n'est pas neutralisable : Figma en pose une sur chaque
  // enfant, et la redéduire supposerait de réimplémenter son placement
  // automatique. Figma compte à partir de 0, CSS à partir de 1.
  if (typeof values.gridColumnAnchorIndex === 'number') {
    placement.columnStart = values.gridColumnAnchorIndex + 1;
  }
  if (typeof values.gridRowAnchorIndex === 'number') {
    placement.rowStart = values.gridRowAnchorIndex + 1;
  }
  if (typeof values.gridColumnSpan === 'number' && values.gridColumnSpan > 1) {
    placement.columnSpan = values.gridColumnSpan;
  }
  if (typeof values.gridRowSpan === 'number' && values.gridRowSpan > 1) {
    placement.rowSpan = values.gridRowSpan;
  }
  const justify = gridSelfAlignment(values.gridChildHorizontalAlign);
  if (justify) placement.justifySelf = justify;
  const align = gridSelfAlignment(values.gridChildVerticalAlign);
  if (align) placement.alignSelf = align;
  return placement;
}

/**
 * Contraintes d'un calque en position absolue, traduites en côtés CSS.
 *
 * Ce sont les seules données de placement que le contrat sache porter sans
 * écrire un nombre de maquette : les offsets, eux, ne sont liables à aucune
 * variable dans Figma, et un `x` brut n'est jamais contractuel. Une contrainte
 * dit au moins à quel bord le calque s'accroche — sans elle, un badge posé en
 * haut à droite se retrouvait en haut à gauche sans que rien ne le dise.
 */
export function layoutConstraints(node: SceneNode): LayoutConstraints | null {
  const constraints = asPropertyBag(node).constraints as
    | { horizontal?: unknown; vertical?: unknown }
    | undefined;
  if (!constraints) return null;

  const horizontal = ({
    MIN: 'left', CENTER: 'center', MAX: 'right', STRETCH: 'stretch', SCALE: 'scale',
  } as Record<string, LayoutConstraints['horizontal']>)[String(constraints.horizontal)];
  const vertical = ({
    MIN: 'top', CENTER: 'center', MAX: 'bottom', STRETCH: 'stretch', SCALE: 'scale',
  } as Record<string, LayoutConstraints['vertical']>)[String(constraints.vertical)];
  if (!horizontal || !vertical) return null;
  return { horizontal, vertical };
}

/** Vrai si Figma sort ce calque du flux de son parent. */
export function isAbsolutePositioned(node: SceneNode): boolean {
  return asPropertyBag(node).layoutPositioning === 'ABSOLUTE';
}

/**
 * Rotation en deçà de laquelle un layer est considéré comme droit, en degrés.
 *
 * Figma stocke la rotation en flottant : une transformation successive laisse
 * des résidus de l'ordre de 1e-13, qu'aucun écran ne rend et qu'aucun designer
 * ne peut remettre à zéro. Un centième de degré est très en dessous du premier
 * pixel visible, et très au-dessus de ce bruit.
 */
const ROTATION_NEUTRE = 0.01;

/** Deux décimales : la règle de tout pixel structurel que le contrat publie. */
function arrondi(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Un nombre que Figma expose réellement, et sur lequel on peut calculer. */
function mesure(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Rotation d'un calque dans la convention de CSS.
 *
 * Figma compte les degrés dans le sens trigonométrique, CSS dans le sens
 * horaire : la valeur publiée est l'opposée, et s'écrit telle quelle dans
 * `transform: rotate(…)`. L'origine est le centre, le défaut de CSS — c'est
 * aussi celle sur laquelle `absoluteInset` calcule sa boîte, si bien que les
 * deux champs décrivent le même modèle.
 */
export function rotationDegrees(node: SceneNode): `${number}deg` | null {
  const rotation = mesure(asPropertyBag(node).rotation);
  if (rotation === null || Math.abs(rotation) <= ROTATION_NEUTRE) return null;
  return `${arrondi(-rotation)}deg`;
}

/**
 * Où se trouve un calque hors du flux, en distances aux bords de son parent.
 *
 * Le calcul passe par le CENTRE du calque, et c'est ce qui le rend juste pour un
 * calque tourné : Figma tourne autour du coin haut-gauche, CSS autour du centre.
 * `relativeTransform` appliqué au centre local (w/2, h/2) donne le centre réel
 * dans le repère du parent ; la boîte CSS non tournée s'en déduit, et
 * `transform: rotate(…)` la ramène exactement où Figma la montre.
 *
 * Les côtés publiés sont ceux auxquels le calque s'accroche, pour que le
 * placement survive à un parent qui change de taille. `stretch`, `center` et
 * `scale` en demandent deux : le premier étire, les deux autres ont besoin des
 * deux distances pour recentrer ou proportionner.
 *
 * Rien n'est publié si Figma n'expose pas tout ce qu'il faut — un node de test,
 * un runtime partiel : mieux vaut une absence qu'un `NaNpx`.
 */
function absoluteInset(parent: SceneNode, child: SceneNode): LayoutInset | null {
  const boite = asPropertyBag(child);
  const cadre = asPropertyBag(parent);
  const width = mesure(boite.width);
  const height = mesure(boite.height);
  const parentWidth = mesure(cadre.width);
  const parentHeight = mesure(cadre.height);
  const transform = boite.relativeTransform as number[][] | undefined;
  if (width === null || height === null || parentWidth === null || parentHeight === null) {
    return null;
  }
  if (!Array.isArray(transform) || transform.length < 2) return null;

  const centre = (row: readonly number[] | undefined): number | null => {
    if (!Array.isArray(row) || row.length < 3) return null;
    const [a, b, t] = [mesure(row[0]), mesure(row[1]), mesure(row[2])];
    if (a === null || b === null || t === null) return null;
    return a * (width / 2) + b * (height / 2) + t;
  };
  const centreX = centre(transform[0]);
  const centreY = centre(transform[1]);
  if (centreX === null || centreY === null) return null;

  const left = centreX - width / 2;
  const top = centreY - height / 2;
  const constraints = layoutConstraints(child);
  const px = (value: number): `${number}px` => `${arrondi(value)}px`;
  // Les deux axes suivent la même règle ; l'écrire une fois évite qu'ils
  // divergent au premier ancrage ajouté.
  const axe = (
    ancrage: string | undefined,
    debut: 'left' | 'top',
    fin: 'right' | 'bottom',
    depuisLeDebut: number,
    depuisLaFin: number,
  ): LayoutInset => {
    if (ancrage === fin) return { [fin]: px(depuisLaFin) } as LayoutInset;
    if (ancrage === 'stretch' || ancrage === 'center' || ancrage === 'scale') {
      return { [debut]: px(depuisLeDebut), [fin]: px(depuisLaFin) } as LayoutInset;
    }
    // Le repli est l'ancrage au début : c'est celui de Figma, et celui d'un
    // node dont le runtime n'expose aucune contrainte.
    return { [debut]: px(depuisLeDebut) } as LayoutInset;
  };

  return {
    ...axe(constraints?.vertical, 'top', 'bottom', top, parentHeight - top - height),
    ...axe(constraints?.horizontal, 'left', 'right', left, parentWidth - left - width),
  };
}

function asPropertyBag(node: SceneNode): FigmaPropertyBag {
  return node as unknown as FigmaPropertyBag;
}

function justifyContent(value: unknown): JustifyContent | null {
  if (value === 'MIN') return 'flex-start';
  if (value === 'CENTER') return 'center';
  if (value === 'MAX') return 'flex-end';
  if (value === 'SPACE_BETWEEN') return 'space-between';
  return null;
}

function alignItems(value: unknown): AlignItems | null {
  if (value === 'MIN') return 'flex-start';
  if (value === 'CENTER') return 'center';
  if (value === 'MAX') return 'flex-end';
  if (value === 'BASELINE') return 'baseline';
  return null;
}

function alignSelf(value: unknown): AlignSelf | null {
  if (value === 'MIN') return 'flex-start';
  if (value === 'CENTER') return 'center';
  if (value === 'MAX') return 'flex-end';
  if (value === 'STRETCH') return 'stretch';
  return null;
}

/**
 * Dimensionnement explicite de l'enfant, rangé par axe du parent.
 *
 * `layoutAlign` et `layoutGrow` sont des API historiques ; `layoutSizing…` est
 * le reflet direct des menus Horizontal / Vertical sizing de Figma et tranche
 * leurs incohérences. Les deux axes sont lus ensemble mais restent
 * indépendants : un enfant qui remplit la largeur et hug la hauteur est un
 * réglage courant, pas une contradiction.
 */
function childSizing(parent: SceneNode, child: SceneNode): { main: unknown; cross: unknown } {
  const parentMode = asPropertyBag(parent).layoutMode;
  const values = asPropertyBag(child);
  if (parentMode === 'HORIZONTAL') {
    return { main: values.layoutSizingHorizontal, cross: values.layoutSizingVertical };
  }
  if (parentMode === 'VERTICAL') {
    return { main: values.layoutSizingVertical, cross: values.layoutSizingHorizontal };
  }
  return { main: undefined, cross: undefined };
}

/**
 * Dimensionnement du composant lu sur le SEUL menu de Figma, traduit en valeurs
 * de `width` et `height`.
 *
 * Seul `Hug` est une intention de comportement : il dit que le composant se
 * limite à son contenu, ce que CSS écrit `fit-content`. Une largeur fixe posée
 * sur un variant ne l'est pas — c'est le plus souvent une commodité de mise en
 * page dans Figma, pour aligner les variants d'un component set entre eux. La
 * publier reviendrait à figer dans le contrat une décision de présentation, et
 * à imposer cette largeur à toutes les pages qui intègrent le composant. Le
 * défaut est donc `stretch` : le composant occupe la place que son intégration
 * lui donne.
 *
 * Ce n'est que la moitié de la règle : une dimension figée qui cite une
 * variable est au contraire une décision du design system, et le token
 * l'emporte sur ce `stretch`. Cette arbitrage demande de résoudre une liaison,
 * et vit donc dans `nodeBindings.resolveContainerSizing`, avec celui des slots.
 * Ce module reste l'autorité sur le vocabulaire CSS, et fournit ici le repli.
 */
export function containerSizing(node: SceneNode): ContainerSizing {
  const values = asPropertyBag(node);
  const cssSizing = (sizing: unknown): AxisSizing =>
    sizing === 'HUG' ? 'fit-content' : 'stretch';
  return {
    width: cssSizing(values.layoutSizingHorizontal),
    height: cssSizing(values.layoutSizingVertical),
  };
}

/**
 * Axes dont la dimension est figée, et qui doivent donc être publiés.
 *
 * `Hug` et `Fill` sont déjà décrits — par l'absence pour le premier, par
 * `flexGrow` / `alignSelf` pour le second — et ne demandent aucune variable.
 * Tout le reste est traité comme figé : un menu que l'API n'expose pas laisse
 * le doute, et mieux vaut réclamer une variable en trop que taire une
 * dimension que le contrat ne saurait pas reconstituer.
 */
export function fixedDimensions(node: SceneNode): { width: boolean; height: boolean } {
  const values = asPropertyBag(node);
  const figee = (sizing: unknown) => sizing !== 'HUG' && sizing !== 'FILL';
  return {
    width: figee(values.layoutSizingHorizontal),
    height: figee(values.layoutSizingVertical),
  };
}

/** Les quatre bornes de taille de Figma, dans l'ordre du panneau. */
export const SIZE_BOUND_FIELDS = [
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
] as const satisfies ReadonlyArray<keyof SizeBounds>;

/**
 * Bornes que Figma pose réellement sur ce node.
 *
 * Une borne est indépendante du menu de dimensionnement : un calque en `Fill`
 * qu'un `max width` retient est le cas le plus courant, et l'axe figé n'est pas
 * une condition. Chaque champ est donc lu seul, sur sa seule présence — Figma
 * renvoie `null` quand rien n'est posé, jamais la dimension courante.
 *
 * Ce module lit le panneau, il ne résout aucune liaison : le token de chaque
 * borne est l'affaire de `nodeBindings.resolveSizeBounds`, exactement comme
 * `fixedDimensions` laisse à `resolveSlotSize` le soin de nommer la variable.
 */
export function sizeBoundFields(node: SceneNode): ReadonlyArray<keyof SizeBounds> {
  const values = asPropertyBag(node);
  return SIZE_BOUND_FIELDS.filter((field) => typeof values[field] === 'number');
}

/**
 * Alignement du conteneur Figma, et son passage à la ligne.
 *
 * Les deux alignements forment une paire : si l'API ne fournit pas les deux, le
 * contrat les omet plutôt que de compléter le second avec un défaut CSS
 * inventé. Le wrap, lui, ne dépend pas d'eux et survit donc à leur absence :
 * un alignement illisible ne doit pas emporter avec lui la disposition sur
 * plusieurs lignes.
 */
export function flexContainerProperties(
  node: SceneNode,
  warnings: string[] = [],
): FlexContainerProperties {
  if (!isLinearAutoLayout(node)) return {};

  const values = asPropertyBag(node);
  // Le passage à la ligne est une décision de disposition, pas une dimension :
  // il se publie ici, à côté des alignements. L'espace entre les lignes, lui,
  // est un token, et `nodeBindings.resolveRowGap` le nomme.
  const wrap: FlexContainerProperties = values.layoutWrap === 'WRAP' ? { wrap: true } : {};
  const primary = values.primaryAxisAlignItems;
  const counter = values.counterAxisAlignItems;
  if (primary === undefined || counter === undefined) return wrap;

  const justify = justifyContent(primary);
  const align = alignItems(counter);
  if (justify && align) return { ...wrap, justifyContent: justify, alignItems: align };

  warnings.push(
    `Layer « ${node.name} » : son alignement d'auto layout est illisible. Le contrat ne ` +
      `publie ni justifyContent ni alignItems, car une valeur CSS devinée déplacerait ses ` +
      `enfants. Réglez l'alignement principal et secondaire dans Figma, puis réexportez.`,
  );
  return wrap;
}

/**
 * Placement d'un enfant dans le flux de son parent. `INHERIT` et `0` sont les
 * valeurs Figma neutres : elles restent absentes, le parent porte déjà la
 * règle commune. Un enfant absolu sort du flux et demanderait des coordonnées
 * que le contrat ne représente pas encore ; il est donc signalé, jamais forcé
 * dans Flex.
 */
export function flexItemProperties(
  parent: SceneNode,
  child: SceneNode,
  warnings: string[] = [],
  // La place d'un calque absolu est une NOTICE, pas un avertissement : elle
  // constate un calcul et ne demande aucun geste. Les deux canaux restent donc
  // distincts jusqu'ici, faute de quoi le corps de la pull request se remplirait
  // de constats que personne ne peut corriger.
  infos: string[] = [],
): FlexItemProperties & GridPlacement {
  // Testé avant l'auto layout linéaire : une grille aussi porte des enfants en
  // position absolue. Le calque sort du flux et le contrat le place : ses
  // contraintes disent à quels bords il s'accroche, `inset` à quelle distance.
  // Un offset Figma ne se relie à aucune variable, et le designer ne PEUT pas
  // le rendre contractuel — lui réclamer un geste impossible n'était pas un
  // avertissement. Le moteur calcule donc la distance, comme il calcule les
  // pixels d'une piste de grille, sous une notice qui ne demande rien.
  if (isAbsolutePositioned(child)) {
    const constraints = layoutConstraints(child);
    const inset = absoluteInset(parent, child);
    if (inset) {
      infos.push(
        `Layer « ${child.name} » : il est en position « Absolute » dans « ${parent.name} ». Sa `
          + `distance aux bords auxquels il s'accroche est publiée en pixels, exception propre `
          + `aux layers hors du flux — Figma ne permet pas de relier une position à une `
          + `variable. Ces valeurs décrivent sa place sans devenir des tokens ; aucune `
          + `modification du design n'est demandée.`,
      );
    }
    return {
      position: 'absolute',
      ...(constraints ? { constraints } : {}),
      ...(inset ? { inset } : {}),
    };
  }
  if (isGridAutoLayout(parent)) return gridItemProperties(parent, child);
  if (!isLinearAutoLayout(parent)) return {};

  const values = asPropertyBag(child);
  const result: FlexItemProperties = {};
  const sizing = childSizing(parent, child);

  // Axe secondaire. Dans Figma, HUG et STRETCH sont incompatibles sur le même
  // axe. Des nodes anciens ou des instances peuvent toutefois exposer les deux
  // valeurs ; le menu de dimensionnement porte alors l'intention la plus
  // précise, et un consommateur qui suivrait `layoutAlign` étirerait un
  // composant que Figma garde hug. Un HUG n'annule que l'étirement : `MIN`,
  // `CENTER` et `MAX` alignent un enfant sans rien dire de sa taille.
  const rawAlign = values.layoutAlign;
  if (sizing.cross === 'FILL') {
    result.alignSelf = 'stretch';
  } else if (rawAlign !== undefined && rawAlign !== 'INHERIT') {
    const mapped = alignSelf(rawAlign);
    if (!mapped) {
      warnings.push(
        `Layer « ${child.name} » : son alignement dans l'auto layout « ${parent.name} » est illisible. ` +
          `Le contrat ne publie pas alignSelf. Réglez ce layer dans Figma, puis réexportez.`,
      );
    } else if (mapped !== 'stretch' || sizing.cross !== 'HUG') {
      result.alignSelf = mapped;
    }
  }

  // Axe principal, lu avec la même autorité. Le dimensionnement d'un axe ne
  // décide jamais de l'autre : une hauteur en hug laisse intacte une largeur
  // en fill.
  if (sizing.main === 'FILL') return { ...result, flexGrow: 1 };
  if (sizing.main === 'HUG') return result;

  const rawGrow = values.layoutGrow;
  if (rawGrow === undefined || rawGrow === 0) return result;
  if (rawGrow === 1) return { ...result, flexGrow: 1 };

  warnings.push(
    `Layer « ${child.name} » : son remplissage de l'auto layout « ${parent.name} » vaut « ${String(rawGrow)} ». ` +
      `Le contrat sait représenter uniquement 0 ou 1, les valeurs exposées par Figma. Corrigez ce layer, puis réexportez.`,
  );
  return result;
}
