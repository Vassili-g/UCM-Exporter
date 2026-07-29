/**
 * Commande « Export tokens » : exporte TOUTES les variables locales du
 * fichier Figma en un arbre DTCG (`tokens.json`), consommable par Style
 * Dictionary. Principe fondamental : la chaîne d'alias est préservée —
 * un alias devient une référence `"{cible}"`, jamais sa valeur finale.
 */
import normalizeName from '../utils';
import { firstVariableAlias, joinTokenPath } from '../variables';

/** Ce que la commande renvoie à l'UI : le fichier à télécharger + un bilan. */
export type TokensExport = {
  filename: string;
  content: string;
  warningCount: number;
  /** Liste des avertissements, pour affichage détaillé dans le journal de l'UI. */
  warnings: string[];
};

/** Erreur « métier » : son message est affiché tel quel à l'utilisateur. */
export class TokensExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokensExportError';
  }
}

/** Un token DTCG : sa valeur, son type, et d'éventuelles extensions. */
type DtcgLeaf = { $value: unknown; $type: string; $extensions?: Record<string, unknown> };
/** L'arbre DTCG : des groupes imbriqués dont les feuilles sont des tokens. */
type DtcgTree = { [key: string]: DtcgTree | DtcgLeaf };

/**
 * Groupes dont les valeurs FLOAT sont des ratios ou des nombres purs, pas
 * des longueurs : exportés en "number", jamais suffixés « px ».
 */
const UNITLESS_HINTS = ['fontweight', 'lineheight', 'opacity', 'z-index', 'aspect-ratio'];

/** Vrai si le chemin du token appartient à un groupe sans unité. */
export function isUnitless(path: string): boolean {
  return UNITLESS_HINTS.some((hint) => path.includes(hint));
}

/** Traduit un type de variable Figma en type DTCG. */
export function dtcgType(resolvedType: VariableResolvedDataType, path: string): string {
  switch (resolvedType) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      return isUnitless(path) ? 'number' : 'dimension';
    case 'BOOLEAN':
      return 'boolean';
    default:
      return 'string';
  }
}

/** Convertit une couleur Figma (canaux 0→1) en hexadécimal (#rrggbb[aa]). */
export function toHex(color: RGB | RGBA): string {
  const channel = (value: number) => Math.round(value * 255).toString(16).padStart(2, '0');
  const base = `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
  const alpha = 'a' in color ? color.a : 1;
  return alpha < 1 ? `${base}${channel(alpha)}` : base;
}

/** Met en forme une valeur directe (non-alias) pour le `$value` DTCG. */
export function formatValue(raw: VariableValue, resolvedType: VariableResolvedDataType, path: string): unknown {
  if (resolvedType === 'COLOR') return toHex(raw as RGB | RGBA);
  if (resolvedType === 'FLOAT') {
    const value = raw as number;
    return isUnitless(path) ? value : `${value}px`;
  }
  return raw; // BOOLEAN et STRING passent tels quels.
}

/** Index partagés entre les étapes de l'export (id → collection/variable/chemin). */
export type ExportContext = {
  collectionById: Map<string, VariableCollection>;
  variableById: Map<string, Variable>;
  pathById: Map<string, string>;
};

/**
 * Remonte la chaîne d'alias jusqu'au token racine (via le mode par défaut de
 * chaque collection). Figma garde le même `resolvedType` le long d'une
 * chaîne, mais le NOM change à chaque maillon : la décision d'unité
 * (dimension vs number) doit donc se prendre sur le groupe de la racine.
 * Ex. `lineheight` alias `spacing` (des px) → dimension, pas number.
 * Le Set `seen` protège d'une boucle d'alias accidentelle.
 */
function resolveRoot(variable: Variable, ctx: ExportContext): Variable {
  let current = variable;
  const seen = new Set<string>([variable.id]);
  for (;;) {
    const collection = ctx.collectionById.get(current.variableCollectionId);
    if (!collection) break;
    const alias = firstVariableAlias(current.valuesByMode[collection.defaultModeId]);
    const next = alias ? ctx.variableById.get(alias.id) : undefined;
    if (!next || seen.has(next.id)) break;
    seen.add(next.id);
    current = next;
  }
  return current;
}

/**
 * Construit UN token DTCG :
 * - valeur directe → littérale (hex, px, nombre…) ;
 * - alias → référence `"{chemin.cible}"`, jamais la valeur résolue ;
 * - collection multi-mode (ex. Brand Tokens, 1 mode = 1 marque) → tous les
 *   modes sous `$extensions["com.ucm.modes"]`, rien n'est perdu.
 */
export function buildLeaf(
  variable: Variable,
  collection: VariableCollection,
  ctx: ExportContext,
  warnings: string[],
): DtcgLeaf {
  const pathById = ctx.pathById;
  const path = pathById.get(variable.id) ?? normalizeName(variable.name);
  const root = resolveRoot(variable, ctx);
  const rootPath = pathById.get(root.id) ?? path;
  const $type = dtcgType(root.resolvedType, rootPath);

  const valueForMode = (modeId: string): unknown => {
    const raw = variable.valuesByMode[modeId];
    if (raw === undefined) {
      warnings.push(`Variable « ${variable.name} » : aucune valeur pour un mode.`);
      return null;
    }
    const alias = firstVariableAlias(raw);
    if (alias) {
      const target = pathById.get(alias.id);
      if (!target) warnings.push(`Variable « ${variable.name} » : alias cible introuvable.`);
      return target ? `{${target}}` : null;
    }
    return formatValue(raw, variable.resolvedType, rootPath);
  };

  const leaf: DtcgLeaf = { $value: valueForMode(collection.defaultModeId), $type };

  if (collection.modes.length > 1) {
    const modes: Record<string, unknown> = {};
    for (const mode of collection.modes) modes[normalizeName(mode.name)] = valueForMode(mode.modeId);
    leaf.$extensions = { 'com.ucm.modes': modes };
  }

  return leaf;
}

/**
 * Insère une feuille dans l'arbre en suivant son chemin pointé.
 * Un emplacement déjà occupé est TOUJOURS conservé, qu'il porte un groupe ou
 * une autre feuille : écraser reviendrait à perdre une variable en silence.
 */
export function insert(tree: DtcgTree, path: string, leaf: DtcgLeaf, warnings: string[]): void {
  const segments = path.split('.').filter(Boolean);
  if (segments.length === 0) return;

  let node = tree;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    const existing = node[key];
    // Un groupe ne peut pas traverser une feuille existante.
    if (existing && '$value' in existing) {
      warnings.push(`Collision de chemin sur « ${path} » : token déjà présent comme feuille.`);
      return;
    }
    node[key] = (existing as DtcgTree) ?? {};
    node = node[key] as DtcgTree;
  }

  // Et rien ne peut prendre la place de l'existant, groupe comme feuille.
  const lastKey = segments[segments.length - 1];
  const existing = node[lastKey];
  if (existing) {
    warnings.push(
      '$value' in existing
        ? `Collision de chemin sur « ${path} » : un token porte déjà ce nom ; premier conservé.`
        : `Collision de chemin sur « ${path} » : un groupe de tokens porte déjà ce nom.`,
    );
    return;
  }
  node[lastKey] = leaf;
}

/**
 * Indexe les variables par chemin canonique. Cette passe précède l'export car
 * un alias a besoin du chemin de sa cible même si elle n'a pas encore été
 * traitée.
 *
 * Deux noms Figma distincts peuvent donner le même token une fois normalisés
 * (« Foo Bar » et « foo-bar »). La première variable garde le chemin ; la
 * seconde est nommée dans un warning et laissée hors des DEUX index — un alias
 * qui la visait sera signalé introuvable plutôt que de pointer en silence sur
 * la valeur de sa rivale, ce qui serait une référence fausse et non un manque.
 */
export function indexVariables(
  variables: Variable[],
  collectionById: Map<string, VariableCollection>,
  warnings: string[],
): { pathById: Map<string, string>; variableByPath: Map<string, Variable> } {
  const pathById = new Map<string, string>();
  const variableByPath = new Map<string, Variable>();

  for (const variable of variables) {
    const collection = collectionById.get(variable.variableCollectionId);
    const path = joinTokenPath(collection?.name ?? '', variable.name);
    const firstVariable = variableByPath.get(path);
    if (firstVariable) {
      warnings.push(
        `Collision de tokens : « ${firstVariable.name} » et « ${variable.name} » donnent le même ` +
          `token « ${path} ». La seconde est ignorée ; renommez-la dans Figma.`,
      );
      continue;
    }
    variableByPath.set(path, variable);
    pathById.set(variable.id, path);
  }

  return { pathById, variableByPath };
}

/** Point d'entrée de la commande : exporte toutes les variables locales en DTCG. */
export async function handleExportTokens(): Promise<TokensExport> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();

  if (variables.length === 0) {
    throw new TokensExportError('Aucune variable locale à exporter.');
  }

  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const variableById = new Map(variables.map((variable) => [variable.id, variable]));
  const warnings: string[] = [];
  const { pathById, variableByPath } = indexVariables(variables, collectionById, warnings);
  const ctx = { collectionById, variableById, pathById };

  // Parcourir l'index plutôt que la liste brute : une variable écartée pour
  // collision n'y figure pas, et chaque chemin est déjà calculé.
  const tree: DtcgTree = {};
  for (const [path, variable] of variableByPath) {
    const collection = collectionById.get(variable.variableCollectionId);
    if (!collection) {
      warnings.push(`Variable « ${variable.name} » : collection introuvable.`);
      continue;
    }
    insert(tree, path, buildLeaf(variable, collection, ctx, warnings), warnings);
  }

  return {
    filename: 'tokens.json',
    content: JSON.stringify(tree, null, 2),
    warningCount: warnings.length,
    warnings,
  };
}

export default handleExportTokens;
