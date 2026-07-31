/**
 * Couche sémantique du contrat — conventions de nommage et correspondances
 * vers le vocabulaire partagé décrit dans CONCEPT.md.
 *
 * Les noms Figma accidentels (axe « Button-Construc-Type », calque
 * « Suivant »…) sont traduits vers un vocabulaire partagé, lisible par un
 * humain ou un agent IA sans interprétation externe. L'appelant conserve
 * toujours le nom Figma d'origine (figmaName / figmaLayer) : zéro perte.
 *
 * Règle d'or : le mapping se décide sur les VALEURS ou le RÔLE, jamais sur
 * le nom d'un composant — aucun cas particulier codé en dur.
 */
import type {
  RenderingRole,
  RenderingSemantics,
  StateModel,
  StrokeTokens,
  VariantStrokes,
  VariantTokens,
} from './types';

/** Déclencheurs web connus pour les valeurs d'un axe d'état. */
const STATE_SELECTORS: Record<string, string | null> = {
  default: null,
  hover: ':hover',
  focus: ':focus-visible',
  press: ':active',
  disable: '[disabled]',
  disabled: '[disabled]',
};

/** Priorité générique appliquée quand plusieurs états sont simultanés. */
const STATE_PRECEDENCE = ['disable', 'disabled', 'press', 'focus', 'hover', 'default'];

/**
 * Échelles de tailles connues. Un enum dont TOUTES les valeurs figurent ici
 * est un axe de tailles, quel que soit son nom Figma.
 */
const SIZE_VALUES = new Set([
  'tiny', 'small', 'medium', 'large', 'big', 'huge',
  '4xs', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl',
]);

/**
 * Nom sémantique d'un axe enum, ou null pour garder le nom brut.
 * Seule règle actuelle : toutes les valeurs sont des tailles → `size`.
 * La liste est faite pour grandir (emphasis, tone…) au fil des besoins.
 */
export function semanticEnumName(values: string[]): string | null {
  if (values.length >= 2 && values.every((value) => SIZE_VALUES.has(value))) {
    return 'size';
  }
  return null;
}

/**
 * Rôle sémantique d'un calque. Un calque texte est toujours le `label`, peu
 * importe son nom Figma (souvent le texte d'exemple, ex. « Suivant »). Un
 * calque graphique désigné par une règle `@icons` est toujours l'`icon`.
 *
 * Nommer l'icône par son rôle est ce qui rend son slot STABLE sur toute la
 * matrice. Un composant dont l'icône change avec le variant (une Alert :
 * `circle-info` en info, `circle-check` en success) garde ainsi un seul slot,
 * là où le nom du calque en aurait inventé un par variant — et le contrat
 * n'aurait décrit que celui du variant de référence. Le déclencheur est la
 * règle du designer, jamais la position ni le nom du calque.
 */
export function semanticSlotName(isText: boolean, isIconTarget = false): string | null {
  if (isText) return 'label';
  return isIconTarget ? 'icon' : null;
}

/**
 * Nom d'un slot homonyme : le premier garde le nom de base, les suivants sont
 * numérotés à partir de 2. Règle unique, partagée par la déduplication des
 * slots et par le rapprochement des icônes — deux formulations du même
 * suffixe finiraient par diverger.
 *
 * @example indexedSlotName('icon', 0) // → 'icon'
 * @example indexedSlotName('icon', 1) // → 'icon-2'
 */
export function indexedSlotName(base: string, index: number): string {
  return index === 0 ? base : `${base}-${index + 1}`;
}

/**
 * Construit le modèle d'interaction d'un composant à partir de ses axes et
 * de ses variants. Les états inconnus restent visibles dans le contrat, mais
 * leur déclencheur est nul et un warning demande une convention explicite.
 */
export function buildStateModel(
  axes: string[],
  variantValues: Array<Record<string, string>>,
  warnings: string[],
): StateModel | null {
  const axis = axes.find((candidate) => candidate === 'state' || candidate === 'status');
  if (!axis) return null;

  const values = Array.from(
    new Set(variantValues.map((entry) => entry[axis]).filter((value): value is string => Boolean(value))),
  );
  const states: StateModel['states'] = {};

  for (const value of values) {
    const selector = Object.prototype.hasOwnProperty.call(STATE_SELECTORS, value)
      ? STATE_SELECTORS[value]
      : null;
    states[value] = { selector };
    if (!(value in STATE_SELECTORS)) {
      warnings.push(`Variant property « ${axis} » : l'état « ${value} » n'est pas reconnu, le contrat ne dira pas quand l'afficher. États reconnus : default, hover, focus, press, disable.`);
    }
  }

  const precedence = [
    ...STATE_PRECEDENCE.filter((value) => values.includes(value)),
    ...values.filter((value) => !STATE_PRECEDENCE.includes(value)),
  ];

  return { axis, states, precedence };
}

/**
 * Retourne le mapping de rendu partagé par tous les contrats. Il est exporté
 * dans chaque contrat afin qu'un agent n'ait pas à deviner le CSS d'un rôle.
 */
export function defaultRenderingSemantics(): RenderingSemantics {
  return {
    roles: {
      background: { kind: 'paint', cssProperties: ['background-color'] },
      foreground: { kind: 'paint', cssProperties: ['color', 'fill'] },
      icon: { kind: 'paint', cssProperties: ['color', 'fill'] },
      border: { kind: 'stroke', cssProperties: ['border-color', 'border-width'] },
      ring: {
        kind: 'stroke',
        cssProperties: ['outline-color', 'outline-width'],
        fallback: 'box-shadow',
      },
    },
  };
}

/**
 * Rôles réellement rendables, avec leur nature. DÉRIVÉ de
 * `defaultRenderingSemantics()` : il n'existe volontairement pas de seconde
 * liste de rôles à maintenir en phase avec la première.
 */
function renderableRoles(): Map<string, RenderingRole['kind']> {
  return new Map(
    Object.entries(defaultRenderingSemantics().roles).map(([role, descriptor]) => [role, descriptor.kind]),
  );
}

/** Ce qu'on retient d'un rôle rencontré : combien de fois, et un exemple citable. */
type RoleUsage = { count: number; example: string };

/**
 * Parcourt un arbre de variantes à profondeur quelconque et compte les rôles
 * de ses feuilles. `readReference` dit comment lire une entrée : elle renvoie
 * la référence de token quand l'entrée EST un rôle, ou null quand il s'agit
 * d'un niveau d'axe supplémentaire à traverser. L'arbre n'est ainsi jamais
 * présumé de la profondeur d'un composant particulier.
 */
function collectRoles(
  tree: Record<string, unknown>,
  readReference: (value: unknown) => string | null,
  usages: Map<string, RoleUsage>,
): void {
  for (const [key, value] of Object.entries(tree)) {
    const reference = readReference(value);
    if (reference) {
      const usage = usages.get(key);
      if (usage) usage.count += 1;
      else usages.set(key, { count: 1, example: reference });
      continue;
    }
    if (value && typeof value === 'object') {
      collectRoles(value as Record<string, unknown>, readReference, usages);
    }
  }
}

/** Une feuille de peinture est une simple référence de token. */
function paintReference(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Une feuille de contour est un objet dont `color` porte la référence. */
function strokeReference(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const color = (value as StrokeTokens).color;
  return typeof color === 'string' ? color : null;
}

/**
 * Contrôle du seul prérequis que le moteur impose au design system : le
 * **dernier segment** d'un token de couleur doit nommer un rôle rendable
 * (`background`, `foreground`, `icon`, `border`, `ring`), car c'est ainsi que le rôle
 * est déduit (cf. `extractSlotTokens.tokenRole`). Un token nommé `…/bg`
 * produit un contrat valide que PERSONNE ne saura peindre : le consommateur
 * ignore un rôle absent de `rendering.roles`, silencieusement.
 *
 * On avertit donc ici — sans bloquer, la donnée n'étant ni fausse ni perdue —
 * et on agrège : un seul message par rôle fautif, plutôt qu'un par variante
 * (un Button a 30 variantes qui portent les mêmes calques). Le message cite un
 * token en exemple, car c'est le token qu'il faut renommer dans Figma.
 *
 * Deuxième anomalie couverte : un rôle connu mais employé à l'envers (un
 * `…/border` posé en remplissage). Même conséquence — non rendu — donc même
 * traitement.
 */
export function variantRoleWarnings(
  variantTokens: VariantTokens,
  variantStrokes: VariantStrokes,
): string[] {
  const roles = renderableRoles();
  const warnings: string[] = [];

  const review = (tree: Record<string, unknown>, readReference: (value: unknown) => string | null, found: RenderingRole['kind']) => {
    const usages = new Map<string, RoleUsage>();
    collectRoles(tree, readReference, usages);

    for (const [role, usage] of usages) {
      const layers = `sur ${usage.count} layer${usage.count > 1 ? 's' : ''}`;
      const declared = roles.get(role);
      if (!declared) {
        warnings.push(
          `Token ${usage.example} : son dernier segment « ${role} » n’indique pas ce qui doit ` +
            `être peint, donc rien ne sera affiché (${layers}). Renommez le token pour qu'il ` +
            `se termine par ${Array.from(roles.keys()).join(', ')}.`,
        );
      } else if (declared !== found) {
        warnings.push(
          `Token ${usage.example} : son dernier segment « ${role} » désigne ` +
            `${declared === 'paint' ? 'un fill' : 'un stroke'}, mais il est appliqué en ` +
            `${found === 'paint' ? 'fill' : 'stroke'} — rien ne sera affiché (${layers}). ` +
            `Appliquez-le du bon côté dans Figma, ou renommez-le.`,
        );
      }
    }
  };

  review(variantTokens as Record<string, unknown>, paintReference, 'paint');
  review(variantStrokes as Record<string, unknown>, strokeReference, 'stroke');

  // Tri : deux exports du même fichier Figma doivent produire le même contrat,
  // sinon l'invariant « aucun changement = aucune PR » ne tient plus.
  return warnings.sort();
}
