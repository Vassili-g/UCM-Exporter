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

/** Une variable écartée, et celle qui lui a pris son nom. */
export type AmbiguousVariable = { name: string; owner: string; path: string };

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

  for (const variable of variables) {
    const collection = collectionById.get(variable.variableCollectionId);
    const path = joinTokenPath(collection?.name ?? '', variable.name);
    const owner = variableByPath.get(path);
    if (owner) {
      ambiguous.set(variable.id, { name: variable.name, owner: owner.name, path });
      continue;
    }
    variableByPath.set(path, variable);
    pathById.set(variable.id, path);
  }

  return { pathById, variableByPath, ambiguous };
}

/** Les collisions de l'index, formulées pour l'export tokens. */
export function collisionWarnings(index: VariableIndex): string[] {
  return Array.from(index.ambiguous.values(), (entry) =>
    `Collision de tokens : « ${entry.owner} » et « ${entry.name} » donnent le même ` +
    `token « ${entry.path} ». La seconde est ignorée ; renommez-la dans Figma.`,
  );
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
  resolve(alias: VariableAlias | null | undefined): Promise<string | null> {
    return alias ? this.resolveById(alias.id) : Promise.resolve(null);
  }

  /** Résout un id de variable en nom de token, avec mise en cache. */
  resolveById(variableId: string): Promise<string | null> {
    const cached = this.namesByVariableId.get(variableId);
    if (cached) return cached;

    const pending = this.loadName(variableId);
    this.namesByVariableId.set(variableId, pending);
    return pending;
  }

  /** Retrouve le chemin d'une variable : par l'index si possible, sinon par l'API. */
  private async loadName(variableId: string): Promise<string | null> {
    const { index, warnings } = this.options;

    const ambiguous = index?.ambiguous.get(variableId);
    if (ambiguous) {
      warnings?.push(
        `Variable « ${ambiguous.name} » : même nom normalisé que « ${ambiguous.owner} » ` +
          `(« ${ambiguous.path} »). Aucune référence n'est écrite — elle désignerait l'autre ` +
          `variable. Renommez l'une des deux dans Figma.`,
      );
      return null;
    }

    const known = index?.pathById.get(variableId);
    if (known) return known;

    const variable = await figma.variables.getVariableByIdAsync(variableId).catch(() => null);
    if (!variable) return null;

    const collectionName = await this.getCollectionName(variable.variableCollectionId);
    return joinTokenPath(collectionName ?? '', variable.name);
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
