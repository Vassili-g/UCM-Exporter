/**
 * Lecture commune des liaisons portées par les nodes Figma.
 *
 * Un champ composé n'est exporté que si une représentation complète converge
 * vers un token. Le parcours des nodes rendables vit séparément dans
 * `exportableNodes.ts`.
 */
import { firstVariableAlias, toRef } from '../variables';
import type { TokenResolver } from '../variables';

/** Une liste d'alternatives ; tous les champs d'une alternative sont requis. */
export type FieldAlternatives = ReadonlyArray<ReadonlyArray<string>>;

/**
 * Représentations techniques des dimensions dans l'API Figma.
 * Centralisées ici pour que layout, tailles et strokes exigent exactement la
 * même complétude, sans vocabulaire propre à un composant.
 */
export const BINDING_PATTERNS = {
  gap: [['itemSpacing']],
  paddingX: [['paddingLeft', 'paddingRight']],
  paddingY: [['paddingTop', 'paddingBottom']],
  radius: [
    ['cornerRadius'],
    ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'],
  ],
  slotSize: [['width', 'height']],
  fontSize: [['fontSize']],
  strokeWidth: [
    ['strokeWeight'],
    ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'],
  ],
} as const satisfies Record<string, FieldAlternatives>;

/**
 * Liaison de variable d'un champ (ex. `fills`, `itemSpacing`).
 * `boundVariables` n'est pas typé champ par champ dans l'API, d'où le
 * passage par un Record générique.
 */
export function getBinding(node: SceneNode, field: string): unknown {
  const bindings = node.boundVariables as unknown as Record<string, unknown> | undefined;
  return bindings?.[field];
}

type AlternativeResolution = {
  fields: ReadonlyArray<string>;
  aliases: Array<VariableAlias | null>;
  tokens: Array<string | null>;
};

/**
 * Résout une valeur Figma qui peut avoir plusieurs représentations.
 *
 * Le tableau extérieur décrit des alternatives (`cornerRadius` OU quatre
 * coins) ; chaque tableau intérieur est une conjonction (gauche ET droite).
 * Une représentation partielle ou asymétrique vaut `null` : conserver le
 * premier token ferait affirmer au contrat une valeur que Figma ne prouve pas.
 */
export async function resolveTokenName(
  node: SceneNode,
  alternatives: FieldAlternatives,
  label: string,
  resolver: TokenResolver,
  warnings: string[],
): Promise<string | null> {
  const resolved: AlternativeResolution[] = await Promise.all(
    alternatives.map(async (fields) => {
      const aliases = fields.map((field) => firstVariableAlias(getBinding(node, field)));
      const tokens = await Promise.all(
        aliases.map((alias, index) =>
          resolver.resolve(alias, {
            nodeName: node.name,
            field: `${label} / ${fields[index]}`,
          }),
        ),
      );
      return { fields, aliases, tokens };
    }),
  );

  const complete = resolved.filter(
    (entry) => entry.aliases.every(Boolean) && entry.tokens.every(Boolean),
  );
  if (complete.length > 0) {
    const tokensByAlternative = complete.map((entry) =>
      Array.from(new Set(entry.tokens.filter((token): token is string => Boolean(token)))),
    );
    const asymmetric = tokensByAlternative.find((tokens) => tokens.length > 1);
    if (asymmetric) {
      warnings.push(
        `Calque « ${node.name} » : variables ${label} asymétriques ` +
          `(${asymmetric.join(', ')}) ; valeur non exportée.`,
      );
      return null;
    }

    const candidates = Array.from(new Set(tokensByAlternative.flat()));
    if (candidates.length > 1) {
      warnings.push(
        `Calque « ${node.name} » : représentations ${label} contradictoires ` +
          `(${candidates.join(', ')}) ; valeur non exportée.`,
      );
      return null;
    }
    return candidates[0] ?? null;
  }

  const withBindings = resolved.filter((entry) => entry.aliases.some(Boolean));
  if (withBindings.length === 0) {
    warnings.push(`Calque « ${node.name} » : ${label} sans variable liée (valeur brute ignorée).`);
    return null;
  }

  // Le groupe le plus renseigné donne le diagnostic le plus utile au designer.
  const best = [...withBindings].sort((left, right) => {
    const score = (entry: AlternativeResolution) =>
      entry.tokens.filter(Boolean).length * 2 + entry.aliases.filter(Boolean).length;
    return score(right) - score(left);
  })[0];
  const missing = best.fields.filter((_, index) => !best.aliases[index]);
  const unresolved = best.fields.filter(
    (_, index) => Boolean(best.aliases[index]) && !best.tokens[index],
  );
  const details = [
    missing.length > 0 ? `sans variable : ${missing.join(', ')}` : null,
    unresolved.length > 0 ? `liaison introuvable : ${unresolved.join(', ')}` : null,
  ].filter((detail): detail is string => Boolean(detail));

  warnings.push(
    `Calque « ${node.name} » : ${label} incomplet (${details.join(' ; ')}) ; ` +
      `valeur non exportée.`,
  );
  return null;
}

/**
 * Résout un groupe puis écrit sa référence dans le contrat et `tokensUsed`.
 */
export async function resolveField(
  node: SceneNode,
  alternatives: FieldAlternatives,
  label: string,
  resolver: TokenResolver,
  tokenNames: Set<string>,
  warnings: string[],
): Promise<string | null> {
  const token = await resolveTokenName(node, alternatives, label, resolver, warnings);
  if (!token) return null;

  const ref = toRef(token);
  tokenNames.add(ref);
  return ref;
}
