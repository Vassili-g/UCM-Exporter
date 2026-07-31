/**
 * Traduction des propriétés Figma en props publiques du contrat.
 */
import normalizeName from '../utils';
import { semanticEnumName } from './semantics';
import type { ContractProp } from './types';

/**
 * Normalise un nom de propriété Figma en clé camelCase.
 * Étapes : retirer l'identifiant interne (« #12:3 »), marquer les frontières
 * du camelCase existant pour ne pas l'aplatir (`iconLeft` reste `iconLeft`),
 * puis recomposer mot à mot.
 *
 * @example normalizePropKey('Icon Position#12:3') // → 'iconPosition'
 */
export function normalizePropKey(name: string): string {
  const withoutFigmaId = name.replace(/#.*$/, '');
  // Insère une frontière avant chaque majuscule interne ('iconLeft' → 'icon Left').
  const withCamelBoundaries = withoutFigmaId.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const words = normalizeName(withCamelBoundaries)
    .replace(/\./g, '-')
    .split('-')
    .filter(Boolean);

  return words
    .map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join('');
}

/** Normalise une valeur de variante (minuscules, espaces → tirets). */
export function normalizePropValue(value: string): string {
  return normalizeName(value).replace(/\./g, '-');
}

/**
 * Un axe « état » (hover, focus, disabled…) est design-only : il décrit des
 * états d'interaction, pas des choix d'API. Il est exclu des props — seule
 * sa valeur Disable devient une prop booléenne `disabled`. Détecté par le
 * nom de l'axe, donc valable pour n'importe quel composant.
 */
function isStateProperty(key: string): boolean {
  return key === 'state' || key === 'status';
}

/**
 * Convertit les définitions de propriétés Figma en props publiques :
 * VARIANT → enum, BOOLEAN → boolean, TEXT → string.
 * La couche sémantique renomme les axes reconnus (ex. axe de tailles →
 * `size`) en gardant le nom Figma d'origine dans `figmaName`.
 *
 * **Une clé publique, un propriétaire.** Les props du contrat vivent dans un
 * espace de noms PLAT, alors que deux propriétés Figma parfaitement légales
 * peuvent y prétendre : soit parce que la normalisation efface leur
 * différence d'écriture (`Icon Left`, `icon-left` et `iconLeft` donnent tous
 * `iconLeft`), soit parce que la couche sémantique fabrique une clé
 * (`size`) qu'une autre propriété porte déjà. Le premier arrivé est conservé
 * et le conflit est signalé — jamais d'écrasement en silence, conformément à
 * la règle appliquée partout ailleurs (variants, rôles, règles d'icônes).
 */
export type ContractPropertyModel = {
  props: Record<string, ContractProp>;
  /** Axe normalisé dans Figma → clé réellement publiée dans le contrat. */
  publicVariantKeyByRawKey: Map<string, string>;
};

export function extractContractPropertyModel(
  definitions: ComponentPropertyDefinitions,
  warnings: string[] = [],
): ContractPropertyModel {
  const props: Record<string, ContractProp> = {};
  const publicVariantKeyByRawKey = new Map<string, string>();
  /** Nom Figma qui détient chaque clé publique, pour nommer les deux camps d'un conflit. */
  const owners = new Map<string, string>();

  // Première passe : TOUTES les clés brutes revendiquées par le fichier Figma.
  // Sans elle, un renommage sémantique volerait la clé d'une propriété
  // simplement déclarée plus loin — le résultat dépendrait de l'ordre.
  const rawKeys = new Set(Object.keys(definitions).map((name) => normalizePropKey(name)));

  /** Attribue une clé publique, ou refuse et signale le conflit. */
  const claim = (key: string, figmaName: string, prop: ContractProp): boolean => {
    const owner = owners.get(key);
    if (owner !== undefined) {
      warnings.push(
        `Component properties « ${owner} » et « ${figmaName} » : leurs noms deviennent ` +
          `identiques une fois normalisés (« ${key} »). Seule « ${owner} » est exportée. ` +
          `Renommez l’une des deux.`,
      );
      return false;
    }
    owners.set(key, figmaName);
    props[key] = prop;
    return true;
  };

  for (const [propertyName, definition] of Object.entries(definitions)) {
    const key = normalizePropKey(propertyName);
    const rawFigmaName = propertyName.replace(/#.*$/, '');

    if (isStateProperty(key)) {
      if (definition.type === 'VARIANT') publicVariantKeyByRawKey.set(key, key);
      const states = definition.variantOptions ?? [];
      const hasDisabledState = states.some((state) => /^disabl(?:e|ed)$/i.test(state.trim()));
      if (definition.type === 'VARIANT' && hasDisabledState) {
        claim('disabled', rawFigmaName, {
          type: 'boolean',
          default: /^disabl(?:e|ed)$/i.test(String(definition.defaultValue).trim()),
        });
      }
      continue;
    }

    if (definition.type === 'VARIANT') {
      const values = (definition.variantOptions ?? []).map((value) => normalizePropValue(value));
      const semantic = semanticEnumName(values);
      // Le nom sémantique ne s'applique que s'il n'entre en conflit avec
      // AUCUNE clé brute du fichier, pas seulement avec celles déjà traitées.
      const taken = Boolean(semantic) && semantic !== key && rawKeys.has(semantic as string);
      if (taken) {
        warnings.push(
          `Variant property « ${rawFigmaName} » : ses valeurs sont des tailles, mais une ` +
            `autre component property porte déjà le nom « ${semantic} ». Elle reste exportée ` +
            `sous « ${key} ». Renommez l'une des deux si vous voulez « ${semantic} ».`,
        );
      }
      const publicKey = semantic && !taken ? semantic : key;
      const claimed = claim(publicKey, rawFigmaName, {
        type: 'enum',
        values,
        default:
          typeof definition.defaultValue === 'string'
            ? normalizePropValue(definition.defaultValue)
            : values[0] ?? null,
        // figmaName n'apparaît que si la clé publique diffère du nom Figma.
        ...(publicKey !== key ? { figmaName: rawFigmaName } : {}),
      });
      if (claimed) publicVariantKeyByRawKey.set(key, publicKey);
      continue;
    }

    if (definition.type === 'BOOLEAN') {
      claim(key, rawFigmaName, { type: 'boolean', default: Boolean(definition.defaultValue) });
      continue;
    }

    if (definition.type === 'TEXT') {
      claim(key, rawFigmaName, {
        type: 'string',
        default: typeof definition.defaultValue === 'string' ? definition.defaultValue : null,
      });
    }
  }

  return { props, publicVariantKeyByRawKey };
}

/** Raccourci historique pour les appelants qui n'ont besoin que des props. */
export function extractContractProps(
  definitions: ComponentPropertyDefinitions,
  warnings: string[] = [],
): Record<string, ContractProp> {
  return extractContractPropertyModel(definitions, warnings).props;
}
