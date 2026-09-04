/**
 * Commande « Export tokens » : exporte TOUTES les variables locales du
 * fichier Figma en un arbre DTCG (`tokens.json`), consommable par Style
 * Dictionary. Principe fondamental : la chaîne d'alias est préservée —
 * un alias devient une référence `"{cible}"`, jamais sa valeur finale.
 */
import { normalizeName } from '@ucm-kit/core/format';
import { collisionWarnings, firstVariableAlias, indexVariables } from '../variables';
import { serializeJson } from '../contract/serializeJson';

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
 * des longueurs : exportés en "number", jamais suffixés « px ». Une hauteur
 * de ligne Figma est au contraire une longueur : `line-height: 24` signifie
 * vingt-quatre fois la taille de police en CSS, là où Figma décrit 24 px.
 */
const UNITLESS_GROUPS = new Set(['fontweight', 'opacity', 'zindex', 'aspectratio']);

/** Scopes Figma qui désignent sans ambiguïté une longueur CSS. */
const DIMENSION_SCOPES = new Set<VariableScope>([
  'CORNER_RADIUS',
  'WIDTH_HEIGHT',
  'GAP',
  'STROKE_FLOAT',
  'EFFECT_FLOAT',
  'FONT_SIZE',
  'LINE_HEIGHT',
  'LETTER_SPACING',
  'PARAGRAPH_SPACING',
  'PARAGRAPH_INDENT',
]);

/** Vrai si le token est un ratio ou nombre CSS sans unité. */
export function isUnitless(path: string, scopes: readonly VariableScope[] = []): boolean {
  // Le scope Figma est l'autorité quand il est précis. `ALL_SCOPES` ne dit
  // rien sur l'unité ; le nom normalisé reste alors le repli compatible.
  if (scopes.some((scope) => DIMENSION_SCOPES.has(scope))) return false;
  if (scopes.includes('FONT_WEIGHT') || scopes.includes('OPACITY')) return true;
  return path.split('.').some((segment) => UNITLESS_GROUPS.has(segment.replace(/-/g, '')));
}

/** Traduit un type de variable Figma en type DTCG. */
export function dtcgType(
  resolvedType: VariableResolvedDataType,
  path: string,
  scopes: readonly VariableScope[] = [],
): string {
  switch (resolvedType) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      return isUnitless(path, scopes) ? 'number' : 'dimension';
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
export function formatValue(
  raw: VariableValue,
  resolvedType: VariableResolvedDataType,
  path: string,
  scopes: readonly VariableScope[] = [],
): unknown {
  if (resolvedType === 'COLOR') return toHex(raw as RGB | RGBA);
  if (resolvedType === 'FLOAT') {
    const value = raw as number;
    return isUnitless(path, scopes) ? value : `${value}px`;
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
  const $type = dtcgType(root.resolvedType, rootPath, root.scopes);

  const valueForMode = (modeId: string): unknown => {
    const raw = variable.valuesByMode[modeId];
    if (raw === undefined) {
      warnings.push(`Variable « ${variable.name} » : un de ses modes n’a pas de valeur. Ce mode est exporté vide ; donnez-lui une valeur dans Figma.`);
      return null;
    }
    const alias = firstVariableAlias(raw);
    if (alias) {
      const target = pathById.get(alias.id);
      if (!target) warnings.push(`Variable « ${variable.name} » : elle référence une variable introuvable. Aucune référence n’est écrite ; reliez-la de nouveau.`);
      return target ? `{${target}}` : null;
    }
    return formatValue(raw, variable.resolvedType, rootPath, root.scopes);
  };

  const leaf: DtcgLeaf = { $value: valueForMode(collection.defaultModeId), $type };

  if (collection.modes.length > 1) {
    // Les noms de modes viennent de Figma. Une `Map` n'a aucune clé héritée, là
    // où un objet littéral prendrait un mode « constructor » pour un doublon
    // déjà présent et laisserait « __proto__ » fixer son prototype : une marque
    // entière quitterait `tokens.json` sans qu'aucun avertissement ne le dise.
    const modes = new Map<string, unknown>();
    // Premier conservé si deux noms se normalisent pareil ; c'est
    // `modeCollisionWarnings` qui le signale.
    for (const mode of collection.modes) {
      const modeName = normalizeName(mode.name);
      if (!modes.has(modeName)) modes.set(modeName, valueForMode(mode.modeId));
    }
    leaf.$extensions = { 'com.ucm.modes': Object.fromEntries(modes) };
  }

  return leaf;
}

/**
 * Insère une feuille dans l'arbre en suivant son chemin pointé.
 * Un emplacement déjà occupé est TOUJOURS conservé, qu'il porte un groupe ou
 * une autre feuille : écraser reviendrait à perdre une variable en silence.
 *
 * Les segments viennent des noms Figma : ils sont lus et écrits en propriétés
 * PROPRES. Un groupe nommé `constructor` passerait sinon pour un emplacement
 * occupé, et `__proto__` écrirait dans le prototype — le token quitterait le
 * fichier sans un mot.
 */
export function insert(tree: DtcgTree, path: string, leaf: DtcgLeaf, warnings: string[]): void {
  const segments = path.split('.').filter(Boolean);
  if (segments.length === 0) return;

  const own = (node: DtcgTree, key: string) =>
    (Object.prototype.hasOwnProperty.call(node, key) ? node[key] : undefined);
  const set = (node: DtcgTree, key: string, value: DtcgTree | DtcgLeaf) => {
    Object.defineProperty(node, key, {
      value, enumerable: true, writable: true, configurable: true,
    });
  };

  let node = tree;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    const existing = own(node, key);
    // Un groupe ne peut pas traverser une feuille existante.
    if (existing && '$value' in existing) {
      warnings.push(`Token « ${path} » : un token porte déjà ce nom plus haut dans l’arborescence. Il n’est pas exporté ; renommez ou déplacez l’un des deux.`);
      return;
    }
    if (!existing) set(node, key, {});
    node = node[key] as DtcgTree;
  }

  const lastKey = segments[segments.length - 1];
  const existing = own(node, lastKey);
  if (existing) {
    warnings.push(
      '$value' in existing
        ? `Token « ${path} » : un autre token porte déjà ce nom. Seul le premier est exporté ; renommez le second.`
        : `Token « ${path} » : un groupe de tokens porte déjà ce nom. Un token ne peut pas être à la fois une valeur et un groupe. Il n’est pas exporté ; renommez ou déplacez l’un des deux.`,
    );
    return;
  }
  set(node, lastKey, leaf);
}

/**
 * Signale les collections dont deux modes portent le même nom une fois
 * normalisé (« Marque 2 » et « marque-2 ») : leurs valeurs se retrouveraient
 * sous une seule clé de `$extensions`, et une marque disparaîtrait.
 *
 * Contrôlé une fois par collection, jamais dans `buildLeaf` : le même message
 * y serait répété pour chacune des centaines de variables de la collection.
 */
export function modeCollisionWarnings(collections: VariableCollection[]): string[] {
  const warnings: string[] = [];

  for (const collection of collections) {
    const seen = new Set<string>();
    for (const mode of collection.modes) {
      const name = normalizeName(mode.name);
      if (seen.has(name)) {
        warnings.push(
          `Collection « ${collection.name} » : deux de ses modes donnent le même nom ` +
            `« ${name} ». Seul le premier est exporté ; renommez l'un des deux.`,
        );
        continue;
      }
      seen.add(name);
    }
  }

  return warnings;
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
  const index = indexVariables(variables, collectionById);
  const { pathById, variableByPath } = index;
  // Cette commande exporte TOUTES les variables : elle signale donc toutes les
  // collisions, là où l'export composant ne signale que celles qu'il rencontre.
  const warnings: string[] = [...modeCollisionWarnings(collections), ...collisionWarnings(index)];
  const ctx = { collectionById, variableById, pathById };

  // Parcourir l'index plutôt que la liste brute : une variable écartée pour
  // collision n'y figure pas, et chaque chemin est déjà calculé.
  const tree: DtcgTree = {};
  for (const [path, variable] of variableByPath) {
    const collection = collectionById.get(variable.variableCollectionId);
    if (!collection) {
      warnings.push(`Variable « ${variable.name} » : sa collection est introuvable, elle n’est pas exportée. Vérifiez que cette variable appartient à une collection du fichier, puis réexportez.`);
      continue;
    }
    insert(tree, path, buildLeaf(variable, collection, ctx, warnings), warnings);
  }

  return {
    filename: 'tokens.json',
    content: serializeJson(tree),
    warningCount: warnings.length,
    warnings,
  };
}

export default handleExportTokens;
