
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
  poidsDeGraisse,
} from '@ucm-kit/core/format';
import { famillesDeTokens } from './familles';
import type { LiaisonsDeTextStyles } from './familles';
import { graissesNumeriques } from './graisses';
import { courbeDeToken, dureeDeToken, easingsSansCourbe } from './mouvement';
import type { CauseSansCourbe } from './mouvement';
import type { CouleurDeToken, DimensionDeToken } from '@ucm-kit/core/format';
import { collisionWarnings, firstVariableAlias, indexVariables } from '../variables';
import type { VariableIndex } from '../variables';
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

/**
 * Refuse un membre de `VariableResolvedDataType` que ce moteur ne traite pas.
 *
 * Le paramètre est typé `never` : ajouter un septième membre aux typings Figma
 * produit une erreur de compilation ici, avant qu'une valeur de l'API puisse
 * entrer telle quelle dans `tokens.json`.
 */
function typeInconnu(resolvedType: never): never {
  void resolvedType;
  throw new TokensExportError(
    'Ce fichier contient un type de variable que cette version du plugin ne sait pas '
    + 'exporter. Mettez à jour le plugin depuis la Figma Community, puis relancez l’analyse.',
  );
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
    case 'STRING':
      return 'string';
    case 'TIMING':
      return 'duration';
    case 'EASING':
      return 'cubicBezier';
  }
  return typeInconnu(resolvedType);
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
  switch (resolvedType) {
    case 'COLOR':
      return couleurDtcg(raw as RGB | RGBA, espace);
    case 'FLOAT': {
      const value = raw as number;
      const dimension: DimensionDeToken = { value, unit: 'px' };
      return isUnitless(path, scopes) ? value : dimension;
    }
    case 'TIMING':
      return dureeDeToken(raw as number);
    case 'EASING': {
      // `easingsSansCourbe` écarte du fichier toute variable dont un mode n'a
      // pas de courbe : sur une feuille exportée, le refus ne se produit pas.
      // Le `null` garde la fonction totale sans laisser sortir un objet de
      // l'API Figma.
      const resultat = courbeDeToken(raw);
      return 'courbe' in resultat ? resultat.courbe : null;
    }
    case 'BOOLEAN':
    case 'STRING':
      return raw;
  }
  return typeInconnu(resolvedType);
}

/**
 * Index partagés entre les étapes de l'export (id → collection/variable/chemin),
 * l'espace colorimétrique du document, lu une fois par export, et les deux
 * ensembles de variables `STRING` décidés avant la première feuille :
 * `graissesNumeriques` puis `famillesDeTokens`, dans cet ordre.
 */
export type ExportContext = {
  collectionById: Map<string, VariableCollection>;
  variableById: Map<string, Variable>;
  pathById: Map<string, string>;
  espace: EspaceColorimetrique;
  graisses: ReadonlySet<string>;
  familles: ReadonlySet<string>;
  /** Variables `EASING` retirées du fichier, par identifiant, avec leur nom Figma. */
  easingsEcartees: ReadonlyMap<string, string>;
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
/**
 * Le type d'une feuille, et la précédence entre les deux décisions prises sur
 * des variables `STRING`.
 *
 * `graissesNumeriques` passe en premier, et `famillesDeTokens` ne reçoit que
 * les variables qu'elle n'a pas retenues : les deux ensembles sont donc
 * disjoints par construction, et aucune variable ne peut recevoir deux types.
 */
function typeDeFeuille(
  variable: Variable,
  root: Variable,
  rootPath: string,
  ctx: ExportContext,
): string {
  if (ctx.graisses.has(variable.id)) return 'number';
  if (ctx.familles.has(variable.id)) return 'fontFamily';
  return dtcgType(root.resolvedType, rootPath, root.scopes);
}

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
  const graisse = ctx.graisses.has(variable.id);
  const $type = typeDeFeuille(variable, root, rootPath, ctx);

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
      // Une cible écartée pour son easing existe encore dans Figma : dire
      // qu'elle est introuvable enverrait le designer chercher une variable
      // supprimée, au lieu de la corriger là où elle est.
      const ecartee = ctx.easingsEcartees.get(alias.id);
      if (!target && ecartee !== undefined) {
        pousserSansNode(warnings, `Variable « ${variable.name} »`, {
          manque: `elle cite la variable « ${ecartee} », que le fichier de tokens ne publie pas.`,
          impact: 'Le développeur n’aura pas sa valeur.',
          action: `Choisissez Linear ou Custom bezier pour « ${ecartee} », puis réexportez.`,
        });
      } else if (!target) {
        pousserSansNode(warnings, `Variable « ${variable.name} »`, {
          manque: 'elle cite une variable introuvable.',
          impact: 'Le développeur n’aura pas sa valeur.',
          action: 'Faites-la de nouveau pointer vers une variable existante, puis réexportez.',
        });
      }
      return target ? `{${target}}` : null;
    }
    // Chaque littéral d'une graisse décidée `number` est un nom que la table connaît.
    if (graisse) return poidsDeGraisse(raw);
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

/**
 * Champs de chaîne d'un text style autres que la famille.
 *
 * Les cinq autres champs de `VariableBindableTextField` mesurent une longueur
 * et ne reçoivent pas de variable `STRING`. Une liaison par l'un de ces deux
 * champs est au contraire un usage de chaîne qui contredit la famille.
 */
const CHAMPS_DE_CHAINE = new Set(['fontStyle', 'fontWeight']);

/**
 * Les liaisons des text styles locaux, par identifiant de variable.
 *
 * `getLocalTextStylesAsync` ne rend que les styles du fichier. Un text style
 * publié par une bibliothèque lie les variables de cette bibliothèque, qui ne
 * sont pas dans cet export : son absence ici ne prouve donc rien contre une
 * variable locale, et laisse seulement la famille sans preuve.
 */
async function liaisonsDesTextStyles(warnings: string[]): Promise<LiaisonsDeTextStyles> {
  const parFontFamily = new Set<string>();
  const parAutreChampDeChaine = new Set<string>();

  let styles: TextStyle[];
  try {
    styles = await figma.getLocalTextStylesAsync();
  } catch {
    pousserSansNode(warnings, `Fichier « ${figma.root.name} »`, {
      manque: 'ses text styles n’ont pas pu être lus.',
      impact: 'Les familles typographiques resteront sans type dans le fichier de tokens.',
      action: 'Relancez l’analyse ; si l’erreur persiste, signalez-la au mainteneur du '
        + 'plugin.',
    });
    return { parFontFamily, parAutreChampDeChaine };
  }

  for (const style of styles) {
    for (const [champ, liaison] of Object.entries(style.boundVariables ?? {})) {
      const alias = firstVariableAlias(liaison);
      if (!alias) continue;
      if (champ === 'fontFamily') parFontFamily.add(alias.id);
      else if (CHAMPS_DE_CHAINE.has(champ)) parAutreChampDeChaine.add(alias.id);
    }
  }
  return { parFontFamily, parAutreChampDeChaine };
}

/**
 * Ce qui manque à une valeur `EASING`, dit par ce que l'API rend.
 *
 * Un préréglage nommé porte bien une courbe dans Figma, et l'API n'en publie
 * pas les points : écrire qu'il « n'est pas une courbe de Bézier » serait
 * faux. Un ressort, lui, n'en est pas une, et DTCG ne porte aucun type qui
 * l'exprime.
 */
function manqueDeCourbe(cause: CauseSansCourbe, mode: string): string {
  switch (cause) {
    case 'abscisse':
      return `la courbe du mode « ${mode} » sort de l’intervalle 0 à 1 en abscisse.`;
    case 'points':
      return `la courbe personnalisée du mode « ${mode} » n’a pas ses quatre points.`;
    case 'ressort':
      return `l’easing du mode « ${mode} » est un ressort, et le fichier de tokens ne porte `
        + `que des courbes de Bézier.`;
    case 'tenue':
      return `l’easing du mode « ${mode} » est Hold, qui ne décrit aucune progression.`;
    case 'preregle':
      return `Figma ne publie pas les points de l’easing du mode « ${mode} ».`;
  }
}

/**
 * Écarte du fichier les variables `EASING` qu'un mode empêche de publier, et
 * nomme chacune au designer.
 *
 * Douze des quatorze easings de Figma ne décrivent aucune courbe cubique que
 * l'API expose. Publier leur nom sous un type qui promet une courbe, ou une
 * courbe inventée à leur place, tromperait le développeur ; refuser l'export
 * entier priverait le fichier de toutes ses couleurs pour une animation. La
 * feuille sort donc du fichier, comme une variable écartée pour collision, et
 * un alias qui la vise retombe sur la politique des cibles absentes.
 */
function ecarterLesEasingsSansCourbe(
  index: VariableIndex,
  ctx: Pick<ExportContext, 'collectionById' | 'variableById' | 'pathById'>,
  warnings: string[],
): Map<string, string> {
  const ecartees = new Map<string, string>();
  for (const [id, modes] of easingsSansCourbe(ctx)) {
    const variable = ctx.variableById.get(id);
    const chemin = ctx.pathById.get(id);
    if (!variable || chemin === undefined) continue;
    const collection = ctx.collectionById.get(variable.variableCollectionId);

    for (const { modeId, cause } of modes) {
      const mode = collection?.modes.find((candidat) => candidat.modeId === modeId)?.name ?? '';
      pousserSansNode(warnings, `Variable « ${variable.name} »`, {
        manque: manqueDeCourbe(cause, mode),
        impact: 'Le développeur n’aura pas ce token.',
        action: cause === 'abscisse'
          ? 'Ramenez les deux poignées de la courbe entre 0 et 1 en abscisse, puis réexportez.'
          : cause === 'points'
            ? 'Reposez la courbe dans Figma, puis réexportez.'
            : 'Choisissez Linear ou Custom bezier dans Figma, puis réexportez.',
      });
    }

    index.pathById.delete(id);
    index.variableByPath.delete(chemin);
    ecartees.set(id, variable.name);
  }
  return ecartees;
}

/** Nomme au designer les familles que l'export n'a pas pu typer. */
function constatsDesFamilles(
  decision: { ambigues: string[]; probables: string[] },
  variableById: ReadonlyMap<string, Variable>,
  warnings: string[],
): void {
  for (const id of decision.ambigues) {
    const nom = variableById.get(id)?.name;
    if (!nom) continue;
    pousserSansNode(warnings, `Variable « ${nom} »`, {
      manque: 'elle sert de famille typographique et d’un autre usage de texte.',
      impact: 'Le développeur la recevra sans son type de famille.',
      action: 'Séparez les deux usages en deux variables dans Figma, puis réexportez.',
    });
  }
  for (const id of decision.probables) {
    const nom = variableById.get(id)?.name;
    if (!nom) continue;
    pousserSansNode(warnings, `Variable « ${nom} »`, {
      manque: 'son nom annonce une famille typographique, sans qu’un text style ni un scope '
        + 'l’établisse.',
      impact: 'Le développeur la recevra sans son type de famille.',
      action: 'Reliez-la au champ Font family d’un text style, ou limitez son scope à Font '
        + 'family, puis réexportez.',
    });
  }
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

  // Les easings sans courbe sortent de l'index avant les deux décisions de
  // type et avant l'arbre : un alias qui vise l'une d'elles trouve alors une
  // cible absente, et reçoit l'avertissement que cette politique prévoit déjà.
  const easingsEcartees = ecarterLesEasingsSansCourbe(
    index,
    { collectionById, variableById, pathById },
    warnings,
  );

  const graisses = graissesNumeriques({ collectionById, variableById, pathById });
  const familles = famillesDeTokens(
    { collectionById, variableById, pathById },
    graisses,
    await liaisonsDesTextStyles(warnings),
  );
  constatsDesFamilles(familles, variableById, warnings);

  const ctx: ExportContext = {
    collectionById,
    variableById,
    pathById,
    espace: espaceDuProfil(figma.root.documentColorProfile),
    graisses,
    familles: familles.familles,
    easingsEcartees,
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
