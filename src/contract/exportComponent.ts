/**
 * Commande « Export composant » : transforme le Component Set sélectionné
 * en contrat de composant (fichier `<Nom>.contract.json` téléchargé).
 *
 * Déroulé : sélection → props → matrice de variantes → wrapper de dimensions
 * → structure (layout, tailles, tokens) → intention → contrat final.
 */
import {
  findMissingVariantCombinations,
  findWrapperReference,
  groupComponentsByVariant,
} from './componentTree';
import type { MissingVariantSummary } from './componentTree';
import { indexContractedNames, scanComposedMatrix } from './composedComponents';
import { extractRules, hasUsableRules, unusableRulesMessage } from './extractRules';
import { extractStructure } from './extractStructure';
import type { PlacedDependencies } from './extractLayout';
import { definePropOn, extractContractPropertyModel, extractContractProps } from './parsers';
import { mergeBooleanDescriptions } from './mergeBooleanDescriptions';
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
} from './types';

/**
 * Version du schéma de contrat — à incrémenter à chaque changement de forme.
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
export const CONTRACT_VERSION = '6.0';

/**
 * Les dépendances de l'arbre publié, dans son ordre — celui des calques Figma.
 *
 * C'est la séquence que le consommateur recompte pour vérifier la parité du
 * code : `composes` et `structure.children` doivent la partager exactement.
 */
function dependanciesDeLArbre(
  children: readonly ChildStructure[],
  placed: PlacedDependencies,
): ComposedDependency[] {
  const dependencies: ComposedDependency[] = [];
  for (const child of children) {
    const dependency = placed.get(child);
    if (dependency) dependencies.push(dependency);
    if (child.children) dependencies.push(...dependanciesDeLArbre(child.children, placed));
  }
  return dependencies;
}

/** Ce que la commande renvoie à l'UI : le fichier à télécharger + un bilan. */
export type ComponentExport = {
  filename: string;
  content: string;
  warningCount: number;
  /** Liste des avertissements, pour affichage détaillé dans le journal de l'UI. */
  warnings: string[];
};

/** Erreur « métier » : son message est affiché tel quel à l'utilisateur. */
export class ComponentExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComponentExportError';
  }
}

/** Message bloquant, formulé comme une action Figma plutôt que comme un concept mathématique. */
export function missingVariantsMessage(
  componentName: string,
  summary: MissingVariantSummary,
): string {
  const plural = summary.missing > 1;
  const axes = summary.axes.map(
    (axis) => `• ${axis.name} : ${axis.values.join(', ')}`,
  );
  const present = summary.presentExamples.map((example) => `• ${example}`);
  const presentRemaining = summary.found - summary.presentExamples.length;
  const examples = summary.examples.map((example) => `• ${example}`);
  const remaining = summary.missing - summary.examples.length;

  return [
    `Export impossible pour « ${componentName} » : il manque ${summary.missing} variant${plural ? 's' : ''} dans le Component Set.`,
    '',
    `Figma contient actuellement ${summary.found} variant${summary.found > 1 ? 's' : ''} distinct${summary.found > 1 ? 's' : ''} :`,
    ...present,
    ...(presentRemaining > 0
      ? [`• … et ${presentRemaining} autre${presentRemaining > 1 ? 's' : ''}`]
      : []),
    '',
    `Mais ${plural ? 'ces combinaisons n’existent' : 'cette combinaison n’existe'} dans aucun variant :`,
    ...examples,
    ...(remaining > 0 ? [`• … et ${remaining} autre${remaining > 1 ? 's' : ''}`] : []),
    '',
    'Pourquoi l’export est bloqué : après l’export, le code peut choisir séparément ces propriétés :',
    ...axes,
    `Il pourrait donc demander l’une des combinaisons absentes, mais Figma ne définit ni son rendu ni ses tokens (${summary.expected} combinaisons possibles, ${summary.found} définies).`,
    '',
    `Si ${plural ? 'ces variants doivent' : 'ce variant doit'} exister : dans Figma, dupliquez un variant existant puis attribuez-lui exactement les valeurs manquantes indiquées ci-dessus.`,
    `Si ${plural ? 'ces combinaisons sont' : 'cette combinaison est'} volontairement interdite : ne créez rien ; le format de contrat doit d’abord être étendu pour exprimer cette interdiction.`,
  ].join('\n');
}

/** Vérifie que la sélection est bien UN Component Set, sinon erreur claire. */
function getSelectedComponentSet(): ComponentSetNode {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    throw new ComponentExportError('Sélectionnez un seul Component Set dans Figma.');
  }

  const node = selection[0];
  if (node.type !== 'COMPONENT_SET') {
    throw new ComponentExportError('La sélection doit être un COMPONENT_SET.');
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
 * `figma.fileKey` n'est PAS une donnée que la publication débloque : l'API la
 * réserve aux **plugins privés d'organisation** déclarant
 * `enablePrivatePluginApi` dans leur manifest. Tant que ce n'est pas le cas,
 * l'URL vaut null — durablement, pas « en attendant ». L'export n'est jamais
 * bloqué pour autant : le lien est un confort de relecture, `nodeId` et
 * `fileName` suffisent à retrouver le composant.
 */
function buildMeta(componentSet: ComponentSetNode): Omit<ContractMeta, 'warnings'> {
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

/** Point d'entrée de la commande : crée le contrat du Component Set sélectionné. */
export async function handleExportComponent(): Promise<ComponentExport> {
  const componentSet = getSelectedComponentSet();

  // Pré-vol : des règles sont OBLIGATOIRES. On lit le conteneur « <Nom>-Rules »
  // et on BLOQUE l'export tout de suite s'il n'y a aucune règle associée — avant
  // toute extraction, pour un retour immédiat à l'utilisateur.
  const rules = await extractRules(componentSet);
  if (!hasUsableRules(rules)) {
    throw new ComponentExportError(unusableRulesMessage(componentSet.name, rules));
  }

  const warnings: string[] = [...rules.warnings];
  const propertyModel = extractContractPropertyModel(
    componentSet.componentPropertyDefinitions,
    warnings,
  );
  const props = propertyModel.props;
  const missingVariants = findMissingVariantCombinations(componentSet);
  if (missingVariants) {
    throw new ComponentExportError(missingVariantsMessage(componentSet.name, missingVariants));
  }
  const { matrix, warnings: matrixWarnings } = groupComponentsByVariant(
    componentSet,
    propertyModel.publicVariantKeyByRawKey,
  );
  // Le variant de référence sert de base au layout.
  const referenceComponent = componentSet.defaultVariant ?? matrix.variants[0]?.component ?? null;

  // La composition se relève AVANT toute extraction : un composant unifié
  // imbriqué n'est ni un wrapper, ni un slot à parcourir, et cette décision
  // conditionne tout ce qui suit.
  const { composes, composed, warnings: compositionWarnings } = await scanComposedMatrix(
    matrix.variants.map((entry) => entry.component),
    referenceComponent,
    indexContractedNames(figma.currentPage),
  );
  warnings.push(...compositionWarnings);

  const wrapper = referenceComponent
    ? await findWrapperReference(referenceComponent, warnings, composed)
    : null;
  const stateModel = buildStateModel(
    matrix.axes,
    matrix.variants.map((entry) => entry.values),
    warnings,
  );

  if (wrapper?.componentSet) {
    mergeWrapperProps(
      props,
      extractContractProps(wrapper.componentSet.componentPropertyDefinitions, warnings),
      warnings,
    );
  }

  if (Object.keys(componentSet.componentPropertyDefinitions).length === 0) {
    warnings.push(
      'Le component set sélectionné n’expose aucune component property : le contrat ne ' +
        'décrira ni variants ni options.',
    );
  }

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

  // La documentation issue des règles s'accroche aux props de même nature, et
  // aux états pour l'axe que `stateModel` publie à la place des props.
  mergePropDescriptions(props, stateModel, rules.propDescriptions, warnings);
  mergeBooleanDescriptions(props, rules.booleanDescriptions, warnings);
  const icons = mergeIconRules(props, extracted.iconLayers, rules.iconRules, warnings);
  const intent = rules.intent;
  if (!intent) {
    warnings.push(
      'Aucune règle @usage, @do, @dont ou @pairs : le contrat dira comment utiliser le ' +
        'composant, mais pas quand. Ajoutez au moins une règle @usage.',
    );
  }

  // `composes` se DÉRIVE de l'arbre publié, comme `tokensUsed` se dérive du
  // contrat terminé. Le scan dit ce que Figma contient ; seul `structure.children`
  // dit où le développeur doit rendre quoi, et le consommateur refuse un contrat
  // dont les deux séquences diffèrent. Une dépendance que l'arbre n'a pas su
  // placer sort donc des deux champs à la fois — jamais d'un seul.
  //
  // La séquence se lit sur l'ARBRE, pas sur l'ordre où l'extraction a rangé ses
  // trouvailles : celui-ci dépend de l'ordonnancement des `await`, et deux
  // cadres frères pourraient se doubler sans qu'aucun design ait changé.
  const composesPlacees = dependanciesDeLArbre(extracted.structure.children, extracted.placedComposes);
  const placees = new Set(composesPlacees);
  for (const dependency of composes) {
    if (placees.has(dependency)) continue;
    warnings.push(
      `Layer « ${dependency.figmaLayer} » : il porte le composant « ${dependency.component} », ` +
        `qui a son propre contrat, mais le contrat n'a trouvé aucun emplacement où le situer. ` +
        `La dépendance ne sera ni décrite dans structure.children, ni déclarée dans composes : ` +
        `le développeur ne la rendra pas. Placez ce layer dans l'auto layout frame que le ` +
        `composant décrit, puis réexportez.`,
    );
  }

  const meta = buildMeta(componentSet);
  if (!meta.figma.url) {
    // Le message nomme la condition réelle : sans cela, l'avertissement paraît
    // transitoire, on attend qu'il disparaisse tout seul, et il finit par
    // apprendre à ne plus lire la liste des avertissements.
    warnings.push(
      'Lien vers Figma absent du contrat : l’API ne le fournit qu’aux plugins privés ' +
        'd’organisation. Le nom du fichier et l’identifiant du composant restent ' +
        'exportés, et suffisent à le retrouver.',
    );
  }

  const allWarnings = Array.from(new Set([...warnings, ...extracted.warnings]));
  const contract: Contract = {
    name: componentSet.name || 'Component',
    meta: { ...meta, warnings: allWarnings },
    props,
    structure: extracted.structure,
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
  // pour décider puis écartés — la taille d'une icône relevée sur chaque
  // variante, les couleurs d'une variante en conflit — et le contrat citerait
  // alors des tokens qu'il n'emploie pas.
  contract.tokensUsed = Array.from(collectTokenReferences(contract)).sort();

  return {
    filename: componentContractFilename(contract.name),
    content: JSON.stringify(contract, null, 2),
    warningCount: allWarnings.length,
    warnings: allWarnings,
  };
}

export default handleExportComponent;
