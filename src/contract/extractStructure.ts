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
  textStructureSignature,
} from './extractLayout';
import { extractSizeDimensions, findSizeRepresentatives } from './extractSizes';
import { extractVariantTokens } from './extractVariantTokens';
import { extractVariantTypography, textSlots } from './extractVariantTypography';
import { electSizeVariantLayoutNodes, electVariantLayoutNodes } from './layoutNodes';
import { variantRoleWarnings } from './semantics';
import type { ContractStructure, SizeDimensions, TextStyleDefinition } from './types';

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
  warnings: string[];
}> {
  const warnings = [...matrixWarnings];
  // Les règles `@icons` sont relevées avant toute extraction : c'est leur
  // inventaire qui distingue l'encre d'une icône de la surface d'un cadre.
  const iconTargets = new Set(iconNames);
  const { variantTokens, variantStrokes, discoveredRoles } = await extractVariantTokens(
    matrix,
    resolver,
    warnings,
    composed,
    iconTargets,
  );

  // Les rôles se relisent sur les arbres terminés, pas pendant l'extraction :
  // un seul message par rôle fautif au lieu d'un par variante, et la
  // vérification reste une fonction pure, testable sans runtime Figma.
  warnings.push(...variantRoleWarnings(variantTokens, variantStrokes));

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
    const referenceSignature = textStructureSignature(
      referenceLayout.layoutNode,
      targetedLayers,
      composed,
    );
    const divergentVariants = matrix.variants.filter(({ component }) =>
      textStructureSignature(layoutNodeOf(component), targetedLayers, composed)
        !== referenceSignature);
    if (divergentVariants.length > 0) {
      const examples = divergentVariants
        .slice(0, 3)
        .map(({ component }) => `« ${component.name} »`)
        .join(', ');
      const remaining = divergentVariants.length - 3;
      warnings.push(
        `Parties texte différentes sur ${divergentVariants.length} variant(s), ex. ${examples}` +
          `${remaining > 0 ? ` (+${remaining})` : ''} : l'export décrit le variant de ` +
          `référence « ${referenceLayout.component.name} ». L'ordre ou la disposition des autres ` +
          `variants ne sera pas représenté. Alignez leurs layers de texte dans Figma ; si la ` +
          `différence est intentionnelle, conservez-la et signalez cette limite du schéma.`,
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
      warnings.push(
        `Auto layout différent sur ${flexDivergentVariants.length} variant(s), ex. ${examples}` +
          `${remaining > 0 ? ` (+${remaining})` : ''} : l'export décrit le variant de ` +
          `référence « ${referenceLayout.component.name} ». Son alignement, le remplissage de ses ` +
          `layers ou leur dimension figée ne représentera pas les autres variants. Alignez les ` +
          `auto layouts dans Figma ; si la différence est intentionnelle, conservez-la et ` +
          `signalez cette limite du schéma.`,
      );
    }
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
    )
    // Sans composant à interroger, le contrat retient le comportement par
    // défaut plutôt que d'inventer un hug que rien ne montre.
    : {
      layout: 'flex-row' as const,
      sizing: { width: 'stretch' as const, height: 'stretch' as const },
      gap: null,
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
  );

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
  const { gap, padding, radius, ...slots } = layout;
  const dimensions = sizes ? { sizes } : { gap, padding, radius };

  const structure: ContractStructure = {
    ...slots,
    ...dimensions,
    variantAxes: matrix.axes,
    variantTokens,
    variantStrokes,
    variantTypography: typography.variantTypography,
  };

  return { structure, textStyles: typography.textStyles, iconLayers, discoveredRoles, warnings };
}
