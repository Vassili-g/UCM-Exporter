/**
 * Commande « Export composant » : transforme le Component Set sélectionné
 * en contrat UCS (fichier `<Nom>.contract.json` téléchargé).
 *
 * Déroulé : sélection → props → matrice de variantes → wrapper de dimensions
 * → structure (layout, tailles, tokens) → intention → contrat final.
 */
import { findWrapperReference, groupComponentsByVariant } from './componentTree';
import { extractRules, hasUsableRules } from './extractRules';
import { extractStructure } from './extractStructure';
import { extractContractProps, normalizePropKey } from './parsers';
import { buildStateModel, defaultRenderingSemantics } from './semantics';
import type { Contract, ContractMeta, ContractProp, IconDefinition, IconProp } from './types';
import type { IconRule } from './extractRules';

/** Version du schéma de contrat — à incrémenter à chaque changement de forme. */
const UCS_VERSION = '1.4';

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
 * Les props du set externe gardent la priorité en cas de doublon.
 */
function mergeWrapperProps(
  props: Record<string, ContractProp>,
  wrapperProps: Record<string, ContractProp>,
): void {
  for (const [key, prop] of Object.entries(wrapperProps)) {
    if (!(key in props)) props[key] = prop;
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
 * Transforme les règles `@icons` en métadonnées d'icônes. La liaison est une
 * égalité stricte entre le texte du calque `icon` et le nom du calque graphique
 * exporté : aucun rôle de position (`left`, `right`…) n'est deviné.
 *
 * Les props BOOLEAN Figma restent inchangées. Si Figma relie nativement la
 * visibilité du calque à l'une d'elles, une prop runtime `<bool>Name` est
 * ajoutée à côté pour une icône `modifiable`.
 */
export function mergeIconRules(
  props: Record<string, ContractProp>,
  children: Contract['structure']['children'],
  rules: IconRule[],
  warnings: string[],
): Record<string, IconDefinition> {
  const icons: Record<string, IconDefinition> = {};

  for (const rule of rules) {
    const key = normalizePropKey(rule.iconName);
    const matches = children.filter(
      (child) => !child.typography && child.figmaLayer === rule.iconName,
    );
    if (matches.length === 0) {
      warnings.push(`@icons « ${rule.iconName} » : aucun calque graphique de ce nom.`);
      continue;
    }
    if (matches.length > 1) {
      warnings.push(
        `@icons « ${rule.iconName} » : ${matches.length} calques graphiques portent ce nom ; règle ignorée.`,
      );
      continue;
    }
    if (icons[key]) {
      warnings.push(`@icons « ${rule.iconName} » : clé normalisée dupliquée ; règle ignorée.`);
      continue;
    }

    const iconChild = matches[0];
    const icon: IconDefinition = {
      policy: rule.policy,
      figmaName: iconChild.figmaLayer ?? rule.iconName,
      ...(iconChild.visibilityProp ? { visibilityProp: iconChild.visibilityProp } : {}),
    };
    icons[key] = icon;

    if (rule.policy === 'strict') continue;

    const visibilityProp = iconChild.visibilityProp;
    if (!visibilityProp) {
      warnings.push(
        `@icons « ${rule.iconName} » modifiable : le calque doit lier « visible » à une prop BOOLEAN Figma pour exposer une prop runtime.`,
      );
      continue;
    }
    if (props[visibilityProp]?.type !== 'boolean') {
      warnings.push(
        `@icons « ${rule.iconName} » modifiable : « ${visibilityProp} » n'est pas une prop BOOLEAN Figma exploitable.`,
      );
      continue;
    }

    const runtimeProp = `${visibilityProp}Name`;
    if (runtimeProp in props) {
      warnings.push(
        `@icons « ${rule.iconName} » modifiable : la prop runtime « ${runtimeProp} » existe déjà ; aucune prop n'est remplacée.`,
      );
      continue;
    }
    const iconProp: IconProp = {
      type: 'icon',
      default: null,
      policy: 'modifiable',
      visibilityProp,
    };
    props[runtimeProp] = iconProp;
    icon.runtimeProp = runtimeProp;
  }

  return icons;
}

/**
 * Construit les métadonnées de traçabilité vers Figma.
 * `figma.fileKey` n'est pas toujours fourni par l'API (plugins en
 * développement) : dans ce cas l'URL vaut null, sans bloquer l'export.
 */
function buildMeta(componentSet: ComponentSetNode): ContractMeta {
  const fileKey = figma.fileKey ?? null;
  const fileName = figma.root.name;
  const nodeId = componentSet.id;
  // Format d'URL Figma : les « : » de l'id de nœud deviennent des « - ».
  const url = fileKey
    ? `https://www.figma.com/design/${fileKey}/${encodeURIComponent(fileName)}?node-id=${nodeId.replace(/:/g, '-')}`
    : null;

  return {
    ucsVersion: UCS_VERSION,
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

/** Point d'entrée de la commande : crée le contrat UCS du Component Set sélectionné. */
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

  const props = extractContractProps(componentSet.componentPropertyDefinitions);
  const { matrix, warnings: matrixWarnings } = groupComponentsByVariant(componentSet);
  // Le variant de référence sert de base au layout et à la couleur du label.
  const referenceComponent = componentSet.defaultVariant ?? matrix.variants[0]?.component ?? null;
  const wrapper = referenceComponent ? await findWrapperReference(referenceComponent) : null;
  const warnings: string[] = [...rules.warnings];
  const stateModel = buildStateModel(
    matrix.axes,
    matrix.variants.map((entry) => entry.values),
    warnings,
  );

  if (wrapper?.componentSet) {
    mergeWrapperProps(props, extractContractProps(wrapper.componentSet.componentPropertyDefinitions));
  }

  if (Object.keys(componentSet.componentPropertyDefinitions).length === 0) {
    warnings.push('Aucune componentPropertyDefinition exposée par le Component Set sélectionné.');
  }

  const extracted = await extractStructure(matrix, matrixWarnings, wrapper, referenceComponent);

  // La doc par valeur (@prop) s'accroche aux props enum ; l'intention est déjà lue.
  mergePropDescriptions(props, rules.propDescriptions, warnings);
  const icons = mergeIconRules(props, extracted.structure.children, rules.iconRules, warnings);
  const intent = rules.intent;
  if (!intent) {
    warnings.push(
      'Règles présentes mais aucune intention (@usage/@do/@dont/@pairs) — seule la doc par valeur est fournie.',
    );
  }

  const meta = buildMeta(componentSet);
  if (!meta.figma.url) {
    warnings.push('Clé du fichier Figma indisponible : lien URL absent des métadonnées.');
  }

  const contract: Contract = {
    name: componentSet.name || 'Component',
    meta,
    props,
    structure: extracted.structure,
    stateModel,
    rendering: defaultRenderingSemantics(),
    icons,
    tokensUsed: extracted.tokensUsed,
    intent,
    warnings: Array.from(new Set([...warnings, ...extracted.warnings])),
  };

  return {
    filename: safeFilename(contract.name),
    content: JSON.stringify(contract, null, 2),
    warningCount: contract.warnings.length,
    warnings: contract.warnings,
  };
}

export default handleExportComponent;
