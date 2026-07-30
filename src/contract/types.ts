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
 * Prop runtime qui porte le nom d'une icône modifiable. Elle est ajoutée à
 * côté du BOOLEAN Figma qui contrôle visuellement le calque correspondant.
 */
export type IconProp = PropMeta & {
  type: 'icon';
  default: string | null;
  policy: 'modifiable';
  /** Prop BOOLEAN Figma liée nativement à la visibilité du calque. */
  visibilityProp: string;
};

/** Une prop publique du composant, quel que soit son type. */
export type ContractProp = EnumProp | BooleanProp | StringProp | IconProp;

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

/** Correspondance des rôles sémantiques vers le rendu, sans logique par composant. */
export type RenderingSemantics = {
  roles: Record<string, RenderingRole>;
};

/**
 * Typographie du calque texte, exprimée en NOMS de tokens (jamais en valeurs
 * brutes). Chaque champ est optionnel : on n'exporte que ce qui est
 * réellement lié à une variable dans Figma.
 */
export type TypographyTokens = Partial<{
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  fontFamily: string;
}>;

/** Un enfant direct du composant (un « slot ») : icône, label, etc. */
export type ChildStructure = {
  /** Nom du slot : rôle sémantique (`label`) ou nom du calque Figma. */
  slot: string;
  /** Nom Figma d'origine, toujours conservé pour tracer labels et placeholders graphiques. */
  figmaLayer?: string;
  /** Vrai pour les calques graphiques et pour tout slot qu'une prop peut masquer. */
  optional?: boolean;
  /** Prop BOOLEAN Figma liée nativement à `visible` sur ce calque, si elle existe. */
  visibilityProp?: string;
  /** Token de taille du calque (ex. taille d'icône). */
  size?: string;
  /** Typographie du calque texte : nom de style OU détail par token. */
  typography?: string | TypographyTokens;
  /**
   * Nom du composant unifié rendu à cet emplacement. Le slot est alors une
   * DÉPENDANCE : ni ses tokens ni ses calques n'appartiennent à ce contrat,
   * ils vivent dans le sien (cf. `Contract.composes`).
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
  /** Prop BOOLEAN qui contrôle la visibilité du calque, si Figma en déclare une. */
  visibilityProp?: string;
  /** Prop runtime ajoutée pour une icône `modifiable`, distincte du booléen. */
  runtimeProp?: string;
};

/** Alignement d'un stroke Figma, conservé comme donnée structurelle. */
export type StrokeAlignment = 'inside' | 'center' | 'outside';

/** Couleur et géométrie tokenisées d'un stroke porté par un rôle (`border`, `ring`…). */
export type StrokeTokens = {
  color: string;
  /** Token de largeur ; null si Figma expose une largeur non tokenisée. */
  width: string | null;
  /** Alignement structurel du stroke dans Figma. */
  align: StrokeAlignment | null;
};

/**
 * Tokens de peinture liés sur UN variant, rangés par rôle. Le rôle est le
 * dernier segment du nom du token : `…default.background` → `background`.
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
 * Dimensions d'UNE taille du composant (une valeur de la prop `size`).
 * Tout est exprimé en noms de tokens.
 */
export type SizeDimensions = {
  gap: string | null;
  padding: { x: string | null; y: string | null };
  radius: string | null;
  /** Token de taille de police propre à cette taille, si lié. */
  fontSize?: string;
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
  /** Sens de l'auto-layout Figma, traduit en vocabulaire CSS. */
  layout: 'flex-row' | 'flex-column';
  /** Dimensions du composant, uniquement s'il n'a PAS d'axe de tailles. */
  gap?: string | null;
  padding?: { x: string | null; y: string | null };
  radius?: string | null;
  /**
   * Dimensions PAR taille quand le composant expose un axe de tailles
   * (clés = valeurs de la prop `size` : big, medium, small…).
   * Absent pour un composant sans axe de tailles.
   */
  sizes?: Record<string, SizeDimensions>;
  /** Les slots enfants (icônes, label…), dans l'ordre des calques. */
  children: ChildStructure[];
  /** Noms des axes de variantes, dans l'ordre d'imbrication de variantTokens. */
  variantAxes: string[];
  /** Géométrie et couleur des strokes, rangées à part pour ne pas casser `variantTokens`. */
  variantStrokes: VariantStrokes;
  variantTokens: VariantTokens;
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
  name: string;
  meta: ContractMeta;
  props: Record<string, ContractProp>;
  structure: ContractStructure;
  /** Déclencheurs et priorité des états, ou null si le composant n'a pas d'axe d'état. */
  stateModel: StateModel | null;
  /** Vocabulaire de rendu des rôles (`background`, `foreground`, `border`, `ring`…). */
  rendering: RenderingSemantics;
  /** Icônes qualifiées par les règles Figma, indexées par leur nom normalisé. */
  icons: Record<string, IconDefinition>;
  /**
   * Les composants unifiés que celui-ci embarque. Vide pour un composant
   * simple ; non vide, il fait de ce contrat celui d'un composé.
   */
  composes: ComposedDependency[];
  /** Liste à plat, dédupliquée et triée, de tous les tokens consommés. */
  tokensUsed: string[];
  intent: Intent | null;
};
