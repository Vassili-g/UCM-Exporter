/**
 * Commande « Export composant » : transforme le Component ou Component Set sélectionné
 * en contrat de composant (fichier `<Nom>.contract.json` téléchargé).
 *
 * Déroulé : sélection → props → matrice de variantes → wrapper de dimensions
 * → structure (layout, tailles, tokens) → intention → contrat final.
 */
import {
  buildFigmaVariantLabels,
  buildVariantMatrix,
  findMissingVariantCombinations,
  findWrapperReference,
} from './componentTree';
import { indexContractedNamesInDocument, scanComposedMatrix } from './composedComponents';
import { extractRules } from './extractRules';
import { extractStructure } from './extractStructure';
import { extractContractPropertyModel } from './parsers';
import { buildContractPropertySurface } from './propertySurface';
export { mergeWrapperProps } from './propertySurface';
import { mergeBooleanDescriptions } from './mergeBooleanDescriptions';
import { extractPropertyBindings } from './propertyBindings';
import { compactVariants, intern, signature } from './compactVariants';
import { CATALOGUES_DE_VUES, elideContract, elideNeutrals } from './elideNeutrals';
import { serializeJson } from './serializeJson';
import { extractVariantSample, sampleVarianceNotice } from './extractSamples';
import { mergeIconRules } from './mergeIconRules';
export { mergeIconRules } from './mergeIconRules';
import { mergePropDescriptions } from './mergePropDescriptions';
export { mergePropDescriptions } from './mergePropDescriptions';
import { buildStateModel, renderingSemanticsFor } from './semantics';
import { indexVariables, VariableNameResolver } from '../variables';
import { codeIdentifier } from '@ucm-kit/core/format';
import { CONTRACT_VERSION } from '@ucm-kit/core/format';
import type { Annonce } from '../messages';
import type {
  ChildStructure,
  ComposedDependency,
  Contract,
  ContractMeta,
  ExtractedContractVariant,
} from '@ucm-kit/core/format';

/** Union ordonnée des dépendances exactes, avec leur cardinalité maximale. */
function mergeVariantDependencies(
  variants: ReadonlyArray<ExtractedContractVariant>,
): ComposedDependency[] {
  const result: ComposedDependency[] = [];
  const maximumBySignature = new Map<string, number>();
  for (const variant of variants) {
    const occurrences = new Map<string, number>();
    for (const dependency of variant.composes) {
      const signature = JSON.stringify([
        dependency.component,
        dependency.figmaLayer,
        dependency.visibilityProp ?? null,
      ]);
      const occurrence = (occurrences.get(signature) ?? 0) + 1;
      occurrences.set(signature, occurrence);
      if (occurrence > (maximumBySignature.get(signature) ?? 0)) {
        maximumBySignature.set(signature, occurrence);
        result.push(dependency);
      }
    }
  }
  return result;
}

function iconPaths(children: readonly ChildStructure[], figmaName: string): string[][] {
  const paths: string[][] = [];
  const visit = (entries: readonly ChildStructure[], parent: string[]) => {
    for (const entry of entries) {
      const path = [...parent, entry.slot];
      if (entry.figmaLayer === figmaName || (!entry.figmaLayer && entry.slot === figmaName)) {
        paths.push(path);
      }
      if (entry.children) visit(entry.children, path);
    }
  };
  visit(children, []);
  return paths;
}

/** Ce que la commande renvoie à l'UI : le fichier à télécharger + un bilan. */
export type ComponentExport = {
  filename: string;
  content: string;
  warningCount: number;
  /** Ce qui manque au contrat et appelle un geste dans Figma. */
  warnings: string[];
  /**
   * Ce que l'export documente sans rien perdre : la valeur est dans le
   * contrat et le designer n'a rien à corriger. Séparé de `warnings` pour que
   * la pull request ne réclame pas une correction qu'elle dit inutile.
   */
  infos: string[];
};

/** Erreur « métier » : son message est affiché tel quel à l'utilisateur. */
export class ComponentExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComponentExportError';
  }
}

/** Message bloquant, formulé comme une action Figma plutôt que comme un concept mathématique. */
/** Vérifie que la sélection est bien UN composant exportable, sinon erreur claire. */
function getSelectedComponent(): ComponentNode | ComponentSetNode {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    throw new ComponentExportError('Sélectionnez un seul Component ou Component Set dans Figma.');
  }

  const node = selection[0];
  if (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT') {
    throw new ComponentExportError('La sélection doit être un COMPONENT ou un COMPONENT_SET.');
  }

  return node;
}

/**
 * Construit les métadonnées de traçabilité vers Figma.
 *
 * **`meta.figma.url` n'est plus écrit, et c'est une décision, pas une panne
 * (T4.4).** `figma.fileKey` est réservé aux plugins qui déclarent
 * `enablePrivatePluginApi`, drapeau que seul un plugin PRIVÉ d'organisation a
 * le droit de porter. Le plugin se distribue désormais par la Figma Community :
 * le drapeau est retiré du manifest, donc la clé du fichier n'arrive jamais, et
 * le champ reste vide sur chaque export.
 *
 * Le calcul est laissé en place plutôt que supprimé. Ce n'est pas du code mort
 * par indécision : `url` reste OPTIONNEL dans le format, une distribution
 * privée reste possible pour qui charge ce plugin en développement dans une
 * organisation, et la troisième voie de D6 — demander la clé dans la
 * configuration — le rebrancherait ici sans rien réécrire. Le jour où le champ
 * doit vraiment disparaître, c'est le format qui change de version, pas ce
 * module.
 *
 * Ce qui remplace le lien : `fileName` et `nodeId`, que le contrat porte
 * toujours, et que le corps de la pull request annonce désormais sur sa page de
 * couverture (T4.2). C'est là que la seconde condition de D6 — « la traçabilité
 * par `fileName` et `nodeId` suffit-elle à une revue ? » — se constate sur une
 * pull request réelle, ce qu'aucun raisonnement ne pouvait trancher.
 */
function buildMeta(
  componentSet: ComponentNode | ComponentSetNode,
): Omit<ContractMeta, 'diagnostics' | 'coverage'> {
  const fileKey = figma.fileKey ?? null;
  const fileName = figma.root.name;
  const nodeId = componentSet.id;
  // Format d'URL Figma : les « : » de l'id de nœud deviennent des « - ».
  const url = fileKey
    ? `https://www.figma.com/design/${fileKey}/${encodeURIComponent(fileName)}?node-id=${nodeId.replace(/:/g, '-')}`
    : undefined;

  return {
    contractVersion: CONTRACT_VERSION,
    exportedAt: new Date().toISOString(),
    figma: {
      fileName,
      nodeId,
      ...(componentSet.key ? { componentKey: componentSet.key } : {}),
      ...(url ? { url } : {}),
    },
  };
}

/** Le nom de fichier EST l'identifiant de code canonique du composant. */
export function componentContractFilename(name: string): string {
  return `${codeIdentifier(name)}.contract.json`;
}

/**
 * Point d'entrée de la commande : crée le contrat du composant sélectionné.
 *
 * `annoncer` NOMME les étapes traversées, il n'en décide aucune (U2.6). Cet
 * export charge toutes les pages puis résout trois fois le même maître par
 * dépendance : un coût réel, non mesuré, pendant lequel un « Analyse du
 * composant… » figé se lit comme un plantage. Les étapes portent le nom de ce
 * que le code fait, jamais une durée ni un pourcentage — la mesure n'existe
 * pas, et une barre de progression inventerait une précision qu'on n'a pas.
 */
export async function handleExportComponent(annoncer: Annonce = () => {}): Promise<ComponentExport> {
  const componentSet = getSelectedComponent();
  annoncer('Lecture des règles d’usage…');

  // Les règles enrichissent l'intention et la documentation, mais ne sont plus
  // une précondition d'export. Leur absence reste visible dans les diagnostics.
  const rules = await extractRules(componentSet);
  const warnings: string[] = [...rules.warnings];
  // Sous-ensemble qui mesure réellement la projection UCM. Les avertissements
  // de documentation (règles), de traçabilité (URL) et de compatibilité avec
  // l'ancienne vue de référence ne rendent pas un arbre exact incomplet.
  const projectionWarnings: string[] = [];
  // Ce que l'export DOCUMENTE, par opposition à ce qu'il n'a pas su décrire.
  // Rien n'y manque et rien n'y est à corriger : la pull request les range
  // hors des points à traiter, et le compteur de l'UI les ignore. Deux
  // sous-ensembles distincts, parce que « sans perte de portabilité » ne veut
  // pas dire « sans geste à faire » : une combinaison de variants absente ou
  // une règle d'usage qui cite une prop inconnue ne coûtent rien à l'arbre
  // exact, mais le designer doit bien y retourner.
  const exportInfos: string[] = [];
  const addProjectionWarnings = (messages: readonly string[]) => {
    projectionWarnings.push(...messages);
  };
  const markProjectionWarningsSince = (index: number) => {
    addProjectionWarnings(warnings.slice(index));
  };
  let warningCursor = warnings.length;
  const propertyModel = extractContractPropertyModel(
    componentSet.componentPropertyDefinitions,
    warnings,
  );
  markProjectionWarningsSince(warningCursor);
  warningCursor = warnings.length;
  const missingVariants = componentSet.type === 'COMPONENT_SET'
    ? findMissingVariantCombinations(componentSet)
    : null;
  if (missingVariants) {
    // Une matrice clairsemée est parfois voulue, parfois oubliée : le contrat ne
    // peut pas trancher, mais le designer si. Le constat reste donc un
    // avertissement, et nomme le geste — sans quoi il ne serait qu'une ligne de
    // plus à survoler dans la pull request.
    const plusieurs = missingVariants.missing > 1;
    warnings.push(
      `Component Set « ${componentSet.name} » : ${missingVariants.missing} `
        + `combinaison${plusieurs ? 's' : ''} du produit cartésien de ses axes `
        + `${plusieurs ? "n'existent" : "n'existe"} pas. Le contrat ${CONTRACT_VERSION} publie `
        + `uniquement les combinaisons exactes présentes dans « variants » ; aucune `
        + `combinaison interdite n'est inventée. ${plusieurs ? 'Si ces combinaisons doivent '
          + 'exister, ajoutez-les' : 'Si cette combinaison doit exister, ajoutez-la'} dans Figma, `
        + `puis réexportez.`,
    );
  }
  // La liste exacte porte cet écart : il ne manque rien à la projection v8.
  warningCursor = warnings.length;
  annoncer('Lecture des variants…');
  const { matrix, warnings: matrixWarnings } = buildVariantMatrix(
    componentSet,
    propertyModel.publicVariantKeyByRawKey,
  );
  if (matrix.variants.length === 0) {
    throw new ComponentExportError(
      `Export impossible pour « ${componentSet.name} » : ce Component Set ne contient aucun `
        + `variant COMPONENT. Ajoutez au moins un variant dans Figma, puis réexportez.`,
    );
  }
  // Le variant de référence sert de base au layout.
  const referenceComponent = componentSet.type === 'COMPONENT_SET'
    ? componentSet.defaultVariant ?? matrix.variants[0]?.component ?? null
    : componentSet;

  // La composition se relève AVANT toute extraction : un composant unifié
  // imbriqué n'est ni un wrapper, ni un slot à parcourir, et cette décision
  // conditionne tout ce qui suit.
  annoncer('Lecture des composants imbriqués…');
  const {
    composes: scannedComposes,
    composed,
    mainByInstanceId,
    warnings: compositionWarnings,
    infos: compositionInfos,
    swapDefaults,
    propertySurfaces,
  } = await scanComposedMatrix(
    matrix.variants.map((entry) => entry.component),
    referenceComponent,
    await indexContractedNamesInDocument(),
  );
  warnings.push(...compositionWarnings, ...compositionInfos);
  // Une instance dont le composant maître est illisible coûte au contrat : ses
  // layers passent pour les nôtres et la dépendance manque à `composes`. C'est
  // une perte de portabilité, et elle se marque comme telle.
  addProjectionWarnings(compositionWarnings);
  // Les arbres exacts portent la composition propre à chaque variante : la note
  // le dit elle-même, et ne demande donc aucun geste. La ranger dans le seul
  // canal `warnings` la faisait compter dans `warningCount` et paraître sous
  // « Corrigez chaque point », où son propre texte répond qu'il n'y a rien à
  // corriger. Son jumeau, « Structure différente sur N variants », vit dans
  // `infos` depuis toujours.
  exportInfos.push(...compositionInfos);
  warningCursor = warnings.length;

  const wrapper = referenceComponent
    ? await findWrapperReference(referenceComponent, warnings, composed)
    : null;
  const stateModel = buildStateModel(
    matrix.axes,
    matrix.variants.map((entry) => entry.values),
    warnings,
  );

  const propertySurface = buildContractPropertySurface(
    componentSet.componentPropertyDefinitions,
    wrapper?.componentSet?.componentPropertyDefinitions,
    warnings,
    propertyModel,
  );
  const props = propertySurface.props;
  const publicPropertyKeyByFigmaName = propertySurface.publicPropertyKeyByFigmaName;
  markProjectionWarningsSince(warningCursor);
  warningCursor = warnings.length;

  const { bindings: propertyBindings, applied: appliedByVariant } = extractPropertyBindings(
    matrix,
    publicPropertyKeyByFigmaName,
    warnings,
    composed,
    mainByInstanceId,
  );
  markProjectionWarningsSince(warningCursor);
  warningCursor = warnings.length;

  if (Object.keys(componentSet.componentPropertyDefinitions).length === 0) {
    warnings.push(
      'Le composant sélectionné n’expose aucune component property : le contrat ne ' +
        'décrira ni variants ni options.',
    );
  }
  // Une API vide est complète pour un composant qui n'expose aucune propriété.
  warningCursor = warnings.length;

  // Le résolveur reçoit l'index des variables locales pour deux raisons : il y
  // lit les chemins sans un aller-retour par variable, et il sait quelles
  // variables partagent un nom — les seules qu'un contrat ne doit jamais citer.
  annoncer('Écriture du contrat…');
  const [collections, variables] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync(),
  ]);
  const index = indexVariables(variables, new Map(collections.map((c) => [c.id, c])));
  const resolver = new VariableNameResolver({ index, warnings });

  const extracted = await extractStructure(
    matrix,
    matrixWarnings,
    wrapper,
    referenceComponent,
    resolver,
    composed,
    rules.iconRules.map((rule) => rule.iconName),
  );
  markProjectionWarningsSince(warningCursor);
  addProjectionWarnings(extracted.warnings);
  warnings.push(...extracted.notices, ...extracted.infos);
  exportInfos.push(...extracted.infos);
  warningCursor = warnings.length;

  // La documentation issue des règles s'accroche aux props de même nature, et
  // aux états pour l'axe que `stateModel` publie à la place des props.
  mergePropDescriptions(props, stateModel, rules.propDescriptions, warnings);
  mergeBooleanDescriptions(props, rules.booleanDescriptions, warnings);
  // Ces deux fusions ne portent que la documentation des règles.
  warningCursor = warnings.length;
  const icons = mergeIconRules(props, extracted.iconLayers, rules.iconRules, warnings);
  markProjectionWarningsSince(warningCursor);
  warningCursor = warnings.length;
  for (const variant of extracted.variants) {
    for (const [key, definition] of Object.entries(icons)) {
      const exactLayer = extracted.iconLayers.find(
        (layer) => layer.figmaLayer === definition.figmaName,
      );
      // Les coordonnées d'axes ne suffisent pas quand deux variants se
      // normalisent pareil. L'inventaire garde donc l'id du node exact : une
      // icône présente dans le second ne doit pas être inventée dans le premier.
      const active = exactLayer?.variantNodeIds.includes(variant.nodeId) ?? false;
      if (!active) continue;
      const paths = iconPaths(variant.structure.children ?? [], definition.figmaName);
      if (paths.length === 1) {
        variant.icons[key] = { figmaName: definition.figmaName, slotPath: paths[0] };
        continue;
      }
      const message = paths.length === 0
        ? `Icône « ${definition.figmaName} » du variant « ${variant.figmaName} » : aucun slot `
          + `exact ne la situe. Rendez son layer publiable dans le composant, puis réexportez.`
        : `Icône « ${definition.figmaName} » du variant « ${variant.figmaName} » : plusieurs `
          + `slots exacts portent ce nom. Donnez un nom Figma distinct à chaque layer, puis réexportez.`;
      warnings.push(message);
      projectionWarnings.push(message);
    }
  }
  warningCursor = warnings.length;
  const intent = rules.intent;
  if (!intent) {
    warnings.push(
      'Aucune règle @usage, @do, @dont ou @pairs : le contrat dira comment utiliser le ' +
        'composant, mais pas quand. Ajoutez au moins une règle @usage.',
    );
  }
  warningCursor = warnings.length;

  // Chaque composition de vue se DÉRIVE de son arbre exact, comme
  // `tokensUsed` se dérive du contrat terminé. Le champ global en est l'union
  // ordonnée à cardinalité maximale : une dépendance conditionnelle ne disparaît
  // donc pas seulement parce qu'elle manque au variant de référence.
  //
  // Chaque séquence se lit sur SON ARBRE, pas sur l'ordre où l'extraction a rangé ses
  // trouvailles : celui-ci dépend de l'ordonnancement des `await`, et deux
  // cadres frères pourraient se doubler sans qu'aucun design ait changé.
  const composesPlacees = mergeVariantDependencies(extracted.variants);
  const placees = new Set(composesPlacees);
  for (const dependency of scannedComposes) {
    if (placees.has(dependency)) continue;
    const message =
      `Layer « ${dependency.figmaLayer} » : il porte le composant « ${dependency.component} », ` +
        `qui a son propre contrat, mais le contrat n'a trouvé aucun emplacement où le situer. ` +
        `La dépendance ne sera ni décrite dans structure.children, ni déclarée dans composes : ` +
        `le développeur ne la rendra pas. Placez ce layer dans l'auto layout frame que le ` +
        `composant décrit, puis réexportez.`;
    warnings.push(message);
    projectionWarnings.push(message);
  }

  // L'échantillon se pose ici, une fois l'arbre exact connu et les valeurs
  // appliquées relevées : il ne recalcule ni chemin de slot, ni reconnaissance
  // de dépendance, il assemble ce que les deux extractions savent déjà.
  for (const variant of extracted.variants) {
    const component = matrix.variants.find(
      (entry) => entry.component.id === variant.nodeId,
    )?.component;
    if (!component) continue;
    const sample = extractVariantSample(
      { component, paths: extracted.exactPathsByVariant.get(component) ?? new Map() },
      appliedByVariant.get(variant.nodeId),
      extracted.targetedLayers,
      composed,
      mainByInstanceId,
      swapDefaults,
      propertySurfaces,
    );
    if (Object.keys(sample).length > 0) variant.sample = sample;
  }

  const compacted = compactVariants(extracted.variants, propertyBindings);
  // Le catalogue sait combien de contenus distincts la matrice montre. Deux là
  // où le design en attendait un révèlent un libellé retouché dans un seul
  // variant — rien ne manque, donc rien à corriger, et le constat passe par le
  // canal qui le dit.
  const varianceEchantillon = sampleVarianceNotice(compacted.variants);
  if (varianceEchantillon) {
    warnings.push(varianceEchantillon);
    exportInfos.push(varianceEchantillon);
  }

  // **Le lien Figma absent ne se signale plus, et son retrait est la moitié la
  // plus importante de T4.4.** Le message était écrit quand le cas était
  // l'exception : le manifest portait `enablePrivatePluginApi`, l'URL était la
  // norme, et le dire une fois de temps en temps ne coûtait rien. La
  // distribution par la Community inverse exactement cela — la clé du fichier
  // n'arrive plus JAMAIS, donc le message se serait imprimé sur chaque export,
  // dans le corps de chaque pull request, pour un constat que le designer ne
  // peut pas corriger et dont la conclusion est toujours « rien à faire ».
  //
  // C'est la règle du projet appliquée à sa propre décision : une liste dont on
  // apprend qu'elle se survole coûte la lecture de celles qui demandent un
  // geste. Un état NORMAL du format ne se documente pas par un diagnostic
  // répété à l'infini ; il se documente une fois, dans le type
  // (`ContractMeta.figma.url`) et dans la spécification.
  const meta = buildMeta(componentSet);

  const allWarnings = Array.from(new Set([...warnings, ...extracted.warnings]));
  const portableWarningSet = new Set(projectionWarnings);
  const hasPortableLoss = portableWarningSet.size > 0;
  // Une perte de portabilité l'emporte toujours : un même texte relevé des deux
  // côtés reste un point à corriger.
  const infoSet = new Set(exportInfos.filter((message) => !portableWarningSet.has(message)));
  const diagnostics = allWarnings.map((message) => ({
    code: portableWarningSet.has(message)
      ? 'UCM_PORTABLE_PROJECTION_WARNING'
      : infoSet.has(message)
        ? 'UCM_EXPORT_INFO'
        : 'UCM_EXPORT_NOTICE',
    severity: 'warning' as const,
    message,
  }));
  // Ce que la pull request et le compteur de l'UI appellent « avertissement »
  // n'est que la part qui demande un geste ; `meta.diagnostics` porte tout.
  const actionableWarnings = allWarnings.filter((message) => !infoSet.has(message));
  const exportedInfos = allWarnings.filter((message) => infoSet.has(message));
  const {
    variantTokens: _variantTokens,
    variantStrokes: _variantStrokes,
    variantTypography: _variantTypography,
    sizes,
    variantAxes,
    ...projectionDeReference
  } = extracted.structure;
  // La projection de référence rejoint le catalogue des structures au lieu d'en
  // recopier une. Le renvoi est INCONDITIONNEL : quand l'élection du node de
  // layout la fait différer de toutes les vues — un wrapper de dimensions
  // sauté —, elle ajoute son entrée. Une seule forme, donc un seul chemin de
  // lecture chez le consommateur.
  const viewStructures = compacted.viewStructures;
  const structureIds = new Map(
    Object.entries(viewStructures).map(([id, value]) => [signature(value), id] as const),
  );
  const projectionPropre = elideNeutrals(projectionDeReference, 'viewStructures.*');
  const structureView = intern(projectionPropre, 'st', structureIds, viewStructures);
  // Les étiquettes Figma des axes viennent de la SOURCE, jamais d'une relecture
  // des noms publiés : reconstruire un nom depuis la table et le comparer ne
  // valide pas l'appariement axe ↔ étiquette, qu'une permutation traverse sans
  // être vue.
  const figmaVariantLabels = buildFigmaVariantLabels(componentSet, matrix, propertyModel.publicVariantKeyByRawKey);
  const variants = figmaVariantLabels
    ? compacted.variants.map(({ figmaName: _figmaName, ...reste }) => reste)
    : compacted.variants;

  const contract: Contract = elideContract<Contract>({
    name: componentSet.name || 'Component',
    meta: {
      ...meta,
      diagnostics,
      coverage: {
        portable: hasPortableLoss ? 'partial' : 'complete',
      },
    },
    props,
    ...(figmaVariantLabels ? { figmaVariantLabels } : {}),
    viewStructures,
    viewTypographies: compacted.viewTypographies,
    viewComposes: compacted.viewComposes,
    viewIcons: compacted.viewIcons,
    viewPaintPlacements: compacted.viewPaintPlacements,
    variantViews: compacted.variantViews,
    propertyBindingDefinitions: compacted.propertyBindingDefinitions,
    variants,
    structure: {
      view: structureView,
      ...(sizes ? { sizes } : {}),
      variantAxes,
    },
    ...(stateModel ? { stateModel } : {}),
    rendering: renderingSemanticsFor(extracted.discoveredRoles),
    icons,
    textStyles: extracted.textStyles,
    composes: composesPlacees,
    samples: compacted.samples,
    ...(intent ? { intent } : {}),
  }, CATALOGUES_DE_VUES);

  return {
    filename: componentContractFilename(contract.name),
    content: serializeJson(contract),
    warningCount: actionableWarnings.length,
    warnings: actionableWarnings,
    infos: exportedInfos,
  };
}

export default handleExportComponent;
