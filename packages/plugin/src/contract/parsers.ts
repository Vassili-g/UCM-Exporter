/**
 * Traduction des propriétés Figma en props publiques du contrat.
 */
import { normalizeName } from '@ucm-kit/core/format';
import { pousserSansNode } from './localisation';
import { semanticEnumName } from './semantics';
import type { ContractProp } from '@ucm-kit/core/format';

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
 * Lit une prop par son nom sans jamais atteindre le prototype d'`Object`.
 *
 * Les noms interrogés viennent de Figma ou du texte libre d'une règle, et
 * `props` est un objet littéral : demander « constructor » ou « toString » y
 * obtiendrait une fonction héritée pour réponse, donc une prop que le composant
 * n'expose pas. Unique autorité sur cette lecture, pour que la précaution ne
 * dépende pas de la vigilance de chaque appelant.
 */
export function propByName(
  props: Record<string, ContractProp>,
  name: string,
): ContractProp | undefined {
  return Object.prototype.hasOwnProperty.call(props, name) ? props[name] : undefined;
}

/**
 * Écrit une prop sans jamais atteindre le prototype d'`Object`.
 *
 * Les clés viennent de Figma (nom d'une component property, nom d'un calque
 * d'icône) et `props` est un objet littéral : `props[key] = prop` laisserait
 * une propriété nommée « __proto__ » fixer le prototype au lieu d'occuper une
 * clé. La prop quitterait le contrat sans un mot, et `propByName` continuerait
 * de répondre qu'elle n'existe pas. C'est la contrepartie exacte de
 * `propByName` en écriture, et la seule autorité : la précaution ne doit pas
 * dépendre de la vigilance de chaque appelant.
 */
export function definePropOn(
  props: Record<string, ContractProp>,
  key: string,
  prop: ContractProp,
): void {
  Object.defineProperty(props, key, {
    value: prop, enumerable: true, writable: true, configurable: true,
  });
}

/**
 * Un axe « état » (hover, focus, disabled…) est design-only : il décrit des
 * états d'interaction, pas des choix d'API. Il est exclu des props : seule
 * sa valeur Disable devient une prop booléenne `disabled`. Détecté par le
 * nom de l'axe, donc valable pour n'importe quel composant.
 *
 * La convention porte sur un axe, donc sur le seul type `VARIANT`. Une BOOLEAN
 * ou une TEXT nommée « State » est une propriété comme une autre : `stateModel`
 * ne la décrit pas, et l'exclure des props la ferait disparaître du contrat sans
 * qu'aucun message ne la nomme.
 */
export function isStateProperty(key: string): boolean {
  return key === 'state' || key === 'status';
}

/**
 * Les deux component properties de type `VARIANT` dont les noms se confondent
 * une fois normalisés, ou `null` si chaque axe garde une clé publique à lui.
 *
 * Un axe ne se replie pas comme les autres propriétés. Ses valeurs sont les
 * coordonnées des variants, et deux axes réduits à une seule clé les
 * mélangeraient : `structure.variantAxes` citerait deux fois le même nom, et
 * chaque variant ne publierait qu'une des deux coordonnées.
 * `handleExportComponent` en fait une précondition d'export.
 */
export function collidingVariantAxes(
  definitions: ComponentPropertyDefinitions,
): [string, string] | null {
  const figmaNameByKey = new Map<string, string>();
  for (const [propertyName, definition] of Object.entries(definitions)) {
    if (definition.type !== 'VARIANT') continue;
    const key = normalizePropKey(propertyName);
    const rawFigmaName = propertyName.replace(/#.*$/, '');
    const first = figmaNameByKey.get(key);
    if (first !== undefined) return [first, rawFigmaName];
    figmaNameByKey.set(key, rawFigmaName);
  }
  return null;
}

/**
 * Vrai pour la valeur d'axe d'états qui devient la prop publique `disabled`.
 *
 * Unique autorité sur cette orthographe : le modèle des props la consulte pour
 * fabriquer la prop, l'échantillon pour dire qu'une dépendance la porte. Deux
 * expressions régulières jumelles finiraient par accepter des graphies
 * différentes, et le contrat annoncerait une prop que l'échantillon ne remplit
 * jamais.
 */
export function isDisabledStateValue(value: unknown): boolean {
  return /^disabl(?:e|ed)$/i.test(String(value).trim());
}

/**
 * Convertit les définitions de propriétés Figma en props publiques :
 * variant → enum, BOOLEAN → boolean, TEXT → string.
 * La couche sémantique renomme les axes reconnus (ex. axe de tailles →
 * `size`) en gardant le nom Figma d'origine dans `figmaName`.
 *
 * **Une clé publique, un propriétaire.** Les props du contrat vivent dans un
 * espace de noms plat, alors que deux propriétés Figma parfaitement légales
 * peuvent y prétendre : soit parce que la normalisation efface leur
 * différence d'écriture (`Icon Left`, `icon-left` et `iconLeft` donnent tous
 * `iconLeft`), soit parce que la couche sémantique fabrique une clé
 * (`size`) qu'une autre propriété porte déjà. Le premier arrivé est conservé
 * et le conflit est signalé : jamais d'écrasement en silence, conformément à
 * la règle appliquée partout ailleurs (variants, rôles, règles d'icônes).
 */
export type ContractPropertyModel = {
  props: Record<string, ContractProp>;
  /** Axe normalisé dans Figma → clé réellement publiée dans le contrat. */
  publicVariantKeyByRawKey: Map<string, string>;
  /** Nom technique Figma complet (`Label#12:3`) → prop publique. */
  publicPropertyKeyByFigmaName: Map<string, string>;
};

export function extractContractPropertyModel(
  definitions: ComponentPropertyDefinitions,
  warnings: string[] = [],
): ContractPropertyModel {
  const props: Record<string, ContractProp> = {};
  const publicVariantKeyByRawKey = new Map<string, string>();
  const publicPropertyKeyByFigmaName = new Map<string, string>();
  /** Nom Figma qui détient chaque clé publique, pour nommer les deux camps d'un conflit. */
  const owners = new Map<string, string>();

  // Première passe : toutes les clés brutes revendiquées par le fichier Figma.
  // Sans elle, un renommage sémantique volerait la clé d'une propriété
  // simplement déclarée plus loin : le résultat dépendrait de l'ordre.
  const rawKeys = new Set(Object.keys(definitions).map((name) => normalizePropKey(name)));

  // La convention State/Status possède une priorité sémantique : son variant
  // Disable décrit l'état interactif du composant. Réserver cette prop avant
  // de parcourir les BOOLEAN rend la sortie indépendante de leur ordre Figma.
  const disabledState = Object.entries(definitions).find(([propertyName, definition]) =>
    isStateProperty(normalizePropKey(propertyName)) &&
    definition.type === 'VARIANT' &&
    (definition.variantOptions ?? []).some(isDisabledStateValue),
  );
  if (disabledState) {
    const [propertyName, definition] = disabledState;
    if (definition.type === 'VARIANT') {
      const rawFigmaName = propertyName.replace(/#.*$/, '');
      owners.set('disabled', rawFigmaName);
      definePropOn(props, 'disabled', {
        type: 'boolean',
        default: isDisabledStateValue(definition.defaultValue),
      });
    }
  }

  /** Attribue une clé publique, ou refuse et signale le conflit. */
  const claim = (key: string, figmaName: string, prop: ContractProp): boolean => {
    const owner = owners.get(key);
    if (owner !== undefined) {
      pousserSansNode(warnings, `Component properties « ${owner} » et « ${figmaName} »`, {
        manque: `leurs noms donnent le même nom « ${key} » dans le contrat.`,
        impact: `Le contrat ne publie que la première : la seconde manquera au développeur.`,
        action: `Renommez l’une des deux, puis réexportez.`,
      });
      return false;
    }
    owners.set(key, figmaName);
    definePropOn(props, key, prop);
    return true;
  };

  // Les axes réservent leur clé publique avant les autres propriétés. Sans cette
  // priorité, une BOOLEAN déclarée plus haut dans le fichier prendrait la clé de
  // l'axe : `structure.variantAxes` citerait un nom que `props` décrirait comme
  // un booléen, et les valeurs des variants n'auraient plus d'enum où se lire.
  const parPriorite = [
    ...Object.entries(definitions).filter(([, definition]) => definition.type === 'VARIANT'),
    ...Object.entries(definitions).filter(([, definition]) => definition.type !== 'VARIANT'),
  ];

  for (const [propertyName, definition] of parPriorite) {
    const key = normalizePropKey(propertyName);
    const rawFigmaName = propertyName.replace(/#.*$/, '');

    if (isStateProperty(key) && definition.type === 'VARIANT') {
      publicVariantKeyByRawKey.set(key, key);
      // L'axe d'états ne devient pas une prop, et il détient malgré tout sa clé
      // publique : une BOOLEAN homonyme qui la prendrait publierait sous ce nom
      // une prop que `stateModel` décrit déjà comme un axe.
      owners.set(key, rawFigmaName);
      continue;
    }

    if (definition.type === 'VARIANT') {
      const values = (definition.variantOptions ?? []).map((value) => normalizePropValue(value));
      const semantic = semanticEnumName(values);
      // Le nom sémantique ne s'applique que s'il n'entre en conflit avec
      // aucune clé brute du fichier, pas seulement avec celles déjà traitées.
      const taken = Boolean(semantic) && semantic !== key && rawKeys.has(semantic as string);
      if (taken) {
        pousserSansNode(warnings, `Variant property « ${rawFigmaName} »`, {
          manque: `ses valeurs sont des tailles, mais une autre component property porte `
            + `déjà le nom « ${semantic} ».`,
          impact: `Elle reste exportée sous « ${key} ».`,
          action: `Renommez l'une des deux si vous voulez « ${semantic} », puis réexportez.`,
        });
      }
      const publicKey = semantic && !taken ? semantic : key;
      // Aucun `default` ici, et c'est la règle : le `defaultValue` d'une
      // variant property est le variant de première position du component set,
      // donc un effet de bord de la mise en page. Le défaut d'un axe se déclare
      // par une règle `@default`, et `mergeEnumDefaults` le pose ; son absence
      // signifie « aucun défaut publié », ce que l'élision sait déjà écrire.
      const claimed = claim(publicKey, rawFigmaName, {
        type: 'enum',
        values,
        // figmaName n'apparaît que si la clé publique diffère du nom Figma.
        ...(publicKey !== key ? { figmaName: rawFigmaName } : {}),
      });
      if (claimed) {
        publicVariantKeyByRawKey.set(key, publicKey);
        publicPropertyKeyByFigmaName.set(propertyName, publicKey);
      }
      continue;
    }

    if (definition.type === 'BOOLEAN') {
      if (key === 'disabled' && disabledState) {
        const [statePropertyName, stateDefinition] = disabledState;
        const stateFigmaName = statePropertyName.replace(/#.*$/, '');
        const disabledStateName = stateDefinition.type === 'VARIANT'
          ? (stateDefinition.variantOptions ?? []).find(isDisabledStateValue) ?? 'Disable'
          : 'Disable';
        pousserSansNode(warnings, `Component property « ${rawFigmaName} »`, {
          manque: `la variant property « ${stateFigmaName} » a déjà la valeur `
            + `« ${disabledStateName} », que le contrat publie sous le nom « disabled ».`,
          impact: `Le contrat ne publie pas cette boolean property : sa valeur par défaut `
            + `manquera au développeur.`,
          action: `Supprimez-la si elle pilote le même état, sinon renommez-la d’après le `
            + `layer qu’elle pilote, puis réexportez.`,
        });
        continue;
      }
      if (claim(key, rawFigmaName, { type: 'boolean', default: Boolean(definition.defaultValue) })) {
        publicPropertyKeyByFigmaName.set(propertyName, key);
      }
      continue;
    }

    if (definition.type === 'TEXT') {
      if (claim(key, rawFigmaName, {
        type: 'string',
        ...(typeof definition.defaultValue === 'string'
          ? { default: definition.defaultValue }
          : {}),
      })) publicPropertyKeyByFigmaName.set(propertyName, key);
      continue;
    }

    if (definition.type === 'INSTANCE_SWAP') {
      if (claim(key, rawFigmaName, {
        type: 'instance-swap',
        ...(typeof definition.defaultValue === 'string'
          ? { default: definition.defaultValue }
          : {}),
        preferredValues: [...(definition.preferredValues ?? [])],
      })) publicPropertyKeyByFigmaName.set(propertyName, key);
      continue;
    }

    if (definition.type === 'SLOT') {
      if (claim(key, rawFigmaName, {
        type: 'slot',
        ...(typeof definition.defaultValue === 'string'
          || typeof definition.defaultValue === 'boolean'
          ? { default: definition.defaultValue }
          : {}),
        preferredValues: [...(definition.preferredValues ?? [])],
        ...(definition.description ? { description: definition.description } : {}),
        ...(definition.slotSettings ? { settings: { ...definition.slotSettings } } : {}),
      })) publicPropertyKeyByFigmaName.set(propertyName, key);
    }
  }

  return { props, publicVariantKeyByRawKey, publicPropertyKeyByFigmaName };
}

/** Raccourci historique pour les appelants qui n'ont besoin que des props. */
export function extractContractProps(
  definitions: ComponentPropertyDefinitions,
  warnings: string[] = [],
): Record<string, ContractProp> {
  return extractContractPropertyModel(definitions, warnings).props;
}
