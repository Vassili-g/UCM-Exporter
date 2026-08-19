/**
 * Assemblage de la « structure » du contrat : layout de référence,
 * dimensions par taille, slots enfants et arbre des tokens de variantes.
 * C'est l'orchestrateur des extractions de la Partie 1.
 */
import { VariableNameResolver } from '../variables';
import type { TokenResolver } from '../variables';
import type { VariantMatrix, WrapperReference } from './componentTree';
import type { ComposedInstances } from './exportableNodes';
import { extractIconLayers } from './extractIconLayers';
import type { IconLayerSummary } from './extractIconLayers';
import {
  extractLayout,
  flexLayoutSignature,
  placedDependenciesFromTree,
  structureSignature,
  warnLayersOutsideLayoutNode,
} from './extractLayout';
import type { PlacedDependencies } from './extractLayout';
import type { PublishedNodePaths } from './extractLayout';
import { extractSizeDimensions, findSizeRepresentatives } from './extractSizes';
import { extractVariantTokens } from './extractVariantTokens';
import type { VariantPaintNodeIds } from './extractVariantTokens';
import { extractVariantTypography, textSlots } from './extractVariantTypography';
import { electSizeVariantLayoutNodes, electVariantLayoutNodes } from './layoutNodes';
import { variantRoleWarnings } from './semantics';
import type {
  ComposedDependency,
  ContractStructure,
  ExtractedContractVariant,
  SizeDimensions,
  TextStyleDefinition,
  VariantPaintPlacements,
} from './types';

/**
 * Situe chaque clé de couleur par les chemins de l'arbre publié.
 *
 * Le chemin d'une peinture est celui du calque PUBLIÉ qui la porte : une couleur
 * posée sous une feuille appartient à cette feuille. C'est ce que le rendu
 * applique de toute façon, `color` et `fill` cascadant du slot vers le dessin.
 *
 * Aucun avertissement n'est produit ici, et il n'y a rien à y remettre : la vue
 * exacte part de la VRAIE racine du variant, la même que celle où `getSlotTokens`
 * relève les couleurs. Tout calque peint reçoit donc un chemin. Réclamer au
 * designer de « rendre publiable » un tracé d'icône lui demandait un geste que le
 * moteur refuse par principe d'honorer — le genre d'avertissement qu'on cesse de
 * lire, et qui laissait `paintPlacements` sans aucune cible pour cette clé.
 */
function paintPlacementsFromPaths(
  nodeIds: VariantPaintNodeIds | undefined,
  paths: PublishedNodePaths,
): VariantPaintPlacements {
  const field = (entries: Record<string, string[]> = {}): Record<string, string[][]> => (
    Object.fromEntries(Object.entries(entries).map(([key, ids]) => {
      // Deux tracés d'une même icône partagent le calque qui les publie : leur
      // chemin est le même, et le publier deux fois ferait compter au
      // consommateur deux cibles là où il n'en peindra jamais qu'une. Les
      // segments d'un slot ne contiennent pas de « / » (`normalizeName`), la
      // jointure identifie donc un chemin sans ambiguïté.
      const seen = new Set<string>();
      const placements: string[][] = [];
      for (const id of ids) {
        const path = paths.get(id);
        if (!path || seen.has(path.join('/'))) continue;
        seen.add(path.join('/'));
        placements.push(path);
      }
      return [key, placements];
    }))
  );
  return {
    fills: field(nodeIds?.fills),
    strokes: field(nodeIds?.strokes),
  };
}

/**
 * Sets susceptibles de porter l'axe de tailles, dans l'ordre où on les
 * interroge.
 *
 * L'axe vit d'ordinaire sur le wrapper de dimensions, mais rien ne l'y oblige :
 * il peut rester sur le set sélectionné pendant que le wrapper porte ses
 * propres axes. On retient donc les deux propriétaires possibles et on garde le
 * premier qui rend des dimensions. Élire le propriétaire sur le TYPE du node
 * ferait disparaître `sizes` en silence dès que le wrapper n'a pas d'axe de
 * tailles, alors que `props.size` continuerait d'annoncer ses valeurs au
 * consommateur.
 */
function proprietairesDAxeDeTailles(
  wrapper: WrapperReference | null,
  referenceComponent: ComponentNode | null,
): ComponentSetNode[] {
  const ownSet = referenceComponent?.parent;
  return [
    wrapper?.componentSet,
    ownSet?.type === 'COMPONENT_SET' ? ownSet : null,
  ].filter((owner): owner is ComponentSetNode => Boolean(owner));
}

export async function extractStructure(
  matrix: VariantMatrix,
  matrixWarnings: string[],
  wrapper: WrapperReference | null,
  referenceComponent: ComponentNode | null,
  // Injectable pour que l'extraction soit vérifiable hors du runtime Figma ;
  // en production, l'appelant laisse le résolveur mis en cache par défaut.
  resolver: TokenResolver = new VariableNameResolver(),
  // Instances des composants unifiés embarqués, et le nom de chacun.
  composed: ComposedInstances = new Map(),
  // Calques désignés par les règles `@icons`, relevés avant les slots : c'est
  // leur inventaire qui donne son rôle `icon` au slot correspondant.
  iconNames: readonly string[] = [],
): Promise<{
  structure: ContractStructure;
  textStyles: Record<string, TextStyleDefinition>;
  iconLayers: IconLayerSummary[];
  /** Rôle de rendu déduit des clés de couleur qui n'en nomment aucun. */
  discoveredRoles: Map<string, string>;
  /**
   * Dépendances que `structure.children` place réellement, indexées par le slot
   * qui les rend. C'est d'elles que `composes` se dérive, dans l'ordre de
   * l'arbre : le scan dit ce que Figma contient, l'arbre dit ce que le contrat
   * décrit, et seul le second engage le développeur.
   */
  placedComposes: PlacedDependencies;
  warnings: string[];
  /** Compatibilité historique ou documentation, sans perte dans la vue exacte. */
  notices: string[];
  /**
   * Constats sans perte ET sans geste à faire dans Figma. Ils décrivent ce que
   * le contrat publie, jamais ce qu'il a dû laisser tomber : la pull request
   * les range hors de la liste des points à corriger.
   */
  infos: string[];
  /** Une structure portable par combinaison réellement présente. */
  variants: ExtractedContractVariant[];
}> {
  const warnings = [...matrixWarnings];
  const notices: string[] = [];
  const infos: string[] = [];
  const placedComposes: PlacedDependencies = new Map();
  // Les règles `@icons` sont relevées avant toute extraction : c'est leur
  // inventaire qui distingue l'encre d'une icône de la surface d'un cadre.
  const iconTargets = new Set(iconNames);
  const {
    variantTokens,
    variantStrokes,
    tokensByComponent,
    strokesByComponent,
    paintNodeIdsByComponent,
    discoveredRoles,
  } = await extractVariantTokens(
    matrix,
    resolver,
    warnings,
    composed,
    iconTargets,
    notices,
  );

  // Les rôles se relisent sur les arbres terminés, pas pendant l'extraction :
  // un seul message par rôle fautif au lieu d'un par variante, et la
  // vérification reste une fonction pure, testable sans runtime Figma.
  warnings.push(...variantRoleWarnings(
    Object.fromEntries(Array.from(tokensByComponent, ([component, leaf]) => [component.id, leaf])),
    Object.fromEntries(Array.from(strokesByComponent, ([component, leaf]) => [component.id, leaf])),
  ));

  // Le node de layout de CHAQUE variant est élu ici, une fois. `findLayoutNode`
  // élit au score, et le score dépend de la racine : relancer l'élection depuis
  // une autre racine — le variant plutôt que son wrapper — désigne parfois un
  // autre node, et les slots des icônes comme les chemins de la typographie
  // cesseraient alors de décrire ceux du contrat.
  const layoutNodes = await electVariantLayoutNodes(
    matrix.variants.map((entry) => entry.component),
    referenceComponent ? { component: referenceComponent, wrapper } : null,
    warnings,
    composed,
  );
  // La carte couvre toute la matrice ; le repli n'existe que pour le typage.
  const layoutNodeOf = (component: ComponentNode): SceneNode =>
    layoutNodes.get(component) ?? component;
  const referenceLayout = referenceComponent
    ? { component: referenceComponent, layoutNode: layoutNodeOf(referenceComponent) }
    : null;

  // L'inventaire des icônes précède les slots : il couvre TOUTE la matrice,
  // là où le layout ne décrit que le variant de référence. C'est lui qui relève
  // les icônes que ce variant ne contient pas, et qui nomme leur slot.
  const iconLayers = await extractIconLayers(
    matrix,
    layoutNodes,
    iconNames,
    resolver,
    warnings,
    composed,
  );
  const targetedLayers = new Set(iconLayers.map((layer) => layer.figmaLayer));

  // `structure.children` décrit le variant de référence. Une récursion
  // textuelle différente ailleurs dans la matrice ne peut donc pas être
  // fusionnée silencieusement dans cet arbre unique.
  if (referenceLayout) {
    const referenceSignature = structureSignature(
      referenceLayout.layoutNode,
      targetedLayers,
      composed,
    );
    const divergentVariants = matrix.variants.filter(({ component }) =>
      structureSignature(layoutNodeOf(component), targetedLayers, composed)
        !== referenceSignature);
    if (divergentVariants.length > 0) {
      const examples = divergentVariants
        .slice(0, 3)
        .map(({ component }) => `« ${component.name} »`)
        .join(', ');
      const remaining = divergentVariants.length - 3;
      infos.push(
        `Structure différente sur ${divergentVariants.length} variant(s), ex. ${examples}` +
          `${remaining > 0 ? ` (+${remaining})` : ''} : l'export décrit le variant de ` +
          `référence « ${referenceLayout.component.name} ». La vue exacte référencée par ` +
          `chaque entrée de « variants » conserve sa propre structure ; seule la projection ` +
          `« structure » reste celle de la référence.`,
      );
    }

    const referenceFlexSignature = flexLayoutSignature(
      referenceLayout.layoutNode,
      targetedLayers,
      composed,
      referenceLayout.component,
    );
    const flexDivergentVariants = matrix.variants.filter(({ component }) =>
      flexLayoutSignature(layoutNodeOf(component), targetedLayers, composed, component)
        !== referenceFlexSignature);
    if (flexDivergentVariants.length > 0) {
      const examples = flexDivergentVariants
        .slice(0, 3)
        .map(({ component }) => `« ${component.name} »`)
        .join(', ');
      const remaining = flexDivergentVariants.length - 3;
      infos.push(
        `Auto layout différent sur ${flexDivergentVariants.length} variant(s), ex. ${examples}` +
          `${remaining > 0 ? ` (+${remaining})` : ''} : l'export décrit le variant de ` +
          `référence « ${referenceLayout.component.name} ». Les vues exactes de « variants » ` +
          `conservent leurs flux respectifs ; seule la projection « structure » reste celle ` +
          `de la référence.`,
      );
    }
  }

  // Un calque posé hors du node élu apporte ses couleurs à `variantTokens` dans
  // TOUS les variants, pas seulement dans la référence : le relevé des couleurs
  // couvre la matrice entière. `extractLayout` ne voit que la référence, on
  // complète donc ici. Les messages identiques se dédupliquent à l'export.
  for (const { component } of matrix.variants) {
    if (component === referenceLayout?.component) continue;
    warnLayersOutsideLayoutNode(component, layoutNodeOf(component), notices, composed);
  }

  // « Où vivent les dimensions » se décide AVANT de les relever, et une seule
  // fois : c'est cette réponse que suivent à la fois l'extraction du layout de
  // référence et le choix final de `dimensions`. La décider après coup ferait
  // relever — donc avertir sur — des valeurs aussitôt jetées.
  const sizeAxisOwners = proprietairesDAxeDeTailles(wrapper, referenceComponent);
  const aUnAxeDeTailles = sizeAxisOwners.some((owner) => findSizeRepresentatives(owner) !== null);

  const layout = referenceLayout
    ? await extractLayout(
      referenceLayout.layoutNode,
      resolver,
      warnings,
      composed,
      targetedLayers,
      referenceLayout.component,
      !aUnAxeDeTailles,
      placedComposes,
      new Set(),
      notices,
      infos,
    )
    // Sans composant à interroger, le contrat retient le comportement par
    // défaut plutôt que d'inventer un hug que rien ne montre.
    : {
      layout: 'flex-row' as const,
      sizing: { width: 'stretch' as const, height: 'stretch' as const },
      gap: null,
      rowGap: null,
      columnGap: null,
      padding: { x: null, y: null },
      radius: null,
      children: [],
    };

  if (!referenceLayout) {
    warnings.push(
      'Aucun auto layout frame trouvé dans le composant : ni gap, ni padding, ni corner ' +
        'radius ne sont exportés.',
    );
  }

  // Vue fidèle de chaque combinaison : elle part de la vraie racine du variant
  // et conserve donc les wrappers que l'ancienne projection de référence
  // écartait par élection. `structure` reste la projection de référence ; les
  // vues exactes sont l'autorité depuis la 8.0.
  const exactLayouts: Array<{
    entry: VariantMatrix['variants'][number];
    structure: ExtractedContractVariant['structure'];
    placed: PlacedDependencies;
    paths: PublishedNodePaths;
  }> = [];
  for (const entry of matrix.variants) {
    const exactPlaced: PlacedDependencies = new Map();
    const exactPaths: PublishedNodePaths = new Map();
    const exactStructure = await extractLayout(
      entry.component,
      resolver,
      warnings,
      composed,
      targetedLayers,
      entry.component,
      true,
      exactPlaced,
      aUnAxeDeTailles ? new Set([layoutNodeOf(entry.component).id]) : new Set(),
      warnings,
      infos,
      exactPaths,
    );
    exactLayouts.push({ entry, structure: exactStructure, placed: exactPlaced, paths: exactPaths });
  }

  const referenceTextSlotPaths = new Set(
    referenceLayout
      ? textSlots(referenceLayout.layoutNode, targetedLayers, composed)
        .map(({ slotPath }) => JSON.stringify(slotPath))
      : [],
  );
  const typography = await extractVariantTypography(
    matrix,
    layoutNodes,
    resolver,
    warnings,
    composed,
    targetedLayers,
    referenceTextSlotPaths,
    undefined,
    notices,
  );
  const exactTypography = await extractVariantTypography(
    matrix,
    new Map(matrix.variants.map((entry) => [entry.component, entry.component])),
    resolver,
    warnings,
    composed,
    targetedLayers,
  );
  const variants: ExtractedContractVariant[] = exactLayouts.map(({
    entry, structure: exactStructure, placed, paths,
  }) => (
    {
      nodeId: entry.component.id,
      figmaName: entry.component.name,
      values: { ...entry.values },
      structure: exactStructure,
      tokens: tokensByComponent.get(entry.component) ?? {},
      strokes: strokesByComponent.get(entry.component) ?? {},
      typography: exactTypography.typographyByComponent.get(entry.component) ?? [],
      composes: placedDependenciesFromTree(exactStructure.children, placed),
      icons: {},
      paintPlacements: paintPlacementsFromPaths(
        paintNodeIdsByComponent.get(entry.component),
        paths,
      ),
    }
  ));

  // Dimensions par taille, pour couvrir big/medium/small et pas seulement la
  // taille instanciée par défaut.
  let sizes: Record<string, SizeDimensions> | null = null;
  for (const owner of sizeAxisOwners) {
    // Un set sans axe de tailles n'a pas de représentants : on passe au suivant
    // sans avoir rien élu ni rien signalé.
    const representatives = findSizeRepresentatives(owner);
    if (!representatives) continue;
    // Les variants du wrapper n'appartiennent pas à la matrice et n'ont donc
    // pas encore de node élu ; ceux du set sélectionné gardent celui de la
    // matrice. L'élection reste dans `layoutNodes.ts`, ici comme ailleurs.
    sizes = await extractSizeDimensions(
      owner,
      resolver,
      warnings,
      electSizeVariantLayoutNodes(representatives.values(), layoutNodes, warnings, composed),
    );
    if (sizes) break;
  }

  // Les dimensions géométriques ne vivent qu'à UN endroit : `sizes` les porte
  // toutes dès qu'un axe de tailles existe, sinon elles restent au niveau haut.
  // La typographie a son propre catalogue et son arbre complet de variants.
  const { gap, rowGap, columnGap, padding, radius, ...slots } = layout;
  const dimensions = sizes ? { sizes } : { gap, rowGap, columnGap, padding, radius };

  const structure: ContractStructure = {
    ...slots,
    ...dimensions,
    variantAxes: matrix.axes,
    variantTokens,
    variantStrokes,
    variantTypography: typography.variantTypography,
  };

  return {
    structure,
    textStyles: { ...typography.textStyles, ...exactTypography.textStyles },
    iconLayers,
    discoveredRoles,
    placedComposes,
    warnings,
    notices,
    infos,
    variants,
  };
}
