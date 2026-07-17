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
 * Résout des ids de variables Figma en noms de tokens canoniques, avec cache.
 * Le cache évite de rappeler l'API Figma pour un même id (un composant lie
 * souvent la même variable des dizaines de fois).
 */
export class VariableNameResolver {
  private readonly namesByVariableId = new Map<string, Promise<string | null>>();
  private readonly collectionNamesById = new Map<string, Promise<string | null>>();

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

  /** Appelle l'API Figma pour retrouver la variable puis composer son chemin. */
  private async loadName(variableId: string): Promise<string | null> {
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
