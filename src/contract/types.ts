/**
 * Types du contrat UCS (Unified Component Specification).
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
};

/** Prop texte libre (issue d'une propriété TEXT Figma). */
export type StringProp = PropMeta & {
  type: 'string';
  default: string | null;
};

/** Une prop publique du composant, quel que soit son type. */
export type ContractProp = EnumProp | BooleanProp | StringProp;

/**
 * Intention d'usage du composant, lue depuis la description Figma taguée
 * (`@usage`, `@do`, `@dont`, `@pairs`). C'est la partie « guidelines »
 * de l'UCS : elle dit à un humain ou à un agent IA QUAND utiliser le
 * composant, pas seulement COMMENT.
 */
export type Intent = {
  usage: string | null;
  do: string[];
  dont: string[];
  pairs: string[];
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
  /** Nom Figma d'origine, conservé quand `slot` a été renommé (ex. label ← « Suivant »). */
  figmaLayer?: string;
  /** Vrai pour les calques graphiques (icônes…), activables/désactivables. */
  optional?: boolean;
  /** Token de taille du calque (ex. taille d'icône). */
  size?: string;
  /** Typographie du calque texte : nom de style OU détail par token. */
  typography?: string | TypographyTokens;
  /** Token de couleur du texte (foreground du variant de référence). */
  color?: string;
};

/**
 * Tokens liés sur UN variant, rangés par rôle. Le rôle est le dernier
 * segment du nom du token : `…default.background` → rôle `background`.
 * Liste ouverte : background, foreground, border, ring, shadow…
 */
export type SlotTokens = Record<string, string>;

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

/** La structure visuelle et dimensionnelle du composant. */
export type ContractStructure = {
  /** Sens de l'auto-layout Figma, traduit en vocabulaire CSS. */
  layout: 'flex-row' | 'flex-column';
  /** Dimensions de la taille de référence (celle instanciée par défaut). */
  gap: string | null;
  padding: { x: string | null; y: string | null };
  radius: string | null;
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
  variantTokens: VariantTokens;
};

/**
 * Métadonnées d'identité du contrat : version du schéma, date d'export,
 * et traçabilité vers le composant Figma d'origine (id, clé, lien URL).
 */
export type ContractMeta = {
  /** Version du schéma UCS — à incrémenter à chaque changement de forme. */
  ucsVersion: string;
  /** Date/heure de l'export, au format ISO 8601. */
  exportedAt: string;
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

/** Le contrat UCS complet — la sortie de la commande « Export composant ». */
export type Contract = {
  name: string;
  meta: ContractMeta;
  props: Record<string, ContractProp>;
  structure: ContractStructure;
  /** Liste à plat, dédupliquée et triée, de tous les tokens consommés. */
  tokensUsed: string[];
  intent: Intent | null;
  warnings: string[];
};
