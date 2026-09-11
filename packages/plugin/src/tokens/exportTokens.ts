
/**
 * Commande « Export tokens » : exporte toutes les variables locales du
 * fichier Figma en un arbre DTCG (`tokens.json`), consommable par Style
 * Dictionary 5. Principe fondamental : la chaîne d'alias est préservée,
 * un alias devient une référence `"{cible}"`, jamais sa valeur finale.
 *
 * Le fichier suit la version `TOKENS_FORMAT_VERSION` du format de tokens :
 * couleurs et dimensions dans la forme du module DTCG 2025.10, et la marque
 * de version à la racine. docs/FORMAT.md en décrit la forme.
 */
import {
  EXTENSION_VERSION_TOKENS,
  TOKENS_FORMAT_VERSION,
  etatDuFormatDeTokens,
  normalizeName,
} from '@ucm-kit/core/format';
import type { CouleurDeToken, DimensionDeToken } from '@ucm-kit/core/format';
import { collisionWarnings, firstVariableAlias, indexVariables } from '../variables';
import { serializeJson } from '../contract/serializeJson';
import { noterLesParties, partiesDe, pointDe, pousserSansNode } from '../contract/localisation';
import type { PointACorriger } from '../contract/localisation';
import type { Annonce } from '../messages';

/** Ce que la commande renvoie à l'UI : le fichier à télécharger + un bilan. */
export type TokensExport = {
  filename: string;
  content: string;
  warningCount: number;

  /** Liste des avertissements, pour affichage détaillé dans le journal de l'UI. */
  warnings: string[];

  /**
   * Parties indexées par leur phrase. Elles atteignent l'UI mais pas
   * `tokens.json`, dont le format DTCG ne prévoit aucun diagnostic UCM.
   */
  parties: ReadonlyMap<string, PointACorriger>;
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
  // Un scope précis fait foi ; `ALL_SCOPES` retombe sur le nom normalisé.
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

/** L'espace colorimétrique qu'une couleur déclare. */
export type EspaceColorimetrique = CouleurDeToken['colorSpace'];

/**
 * L'espace des couleurs d'un document, d'après son profil. `LEGACY` désigne un
 * fichier qui n'en déclare aucun : ses couleurs sont publiées en sRGB, et
 * `avertissementDeProfil` le dit au designer.
 */
export function espaceDuProfil(profil: DocumentNode['documentColorProfile']): EspaceColorimetrique {
  return profil === 'DISPLAY_P3' ? 'display-p3' : 'srgb';
}

/**
 * Une couleur Figma dans la forme DTCG 2025.10. Figma range les canaux dans le
 * profil du document : ils sont recopiés sans conversion ni arrondi, et
 * `alpha` est toujours écrit.
 */
export function couleurDtcg(color: RGB | RGBA, espace: EspaceColorimetrique): CouleurDeToken {
  return {
    colorSpace: espace,
    components: [color.r, color.g, color.b],
    alpha: 'a' in color ? color.a : 1,
  };
}

/** Met en forme une valeur directe (non-alias) pour le `$value` DTCG. */
export function formatValue(
  raw: VariableValue,
  resolvedType: VariableResolvedDataType,
  path: string,
  scopes: readonly VariableScope[],
  espace: EspaceColorimetrique,
): unknown {
  if (resolvedType === 'COLOR') return couleurDtcg(raw as RGB | RGBA, espace);
  if (resolvedType === 'FLOAT') {
    const value = raw as number;
    const dimension: DimensionDeToken = { value, unit: 'px' };
    return isUnitless(path, scopes) ? value : dimension;
  }
  return raw; // BOOLEAN et STRING passent tels quels.
}

/**
 * Index partagés entre les étapes de l'export (id → collection/variable/chemin),
 * et l'espace colorimétrique du document, lu une fois par export.
 */
export type ExportContext = {
  collectionById: Map<string, VariableCollection>;
  variableById: Map<string, Variable>;
  pathById: Map<string, string>;
  espace: EspaceColorimetrique;
};

/**
 * Remonte la chaîne d'alias jusqu'au token racine (via le mode par défaut de
 * chaque collection). Figma garde le même `resolvedType` le long d'une
 * chaîne, mais le nom change à chaque maillon : la décision d'unité
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

/** Point d'entrée de la commande : exporte toutes les variables locales en DTCG. */
/**
 * Construit un token DTCG :
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
      const mode = collection.modes.find((candidate) => candidate.modeId === modeId);
      pousserSansNode(warnings, `Variable « ${variable.name} »`, {
        manque: mode
          ? `le mode « ${mode.name} » n’a pas de valeur.`
          : 'un de ses modes n’a pas de valeur.',
        impact: 'Le développeur n’aura aucune valeur pour ce mode.',
        action: 'Donnez une valeur à ce mode dans Figma, puis réexportez.',
      });
      return null;
    }
    const alias = firstVariableAlias(raw);
    if (alias) {
      const target = pathById.get(alias.id);
      if (!target) {
        pousserSansNode(warnings, `Variable « ${variable.name} »`, {
          manque: 'elle cite une variable introuvable.',
          impact: 'Le développeur n’aura pas sa valeur.',
          action: 'Faites-la de nouveau pointer vers une variable existante, puis réexportez.',
        });
      }
      return target ? `{${target}}` : null;
    }
    return formatValue(raw, variable.resolvedType, rootPath, root.scopes, ctx.espace);
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
 * Un emplacement déjà occupé est toujours conservé, qu'il porte un groupe ou
 * une autre feuille : écraser reviendrait à perdre une variable en silence.
 *
 * Les segments viennent des noms Figma : ils sont lus et écrits en propriétés
 * propres. Un groupe nommé `constructor` passerait sinon pour un emplacement
 * occupé, et `__proto__` écrirait dans le prototype : le token quitterait le
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
      pousserSansNode(warnings, `Token « ${path} »`, {
        manque: 'un autre token porte déjà le nom d’un de ses groupes.',
        impact: 'Le développeur n’aura pas ce token.',
        action: 'Renommez ou déplacez l’un des deux, puis réexportez.',
      });
      return;
    }
    if (!existing) set(node, key, {});
    node = node[key] as DtcgTree;
  }

  const lastKey = segments[segments.length - 1];
  const existing = own(node, lastKey);
  if (existing) {
    pousserSansNode(warnings, `Token « ${path} »`, '$value' in existing
      ? {
        manque: 'un autre token porte déjà ce nom.',
        impact: 'Seul le premier est exporté.',
        action: 'Renommez l’un des deux, puis réexportez.',
      }
      : {
        manque: 'un groupe de tokens porte déjà ce nom.',
        impact: 'Le développeur n’aura pas ce token.',
        action: 'Renommez ou déplacez l’un des deux, puis réexportez.',
      });
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
export function modeCollisionWarnings(collections: VariableCollection[]): PointACorriger[] {
  const points: PointACorriger[] = [];

  for (const collection of collections) {
    const seen = new Set<string>();
    for (const mode of collection.modes) {
      const name = normalizeName(mode.name);
      if (seen.has(name)) {
        points.push(pointDe(`Collection « ${collection.name} »`, {
          manque: `deux de ses modes donnent le même nom « ${name} » dans le fichier de tokens.`,
          impact: 'Les valeurs du second manqueront au développeur.',
          action: `Renommez l'un des deux, puis réexportez.`,
        }));
        continue;
      }
      seen.add(name);
    }
  }

  return points;
}

/**
 * Avertit d'un document qui ne déclare aucun profil de couleur. Le constat porte
 * sur le fichier : il s'écrit une fois par export, jamais une fois par couleur.
 */
export function avertissementDeProfil(
  document: Pick<DocumentNode, 'documentColorProfile' | 'name'>,
  warnings: string[],
): void {
  if (document.documentColorProfile !== 'LEGACY') return;
  pousserSansNode(warnings, `Fichier « ${document.name} »`, {
    manque: 'aucun profil de couleur n’est choisi.',
    impact: 'Le développeur recevra ces couleurs en sRGB, que Figma les affiche en sRGB ou en '
      + 'Display P3.',
    action: 'Choisissez sRGB ou Display P3 dans le menu File color profile, puis réexportez.',
  });
}

/**
 * Ce que le résultat de la commande annonce du fichier produit, lu dans le
 * fichier et non dans la constante, ou `null` quand il ne porte pas la version
 * courante. La version 1 est celle qui suit le module DTCG 2025.10.
 */
export function annonceDuFormat(contenu: string): string | null {
  let document: unknown;
  try {
    document = JSON.parse(contenu);
  } catch {
    return null;
  }
  const format = etatDuFormatDeTokens(document);
  return format.etat === 'courante'
    ? `DTCG 2025.10, version ${format.version} du format de tokens`
    : null;
}

/** Résumé de portée fichier : la sélection Figma n'intervient pas. */
export type EtatDesTokens = {

  resume: string;

  presents: boolean;
};

/** Forme le résumé affiché et indique si une analyse peut commencer. */
export function etatDesTokens(
  compte: { collections: number; variables: number; modes: number },
): EtatDesTokens {
  if (compte.variables === 0) {
    return { resume: 'Ce fichier ne contient aucune variable locale.', presents: false };
  }
  const parties = [
    `${compte.collections} collection${compte.collections === 1 ? '' : 's'}`,
    `${compte.variables} variable${compte.variables === 1 ? '' : 's'}`,
  ];
  if (compte.modes > 1) parties.push(`${compte.modes} modes`);
  return { resume: parties.join(' · '), presents: true };
}

/**
 * Compte sans tout charger : les collections portent déjà leurs identifiants de
 * variables et leurs modes, donc `getLocalVariablesAsync` n'est pas payé ici.
 */
export async function etatDesTokensDuFichier(): Promise<EtatDesTokens> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const modes = new Set<string>();
  let variables = 0;
  for (const collection of collections) {
    variables += collection.variableIds.length;
    for (const mode of collection.modes) modes.add(mode.name);
  }
  return etatDesTokens({ collections: collections.length, variables, modes: modes.size });
}

/** Exporte toutes les variables locales en DTCG sans aplatir leurs alias. */
export async function handleExportTokens(annoncer: Annonce = () => {}): Promise<TokensExport> {
  annoncer('Lecture des variables du fichier…');
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();
  annoncer('Écriture du fichier de tokens…');

  if (variables.length === 0) {
    throw new TokensExportError('Aucune variable locale à exporter.');
  }

  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const variableById = new Map(variables.map((variable) => [variable.id, variable]));
  const index = indexVariables(variables, collectionById);
  const { pathById, variableByPath } = index;
  // Cette commande exporte toutes les variables : elle signale donc toutes les
  // collisions, là où l'export composant ne signale que celles qu'il rencontre.
  // Les collisions arrivent déjà découpées : elles sont poussées par le même
  // chemin que les autres, pour que leurs parties entrent au registre.
  const warnings: string[] = [];
  for (const point of [...modeCollisionWarnings(collections), ...collisionWarnings(index)]) {
    warnings.push(noterLesParties(warnings, point));
  }
  avertissementDeProfil(figma.root, warnings);
  const ctx: ExportContext = {
    collectionById, variableById, pathById, espace: espaceDuProfil(figma.root.documentColorProfile),
  };

  // Parcourir l'index plutôt que la liste brute : une variable écartée pour
  // collision n'y figure pas, et chaque chemin est déjà calculé.
  const tree: DtcgTree = {};
  for (const [path, variable] of variableByPath) {
    const collection = collectionById.get(variable.variableCollectionId);
    if (!collection) {
      pousserSansNode(warnings, `Variable « ${variable.name} »`, {
        manque: 'sa collection est introuvable.',
        impact: 'Elle n’est pas exportée.',
        action: 'Vérifiez que cette variable appartient à une collection du fichier, puis '
          + 'réexportez.',
      });
      continue;
    }
    insert(tree, path, buildLeaf(variable, collection, ctx, warnings), warnings);
  }

  // La marque s'écrit une fois, à la racine et avant les groupes. Une `Map` tient
  // cet ordre même devant une collection au nom entier, qu'un objet rangerait
  // en tête.
  const document = new Map<string, unknown>([
    ['$extensions', { [EXTENSION_VERSION_TOKENS]: TOKENS_FORMAT_VERSION }],
    ...Object.entries(tree),
  ]);

  return {
    filename: 'tokens.json',
    content: serializeJson(document),
    warningCount: warnings.length,
    warnings,
    parties: partiesDe(warnings),
  };
}

export default handleExportTokens;
