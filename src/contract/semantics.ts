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
    states.set(value, { selector: known ? STATE_SELECTORS[value] : null });
    if (!known) {
      warnings.push(`Variant property « ${axis} » : l'état « ${value} » n'est pas reconnu, le contrat ne dira pas quand l'afficher. États reconnus : default, hover, focus, press, disable.`);
    }
  }

  const precedence = [
    ...STATE_PRECEDENCE.filter((value) => values.includes(value)),
    ...values.filter((value) => !STATE_PRECEDENCE.includes(value)),
  ];

  return { axis, states: Object.fromEntries(states), precedence };
}

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

/**
 * Vrai si cette clé nomme un des rôles que `rendering.roles` publie pour tous
 * les composants. Une seule fonction répond à cette question : l'extraction et
 * les avertissements la posent tous les deux, et deux tests équivalents en
 * apparence finiraient par diverger au premier rôle ajouté.
 */
export function isRenderableRole(key: string): boolean {
  return renderableRoles().has(key);
}

/**
 * Rôle de rendu déduit du SITE d'application, c'est-à-dire de ce que Figma
 * peint réellement — jamais du nom du token.
 *
 * C'est la contrepartie de la règle d'or en haut de ce fichier : un token
 * nommé `…/scale-1` ne dit rien de ce qu'il peint, mais le calque qui le porte
 * le dit entièrement. Le nom reste l'IDENTITÉ de la couleur dans la feuille de
 * variante ; il ne décide plus de son rendu.
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
 * chaque feuille de `variantStrokes`, qui dit au consommateur si le dessiner en
 * bordure ou en `box-shadow`. Le contrat n'a donc pas à deviner un `ring` : la
 * donnée structurelle est déjà là, et elle est observée, pas supposée.
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
 * Vocabulaire de rendu d'UN contrat : les rôles partagés, plus une entrée par
 * couleur dont le nom ne déclare aucun rôle.
 *
 * Sans cela, une couleur nommée `…/scale-1` produit un contrat valide que
 * personne ne sait peindre : le consommateur ignore une clé absente de
 * `rendering.roles`, silencieusement. Publier son rendu déduit ferme ce trou
 * sans imposer au design system de renommer ses variables — et un renommage
 * n'était de toute façon pas possible partout, la feuille d'un variant n'ayant
 * qu'une entrée par rôle.
 *
 * `discovered` associe chaque clé au rôle partagé dont elle emprunte le rendu.
 * Les descripteurs sont RECOPIÉS depuis `defaultRenderingSemantics()` : il
 * n'existe pas de seconde table de propriétés CSS à tenir en phase.
 *
 * Les clés déduites sont triées : deux exports d'un design inchangé doivent
 * produire le même JSON, sinon l'invariant « aucun changement = aucune PR »
 * tombe.
 */
export function renderingSemanticsFor(
  discovered: ReadonlyMap<string, string>,
): RenderingSemantics {
  const semantics = defaultRenderingSemantics();
  for (const key of Array.from(discovered.keys()).sort()) {
    const role = discovered.get(key);
    const shared = role ? semantics.roles[role] : undefined;
    // Une clé qui nomme déjà un rôle partagé garde le rendu publié pour tous :
    // c'est le designer qui l'a déclaré, et l'écraser ferait diverger deux
    // contrats sur le sens du même mot.
    if (!shared || isRenderableRole(key)) continue;
    // Les clés viennent de Figma. `roles[key] = …` laisserait un token nommé
    // « __proto__ » écrire dans le prototype : l'entrée disparaîtrait du JSON
    // sans un mot, et le contrat citerait un rendu qu'il ne publie pas.
    Object.defineProperty(semantics.roles, key, {
      value: { ...shared }, enumerable: true, writable: true, configurable: true,
    });
  }
  return semantics;
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
 * Signale un rôle partagé employé à l'envers : un `…/border` posé en
 * remplissage, un `…/background` posé en contour. Le designer a nommé le rôle
 * explicitement, et le calque qui le porte dit le contraire — l'une des deux
 * intentions est fausse, et le contrat ne peut pas trancher à sa place.
 *
 * Une clé qui ne nomme AUCUN rôle partagé n'est plus une anomalie : son rendu
 * se déduit du site d'application (`paintSiteRole`) et se publie dans
 * `rendering.roles` (`renderingSemanticsFor`). Exiger qu'elle se termine par un
 * rôle était impossible à satisfaire dès qu'un variant peint plusieurs
 * surfaces : la feuille n'ayant qu'une entrée par rôle, le renommage demandé
 * aurait fait perdre toutes les couleurs sauf une.
 *
 * On agrège : un seul message par rôle fautif, plutôt qu'un par variante — un
 * Button a 30 variantes qui portent les mêmes calques. Le message cite un token
 * en exemple, car c'est celui à corriger dans Figma.
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
      // Clé sans rôle déclaré : `rendering.roles` publie son rendu déduit, il
      // n'y a rien à signaler ni rien à renommer.
      if (!declared) continue;
      if (declared !== found) {
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
