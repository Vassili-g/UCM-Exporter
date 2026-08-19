/**
 * Commande « Export composant » : transforme le Component ou Component Set sélectionné
 * en contrat de composant (fichier `<Nom>.contract.json` téléchargé).
 *
 * Déroulé : sélection → props → matrice de variantes → wrapper de dimensions
 * → structure (layout, tailles, tokens) → intention → contrat final.
 */
import {
  buildVariantMatrix,
  findMissingVariantCombinations,
  findWrapperReference,
} from './componentTree';
import { indexContractedNamesInDocument, scanComposedMatrix } from './composedComponents';
import { extractRules } from './extractRules';
import { extractStructure } from './extractStructure';
import { definePropOn, extractContractPropertyModel } from './parsers';
import { mergeBooleanDescriptions } from './mergeBooleanDescriptions';
import { extractPropertyBindings } from './propertyBindings';
import { compactVariants } from './compactVariants';
import { mergeIconRules } from './mergeIconRules';
export { mergeIconRules } from './mergeIconRules';
import { mergePropDescriptions } from './mergePropDescriptions';
export { mergePropDescriptions } from './mergePropDescriptions';
import { buildStateModel, renderingSemanticsFor } from './semantics';
import { collectTokenReferences, indexVariables, VariableNameResolver } from '../variables';
import { codeIdentifier } from '../utils';
import type {
  ChildStructure,
  ComposedDependency,
  Contract,
  ContractMeta,
  ContractProp,
  ExtractedContractVariant,
} from './types';

/**
 * Version du schéma de contrat — à incrémenter à chaque changement de forme.
 * 10.1 : `structuralSize` étend l'exception pixel des grilles de la piste à la
 * cellule. Sous une piste qui hug, la mesure ne vit que sur l'enfant — Figma n'y
 * expose aucun remplissage et `GridTrackSize.value` n'existe pas sur ce type —
 * et sans elle la piste retombait à zéro. `size` reste strictement tokenisé.
 * 10.0 : les pistes FIXED d'une grille conservent exceptionnellement leur
 * valeur CSS en pixels, les valeurs par côté peuvent être clairsemées lorsque
 * les autres côtés sont neutres, toute feuille publie son radius, et chaque
 * vue situe ses fills et strokes par des chemins exacts de slots.
 * 9.0 : les vues exactes identiques sont cataloguées dans `variantViews`, et
 * les liaisons natives partagent `propertyBindingDefinitions`. Chaque variant
 * conserve ses feuilles et ses placements propres par référence exacte ; les
 * trois anciens index parallèles de `structure` disparaissent.
 * 8.0 : `variants` publie un arbre portable par combinaison exacte, y compris
 * pour un COMPONENT standalone et un set clairsemé. `propertyBindings` situe
 * les liaisons natives, `INSTANCE_SWAP` et `SLOT` gardent leur type, et les
 * diagnostics rendent explicites les limites de la projection portable. Les
 * règles ne sont plus une précondition d'export.
 * 6.0 : `structure.children` cesse de s'arrêter au premier calque qui n'est ni
 * un texte ni une dépendance. Le contrat descend désormais dès qu'un descendant
 * porte une information qu'une feuille ne sait pas exprimer — un texte, une
 * icône, une dépendance ou n'importe quelle liaison de variable — et le fait à
 * n'importe quelle profondeur : un auto layout dans un auto layout dans une
 * grille est décrit jusqu'au bout, chaque niveau avec sa disposition, son
 * `padding`, son `radius`, sa taille et ses bornes. Jusqu'ici, tout un
 * sous-arbre graphique — la piste et le curseur d'un Toggle, le rail et le
 * remplissage d'une Progress, trois cadres bordés emboîtés — se réduisait à un
 * slot opaque, alors que ses couleurs entraient bien dans `variantTokens` : le
 * contrat annonçait des peintures qu'aucun calque publié ne portait.
 * `structureTree.ts` en est l'unique autorité, partagée par l'extraction, les
 * chemins de `variantTypography` et les signatures de comparaison.
 * La même version rend contractuelles deux dispositions que le moteur se
 * contentait d'avertir : la GRILLE (`layout: "grid"`, `columns`, `rows`,
 * `columnGap`, `rowGap`, et `columnSpan` / `rowSpan` / `justifySelf` sur chaque
 * enfant — les deux gaps de Figma se relient à une variable, donc une grille est
 * aussi contractuelle qu'une rangée) et la POSITION ABSOLUE (`position` et
 * `constraints`, soit les bords auxquels un calque hors flux s'accroche ; sa
 * distance à ces bords ne se relie à aucune variable et reste hors du contrat).
 * Un consommateur doit désormais parcourir `structure.children` récursivement
 * sans supposer que seules les branches de texte se ramifient, accepter un
 * `layout` valant `grid`, et lire les chemins de `variantTypography` qui
 * gagnent un étage dès qu'un texte est rangé dans son propre cadre — d'où la
 * version majeure.
 * 5.5 : une couleur cesse d'en évincer une autre. La clé reste le dernier
 * segment du token, mais quand deux couleurs d'un même variant le partagent,
 * elle s'allonge des segments qui les séparent (`userinput.background` /
 * `divider.background`) au lieu de n'en garder qu'une. Le design system nommait
 * déjà ces surfaces distinctement : c'est l'export qui tronquait. Un
 * consommateur doit désormais accepter une clé contenant des points et cesser
 * de présumer qu'un des cinq rôles est présent.
 * 5.4 : le passage à la ligne devient contractuel. `wrap` et `rowGap` décrivent
 * un auto layout qui déborde sur plusieurs lignes, sur le composant comme sur
 * n'importe quel conteneur de `children` ; le contrat se contentait jusqu'ici
 * d'avertir, et le développeur alignait tout sur une seule ligne. Un `rowGap`
 * absent sous `wrap` vaut le `gap`, comme dans Figma et comme en CSS. La même
 * version élargit ce qu'un cadre de dépendances publie : ses calques voisins
 * cessent de disparaître avec leur slot, leur typographie et leur visibilité.
 * 5.3 : les bornes de taille deviennent contractuelles. `bounds` publie
 * `minWidth`, `maxWidth`, `minHeight` et `maxHeight` sur le composant comme sur
 * chaque slot, tokenisées. Le contrat cesse de demander qu'on retire du design
 * ce qu'il ne savait pas écrire : une borne reliée à une variable se publie.
 * 5.2 : un axe de `structure.sizing` peut citer un token. Une dimension figée
 * sans variable reste `stretch` — c'est une taille de maquette — mais celle qui
 * cite une variable est une décision du design system, et le token l'emporte.
 * 5.1 : ce qu'une couleur peint se lit sur le calque qui la porte, plus sur le
 * nom du token. Le dernier segment reste la CLÉ de la couleur, et
 * `rendering.roles` publie le rendu de celles qui ne nomment aucun rôle
 * partagé — un composant peut donc peindre plusieurs surfaces sans qu'aucun
 * renommage impossible soit demandé au designer.
 * 5.0 : chaque axe publié devient documentable et chaque icône modifiable
 * devient remplaçable. L'axe d'états accueille sa doc dans
 * `stateModel.states.<état>.description`, et `IconProp.visibilityProp` devient
 * facultatif — une icône toujours visible a désormais sa prop runtime.
 * 4.9 : un calque qui ENVELOPPE un composant unifié devient un conteneur de ce
 * contrat — il publie son flux et range la dépendance dans `children`. Seul le
 * calque qui EST l'instance porte encore `composes`.
 * 4.8 : `structure.sizing` s'écrit en CSS, par propriété (`width`, `height`) et
 * en valeurs `stretch` / `fit-content`.
 * 4.7 : le dimensionnement se ferme — `structure.sizing` est toujours publié et
 * `size` décrit la dimension figée de n'importe quel slot, côté par côté.
 * 4.6 : les text styles et leurs tokens sont catalogués une fois, puis leurs
 * usages sont décrits sur toute la matrice par `variantTypography`.
 * 4.5 : quand `sizes` décrit une font size par taille, celle du slot de
 * référence est retirée de `typography` ; la carte des tailles est son unique
 * autorité.
 * 4.4 : l'auto-layout publie l'alignement du conteneur et le remplissage de
 * ses enfants ; un consommateur n'a plus à inventer `alignItems` ou `flexGrow`.
 * 4.3 : les slots multi-textes deviennent récursifs, afin que chaque calque
 * texte porte sa propre typographie et sa propre visibilité.
 * 4.2 : un slot d'icône porte le rôle `icon` au lieu du nom de son calque, et
 * chaque icône déclare le slot et la taille qui la rendent — les icônes qui se
 * relaient entre variants deviennent toutes rendables.
 * 4.1 : conditions de variantes des icônes et cibles de visibilité imbriquées.
 * 4.0 : composition (`composes`) et assainissement du format — les dimensions
 * ne sont plus recopiées hors de `sizes`, la couleur du label vient de
 * `variantTokens`, et `warnings` documente l'export sous `meta`.
 */
export const CONTRACT_VERSION = '10.1';

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
 * Fusionne les props du wrapper de dimensions dans l'API publique du contrat
 * (le composant est décrit comme UNE API, pas deux component sets).
 * Les props du set externe gardent la priorité en cas de doublon — même règle
 * « une clé publique, un propriétaire » que `extractContractProps`, et même
 * obligation de signaler ce qui est écarté.
 */
export function mergeWrapperProps(
  props: Record<string, ContractProp>,
  wrapperProps: Record<string, ContractProp>,
  warnings: string[],
): void {
  for (const [key, prop] of Object.entries(wrapperProps)) {
    // En propriété propre : `key in props` répondrait vrai pour une component
    // property nommée « constructor », et le wrapper perdrait sa prop sous un
    // avertissement de collision avec une prop que le composant n'expose pas.
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      warnings.push(
        `Component property « ${key} » : le composant imbriqué qui porte les dimensions et ` +
          `le component set sélectionné l’exposent tous les deux. Seule celle du component ` +
          `set sélectionné est exportée. Renommez l’une des deux.`,
      );
      continue;
    }
    // Même précaution que la lecture ci-dessus, en écriture : une component
    // property nommée « __proto__ » fixerait le prototype de `props` au lieu
    // d'occuper une clé, et le wrapper perdrait sa prop sans un mot.
    definePropOn(props, key, prop);
  }
}

/**
 * Construit les métadonnées de traçabilité vers Figma.
 *
 * `figma.fileKey` est réservé aux plugins qui déclarent `enablePrivatePluginApi`
 * dans leur manifest — ce que fait celui-ci. L'API le referme pour un plugin
 * publié sur la Community : l'URL vaut alors null, et l'export n'est pas bloqué
 * pour autant. Le lien est un confort de relecture ; `nodeId` et `fileName`
 * suffisent à retrouver le composant.
 */
function buildMeta(
  componentSet: ComponentNode | ComponentSetNode,
): Omit<ContractMeta, 'warnings' | 'diagnostics' | 'coverage'> {
  const fileKey = figma.fileKey ?? null;
  const fileName = figma.root.name;
  const nodeId = componentSet.id;
  // Format d'URL Figma : les « : » de l'id de nœud deviennent des « - ».
  const url = fileKey
    ? `https://www.figma.com/design/${fileKey}/${encodeURIComponent(fileName)}?node-id=${nodeId.replace(/:/g, '-')}`
    : null;

  return {
    contractVersion: CONTRACT_VERSION,
    exportedAt: new Date().toISOString(),
    figma: {
      fileName,
      nodeId,
      componentKey: componentSet.key || null,
      url,
    },
  };
}

/** Le nom de fichier EST l'identifiant de code canonique du composant. */
export function componentContractFilename(name: string): string {
  return `${codeIdentifier(name)}.contract.json`;
}

/** Point d'entrée de la commande : crée le contrat du composant sélectionné. */
export async function handleExportComponent(): Promise<ComponentExport> {
  const componentSet = getSelectedComponent();

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
  const props = propertyModel.props;
  const missingVariants = componentSet.type === 'COMPONENT_SET'
    ? findMissingVariantCombinations(componentSet)
    : null;
  if (missingVariants) {
    warnings.push(
      `Component Set « ${componentSet.name} » : ${missingVariants.missing} combinaison(s) du `
        + `produit cartésien de ses axes n'existent pas. Le contrat ${CONTRACT_VERSION} publie uniquement les `
        + `combinaisons exactes présentes dans « variants » ; aucune combinaison interdite `
        + `n'est inventée.`,
    );
  }
  // La liste exacte porte cet écart : il ne manque rien à la projection v8.
  warningCursor = warnings.length;
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
  const { composes: scannedComposes, composed, warnings: compositionWarnings } = await scanComposedMatrix(
    matrix.variants.map((entry) => entry.component),
    referenceComponent,
    await indexContractedNamesInDocument(),
  );
  warnings.push(...compositionWarnings);
  // Les arbres exacts portent la composition propre à chaque variante.
  warningCursor = warnings.length;

  const wrapper = referenceComponent
    ? await findWrapperReference(referenceComponent, warnings, composed)
    : null;
  const stateModel = buildStateModel(
    matrix.axes,
    matrix.variants.map((entry) => entry.values),
    warnings,
  );

  const publicPropertyKeyByFigmaName = new Map(propertyModel.publicPropertyKeyByFigmaName);
  if (wrapper?.componentSet) {
    const wrapperModel = extractContractPropertyModel(
      wrapper.componentSet.componentPropertyDefinitions,
      warnings,
    );
    const existingKeys = new Set(Object.keys(props));
    mergeWrapperProps(
      props,
      wrapperModel.props,
      warnings,
    );
    for (const [figmaName, publicKey] of wrapperModel.publicPropertyKeyByFigmaName) {
      if (!existingKeys.has(publicKey)) publicPropertyKeyByFigmaName.set(figmaName, publicKey);
    }
  }
  markProjectionWarningsSince(warningCursor);
  warningCursor = warnings.length;

  const propertyBindings = extractPropertyBindings(
    matrix,
    publicPropertyKeyByFigmaName,
    warnings,
    composed,
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
      const paths = iconPaths(variant.structure.children, definition.figmaName);
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

  const meta = buildMeta(componentSet);
  if (!meta.figma.url) {
    // Le message ne promet rien qu'on ne sache tenir : le manifest déclare
    // `enablePrivatePluginApi`, donc le cas normal est l'URL. Reste celui où
    // l'API ne la fournit pas — un plugin publié sur la Community — et le dire
    // en une phrase vaut mieux qu'un avertissement qui paraît transitoire.
    // Le designer n'y peut rien : c'est un constat, pas un point à corriger.
    const lienAbsent = 'Lien vers Figma absent du contrat : l’API n’a pas fourni la clé du '
      + 'fichier à ce plugin. Le nom du fichier et l’identifiant du composant restent '
      + 'exportés, et suffisent à le retrouver.';
    warnings.push(lienAbsent);
    exportInfos.push(lienAbsent);
  }

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
  // `meta.warnings` reste le miroir complet des diagnostics ; ce que la pull
  // request et le compteur de l'UI appellent « avertissement » n'est que la
  // part qui demande un geste.
  const actionableWarnings = allWarnings.filter((message) => !infoSet.has(message));
  const exportedInfos = allWarnings.filter((message) => infoSet.has(message));
  const compacted = compactVariants(extracted.variants, propertyBindings);
  const {
    variantTokens: _variantTokens,
    variantStrokes: _variantStrokes,
    variantTypography: _variantTypography,
    ...referenceStructure
  } = extracted.structure;
  const contract: Contract = {
    name: componentSet.name || 'Component',
    meta: {
      ...meta,
      warnings: allWarnings,
      diagnostics,
      coverage: {
        portable: hasPortableLoss ? 'partial' : 'complete',
      },
    },
    props,
    variantViews: compacted.variantViews,
    propertyBindingDefinitions: compacted.propertyBindingDefinitions,
    variants: compacted.variants,
    structure: referenceStructure,
    stateModel,
    rendering: renderingSemanticsFor(extracted.discoveredRoles),
    icons,
    textStyles: extracted.textStyles,
    composes: composesPlacees,
    tokensUsed: [],
    intent,
  };
  // `tokensUsed` est l'index des références du contrat : il se DÉRIVE du contrat
  // terminé. L'alimenter pendant l'extraction y ferait entrer des tokens lus
  // pour décider puis écartés — par exemple une taille d'icône instable — et le
  // contrat citerait alors des tokens qu'il n'emploie pas. Les feuilles exactes
  // de `variants`, elles, font partie du contrat et contribuent normalement.
  contract.tokensUsed = Array.from(collectTokenReferences({
    props: contract.props,
    variantViews: contract.variantViews,
    variants: contract.variants,
    propertyBindingDefinitions: contract.propertyBindingDefinitions,
    structure: contract.structure,
    stateModel: contract.stateModel,
    rendering: contract.rendering,
    icons: contract.icons,
    textStyles: contract.textStyles,
    composes: contract.composes,
    intent: contract.intent,
  })).sort();

  return {
    filename: componentContractFilename(contract.name),
    content: JSON.stringify(contract, null, 2),
    warningCount: actionableWarnings.length,
    warnings: actionableWarnings,
    infos: exportedInfos,
  };
}

export default handleExportComponent;
