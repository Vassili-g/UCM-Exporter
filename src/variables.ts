/**
 * Résolution des variables Figma en NOMS de tokens — module commun aux deux
 * commandes du plugin. Principe fondamental : on résout les noms, jamais les
 * valeurs, pour préserver la chaîne d'alias du design system.
 */
import normalizeName from './utils';

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
 * Enrobe un nom de token en RÉFÉRENCE de contrat, entre accolades — même
 * convention que les références DTCG de `tokens.json`. Un token cité dans un
 * contrat est toujours un lien vers `tokens.json`, jamais une valeur : les
 * accolades le rendent explicite et le distinguent d'une chaîne littérale.
 * Le chemin lui-même vient de `normalizeName()` — les accolades sont un
 * enrobage, pas un renommage : les deux commandes restent recoupables.
 *
 * @example toRef('components.button.default.background')
 * // → '{components.button.default.background}'
 */
export function toRef(name: string): string {
  return `{${name}}`;
}

/** Forme exacte d'une référence, telle que `toRef` la produit. */
const TOKEN_REFERENCE = /^\{[^{}\s]+\.[^{}\s]+\}$/;

/**
 * Vrai si cette valeur est une référence de token, et rien d'autre.
 *
 * La chaîne ENTIÈRE doit être la référence : une phrase qui en cite une — un
 * avertissement, une règle d'usage écrite par le designer — n'en est pas une.
 */
export function isTokenReference(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_REFERENCE.test(value);
}

/**
 * Chemin nu d'une référence : l'inverse exact de `toRef`. Une chaîne qui n'est
 * pas une référence est rendue telle quelle.
 *
 * Cette fonction vit ici parce que `variables.ts` est l'unique autorité sur la
 * forme d'une référence. Déballer les accolades ailleurs finirait par lire
 * « border} » comme le dernier segment d'un token, et un garde-fou entier se
 * tairait sans un mot.
 *
 * @example refPath('{components.button.default.border}')
 * // → 'components.button.default.border'
 */
export function refPath(reference: string): string {
  return isTokenReference(reference) ? reference.slice(1, -1) : reference;
}

/**
 * Toutes les références de token contenues dans une valeur, à profondeur
 * quelconque.
 *
 * Aucune connaissance de la forme du contrat n'est nécessaire : un champ qui
 * porterait demain une référence est couvert sans toucher à cette fonction.
 * C'est ce qui permet à `tokensUsed` d'être l'index du contrat terminé plutôt
 * qu'un relevé tenu pendant l'extraction — un relevé y ferait entrer les tokens
 * lus pour décider, puis écartés.
 */
export function collectTokenReferences(
  value: unknown,
  found = new Set<string>(),
): Set<string> {
  if (isTokenReference(value)) found.add(value);
  else if (Array.isArray(value)) for (const item of value) collectTokenReferences(item, found);
  else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectTokenReferences(item, found);
  }
  return found;
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
 * Interface MINIMALE dont dépendent les modules d'extraction : résoudre un
 * alias en nom de token, rien d'autre. Les modules la demandent plutôt que la
 * classe concrète, si bien qu'un test peut fournir un résolveur littéral —
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
};

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
 * Index canonique des variables LOCALES, partagé par les deux commandes.
 *
 * `normalizeName()` est volontairement à plusieurs entrées pour une sortie :
 * « Foo Bar », « foo-bar » et « Foo  Bar » donnent le même token. Deux
 * variables Figma distinctes peuvent donc se disputer un nom — y compris
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
   * Chemins déjà occupés par un GROUPE : chaque ancêtre d'une variable insérée,
   * associé au chemin complet de la première variable qui l'a créé — celle que
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
export function collisionWarnings(index: VariableIndex): string[] {
  return Array.from(index.ambiguous.values(), (entry) => {
    if (entry.kind === 'same-path') {
      return (
        `Variables « ${entry.owner} » et « ${entry.name} » : leurs noms donnent le même token ` +
        `« ${entry.path} ». Seule la première est exportée ; renommez la seconde.`
      );
    }
    return (
      `Variables « ${entry.owner} » (« ${entry.ownerPath} ») et « ${entry.name} » ` +
      `(« ${entry.path} ») : un token ne peut pas être à la fois une valeur et un groupe de ` +
      `tokens. Seule la première est exportée ; renommez ou déplacez l'une des deux.`
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
 * Avec un `index`, le résolveur sert les variables locales de mémoire — plus
 * rapide qu'un aller-retour par id — et surtout REFUSE celles dont le nom
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
      warnings?.push(ambiguous.kind === 'same-path'
        ? `Variable « ${ambiguous.name} » : une fois normalisé, son nom est identique à celui ` +
          `de « ${ambiguous.owner} » (« ${ambiguous.path} »). Aucune référence n'est écrite` +
          `${location}. Elle désignerait l'autre variable. Renommez l'une des deux.`
        : `Variable « ${ambiguous.name} » : son nom « ${ambiguous.path} » entre en conflit avec ` +
          `« ${ambiguous.ownerPath} » (« ${ambiguous.owner} »). Un token ne peut pas être à la ` +
          `fois une valeur et un groupe de tokens. Aucune référence n'est écrite${location}. ` +
          `Renommez ou déplacez l'une des deux.`);
      return null;
    }

    const known = index?.pathById.get(variableId);
    if (known) return known;

    const variable = await figma.variables.getVariableByIdAsync(variableId).catch(() => null);
    if (!variable) {
      warnings?.push(
        `Variable introuvable${location} : elle a sans doute été supprimée, ou vient d'une ` +
          `bibliothèque qui n'est plus publiée. Rien n'est exporté pour cette valeur. ` +
          `Reliez de nouveau une variable existante.`,
      );
      return null;
    }

    const collectionName = await this.getCollectionName(variable.variableCollectionId);
    if (!collectionName) {
      warnings?.push(
        `Variable « ${variable.name} »${location} : sa collection est introuvable. Rien n'est ` +
          `exporté pour cette valeur. Republiez la bibliothèque, ou reliez une variable locale.`,
      );
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
