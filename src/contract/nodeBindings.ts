/**
 * Petits utilitaires de lecture des `boundVariables` d'un node Figma :
 * parcours de sous-arbre, accès à une liaison, résolution d'un champ en
 * nom de token avec warning si la valeur n'est pas tokenisée.
 */
import { firstVariableAlias, toRef, VariableNameResolver } from '../variables';

/** Racine de recherche acceptée : un composant ou une instance. */
export type SearchRoot = ComponentNode | InstanceNode;

/** La racine + tous ses descendants, à plat. */
export function getAllNodes(root: SearchRoot): SceneNode[] {
  return [root, ...root.findAll(() => true)];
}

/**
 * Liaison de variable d'un champ (ex. 'fills', 'itemSpacing').
 * `boundVariables` n'est pas typé champ par champ dans l'API, d'où le
 * passage par un Record générique.
 */
export function getBinding(node: SceneNode, field: string): unknown {
  const bindings = node.boundVariables as unknown as Record<string, unknown> | undefined;
  return bindings?.[field];
}

/**
 * Résout un groupe de champs Figma (ex. paddingLeft + paddingRight) vers UN
 * nom de token. Règles :
 * - aucun champ lié → warning « valeur brute ignorée », renvoie null ;
 * - plusieurs tokens différents (ex. paddings asymétriques) → warning, on
 *   garde le premier ;
 * - le token retenu alimente `tokenNames` (future liste `tokensUsed`).
 */
export async function resolveField(
  node: SceneNode,
  fields: string[],
  label: string,
  resolver: VariableNameResolver,
  tokenNames: Set<string>,
  warnings: string[],
): Promise<string | null> {
  const resolved = await Promise.all(
    fields.map((field) => resolver.resolve(firstVariableAlias(getBinding(node, field)))),
  );
  const tokens = Array.from(new Set(resolved.filter((token): token is string => Boolean(token))));

  if (tokens.length === 0) {
    warnings.push(`Calque « ${node.name} » : ${label} sans variable liée (valeur brute ignorée).`);
    return null;
  }
  if (tokens.length > 1) {
    warnings.push(`Calque « ${node.name} » : variables ${label} asymétriques (${tokens.join(', ')}).`);
  }

  // Le token est cité dans le contrat comme référence `{…}`, jamais nu.
  const ref = toRef(tokens[0]);
  tokenNames.add(ref);
  return ref;
}
