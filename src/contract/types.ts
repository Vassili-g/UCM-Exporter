/**
 * Types du contrat de composant produit par Unified Component Exporter.
 *
 * Ce fichier décrit la forme exacte du JSON produit par « Export composant ».
 * Aucune logique ici : uniquement des types TypeScript, pour que chaque module
 * du plugin parle le même langage.
 */

/**
 * Nom Figma d'origine d'une prop, conservé quand la clé publique a été
 * renommée par la couche sémantique (ex. `size` ← `Button-Construc-Type`).
 * Permet de toujours retrouver la propriété dans Figma.
 */
type PropMeta = { figmaName?: string };

/** Prop à choix multiples (issue d'un axe de variantes Figma). */
export type EnumProp = PropMeta & {
  type: 'enum';
  values: string[];
  default: string | null;
  /**
   * Documentation par valeur, alimentée par les règles `@prop <prop>.<valeur>`
   * (section `<Nom>-Rules`). Clé = valeur de l'enum, texte = quand l'utiliser.
   * Absent si aucune règle `@prop` ne cible cette prop.
   */
  descriptions?: Record<string, string>;
};

/** Prop vrai/faux (issue d'une propriété BOOLEAN Figma). */
export type BooleanProp = PropMeta & {
  type: 'boolean';
  default: boolean;
  /**
   * Rôle de la prop, alimenté par la règle `@boolean <prop>` du conteneur
   * `<Nom>-Rules`. Absent si cette prop n'est pas documentée explicitement.
   */
  description?: string;
};

/** Prop texte libre (issue d'une propriété TEXT Figma). */
export type StringProp = PropMeta & {
  type: 'string';
  default: string | null;
};

/**
 * Prop runtime qui porte le nom d'une icône modifiable — QUELLE icône rendre.
 *
 * Elle est indépendante de la visibilité du calque : une icône toujours
 * affichée reste parfaitement remplaçable. `visibilityProp` n'apparaît donc
 * que si Figma déclare un BOOLEAN qui montre ou masque ce calque, auquel cas
 * les deux props se lisent en paire (`iconLeft` / `iconLeftName`).
 */
export type IconProp = PropMeta & {
  type: 'icon';
  default: string | null;
  policy: 'modifiable';
  /** Prop BOOLEAN Figma liée nativement à la visibilité du calque, si elle existe. */
  visibilityProp?: string;
};

/** Valeur recommandée par Figma pour un INSTANCE_SWAP ou un SLOT. */
export type PreferredComponentValue = {
  type: 'COMPONENT' | 'COMPONENT_SET';
  key: string;
};

/** Prop native de remplacement d'instance. */
export type InstanceSwapProp = PropMeta & {
  type: 'instance-swap';
  /** Id du composant Figma choisi par défaut. */
  default: string | null;
  preferredValues: PreferredComponentValue[];
};

/** Réglages natifs d'une component property SLOT. */
export type SlotProp = PropMeta & {
  type: 'slot';
  default: string | boolean | null;
  preferredValues: PreferredComponentValue[];
  description?: string;
  settings?: {
    stretchChildOnInsert?: boolean;
    displayEmptyByDefault?: boolean;
    minChildren?: number | null;
    maxChildren?: number | null;
    allowPreferredValuesOnly?: boolean;
  };
};

/** Une prop publique du composant, quel que soit son type. */
export type ContractProp =
  | EnumProp
  | BooleanProp
  | StringProp
  | IconProp
  | InstanceSwapProp
  | SlotProp;

/**
 * Intention d'usage du composant, lue depuis la description Figma taguée
 * (`@usage`, `@do`, `@dont`, `@pairs`). Cette partie du contrat dit à un
 * humain ou à un agent IA QUAND utiliser le composant, pas seulement COMMENT.
 */
export type Intent = {
  usage: string | null;
  do: string[];
  dont: string[];
  pairs: string[];
};

/** Déclencheur d'un état d'interaction dans le contrat consommé par le code. */
export type StateDescriptor = {
  /** Sélecteur ou attribut attendu par l'adaptateur de rendu ; null pour l'état par défaut. */
  selector: string | null;
  /**
   * Doc de l'état, déclarée par une règle `@prop <axe>.<état>`. L'axe d'états
   * n'étant pas une prop, sa documentation vit ici — au même endroit que le
   * reste de ce que le contrat en dit.
   */
  description?: string;
};

/** Modèle d'interaction déduit d'un axe Figma `State` ou `Status`. */
export type StateModel = {
  /** Nom normalisé de l'axe Figma qui porte les états. */
  axis: string;
  /** Déclencheur de chaque valeur réellement présente dans le Component Set. */
  states: Record<string, StateDescriptor>;
  /** Ordre de priorité, du plus fort au plus faible. */
  precedence: string[];
};

/** Vocabulaire de rendu des rôles visuels, commun à tous les composants. */
export type RenderingRole = {
  /** `paint` pour une couleur, `stroke` pour une couleur accompagnée de géométrie. */
  kind: 'paint' | 'stroke';
  /** Propriétés CSS candidates pour un adaptateur web. */
  cssProperties: string[];
  /** Stratégie de rendu complémentaire quand une propriété seule ne suffit pas. */
  fallback?: string;
};

/**
 * Correspondance des rôles vers le rendu. Les rôles partagés (`background`,
 * `foreground`, `icon`, `border`, `ring`) sont publiés par tout contrat ; s'y
 * ajoutent les clés de couleur du composant qui n'en nomment aucun, avec le
 * rendu déduit du calque qui les porte. La RÈGLE reste sans logique par
 * composant — seules les clés observées changent d'un contrat à l'autre.
 */
export type RenderingSemantics = {
  roles: Record<string, RenderingRole>;
};

/** Tokens réellement liés aux propriétés d'un text style Figma. */
export type TypographyTokens = Partial<{
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  fontFamily: string;
  letterSpacing: string;
}>;

/** Définition d'un text style utilisé par le composant, avec son nom Figma traçable. */
export type TextStyleDefinition = {
  figmaName: string;
  tokens: TypographyTokens;
};

/** Application d'un text style à un slot textuel précis d'un variant. */
export type TextStyleUse = {
  /** Chemin de slots depuis `structure.children` jusqu'au texte concerné. */
  slotPath: string[];
  /** Clé normalisée d'une entrée de `Contract.textStyles`. */
  style: string;
};

/** Répartition des enfants sur l'axe principal d'un conteneur Flex. */
export type JustifyContent = 'flex-start' | 'center' | 'flex-end' | 'space-between';

/** Alignement commun des enfants sur l'axe secondaire d'un conteneur Flex. */
export type AlignItems = 'flex-start' | 'center' | 'flex-end' | 'baseline';

/** Exception d'alignement d'un enfant Flex direct. */
export type AlignSelf = 'flex-start' | 'center' | 'flex-end' | 'stretch';

/**
 * Place d'un enfant dans la grille de son parent.
 *
 * Les étendues valent 1 par défaut — la cellule elle-même — et restent alors
 * absentes, comme toute valeur neutre du contrat. Les deux alignements suivent
 * le vocabulaire de `AlignSelf` : une grille aligne ses enfants dans leur
 * cellule exactement comme un flex les aligne sur son axe secondaire.
 */
export type GridPlacement = {
  /** Place de la cellule d'ancrage, en valeurs CSS — comptées à partir de 1. */
  columnStart?: number;
  rowStart?: number;
  columnSpan?: number;
  rowSpan?: number;
  justifySelf?: AlignSelf;
  alignSelf?: AlignSelf;
};

/**
 * Bords auxquels un calque hors flux s'accroche.
 *
 * C'est tout ce que le contrat sait porter d'une position absolue. La distance
 * à ces bords, elle, n'est liable à aucune variable dans Figma : ce serait un
 * nombre de maquette, et le contrat n'en écrit jamais. Les clés sont celles de
 * CSS plutôt que le `MIN`/`MAX` de Figma, comme partout ailleurs.
 */
export type LayoutConstraints = {
  horizontal: 'left' | 'center' | 'right' | 'stretch' | 'scale';
  vertical: 'top' | 'center' | 'bottom' | 'stretch' | 'scale';
};

/**
 * Disposition d'un conteneur, dans le vocabulaire de CSS.
 *
 * `grid` n'est plus un repli honteux : Figma y expose deux gaps liables à une
 * variable et le nombre de ses pistes, soit exactement ce que le contrat sait
 * porter. Un conteneur sans auto layout reste décrit comme une rangée, faute de
 * mieux, et le dit.
 */
export type LayoutDirection = 'flex-row' | 'flex-column' | 'grid';

/**
 * Comportement d'un composant sur un axe, face à la place qu'on lui donne.
 *
 * Ce sont les mots de CSS, pas ceux de Figma : `Fill` et `Hug` sont les
 * intitulés d'un panneau, `stretch` et `fit-content` sont des valeurs de
 * `width` et `height`. Le contrat traduit partout ailleurs (`flex-start`,
 * `stretch`, `flexGrow`), et il ne garde un terme Figma que là où CSS n'a
 * rien à proposer — l'alignement d'un stroke, par exemple. Ici CSS a le mot
 * exact : le consommateur écrit la valeur, il ne la devine pas.
 */
export type AxisSizing = 'stretch' | 'fit-content';

/**
 * Un axe du composant : un comportement CSS, ou la référence du token qui fixe
 * cette dimension.
 *
 * Le troisième terme est une référence `{…}`, et il l'emporte sur les deux
 * autres. Une dimension figée SANS variable reste une commodité de maquette —
 * elle aligne les variants d'un component set — et vaut `stretch` ; une
 * dimension figée qui cite une variable est une décision du design system, que
 * le composant connaît de lui-même quel que soit son futur conteneur. C'est la
 * règle des slots, appliquée au composant : un nombre brut n'est jamais
 * contractuel, une variable liée l'est toujours.
 *
 * Le type dégénère structurellement en `string`, comme partout où le contrat
 * porte une référence de token ; le nom sépare les deux intentions.
 */
export type ContainerAxisSizing = AxisSizing | string;

/**
 * Dimensionnement propre du composant, publié sur les deux axes.
 *
 * Les clés sont les propriétés CSS concernées, et non les axes de Figma : la
 * taille d'un composant n'est pas une propriété de flux, elle ne dépend pas
 * d'un conteneur qu'il ne connaît pas. `stretch` reste une intention —
 * « occupe la place donnée » — dont la technique appartient au développeur :
 * `width: stretch`, `width: 100%` ou `flex: 1` selon le contexte d'intégration.
 */
export type ContainerSizing = {
  width: ContainerAxisSizing;
  height: ContainerAxisSizing;
};

/**
 * Dimension figée d'un slot, toujours tokenisée.
 *
 * Un carré garde la forme courte — c'est le cas de presque toutes les icônes,
 * et l'objet n'y apprendrait rien. Dès que les deux axes diffèrent, ou qu'un
 * seul est figé, chacun est nommé : réduire les deux à une valeur ferait
 * affirmer au contrat une dimension que Figma n'a pas.
 */
export type SlotSize = string | { width?: string; height?: string };

/**
 * Une valeur que Figma laisse régler côté par côté, toujours tokenisée.
 *
 * C'est l'idiome de `SlotSize`, appliqué aux quatre champs qui portent une
 * décision par bord : une RÉFÉRENCE quand tous les côtés citent la même
 * variable — la forme de presque tous les composants, inchangée — et le DÉTAIL
 * par côté dès qu'ils en citent plusieurs. Le design system nomme déjà ces
 * variables séparément (`padding-left`, `radius-top-left`) : les refuser
 * demandait au designer d'aplatir une décision qui lui appartient.
 *
 * Le détail est complet ou n'existe pas. Un seul côté relié ne publie rien et
 * avertit : la règle des groupes composés ne change pas, seule l'exigence
 * « une seule et même variable » disparaît.
 */
export type SidedRefs<K extends string> = string | Record<K, string>;

/** Padding horizontal : une référence, ou le détail gauche/droite. */
export type PaddingX = SidedRefs<'left' | 'right'>;

/** Padding vertical : une référence, ou le détail haut/bas. */
export type PaddingY = SidedRefs<'top' | 'bottom'>;

/** Padding d'un conteneur, rangé par axe comme le panneau Figma le présente. */
export type Padding = { x: PaddingX | null; y: PaddingY | null };

/** Rayon : une référence, ou le détail des quatre coins, dans l'ordre CSS. */
export type Radius = SidedRefs<'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'>;

/** Épaisseur de contour : une référence, ou le détail des quatre bords. */
export type StrokeWidth = SidedRefs<'top' | 'right' | 'bottom' | 'left'>;

/**
 * Taille d'UNE piste de grille, dans le vocabulaire de `grid-template-*`.
 *
 * `1fr` pour une piste qui se partage la place, `fit-content` pour une piste qui
 * se règle sur son contenu. Une piste figée à la main vaut `null` : c'est un
 * nombre de maquette, que le contrat n'écrit jamais, et l'export le signale. La
 * place dans le tableau est conservée — retirer la piste décalerait les autres.
 */
export type GridTrack = string | null;

/**
 * Bornes de taille, toujours tokenisées.
 *
 * Elles sont SÉPARÉES de `size` et de `sizing` parce qu'elles ne répondent pas
 * à la même question. Le menu de dimensionnement dit quelle place le calque
 * prend ; une borne dit jusqu'où cette place peut aller. Les deux coexistent :
 * le cas le plus courant est un calque en `Fill` qu'un `max width` retient,
 * exactement ce qu'aucune valeur de `size` ne saurait écrire.
 *
 * Les clés sont celles de CSS, comme partout ailleurs dans le contrat, et le
 * consommateur les écrit telles quelles. Une borne absente ne veut pas dire
 * zéro : elle veut dire que Figma n'en pose aucune sur cet axe.
 */
export type SizeBounds = {
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
};

/** Cible imbriquée dont une prop BOOLEAN contrôle la visibilité. */
export type VisibilityTarget = {
  /** Prop publique qui montre ou masque uniquement cette cible. */
  visibilityProp: string;
  /** Chemin de calques Figma relatif au slot direct, cible comprise. */
  figmaPath: string[];
};

/** Un enfant direct du composant (un « slot ») : icône, label, etc. */
export type ChildStructure = {
  /** Nom du slot : rôle sémantique (`label`, `icon`) ou nom du calque Figma. */
  slot: string;
  /**
   * Nom Figma d'origine, toujours conservé pour tracer labels et placeholders
   * graphiques. Il décrit le VARIANT DE RÉFÉRENCE : quand plusieurs icônes se
   * relaient sur un même slot, `Contract.icons` fait foi sur celle à rendre
   * dans chaque combinaison d'axes.
   */
  figmaLayer?: string;
  /** Vrai pour les calques graphiques et pour tout slot qu'une prop peut masquer. */
  optional?: boolean;
  /** Prop BOOLEAN Figma liée nativement à `visible` sur ce calque, si elle existe. */
  visibilityProp?: string;
  /**
   * Visibilités portées plus profondément que le slot. Elles restent séparées
   * pour ne jamais prétendre que la prop masque le slot entier.
   */
  visibilityTargets?: VisibilityTarget[];
  /**
   * Dimension figée du calque (ex. taille d'icône), relevée sur les axes que
   * Figma tient en `Fixed`. Un axe en `Hug` ou en `Fill` n'apparaît pas ici :
   * il est déjà décrit par l'absence, ou par `flexGrow` / `alignSelf`.
   *
   * Sous un parent `layout: grid`, l'absence se lit autrement : remplir sa
   * cellule est le DÉFAUT d'un enfant de grille — `stretch` en CSS — et c'est
   * donc la cellule qui décide, décrite par `columnSizes` / `rowSizes` et par la
   * place du layer. Un layer explicitement aligné dans sa cellule ne s'étire
   * plus : sa dimension redevient la sienne, et l'absence reprend son sens
   * ordinaire.
   */
  size?: SlotSize;
  /**
   * Bornes de taille du calque, indépendantes de son menu de dimensionnement.
   * Un slot qui remplit son axe principal peut être retenu par un `max width`,
   * et le rendre sans lui donnerait une autre maquette.
   */
  bounds?: SizeBounds;
  /** Exception d'alignement de ce layer dans l'auto layout de son parent. */
  alignSelf?: AlignSelf;
  /**
   * Le layer est hors du flux de son parent. `constraints` dit alors à quels
   * bords il s'accroche ; sa distance à ces bords n'est pas contractuelle.
   */
  position?: 'absolute';
  constraints?: LayoutConstraints;
  /**
   * Place du layer dans la grille de son parent.
   *
   * `columnStart` et `rowStart` sont les valeurs de `grid-column-start` et
   * `grid-row-start` — donc comptées à partir de 1, là où Figma indexe à partir
   * de 0. Elles sont publiées sur tout enfant de grille EN FLUX : Figma pose une
   * ancre sur chacun, et la redéduire supposerait de réimplémenter son placement
   * automatique. Un enfant en position absolue n'en a pas : il est hors de la
   * grille, et `constraints` dit à quels bords il s'accroche.
   *
   * Les étendues gardent leur règle : absentes quand elles valent 1, la cellule
   * elle-même.
   */
  columnStart?: number;
  rowStart?: number;
  columnSpan?: number;
  rowSpan?: number;
  justifySelf?: AlignSelf;
  /**
   * Le layer remplit l'axe principal de son parent (`Fill` dans Figma, exposé
   * par `layoutSizing…` ou par l'historique `layoutGrow: 1`). Son absence vaut
   * `Hug` : une dimension fixe est publiée par `size` quand elle est reliée à
   * une variable, et avertie quand elle ne l'est pas.
   */
  flexGrow?: 1;
  /**
   * Calques internes du slot, à profondeur quelconque et de toute nature.
   *
   * Le contrat descend dès qu'un descendant porte une information qu'une
   * feuille ne sait pas exprimer : un texte, une icône, une dépendance, ou
   * n'importe quelle liaison de variable. Un auto layout dans un auto layout
   * dans une grille est donc décrit jusqu'au bout, chaque niveau avec sa
   * disposition, ses dimensions et ses bornes. Seule exception, qui évite un
   * étage inutile : un cadre dont la seule information est un unique calque
   * texte reste ce texte. `structureTree.ts` en est l'unique autorité.
   */
  children?: ChildStructure[];
  /** Disposition du slot, présente uniquement avec `children`. */
  layout?: LayoutDirection;
  /** Nombre de pistes, quand `layout` vaut `grid`. */
  columns?: number;
  rows?: number;
  /**
   * Taille de chaque piste, dans l'ordre du panneau Figma — colonnes de gauche
   * à droite, lignes de haut en bas. Publiées avec `layout: grid`, et seulement
   * quand Figma les expose.
   */
  columnSizes?: GridTrack[];
  rowSizes?: GridTrack[];
  /**
   * Dimensions propres du conteneur, aux mêmes conditions que celles du
   * composant : une valeur reliée à une variable se publie, une valeur neutre
   * reste absente sans un mot, et un nombre écrit à la main avertit.
   */
  padding?: Padding;
  radius?: Radius | null;
  /** Répartition sur l'axe principal de ce conteneur. */
  justifyContent?: JustifyContent;
  /** Alignement sur l'axe secondaire de ce conteneur. */
  alignItems?: AlignItems;
  /**
   * Gap interne du slot, publié dès que le conteneur range plusieurs enfants
   * décrits par le contrat.
   */
  gap?: string | null;
  /**
   * Le conteneur passe à la ligne. Son absence vaut « une seule ligne » : c'est
   * le défaut de Figma comme celui de CSS.
   */
  wrap?: true;
  /**
   * Espace entre les LIGNES : celles d'un conteneur en `wrap`, ou celles d'une
   * grille. Absent sous `wrap`, il vaut `gap` — Figma synchronise les deux tant
   * que le designer ne les dissocie pas, et CSS fait de même avec une valeur de
   * `gap` unique.
   */
  rowGap?: string | null;
  /** Espace entre les COLONNES d'une grille. */
  columnGap?: string | null;
  /**
   * Nom du composant unifié rendu à cet emplacement. Le slot est alors une
   * DÉPENDANCE : ni ses tokens ni ses calques n'appartiennent à ce contrat,
   * ils vivent dans le sien (cf. `Contract.composes`).
   *
   * Ce champ ne décrit QUE le calque qui est l'instance. Un calque qui
   * l'enveloppe est un conteneur de ce contrat-ci : il publie son flux et range
   * la dépendance dans `children`. Sans cette distinction, l'alignement du
   * cadre atterrit sur le composant, dont le `structure.sizing` le neutralise.
   */
  composes?: string;
};

/**
 * Un composant unifié embarqué par un composé. `figmaLayer` situe l'instance
 * dans le composant, `visibilityProp` dit quelle prop la montre ou la masque
 * lorsque Figma en déclare une.
 */
export type ComposedDependency = {
  component: string;
  figmaLayer: string;
  visibilityProp?: string;
};

/** Politique d'une icône déclarée par la variante de règle `Type=@icons`. */
export type IconPolicy = 'modifiable' | 'strict';

/**
 * Icône déclarée dans les règles Figma. `figmaName` est à la fois le nom
 * affiché dans le calque `icon` et la clé de rapprochement exacte avec le
 * calque graphique du composant ; il ne décrit pas une prop d'API.
 */
export type IconDefinition = {
  policy: IconPolicy;
  /** Nom de l'icône dans Figma, conservé sans normalisation pour la traçabilité. */
  figmaName: string;
  /**
   * Slot de `structure.children` que cette icône remplit. C'est lui qui situe
   * une icône absente du variant de référence, donc absente de `children` :
   * plusieurs icônes qui s'excluent entre variants partagent un même slot.
   * Absent lorsque le calque n'occupe pas le même rang selon les variants.
   */
  slot?: string;
  /** Token de taille du calque, relevé sur tous les variants où il existe. */
  size?: string;
  /** Prop BOOLEAN qui contrôle la visibilité du calque, si Figma en déclare une. */
  visibilityProp?: string;
  /** Prop runtime ajoutée pour une icône `modifiable`, distincte du booléen. */
  runtimeProp?: string;
  /**
   * Combinaisons exactes d'axes où le calque existe. Absent si l'icône est
   * présente dans tous les variants.
   */
  variants?: Array<Record<string, string>>;
};

/** Alignement d'un stroke Figma, conservé comme donnée structurelle. */
export type StrokeAlignment = 'inside' | 'center' | 'outside';

/** Couleur et géométrie tokenisées d'un stroke porté par un rôle (`border`, `ring`…). */
export type StrokeTokens = {
  color: string;
  /**
   * Largeur du contour : une référence quand les quatre bords partagent leur
   * variable, le détail par bord sinon, `null` quand Figma expose une largeur
   * non tokenisée.
   */
  width: StrokeWidth | null;
  /** Alignement structurel du stroke dans Figma. */
  align: StrokeAlignment | null;
};

/**
 * Tokens de peinture liés sur UN variant, rangés par clé. La clé est le dernier
 * segment du nom du token : `…default.background` → `background`,
 * `…colors.scale-1` → `scale-1`. Elle IDENTIFIE la couleur ; ce qu'elle peint
 * se lit dans `rendering.roles`.
 *
 * Quand deux couleurs d'un même variant portent le même dernier segment, la clé
 * s'allonge des segments qui les séparent : `…userinput.colors.background` et
 * `…divider.colors.background` deviennent `userinput.background` et
 * `divider.background`. Une clé allongée contient donc un point, jamais une clé
 * simple — un segment de token n'en contient aucun. `colorKeys.ts` en est
 * l'unique autorité et la décide sur toute la matrice, si bien que la clé d'un
 * token est la même dans toutes les feuilles.
 */
export type SlotTokens = Record<string, string>;

/** Strokes liés sur UN variant, séparés des peintures pour garder `variantTokens` stable. */
export type SlotStrokes = Record<string, StrokeTokens>;

/**
 * Arbre des tokens par variante, imbriqué dans l'ordre des axes donné par
 * `ContractStructure.variantAxes`. La profondeur = le nombre d'axes ;
 * les feuilles sont des `SlotTokens`. Totalement générique : aucun nom
 * d'axe n'est présumé.
 *
 * Exemple (axes ["color","variant","state"]) :
 * variantTokens.primary.contained.default = { background: "…", foreground: "…" }
 */
export interface VariantTokens {
  [axisValue: string]: VariantTokens | SlotTokens;
}

/** Même arbre que `variantTokens`, mais ses feuilles ne contiennent que des strokes. */
export interface VariantStrokes {
  [axisValue: string]: VariantStrokes | SlotStrokes;
}

/**
 * Arbre parallèle aux variantes dont chaque feuille situe les text styles
 * réellement appliqués aux slots de cette combinaison.
 */
export interface VariantTypography {
  [axisValue: string]: VariantTypography | TextStyleUse[];
}

/**
 * Dimensions d'UNE taille du composant (une valeur de la prop `size`).
 * Tout est exprimé en noms de tokens.
 */
export type SizeDimensions = {
  gap: string | null;
  /** Espace entre les lignes, publié aux mêmes conditions que `gap`. */
  rowGap: string | null;
  /** Espace entre les colonnes d'une grille, aux mêmes conditions. */
  columnGap: string | null;
  padding: Padding;
  radius: Radius | null;
};

/**
 * La structure visuelle et dimensionnelle du composant.
 *
 * Les dimensions vivent à UN seul endroit : `sizes` quand le composant expose
 * un axe de tailles, sinon `gap` / `padding` / `radius` au niveau haut. Les
 * deux ne coexistent jamais — quand `sizes` existe, le niveau haut n'en serait
 * que la recopie de la taille de référence, et deux copies finissent toujours
 * par diverger.
 */
export type ContractStructure = {
  /** Disposition Figma du composant, traduite en vocabulaire CSS. */
  layout: LayoutDirection;
  /** Nombre de pistes, quand `layout` vaut `grid`. */
  columns?: number;
  rows?: number;
  /**
   * Taille de chaque piste, dans l'ordre du panneau Figma. Elles disent, avec
   * `columns` / `rows` et la place de chaque enfant, la boîte que la grille
   * donne à ses calques — ce qu'aucune dimension de calque ne décrit sous une
   * grille.
   */
  columnSizes?: GridTrack[];
  rowSizes?: GridTrack[];
  /** Espace entre les COLONNES d'une grille. */
  columnGap?: string | null;
  /**
   * Comportement du composant face à la place qu'on lui donne. Toujours
   * publié : c'est la première décision de qui l'intègre, et la déduire d'une
   * absence reviendrait à la deviner.
   */
  sizing: ContainerSizing;
  /**
   * Bornes de taille du composant lui-même. `sizing` dit comment il occupe la
   * place qu'on lui donne, ces bornes disent jusqu'où. Facultatives, à la
   * différence de `sizing` : une absence de borne est une information complète,
   * là où un comportement absent resterait à deviner.
   */
  bounds?: SizeBounds;
  /** Répartition Figma sur l'axe principal, absente hors auto-layout linéaire. */
  justifyContent?: JustifyContent;
  /** Alignement Figma sur l'axe secondaire, absent hors auto-layout linéaire. */
  alignItems?: AlignItems;
  /**
   * Le composant passe à la ligne. Ce n'est pas une dimension mais une
   * propriété de flux : elle reste ici même quand `sizes` porte les dimensions.
   */
  wrap?: true;
  /** Dimensions du composant, uniquement s'il n'a PAS d'axe de tailles. */
  gap?: string | null;
  /** Espace entre les lignes, aux mêmes conditions que `gap`. */
  rowGap?: string | null;
  padding?: Padding;
  radius?: Radius | null;
  /**
   * Dimensions PAR taille quand le composant expose un axe de tailles
   * (clés = valeurs de la prop `size` : big, medium, small…).
   * Absent pour un composant sans axe de tailles.
   */
  sizes?: Record<string, SizeDimensions>;
  /** Les slots enfants (icônes, label…), dans l'ordre des calques. */
  children: ChildStructure[];
  /**
   * Clés PUBLIQUES des axes de variantes, dans l'ordre d'imbrication de
   * variantTokens. Un axe sémantiquement renommé utilise ici la même clé que
   * dans `props` (`size`, jamais son ancien nom normalisé).
   */
  variantAxes: string[];
  /** Géométrie et couleur des strokes, rangées à part pour ne pas casser `variantTokens`. */
  variantStrokes: VariantStrokes;
  variantTokens: VariantTokens;
  /** Text styles appliqués à chaque slot de chaque combinaison d'axes. */
  variantTypography: VariantTypography;
};

/** Structure portable d'une combinaison exacte, sans les index globaux de matrice. */
export type VariantStructure = Omit<
  ContractStructure,
  'sizes' | 'variantAxes' | 'variantStrokes' | 'variantTokens' | 'variantTypography'
>;

/** Emplacement d'une icône dans l'arbre exact d'un variant. */
export type VariantIconPlacement = {
  figmaName: string;
  slotPath: string[];
};

/** Une combinaison réellement présente dans Figma et sa structure propre. */
export type ContractVariant = {
  nodeId: string;
  figmaName: string;
  values: Record<string, string>;
  structure: VariantStructure;
  /** Feuilles sémantiques directement adressables, sans axe synthétique. */
  tokens: SlotTokens;
  strokes: SlotStrokes;
  typography: TextStyleUse[];
  /** Dépendances de CETTE combinaison, dans l'ordre de son arbre. */
  composes: ComposedDependency[];
  /** Slots exacts des icônes, relatifs à `structure.children`. */
  icons: Record<string, VariantIconPlacement>;
};

/** L'endroit exact où une component property agit dans un variant. */
export type ComponentPropertyBinding = {
  prop: string;
  figmaPropName: string;
  target: 'visible' | 'characters' | 'mainComponent';
  nodeId: string;
  figmaPath: string[];
  variant: Record<string, string>;
};

export type ContractDiagnostic = {
  code: string;
  severity: 'warning' | 'error';
  message: string;
  figma?: {
    nodeId?: string;
    nodeName?: string;
    variantName?: string;
    property?: string;
  };
  contractPath?: string;
};

export type ContractCoverage = {
  /** Partiel dès que le contrat portable demande l'attention du designer. */
  portable: 'complete' | 'partial';
};

/**
 * Métadonnées d'identité du contrat : version du schéma, date d'export,
 * et traçabilité vers le composant Figma d'origine (id, clé, lien URL).
 */
export type ContractMeta = {
  /** Version du schéma du contrat — à incrémenter à chaque changement de forme. */
  contractVersion: string;
  /** Date/heure de l'export, au format ISO 8601. */
  exportedAt: string;
  /**
   * Ce que l'export n'a pas pu décrire, en français et adressé au designer.
   * Rangé sous `meta` parce qu'il documente l'EXPORT, pas le composant : un
   * consommateur du contrat n'a jamais à le lire pour rendre un composant.
   */
  warnings: string[];
  /** Diagnostics structurés ; `warnings` reste le miroir lisible et compatible. */
  diagnostics: ContractDiagnostic[];
  coverage: ContractCoverage;
  figma: {
    /** Nom du fichier Figma d'origine. */
    fileName: string;
    /** Id du nœud Component Set dans le fichier (ex. « 12:345 »). */
    nodeId: string;
    /** Clé de publication du composant (null si non publié). */
    componentKey: string | null;
    /**
     * Lien direct vers le composant dans Figma. Null quand l'API ne fournit
     * pas la clé du fichier (cas des plugins en développement).
     */
    url: string | null;
  };
};

/** Le contrat de composant complet — sortie de la commande « Export composant ». */
export type Contract = {
  /** Nom Figma exact, lisible ; le nom de fichier porte l'identifiant de code canonique. */
  name: string;
  meta: ContractMeta;
  props: Record<string, ContractProp>;
  /** Combinaisons exactes : aucune matrice cartésienne n'est inventée. */
  variants: ContractVariant[];
  /** Cibles natives des component properties, situées sans convention de nom. */
  propertyBindings: ComponentPropertyBinding[];
  structure: ContractStructure;
  /** Déclencheurs et priorité des états, ou null si le composant n'a pas d'axe d'état. */
  stateModel: StateModel | null;
  /** Vocabulaire de rendu des rôles (`background`, `foreground`, `icon`, `border`, `ring`…). */
  rendering: RenderingSemantics;
  /** Icônes qualifiées par les règles Figma, indexées par leur nom normalisé. */
  icons: Record<string, IconDefinition>;
  /** Text styles réellement utilisés, liés à leurs tokens DTCG. */
  textStyles: Record<string, TextStyleDefinition>;
  /**
   * Les composants unifiés que celui-ci embarque. Vide pour un composant
   * simple ; non vide, il fait de ce contrat celui d'un composé.
   */
  composes: ComposedDependency[];
  /** Liste à plat, dédupliquée et triée, de tous les tokens consommés. */
  tokensUsed: string[];
  intent: Intent | null;
};
