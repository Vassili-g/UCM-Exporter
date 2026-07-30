/**
 * Commande « Export composant » : transforme le Component Set sélectionné
 * en contrat de composant (fichier `<Nom>.contract.json` téléchargé).
 *
 * Déroulé : sélection → props → matrice de variantes → wrapper de dimensions
 * → structure (layout, tailles, tokens) → intention → contrat final.
 */
import { findWrapperReference, groupComponentsByVariant } from './componentTree';
import { indexContractedNames, scanComposedMatrix } from './composedComponents';
import { extractRules, hasUsableRules } from './extractRules';
import { extractStructure } from './extractStructure';
import { extractContractProps } from './parsers';
import { mergeBooleanDescriptions } from './mergeBooleanDescriptions';
import { mergeIconRules } from './mergeIconRules';
export { mergeIconRules } from './mergeIconRules';
import { buildStateModel, defaultRenderingSemantics } from './semantics';
import { indexVariables, VariableNameResolver } from '../variables';
import type { Contract, ContractMeta, ContractProp } from './types';

/**
 * Version du schéma de contrat — à incrémenter à chaque changement de forme.
 * 4.2 : un slot d'icône porte le rôle `icon` au lieu du nom de son calque, et
 * chaque icône déclare le slot et la taille qui la rendent — les icônes qui se
 * relaient entre variants deviennent toutes rendables.
 * 4.1 : conditions de variantes des icônes et cibles de visibilité imbriquées.
 * 4.0 : composition (`composes`) et assainissement du format — les dimensions
 * ne sont plus recopiées hors de `sizes`, la couleur du label vient de
 * `variantTokens`, et `warnings` documente l'export sous `meta`.
 */
export const CONTRACT_VERSION = '4.2';

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
function mergeWrapperProps(
  props: Record<string, ContractProp>,
  wrapperProps: Record<string, ContractProp>,
  warnings: string[],
): void {
  for (const [key, prop] of Object.entries(wrapperProps)) {
    if (key in props) {
      warnings.push(
        `Prop « ${key} » du wrapper de dimensions ignorée : le Component Set sélectionné en expose déjà une.`,
      );
      continue;
    }
    props[key] = prop;
  }
}

/**
 * Accroche la doc par valeur (issue des règles `@prop`) sur les props enum.
 * Une prop inconnue ou une valeur absente de l'enum déclenche un warning précis
 * (faute de frappe dans une règle) sans bloquer l'export.
 */
function mergePropDescriptions(
  props: Record<string, ContractProp>,
  propDescriptions: Record<string, Record<string, string>>,
  warnings: string[],
): void {
  for (const [propName, valueDescriptions] of Object.entries(propDescriptions)) {
    const prop = props[propName];
    if (!prop || prop.type !== 'enum') {
      warnings.push(`@prop « ${propName} » : aucune prop enum de ce nom.`);
      continue;
    }
    for (const [value, description] of Object.entries(valueDescriptions)) {
      if (!prop.values.includes(value)) {
        warnings.push(`@prop « ${propName}.${value} » : valeur inconnue de la prop.`);
        continue;
      }
      if (!prop.descriptions) prop.descriptions = {};
      prop.descriptions[value] = description;
    }
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

/** Rend le nom du composant utilisable comme nom de fichier (Windows interdit certains caractères). */
function safeFilename(name: string): string {
  const safeName = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim();
  return `${safeName || 'Component'}.contract.json`;
}

/** Point d'entrée de la commande : crée le contrat du Component Set sélectionné. */
export async function handleExportComponent(): Promise<ComponentExport> {
  const componentSet = getSelectedComponentSet();

  // Pré-vol : des règles sont OBLIGATOIRES. On lit le conteneur « <Nom>-Rules »
  // et on BLOQUE l'export tout de suite s'il n'y a aucune règle associée — avant
  // toute extraction, pour un retour immédiat à l'utilisateur.
  const rules = await extractRules(componentSet);
  if (!hasUsableRules(rules)) {
    throw new ComponentExportError(
      `Aucune règle associée à « ${componentSet.name} ». Ajoutez un conteneur ` +
        `« ${componentSet.name}-Rules » (frame, section ou groupe) avec au moins ` +
        `une règle, puis réexportez.`,
    );
  }

  const warnings: string[] = [...rules.warnings];
  const props = extractContractProps(componentSet.componentPropertyDefinitions, warnings);
  const { matrix, warnings: matrixWarnings } = groupComponentsByVariant(componentSet);
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
    warnings.push('Aucune componentPropertyDefinition exposée par le Component Set sélectionné.');
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

  // La documentation issue des règles s'accroche aux props de même nature.
  mergePropDescriptions(props, rules.propDescriptions, warnings);
  mergeBooleanDescriptions(props, rules.booleanDescriptions, warnings);
  const icons = mergeIconRules(props, extracted.iconLayers, rules.iconRules, warnings);
  const intent = rules.intent;
  if (!intent) {
    warnings.push(
      'Règles présentes mais aucune intention (@usage/@do/@dont/@pairs) — seule la documentation de props est fournie.',
    );
  }

  const meta = buildMeta(componentSet);
  if (!meta.figma.url) {
    // Le message nomme la condition réelle : sans cela, l'avertissement paraît
    // transitoire, on attend qu'il disparaisse tout seul, et il finit par
    // apprendre à ne plus lire la liste des avertissements.
    warnings.push(
      'Lien Figma absent des métadonnées : figma.fileKey est réservé aux plugins ' +
        'privés d’organisation (manifest « enablePrivatePluginApi »). nodeId et ' +
        'fileName restent exploitables.',
    );
  }

  const allWarnings = Array.from(new Set([...warnings, ...extracted.warnings]));
  const contract: Contract = {
    name: componentSet.name || 'Component',
    meta: { ...meta, warnings: allWarnings },
    props,
    structure: extracted.structure,
    stateModel,
    rendering: defaultRenderingSemantics(),
    icons,
    composes,
    tokensUsed: extracted.tokensUsed,
    intent,
  };

  return {
    filename: safeFilename(contract.name),
    content: JSON.stringify(contract, null, 2),
    warningCount: allWarnings.length,
    warnings: allWarnings,
  };
}

export default handleExportComponent;
