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
  StateDescriptor,
  StateModel,
} from './types';

/**
 * Déclencheurs web connus pour les valeurs d'un axe d'état.
 *
 * `default` n'en a aucun, et c'est une réponse : l'état par défaut est celui
 * qu'aucun sélecteur ne déclenche. Il vaut donc la chaîne vide ici, et le
 * descripteur publié n'a pas de `selector` du tout.
 */
const STATE_SELECTORS: Record<string, string> = {
  default: '',
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
  // Les valeurs d'axe viennent de Figma. Une `Map` n'a aucune clé héritée, là
  // où un objet littéral laisserait un état « __proto__ » fixer son prototype
  // au lieu d'occuper une clé : `precedence`, construit depuis `values`,
  // citerait alors un état absent de `states` et le contrat se contredirait.
  const states = new Map<string, StateDescriptor>();

  for (const value of values) {
    // Une seule définition de « cet état est reconnu » : la table est un objet
    // littéral, donc `value in STATE_SELECTORS` répondrait vrai pour
    // « constructor » et supprimerait l'avertissement que la ligne suivante doit
    // produire.
    const known = Object.prototype.hasOwnProperty.call(STATE_SELECTORS, value);
    const selector = known ? STATE_SELECTORS[value] : '';
    states.set(value, selector ? { selector } : {});
    if (!known) {
      warnings.push(`Variant property « ${axis} » : l'état « ${value} » n'est pas reconnu, le contrat ne dira pas quand l'afficher. États reconnus : default, hover, focus, press, disable. Renommez cette valeur avec l'un d'eux, puis réexportez.`);
    }
  }

  const precedence = [
    ...STATE_PRECEDENCE.filter((value) => values.includes(value)),
    ...values.filter((value) => !STATE_PRECEDENCE.includes(value)),
  ];

  return { axis, states: Object.fromEntries(states), precedence };
}

/**
 * Le rôle relevé de chaque clé de couleur, un côté par arbre publié.
 *
 * `extractVariantTokens` le remplit, `renderingSemanticsFor` le publie. Les
 * deux côtés ne se mélangent jamais : une clé n'est unique que dans son arbre.
 */
export type DiscoveredRoles = {
  fills: ReadonlyMap<string, string>;
  strokes: ReadonlyMap<string, string>;
};

/**
 * Retourne le vocabulaire de rendu partagé par tous les contrats. Il est exporté
 * dans chaque contrat afin qu'un agent n'ait pas à deviner le CSS d'un rôle.
 */
export function defaultRenderingSemantics(): RenderingSemantics {
  return {
    roles: {
      background: { kind: 'paint', cssProperties: ['background-color'] },
      foreground: { kind: 'paint', cssProperties: ['color', 'fill'] },
      icon: { kind: 'paint', cssProperties: ['color', 'fill'] },
      // Un stroke Figma se dessine HORS du flux : il n'élargit pas la boîte et
      // ne déplace aucun voisin. `border-color` / `border-width` disaient le
      // contraire au consommateur, qui rendait une bordure CSS et décalait tout
      // le contenu du composant. `align` dit de quel côté la dessiner
      // (cf. `StrokeAlignment`) ; aucune de ses valeurs ne justifie une bordure.
      border: { kind: 'stroke', cssProperties: ['box-shadow'] },
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

/**
 * Vrai si cette clé nomme un des rôles que `rendering.roles` publie pour tous
 * les composants. Une seule fonction répond à cette question : l'extraction et
 * la publication la posent toutes les deux, et deux tests équivalents en
 * apparence finiraient par diverger au premier rôle ajouté.
 */
export function isRenderableRole(key: string): boolean {
  return renderableRoles().has(key);
}

/**
 * La nature d'un rôle partagé — `paint` ou `stroke` —, ou `null` si ce nom n'en
 * désigne aucun.
 */
export function roleKind(role: string): RenderingRole['kind'] | null {
  return renderableRoles().get(role) ?? null;
}

/**
 * Rôle de rendu déduit du SITE d'application, c'est-à-dire de ce que Figma
 * peint réellement — jamais du nom du token.
 *
 * C'est la contrepartie de la règle d'or en haut de ce fichier : un token
 * nommé `…/scale-1` ne dit rien de ce qu'il peint, mais le calque qui le porte
 * le dit entièrement. Le nom reste l'IDENTITÉ de la couleur dans la feuille de
 * variante ; il ne décide pas de son rendu.
 *
 * Même ordre que `semanticSlotName` — le texte d'abord, l'icône ensuite — pour
 * que les deux se lisent comme une seule règle. Le défaut est la surface :
 * seuls deux signaux explicites (être un texte, être désigné par une règle
 * `@icons`) en font de l'encre. Le type du node ne tranche pas — un
 * `RECTANGLE` est une surface ou un tracé d'icône selon l'usage — et le
 * promouvoir en signal remplacerait une convention de nommage visible par une
 * convention de typage invisible.
 *
 * Pour un contour, `border` couvre le rendu ; c'est `align`, déjà publié sur
 * chaque feuille de `variantStrokes`, qui dit au consommateur de quel côté de
 * la boîte le dessiner — jamais avec quelle technique, puisque les deux rôles
 * de contour se rendent hors du flux. Le contrat n'a donc pas à deviner un
 * `ring` : la donnée structurelle est déjà là, et elle est observée, pas
 * supposée.
 *
 * C'est CETTE fonction qui décide de la NATURE du rendu, et elle seule : un
 * token nommé `…/foreground` posé en contour peint bien un contour. Le nom du
 * token ne peut que préciser le rôle À L'INTÉRIEUR de cette nature — distinguer
 * un `ring` d'un `border` —, jamais la contredire. Le moteur n'a pas à avoir un
 * avis sur le vocabulaire du design system.
 */
export function paintSiteRole(site: {
  isStroke: boolean;
  isText: boolean;
  isIconTarget: boolean;
}): string {
  if (site.isStroke) return 'border';
  if (site.isText) return 'foreground';
  return site.isIconTarget ? 'icon' : 'background';
}

/**
 * Vocabulaire de rendu d'UN contrat : les rôles partagés, et le rôle de chaque
 * clé de couleur qui n'en porte pas le nom.
 *
 * Sans cela, une couleur nommée `…/scale-1` produit un contrat valide que
 * personne ne sait peindre : le consommateur ignore une clé absente de
 * `rendering.roles`, silencieusement. Publier le rôle déduit du calque qui la
 * porte ferme ce trou sans imposer au design system de renommer ses variables.
 *
 * `roles` reste STRICTEMENT le vocabulaire partagé, identique dans tous les
 * contrats : un mot y signifie partout la même chose, et c'est ce qui permet de
 * l'apprendre une fois. La part propre au composant vit à côté, dans
 * `keyRoles`, qui NOMME un rôle au lieu d'en recopier le rendu — deux tables de
 * propriétés CSS à tenir en phase valaient déjà mieux qu'une, et une clé qui
 * s'appelle comme un rôle sans en avoir la nature n'avait aucun endroit où le
 * dire.
 *
 * Les deux côtés sont séparés parce que les clés le sont (`colorKeys` décide
 * sur des feuilles distinctes) : la clé `background` d'une peinture et celle
 * d'un contour peuvent désigner deux tokens différents.
 *
 * Une clé dont le rôle porte déjà le nom reste absente : `roles[clé]` répond
 * pour elle. Les entrées sont triées — deux exports d'un design inchangé
 * doivent produire le même JSON, sinon l'invariant « aucun changement = aucune
 * PR » tombe.
 */
export function renderingSemanticsFor(
  discovered: DiscoveredRoles,
): RenderingSemantics {
  const semantics = defaultRenderingSemantics();
  const table = (roles: ReadonlyMap<string, string>): Record<string, string> => {
    const publiees: Record<string, string> = {};
    for (const key of Array.from(roles.keys()).sort()) {
      const role = roles.get(key);
      // Un rôle inconnu n'existe pas : `paintSiteRole` et `colorRole` n'en
      // rendent que des partagés. La garde vaut pour le lecteur.
      if (!role || !isRenderableRole(role) || key === role) continue;
      // Les clés viennent de Figma. `publiees[key] = …` laisserait un token
      // nommé « __proto__ » écrire dans le prototype : l'entrée disparaîtrait
      // du JSON sans un mot, et le contrat citerait un rendu qu'il ne publie
      // pas.
      Object.defineProperty(publiees, key, {
        value: role, enumerable: true, writable: true, configurable: true,
      });
    }
    return publiees;
  };

  const fills = table(discovered.fills);
  const strokes = table(discovered.strokes);
  const keyRoles = {
    ...(Object.keys(fills).length > 0 ? { fills } : {}),
    ...(Object.keys(strokes).length > 0 ? { strokes } : {}),
  };
  return Object.keys(keyRoles).length > 0 ? { ...semantics, keyRoles } : semantics;
}
