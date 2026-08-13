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
  ContainerSizing,
  JustifyContent,
} from './types';

type FlexContainerProperties = {
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
};

type FlexItemProperties = {
  alignSelf?: AlignSelf;
  flexGrow?: 1;
};

type FigmaPropertyBag = Record<string, unknown>;

/** Vrai pour les deux auto-layouts que le contrat sait traduire en Flex. */
export function isLinearAutoLayout(node: SceneNode): boolean {
  const mode = (node as unknown as FigmaPropertyBag).layoutMode;
  return mode === 'HORIZONTAL' || mode === 'VERTICAL';
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
 * Dimensionnement propre du composant, axe par axe.
 *
 * Seul `Hug` est une intention de comportement : il dit que le composant se
 * limite à son contenu. Une largeur fixe posée sur un variant ne l'est pas —
 * c'est le plus souvent une commodité de mise en page dans Figma, pour aligner
 * les variants d'un component set entre eux. La publier reviendrait à figer
 * dans le contrat une décision de présentation, et à imposer cette largeur à
 * toutes les pages qui intègrent le composant. Le défaut est donc `fill` : le
 * composant occupe la place que son intégration lui donne.
 *
 * C'est l'inverse de la règle des slots, et pour une raison : un slot vit dans
 * l'auto-layout de ce composant, dont le contrat décrit tout le contexte ; un
 * composant, lui, ne connaît pas son futur parent.
 */
export function containerSizing(node: SceneNode): ContainerSizing {
  const values = asPropertyBag(node);
  return {
    horizontal: values.layoutSizingHorizontal === 'HUG' ? 'hug' : 'fill',
    vertical: values.layoutSizingVertical === 'HUG' ? 'hug' : 'fill',
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

/**
 * Alignement du conteneur Figma. Les deux champs forment une paire : si l'API
 * ne fournit pas les deux, le contrat les omet plutôt que de compléter le
 * second avec un défaut CSS inventé.
 */
export function flexContainerProperties(
  node: SceneNode,
  warnings: string[] = [],
): FlexContainerProperties {
  if (!isLinearAutoLayout(node)) return {};

  const values = asPropertyBag(node);
  const primary = values.primaryAxisAlignItems;
  const counter = values.counterAxisAlignItems;
  if (primary === undefined || counter === undefined) return {};

  const justify = justifyContent(primary);
  const align = alignItems(counter);
  if (justify && align) return { justifyContent: justify, alignItems: align };

  warnings.push(
    `Layer « ${node.name} » : son alignement d'auto layout est illisible. Le contrat ne ` +
      `publie ni justifyContent ni alignItems, car une valeur CSS devinée déplacerait ses ` +
      `enfants. Réglez l'alignement principal et secondaire dans Figma, puis réexportez.`,
  );
  return {};
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
): FlexItemProperties {
  if (!isLinearAutoLayout(parent)) return {};

  const values = asPropertyBag(child);
  if (values.layoutPositioning === 'ABSOLUTE') {
    warnings.push(
      `Layer « ${child.name} » : il est en position « Absolute » dans l'auto layout « ${parent.name} ». ` +
        `Le contrat ne publie pas ses coordonnées ; son placement manquera au développeur. ` +
        `Replacez-le dans le flux de l'auto layout si ce placement doit être contractuel, puis réexportez.`,
    );
    return {};
  }

  const result: FlexItemProperties = {};
  const sizing = childSizing(parent, child);

  // Axe secondaire. Dans Figma, HUG et STRETCH sont incompatibles sur le même
  // axe. Des nodes anciens ou des instances peuvent toutefois exposer les deux
  // valeurs ; le menu de dimensionnement est alors l'intention la plus précise.
  // Sans cette priorité, le consommateur CSS étirerait un composant que Figma
  // garde hug. Un HUG n'annule que l'étirement : `MIN`, `CENTER` et `MAX`
  // alignent un enfant sans rien dire de sa taille, et restent publiés.
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
  // en fill, et l'oublier ferait disparaître du contrat un remplissage encore
  // vrai dans Figma.
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
