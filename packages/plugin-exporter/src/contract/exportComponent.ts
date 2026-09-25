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
import { indexContractedNames, scanComposedMatrix } from './composedComponents';
import { extractRules } from './extractRules';
import { contientUneInstanceRendue } from './exportableNodes';
import { etape, fermerLaMesure, ouvrirLaMesure } from './mesure';
import { dansUnePorteeDAnalyse } from './porteeDAnalyse';
import { pousserLesImbriques, releverLesImbriques } from './imbriques';
import type { ReleveDesImbriques } from './imbriques';
import { TAGS_D_INTENTION } from './rulesModel';
import { extractStructure } from './extractStructure';
import { collidingVariantAxes, extractContractPropertyModel } from './parsers';
import { buildContractPropertySurface } from './propertySurface';
export { mergeWrapperProps } from './propertySurface';
import { mergeBooleanDescriptions } from './mergeBooleanDescriptions';
import { mergeEnumDefaults } from './mergeEnumDefaults';
import { extractPropertyBindings } from './propertyBindings';
import { compactVariants, intern, signature } from './compactVariants';
import { CATALOGUES_DE_VUES, elideContract, elideNeutrals } from './elideNeutrals';
import { serializeJson } from './serializeJson';
import { extractVariantSample } from './extractSamples';
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
import {
  localisationsDe,
  partiesDe,
  pousserLocalise,
  pousserSansNode,
  raisonsSansNode,
  reporterLocalisations,
  sujetSansNode,
} from './localisation';
import type { PointACorriger } from './localisation';

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
  /**
   * Seul canal des données manquantes qui demandent un geste dans Figma. Les
   * transformations complètes restent silencieuses et documentées par le format.
   */
  warnings: string[];
  /**
   * Nodes du sujet dans l'ordre d'émission, indexés par la phrase qui sert aussi
   * au dédoublonnage. Cette aide d'interface n'entre jamais dans le contrat ;
   * son absence peut être voulue.
   */
  localisations: ReadonlyMap<string, readonly string[]>;
  /**
   * Parties du message indexées par sa phrase. L'UI les met en page ; le contrat
   * et la pull request publient la phrase dérivée par `phraseDe`.
   */
  parties: ReadonlyMap<string, PointACorriger>;
  /**
   * Justification explicite des messages sans node, utilisée par la loi de couverture.
   */
  localisationsDeclarees: ReadonlyMap<string, string>;
  /** Les imbriqués sans règles : la création des règles en tire son modèle et ses points. */
  imbriques: ReleveDesImbriques;
};

/** Erreur « métier » : son message est affiché tel quel à l'utilisateur. */
export class ComponentExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComponentExportError';
  }
}

/** Message bloquant, formulé comme une action Figma plutôt que comme un concept mathématique. */
/**
 * Vérifie que la sélection est bien un composant exportable, sinon erreur claire.
 *
 * Exporté parce que la création des règles vise le même composant que l'export,
 * et qu'une seconde lecture de la sélection se désaccorderait de celle-ci le
 * jour où l'une des deux changerait.
 */
export function getSelectedComponent(): ComponentNode | ComponentSetNode {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    throw new ComponentExportError('Sélectionnez un seul composant principal ou ensemble de variantes dans Figma.');
  }

  const node = selection[0];
  if (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT') {
    throw new ComponentExportError(
      'La sélection n’est pas un composant principal ni un ensemble de variantes. Sélectionnez le composant principal à exporter.',
    );
  }

  return node;
}

/**
 * Construit les métadonnées de traçabilité vers Figma.
 * `url` reste optionnelle : la distribution Community n'expose généralement
 * pas `figma.fileKey`, réservé à `enablePrivatePluginApi`. `fileName` et
 * `nodeId` assurent alors la traçabilité ; une distribution privée peut encore
 * fournir le lien sans changer le format.
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

/** Le nom de fichier est l'identifiant de code canonique du composant. */
export function componentContractFilename(name: string): string {
  return `${codeIdentifier(name)}.contract.json`;
}

/**
 * Point d'entrée de la commande : crée le contrat du composant sélectionné.
 *
 * `annoncer` nomme les étapes traversées, il n'en décide aucune. Quand le
 * composant porte des instances, cet export résout leurs maîtres et charge la
 * page de chacun, une fois par session et par page tant qu'elle ne change pas :
 * un coût pendant lequel un « Analyse du composant… » figé se lit comme un
 * plantage. Les étapes portent le nom de ce que le code fait, jamais une durée
 * ni un pourcentage : le temps d'une étape dépend du fichier, et seule la trace
 * du build de mesure le relève, après coup.
 *
 * `options.respirer` rend la main au sandbox dans les boucles longues, une
 * fois le budget de calcul écoulé ; `code.ts` y lit l'annulation.
 */
export async function handleExportComponent(
  annoncer: Annonce = () => {},
  options: { respirer?: () => Promise<void> } = {},
): Promise<ComponentExport> {
  ouvrirLaMesure();
  const resultat = await dansUnePorteeDAnalyse(options, () => exporterLaSelection((texte) => {
    etape(texte);
    annoncer(texte);
  }));
  fermerLaMesure(resultat.content);
  return resultat;
}

async function exporterLaSelection(annoncer: Annonce): Promise<ComponentExport> {
  const componentSet = getSelectedComponent();
  annoncer('Lecture des règles d’usage…');

  // Les règles enrichissent l'intention et la documentation, mais ne sont plus
  // une précondition d'export. Leur absence reste visible dans les diagnostics.
  const rules = await extractRules(componentSet);
  const warnings: string[] = [...rules.warnings];
  reporterLocalisations(rules.warnings, warnings);
  // Sous-ensemble qui mesure réellement la projection UCM. Les avertissements
  // de documentation (règles), de traçabilité (URL) et de compatibilité avec
  // l'ancienne vue de référence ne rendent pas un arbre exact incomplet.
  const projectionWarnings: string[] = [];
  const addProjectionWarnings = (messages: readonly string[]) => {
    projectionWarnings.push(...messages);
  };
  const markProjectionWarningsSince = (index: number) => {
    addProjectionWarnings(warnings.slice(index));
  };
  let warningCursor = warnings.length;
  // Deux axes qui se confondent sont la seule collision de noms que l'export ne
  // sait pas trancher. Ailleurs, le premier arrivé garde la clé et le second est
  // signalé ; ici, le second emporte les coordonnées des variants avec lui, et
  // aucune des deux propriétés ne peut être servie sans l'autre.
  const axesConfondus = collidingVariantAxes(componentSet.componentPropertyDefinitions);
  if (axesConfondus) {
    const [premier, second] = axesConfondus;
    throw new ComponentExportError(
      `Les propriétés de variante « ${premier} » et « ${second} » produisent le même nom à `
      + `l’export. L’export est bloqué pour éviter de les confondre. Donnez-leur des noms `
      + `qui diffèrent autrement que par les majuscules, espaces ou tirets, puis relancez l’analyse.`,
    );
  }
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
    // avertissement, et nomme le geste, sans quoi il ne serait qu'une ligne de
    // plus à survoler dans la pull request.
    const plusieurs = missingVariants.missing > 1;
    pousserLocalise(warnings, 'Component Set', componentSet, {
      manque: plusieurs
        ? `${missingVariants.missing} combinaisons de valeurs de ses propriétés de variante `
          + `n'ont pas de variant.`
        : `une combinaison de valeurs de ses propriétés de variante n'a pas de variant.`,
      impact: plusieurs
        ? 'Le développeur ne pourra pas afficher ces combinaisons.'
        : 'Le développeur ne pourra pas afficher cette combinaison.',
      action: `${plusieurs ? 'Si ces combinaisons doivent exister, ajoutez-les'
        : 'Si cette combinaison doit exister, ajoutez-la'} dans Figma, puis réexportez.`,
    });
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
      `Export impossible pour « ${componentSet.name} » : ce component set ne contient aucun `
        + `variant. Ajoutez au moins un variant dans Figma, puis réexportez.`,
    );
  }
  // Le variant de référence sert de base au layout.
  const referenceComponent = componentSet.type === 'COMPONENT_SET'
    ? componentSet.defaultVariant ?? matrix.variants[0]?.component ?? null
    : componentSet;

  // La composition se relève avant toute extraction : un composant unifié
  // imbriqué n'est ni un wrapper, ni un slot à parcourir, et cette décision
  // conditionne tout ce qui suit.
  annoncer('Lecture des composants imbriqués…');
  etape('index');
  const contientDesInstances = matrix.variants.some(({ component }) =>
    contientUneInstanceRendue(component));
  const contractes = contientDesInstances
    ? await indexContractedNames(
      matrix.variants.map((entry) => entry.component),
      { priorite: 'analyse' },
    )
    : new Set<string>();
  etape('composition');
  const {
    composes: scannedComposes,
    composed,
    mainByInstanceId,
    warnings: compositionWarnings,
    swapDefaults,
    propertySurfaces,
  } = await scanComposedMatrix(
    matrix.variants.map((entry) => entry.component),
    referenceComponent,
    contractes,
  );
  warnings.push(...compositionWarnings);
  // Un message qui change de canal laisse sa cible derrière lui si le registre
  // ne suit pas. C'est le prix du registre indexé par canal, et le seul endroit
  // où un oubli serait muet : d'où la loi qui compte, à la sortie, les messages
  // localisables restés sans node.
  reporterLocalisations(compositionWarnings, warnings);
  // Une instance dont le composant maître est illisible coûte au contrat : ses
  // layers passent pour les nôtres et la dépendance manque à `composes`. C'est
  // une perte de portabilité, et elle se marque comme telle.
  addProjectionWarnings(compositionWarnings);
  warningCursor = warnings.length;

  etape('wrapper');
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
    wrapper?.componentSet?.name,
  );
  const props = propertySurface.props;
  // Aucune prop `icon` n'existe encore : `mergeIconRules` les ajoute plus loin,
  // depuis une règle du composant lui-même, que nul imbriqué ne déclare.
  const clesDuParent = new Set(Object.keys(propertyModel.props));
  const imbriques = releverLesImbriques({
    composant: componentSet,
    variants: matrix.variants.map((entry) => entry.component),
    maitres: mainByInstanceId,
    contractes,
    composed,
    horsDuParent: Object.keys(props).filter((cle) => !clesDuParent.has(cle)),
  });
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
    pousserLocalise(warnings, 'Component Set', componentSet, {
      manque: 'aucune propriété de composant n’est définie.',
      impact: 'Le contrat ne décrira ni variants ni options.',
      action: 'Si ce composant doit en avoir, déclarez-les dans Figma, puis réexportez.',
    });
  }
  // Une API vide est complète pour un composant qui n'expose aucune propriété.
  warningCursor = warnings.length;

  // Le résolveur reçoit l'index des variables locales pour deux raisons : il y
  // lit les chemins sans un aller-retour par variable, et il sait quelles
  // variables partagent un nom, les seules qu'un contrat ne doit jamais citer.
  annoncer('Écriture du contrat…');
  const [collections, variables] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync(),
  ]);
  const index = indexVariables(variables, new Map(collections.map((c) => [c.id, c])));
  const resolver = new VariableNameResolver({ index, warnings });

  etape('structure');
  const extracted = await extractStructure(
    matrix,
    matrixWarnings,
    wrapper,
    referenceComponent,
    resolver,
    composed,
    rules.iconRules.map((rule) => rule.iconName),
    imbriques,
  );
  markProjectionWarningsSince(warningCursor);
  addProjectionWarnings(extracted.warnings);
  warnings.push(...extracted.notices);
  reporterLocalisations(extracted.notices, warnings);
  warningCursor = warnings.length;

  // La documentation issue des règles s'accroche aux props de même nature, et
  // aux états pour l'axe que `stateModel` publie à la place des props.
  mergePropDescriptions(props, stateModel, rules.propDescriptions, warnings);
  mergeBooleanDescriptions(props, rules.booleanDescriptions, warnings);
  mergeEnumDefaults(props, rules.enumDefaults, warnings);
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
      const sujetDeLIcone =
        `Icône « ${definition.figmaName} » du variant « ${variant.figmaName} »`;
      const message = pousserSansNode(warnings, sujetDeLIcone, paths.length === 0
        ? {
          manque: 'le contrat ne décrit pas son calque dans ce variant.',
          impact: 'Le développeur ne saura pas où la placer et ne la rendra pas.',
          action: 'Rendez son calque visible et placez-le dans le cadre en auto layout qui porte '
            + 'le gap et le padding, puis réexportez.',
        }
        : {
          manque: 'plusieurs calques de ce variant portent ce nom.',
          impact: 'Le développeur ne saura pas lequel est l’icône.',
          action: 'Donnez un nom distinct à chaque calque, puis réexportez.',
        });
      projectionWarnings.push(message);
    }
  }
  warningCursor = warnings.length;
  const intent = rules.intent;
  const intentionARediger = rules.tagsARediger.some((tag) => TAGS_D_INTENTION.includes(tag));
  if (!intent && !intentionARediger) {
    pousserSansNode(warnings, 'Règles d’usage', {
      manque: 'aucune règle @usage, @do, @dont ou @pairs n’est déclarée.',
      impact: 'Le développeur ne recevra aucune consigne sur les cas d’usage du composant.',
      action: 'Ajoutez au moins une règle @usage, puis réexportez.',
    });
  }
  warningCursor = warnings.length;

  // Chaque composition de vue se dérive de son arbre exact, comme
  // `tokensUsed` se dérive du contrat terminé. Le champ global en est l'union
  // ordonnée à cardinalité maximale : une dépendance conditionnelle ne disparaît
  // donc pas seulement parce qu'elle manque au variant de référence.
  //
  // Chaque séquence se lit sur son arbre, pas sur l'ordre où l'extraction a rangé ses
  // trouvailles : celui-ci dépend de l'ordonnancement des `await`, et deux
  // cadres frères pourraient se doubler sans qu'aucun design ait changé.
  const composesPlacees = mergeVariantDependencies(extracted.variants);
  const placees = new Set(composesPlacees);
  for (const dependency of scannedComposes) {
    if (placees.has(dependency)) continue;
    const message = pousserSansNode(
      warnings,
      sujetSansNode('Layer', dependency.figmaLayer, 'nom-publie'),
      {
        manque: `il contient le composant « ${dependency.component} », mais le contrat ne `
          + `décrit ce calque nulle part.`,
        impact: `Le développeur ne rendra pas « ${dependency.component} » dans ce composant.`,
        action: `Placez ce calque dans le cadre en auto layout qui porte le gap et le padding, puis `
          + `réexportez.`,
      },
    );
    projectionWarnings.push(message);
  }

  // L'échantillon se pose ici, une fois l'arbre exact connu et les valeurs
  // appliquées relevées : il ne recalcule ni chemin de slot, ni reconnaissance
  // de dépendance, il assemble ce que les deux extractions savent déjà.
  etape('echantillons');
  const componentsById = new Map(matrix.variants.map(({ component }) => [component.id, component]));
  for (const variant of extracted.variants) {
    const component = componentsById.get(variant.nodeId);
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

  etape('compaction');
  const compacted = compactVariants(extracted.variants, propertyBindings);

  // Le lien Figma absent ne se signale pas. Distribué par la Community, le
  // plugin n'a pas `enablePrivatePluginApi`, donc jamais la clé du fichier : le
  // message s'imprimerait sur chaque export, pour un constat que le designer ne
  // peut pas corriger. Un état normal du format se documente dans le type
  // (`ContractMeta.figma.url`) et dans la spécification, pas dans un diagnostic
  // répété à l'infini.
  const meta = buildMeta(componentSet);

  // En tête : le point dit que le contrat est déjà faux, et la demande de
  // fusion coupe sa liste par la fin quand elle dépasse sa taille.
  const bloquants: string[] = [];
  pousserLesImbriques(bloquants, componentSet, imbriques);
  addProjectionWarnings(bloquants);
  const allWarnings = Array.from(new Set([...bloquants, ...warnings, ...extracted.warnings]));
  // La jonction : les deux canaux se fondent, et leurs registres avec eux. Le
  // relevé ne va pas plus loin que la frontière sandbox ↔ UI : le contrat, lui,
  // n'en verra rien, et une loi de `lois.ts` le refuse.
  reporterLocalisations(bloquants, allWarnings);
  reporterLocalisations(warnings, allWarnings);
  reporterLocalisations(extracted.warnings, allWarnings);
  const localisations = localisationsDe(allWarnings);
  const decoupes = partiesDe(allWarnings);
  const localisationsDeclarees = raisonsSansNode(allWarnings);
  const portableWarningSet = new Set(projectionWarnings);
  const hasPortableLoss = portableWarningSet.size > 0;
  // Deux codes, et une seule question qu'ils tranchent : la projection portable
  // a-t-elle perdu quelque chose ? Les deux demandent un geste (c'est la
  // condition d'entrée dans ce canal), mais seul le premier
  // dégrade `meta.coverage.portable`, et le rapport de CI ne remonte que
  // celui-là.
  const diagnostics = allWarnings.map((message) => ({
    code: portableWarningSet.has(message)
      ? 'UCM_PORTABLE_PROJECTION_WARNING'
      : 'UCM_EXPORT_NOTICE',
    severity: 'warning' as const,
    message,
  }));
  const {
    variantTokens: _variantTokens,
    variantStrokes: _variantStrokes,
    variantTypography: _variantTypography,
    sizes,
    variantAxes,
    ...projectionDeReference
  } = extracted.structure;
  // La projection de référence rejoint le catalogue des structures au lieu d'en
  // recopier une. Le renvoi est inconditionnel : quand l'élection du node de
  // layout la fait différer de toutes les vues (un wrapper de dimensions
  // sauté), elle ajoute son entrée. Une seule forme, donc un seul chemin de
  // lecture chez le consommateur.
  const viewStructures = compacted.viewStructures;
  const structureIds = new Map(
    Object.entries(viewStructures).map(([id, value]) => [signature(value), id] as const),
  );
  const projectionPropre = elideNeutrals(projectionDeReference, 'viewStructures.*');
  const structureView = intern(projectionPropre, 'st', structureIds, viewStructures);
  // Les étiquettes Figma des axes viennent de la source, jamais d'une relecture
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
    viewEffects: compacted.viewEffects,
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
    effectStyles: extracted.effectStyles,
    composes: composesPlacees,
    samples: compacted.samples,
    ...(intent ? { intent } : {}),
  }, CATALOGUES_DE_VUES);

  etape('serialisation');
  return {
    filename: componentContractFilename(contract.name),
    content: serializeJson(contract),
    warningCount: allWarnings.length,
    warnings: allWarnings,
    localisations,
    parties: decoupes,
    localisationsDeclarees,
    imbriques,
  };
}

export default handleExportComponent;
