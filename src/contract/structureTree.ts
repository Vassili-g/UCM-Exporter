/**
 * Qui est un conteneur du contrat, et qui est une feuille — unique autorité.
 *
 * `structure.children` décrivait jusqu'ici deux sortes de branches : celles qui
 * mènent à un calque texte, et celles qui mènent à un composant unifié. Tout le
 * reste devenait une feuille opaque, quelle que soit sa richesse : un auto
 * layout dans un auto layout dans un auto layout, trois cadres bordés
 * emboîtés, une grille de tuiles — un seul slot, et rien dedans. Leurs couleurs
 * entraient pourtant dans `variantTokens`, si bien que le contrat annonçait des
 * peintures qu'aucun calque publié ne portait.
 *
 * La règle est désormais unique et ne connaît ni profondeur, ni nature de
 * composant : **on descend dans un calque dès qu'un de ses descendants porte
 * une information que la forme feuille ne sait pas exprimer.** Une feuille dit
 * son nom, sa taille, ses bornes et sa place dans le flux ; elle ne sait pas
 * dire la disposition interne, ni les couleurs, ni les tailles de ce qu'elle
 * contient.
 *
 * La règle n'a pas d'exception, et c'est ce qui la rend tenable : un cadre qui
 * n'enveloppe qu'un libellé est décrit comme un cadre, avec son padding, sa
 * taille et son alignement, puis le libellé dedans. L'étage supplémentaire
 * n'est pas du bruit — c'est exactement ce que l'ancienne forme perdait.
 *
 * Cette décision vit ici et nulle part ailleurs. `extractLayout` la suit pour
 * publier, `textSlots` pour situer les typographies, les signatures pour
 * comparer les variants : un second calcul finirait par désigner des chemins de
 * slots que `structure.children` ne contient pas, et le consommateur refuse un
 * contrat dont la typographie vise un slot absent.
 */
import { variableAliases } from '../variables';
import { getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import { getBinding } from './nodeBindings';
import { assignSlots, isIconLayer } from './slotNames';
import type { SlotAssignment } from './slotNames';
import { composedSlotDependencies } from './slotRelations';

/**
 * Profondeur maximale de `structure.children`.
 *
 * Un arbre sans borne suit Figma jusqu'au bout, y compris dans les entrailles
 * d'un dessin importé que personne ne rendra calque par calque. La borne est
 * large — aucun composant de design system raisonnable ne l'atteint — et son
 * dépassement est DIT : le contrat ne perd jamais un calque en silence.
 */
export const MAX_STRUCTURE_DEPTH = 12;

/** Champs dont une liaison fait à elle seule un calque « décrit par le contrat ». */
const CONTRACTUAL_BINDINGS = [
  'fills',
  'strokes',
  'itemSpacing',
  'counterAxisSpacing',
  'gridRowGap',
  'gridColumnGap',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'opacity',
  'strokeWeight',
] as const;

/**
 * Vrai si ce calque porte, à lui seul, quelque chose que le contrat sait dire.
 *
 * Un texte, une icône désignée par une règle, un composant unifié, ou n'importe
 * quelle liaison de variable : ce sont les quatre façons dont un calque cesse
 * d'être un simple dessin. Le reste — un tracé décoratif, un repère, un cadre
 * vide — n'apporte rien qu'un slot supplémentaire ferait connaître.
 */
export function carriesContractInformation(
  node: SceneNode,
  iconNames: ReadonlySet<string>,
  composed: ComposedInstances,
): boolean {
  if (composed.has(node.id)) return true;
  if (node.type === 'TEXT') return true;
  if (isIconLayer(node, iconNames)) return true;
  return CONTRACTUAL_BINDINGS.some((field) => variableAliases(getBinding(node, field)).length > 0);
}

/** Les descendants STRICTS et rendables qui portent une information contractuelle. */
function informationDescendants(
  node: SceneNode,
  iconNames: ReadonlySet<string>,
  composed: ComposedInstances,
): SceneNode[] {
  return getAllNodes(node, [], composed).filter(
    (descendant) => descendant !== node
      && carriesContractInformation(descendant, iconNames, composed),
  );
}

/**
 * Vrai si le contrat doit décrire les enfants de ce calque plutôt que de s'en
 * tenir à une feuille.
 *
 * Trois refus d'emblée : un composant unifié appartient à son propre contrat,
 * un calque texte est une feuille par nature, et une icône est un dessin dont
 * on ne publie pas les tracés.
 *
 * Vient ensuite la règle des cadres de dépendances, inchangée depuis la 5.4 :
 * ils publient TOUS leurs calques, ou aucun quand aucune branche rendable ne
 * mène à une dépendance — leurs instances sont alors rangées sous un calque
 * masqué, et le contrat se replie sur le seul nom du composant.
 *
 * Pour tout le reste, on descend dès qu'un descendant porte une information.
 */
export function publishesChildren(
  node: SceneNode,
  iconNames: ReadonlySet<string>,
  composed: ComposedInstances,
  depth = 0,
): boolean {
  if (composed.has(node.id)) return false;
  if (node.type === 'TEXT') return false;
  if (isIconLayer(node, iconNames)) return false;
  if (depth >= MAX_STRUCTURE_DEPTH) return false;

  const assignments = assignSlots(node, iconNames, [], composed);
  if (assignments.length === 0) return false;

  if (composedSlotDependencies(node, composed).length > 0) {
    return assignments.some(
      ({ child }) => composedSlotDependencies(child, composed).length > 0,
    );
  }

  return informationDescendants(node, iconNames, composed).length > 0;
}

/**
 * Les enfants qu'un conteneur publie : TOUS ses calques rendables.
 *
 * C'est la règle que la 5.4 avait déjà tranchée pour un cadre de dépendances —
 * « ce qu'il range à côté de ses dépendances lui appartient tout autant » — et
 * elle vaut pour n'importe quel conteneur : un tag, un texte, un dessin sont
 * des calques de ce contrat-ci. N'en publier qu'une partie les ferait
 * disparaître avec leur slot, leur typographie et leur visibilité, alors que
 * leurs couleurs entrent bien dans `variantTokens`.
 */
export function publishedSlots(
  node: SceneNode,
  iconNames: ReadonlySet<string>,
  composed: ComposedInstances,
  warnings: string[] = [],
): SlotAssignment[] {
  return assignSlots(node, iconNames, warnings, composed);
}

/**
 * Avertit lorsque la borne de profondeur coupe un sous-arbre réellement
 * porteur. Un calque coupé alors qu'il ne contenait qu'un dessin ne manque à
 * personne et ne dit rien.
 */
export function depthLimitWarning(
  node: SceneNode,
  iconNames: ReadonlySet<string>,
  composed: ComposedInstances,
  depth: number,
): string | null {
  if (depth < MAX_STRUCTURE_DEPTH) return null;
  if (informationDescendants(node, iconNames, composed).length === 0) return null;
  return `Layer « ${node.name} » : il est imbriqué au-delà de ${MAX_STRUCTURE_DEPTH} niveaux, `
    + `la profondeur maximale que le contrat décrit. Son contenu ne recevra ni slot, ni `
    + `typographie, ni visibilité, et le développeur ne le rendra pas. Remontez ce layer ou `
    + `découpez le composant, puis réexportez.`;
}
