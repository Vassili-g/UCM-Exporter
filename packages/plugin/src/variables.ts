/**
 * Résolution des variables Figma en noms de tokens : module commun aux deux
 * commandes du plugin. Principe fondamental : on résout les noms, jamais les
 * valeurs, pour préserver la chaîne d'alias du design system.
 */
import { normalizeName } from '@ucm-kit/core/format';

import {
  noterLesParties,
  noterSansNode,
  phraseDe,
  pointDe,
  pousserNote,
  pousserSansNode,
  sujet,
} from './contract/localisation';
import type { PointACorriger } from './contract/localisation';

/**
 * Extrait tous les alias de variable d'une liaison, qu'elle soit simple
 * (ex. itemSpacing) ou multiple (ex. fills, qui est un tableau).
 */
export function variableAliases(value: unknown): VariableAlias[] {
  const candidates = Array.isArray(value) ? value : [value];
  return candidates.filter((candidate): candidate is VariableAlias => {
    return Boolean(
      candidate &&
        typeof candidate === 'object' &&
        'type' in candidate &&
        candidate.type === 'VARIABLE_ALIAS' &&
        'id' in candidate &&
        typeof candidate.id === 'string',
    );
  });
}

/** Le premier alias d'une liaison, ou null s'il n'y en a aucun. */
export function firstVariableAlias(value: unknown): VariableAlias | null {
  return variableAliases(value)[0] ?? null;
}

/**
 * Assemble le chemin canonique d'un token : collection + variable, chacun
 * normalisé. Évite les doublons si la variable répète déjà la collection.
 *
 * @example joinTokenPath('Brand Tokens', 'Primary/default')
 * // → 'brand-tokens.primary.default'
 */
export function joinTokenPath(collectionName: string, variableName: string): string {
  const collection = normalizeName(collectionName);
  const variable = normalizeName(variableName);

  if (!collection) return variable;
  if (!variable || variable === collection || variable.startsWith(`${collection}.`)) {
    return variable || collection;
  }

  return `${collection}.${variable}`;
}

/**
 * Interface minimale dont dépendent les modules d'extraction : résoudre un
 * alias en nom de token, rien d'autre. Les modules la demandent plutôt que la
 * classe concrète, si bien qu'un test peut fournir un résolveur littéral :
 * c'est ce qui rend l'extraction vérifiable hors du runtime Figma.
 */
export type TokenResolver = Pick<VariableNameResolver, 'resolve'>;

/**
 * Premier emplacement où une variable est rencontrée. Le résolveur le garde
 * dans son warning pour que le designer sache quelle liaison réassigner.
 */
export type TokenUsage = {
  nodeName: string;
  field: string;
  /**
   * Le node du calque nommé, quand il y en a un.
   *
   * Optionnel, et l'exception a un nom : un style de texte passe aussi par ici,
   * et un style n'est pas un node. Un message qui cite un calque sans porter
   * son id est celui que l'interface réafficherait sans lien : d'où la loi qui
   * compte ces cas à la sortie du moteur.
   */
  nodeId?: string;
};

/**
 * Pousse un message qui nomme un calque, et le fait mener à ce calque.
 *
 * Les messages de ce module ont pour sujet une variable, qui n'est pas un node.
 * Plusieurs nomment ensuite le calque où la variable est reliée, et c'est là
 * que le designer agit : le clic doit y mener. Quand l'appelant n'a pas de node
 * (un style de texte passe aussi par ici), l'absence est déclarée plutôt que
 * laissée à deviner.
 */
function pousserVersLeCalque(
  point: PointACorriger,
  usage: TokenUsage | undefined,
  warnings: string[] | undefined,
): void {
  if (!warnings) return;
  if (usage?.nodeId) {
    pousserNote(warnings, point, sujet('Layer', { id: usage.nodeId, name: usage.nodeName }));
    return;
  }
  const message = phraseDe(point);
  warnings.push(message);
  noterLesParties(warnings, point);
  if (usage) noterSansNode(warnings, message, 'nom-publie');
}

/** Une variable écartée, et celle qui occupe déjà tout ou partie de son chemin. */
export type AmbiguousVariable = {
  name: string;
  owner: string;
  /** Chemin que la variable écartée aurait dû occuper. */
  path: string;
  /** Chemin réellement détenu par la première variable. */
  ownerPath: string;
  kind: 'same-path' | 'leaf-group';
};

/**
 * Index canonique des variables locales, partagé par les deux commandes.
 *
 * `normalizeName()` est volontairement à plusieurs entrées pour une sortie :
 * « Foo Bar », « foo-bar » et « Foo  Bar » donnent le même token. Deux
 * variables Figma distinctes peuvent donc se disputer un nom, y compris
 * depuis deux collections différentes (« Brand Tokens » et « brand-tokens »).
 * Une seule peut occuper le chemin ; les autres sont `ambiguous`.
 */
export type VariableIndex = {
  /** Chemin canonique des variables non ambiguës. */
  pathById: Map<string, string>;
  /** La variable qui détient chaque chemin, dans l'ordre de découverte. */
  variableByPath: Map<string, Variable>;
  /** Variables écartées, par id : leur nom appartient déjà à une autre. */
  ambiguous: Map<string, AmbiguousVariable>;
};

/**
 * Chemins des ancêtres d'un token, du plus court au plus long.
 * `['a','b','c']` → `['a', 'a.b']`. La feuille elle-même n'en fait pas partie.
 */
function ancestorPaths(segments: string[]): string[] {
  const ancestors: string[] = [];
  let current = '';
  for (let depth = 0; depth < segments.length - 1; depth += 1) {
    current = current ? `${current}.${segments[depth]}` : segments[depth];
    ancestors.push(current);
  }
  return ancestors;
}

/**
 * Construit l'index sans rien signaler : ce sont les commandes qui décident
 * de quoi avertir. L'export tokens les signale toutes (il exporte tout) ;
 * l'export composant ne signale que celles qu'un calque lie réellement, sinon
 * chaque contrat traînerait les défauts de nommage du fichier entier.
 */
export function indexVariables(
  variables: Variable[],
  collectionById: Map<string, VariableCollection>,
): VariableIndex {
  const pathById = new Map<string, string>();
  const variableByPath = new Map<string, Variable>();
  const ambiguous = new Map<string, AmbiguousVariable>();
  /**
   * Chemins déjà occupés par un groupe : chaque ancêtre d'une variable insérée,
   * associé au chemin complet de la première variable qui l'a créé, celle que
   * le diagnostic doit citer.
   *
   * L'index existe pour le coût. Sans lui, reconnaître un groupe suppose de
   * balayer toutes les variables déjà vues, pour chacune des suivantes : sur un
   * design system de plusieurs milliers de variables, ce balayage gèle l'UI du
   * plugin le temps de l'export.
   */
  const groupOwnerByPath = new Map<string, string>();

  for (const variable of variables) {
    const collection = collectionById.get(variable.variableCollectionId);
    const path = joinTokenPath(collection?.name ?? '', variable.name);
    const segments = path.split('.').filter(Boolean);
    const ancestors = ancestorPaths(segments);
    const occupiedPath =
      // Collision exacte : deux variables donnent la même feuille.
      (variableByPath.has(path) ? path : null)
      // Une feuille existante ne peut pas devenir le parent d'un groupe.
      ?? ancestors.find((ancestor) => variableByPath.has(ancestor))
      // Une nouvelle feuille ne peut pas remplacer le groupe implicite d'une
      // variable déjà rencontrée plus profondément.
      ?? groupOwnerByPath.get(path)
      ?? null;

    if (occupiedPath) {
      const owner = variableByPath.get(occupiedPath);
      // `occupiedPath` vient nécessairement des clés de `variableByPath`.
      if (!owner) continue;
      ambiguous.set(variable.id, {
        name: variable.name,
        owner: owner.name,
        path,
        ownerPath: occupiedPath,
        kind: occupiedPath === path ? 'same-path' : 'leaf-group',
      });
      continue;
    }
    variableByPath.set(path, variable);
    pathById.set(variable.id, path);
    // Le premier occupant d'un groupe reste le sien : ne jamais l'écraser.
    for (const ancestor of ancestors) {
      if (!groupOwnerByPath.has(ancestor)) groupOwnerByPath.set(ancestor, path);
    }
  }

  return { pathById, variableByPath, ambiguous };
}

/** Les collisions de l'index, formulées pour l'export tokens. */
export function collisionWarnings(index: VariableIndex): PointACorriger[] {
  return Array.from(index.ambiguous.values(), (entry) => {
    if (entry.kind === 'same-path') {
      return pointDe(`Variables « ${entry.owner} » et « ${entry.name} »`, {
        manque: `leurs noms donnent le même token « ${entry.path} ».`,
        impact: 'Seule la première est exportée.',
        action: 'Renommez la seconde.',
      });
    }
    return pointDe(
      `Variables « ${entry.owner} » (« ${entry.ownerPath} ») et « ${entry.name} » `
        + `(« ${entry.path} »)`,
      {
        manque: 'un token ne peut pas être à la fois une valeur et un groupe de tokens.',
        impact: 'Seule la première est exportée.',
        action: `Renommez ou déplacez l'une des deux.`,
      },
    );
  });
}

/** Ce dont le résolveur a besoin pour ne jamais écrire une référence trompeuse. */
export type ResolverOptions = {
  /** Index des variables locales. Absent, le résolveur interroge l'API pour tout. */
  index?: VariableIndex;
  /** Avertissements du contrat en cours ; une variable ambiguë n'y est nommée qu'une fois. */
  warnings?: string[];
};

/**
 * Résout des ids de variables Figma en noms de tokens canoniques, avec cache.
 * Le cache évite de rappeler l'API Figma pour un même id (un composant lie
 * souvent la même variable des dizaines de fois).
 *
 * Avec un `index`, le résolveur sert les variables locales de mémoire (plus
 * rapide qu'un aller-retour par id) et surtout refuse celles dont le nom
 * appartient déjà à une autre : écrire `{brand.foo-bar}` pour un calque lié à
 * la variable écartée désignerait la valeur de sa rivale. Une couleur fausse
 * traverserait alors tous les garde-fous, puisque le token, lui, existe bien.
 * Les variables d'une bibliothèque partagée ne sont pas dans l'index : elles
 * restent résolues par l'API, comme avant.
 */
export class VariableNameResolver {
  private readonly namesByVariableId = new Map<string, Promise<string | null>>();
  private readonly collectionNamesById = new Map<string, Promise<string | null>>();

  constructor(private readonly options: ResolverOptions = {}) {}

  /** Résout un alias (ou null) en nom de token (ou null). */
  resolve(
    alias: VariableAlias | null | undefined,
    usage?: TokenUsage,
  ): Promise<string | null> {
    return alias ? this.resolveById(alias.id, usage) : Promise.resolve(null);
  }

  /** Résout un id de variable en nom de token, avec mise en cache. */
  resolveById(variableId: string, usage?: TokenUsage): Promise<string | null> {
    const cached = this.namesByVariableId.get(variableId);
    if (cached) return cached;

    const pending = this.loadName(variableId, usage);
    this.namesByVariableId.set(variableId, pending);
    return pending;
  }

  /** Retrouve le chemin d'une variable : par l'index si possible, sinon par l'API. */
  private async loadName(variableId: string, usage?: TokenUsage): Promise<string | null> {
    const { index, warnings } = this.options;
    const location = usage
      ? ` sur le layer « ${usage.nodeName} » (${usage.field})`
      : '';

    const ambiguous = index?.ambiguous.get(variableId);
    if (ambiguous) {
      if (warnings) {
        pousserSansNode(warnings, `Variable « ${ambiguous.name} »`, ambiguous.kind === 'same-path'
          ? {
            manque: `une fois normalisé, son nom est identique à celui de `
              + `« ${ambiguous.owner} » (« ${ambiguous.path} »).`,
            impact: `Aucune référence n'est écrite${location}. Elle désignerait l'autre `
              + `variable.`,
            action: `Renommez l'une des deux.`,
          }
          : {
            manque: `son nom « ${ambiguous.path} » entre en conflit avec `
              + `« ${ambiguous.ownerPath} » (« ${ambiguous.owner} »).`,
            impact: `Un token ne peut pas être à la fois une valeur et un groupe de tokens. `
              + `Aucune référence n'est écrite${location}.`,
            action: `Renommez ou déplacez l'une des deux.`,
          });
      }
      return null;
    }

    const known = index?.pathById.get(variableId);
    if (known) return known;

    const variable = await figma.variables.getVariableByIdAsync(variableId).catch(() => null);
    if (!variable) {
      // Le sujet est la variable, qui n'est pas un node ; mais le message nomme
      // le calque où elle est reliée, et c'est là que le designer agit. Le clic
      // y mène quand l'appelant a passé le node : un style de texte n'en a pas.
      pousserVersLeCalque(
        pointDe(`Variable introuvable${location}`, {
          manque: `elle a sans doute été supprimée, ou vient d'une bibliothèque qui n'est `
            + `plus publiée.`,
          impact: `Rien n'est exporté pour cette valeur.`,
          action: `Reliez de nouveau une variable existante.`,
        }),
        usage,
        warnings,
      );
      return null;
    }

    const collectionName = await this.getCollectionName(variable.variableCollectionId);
    if (!collectionName) {
      if (warnings) {
        pousserSansNode(warnings, `Variable « ${variable.name} »${location}`, {
          manque: `sa collection est introuvable.`,
          impact: `Rien n'est exporté pour cette valeur.`,
          action: `Republiez la bibliothèque, ou reliez une variable locale.`,
        });
      }
      return null;
    }
    return joinTokenPath(collectionName, variable.name);
  }

  /** Nom d'une collection, également mis en cache. */
  private getCollectionName(collectionId: string): Promise<string | null> {
    const cached = this.collectionNamesById.get(collectionId);
    if (cached) return cached;

    const pending = figma.variables
      .getVariableCollectionByIdAsync(collectionId)
      .then((collection) => collection?.name ?? null)
      .catch(() => null);
    this.collectionNamesById.set(collectionId, pending);
    return pending;
  }
}
