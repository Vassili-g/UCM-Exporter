/**
 * Parcours des nodes qui peuvent réellement participer au contrat.
 *
 * Un calque masqué reste pertinent si une prop ou une variable peut le rendre
 * visible. À l'inverse, un sous-arbre statiquement masqué est élagué avant
 * toute extraction pour qu'il ne fournisse ni tokens, ni slots, ni wrapper.
 *
 * Deuxième motif d'élagage : les composants unifiés imbriqués. Leurs calques
 * appartiennent à leur contrat, pas à celui du composé qui les embarque
 * (cf. `composedComponents.ts`) ; l'instance elle-même reste visible, car le
 * composé doit pouvoir la décrire comme un de ses slots.
 */
import { variableAliases } from '../variables';
import { getBinding } from './nodeBindings';
import { compter } from './mesure';
import type { ComposedDependency } from '@ucm-kit/core/format';
import { noter, phraseDe, pointDe, pousserNote, sujet } from './localisation';
import type { PointACorriger, Sujet } from './localisation';

/** Vrai si la visibilité peut changer via l'API publique ou un mode de variable. */
function hasDynamicVisibility(node: SceneNode): boolean {
  return Boolean(node.componentPropertyReferences?.visible)
    || variableAliases(getBinding(node, 'visible')).length > 0;
}

/**
 * Un node masqué sans liaison de visibilité ne peut être rendu dans cet état.
 *
 * Exporté pour rester l'unique autorité : l'échantillon compare une instance à
 * son maître par position, donc sans passer par `getAllNodes`, et doit taire
 * les mêmes calques que lui, sans quoi la maquette « montrerait » un calque
 * que le contrat déclare invisible.
 */
export function isStaticallyHidden(node: SceneNode): boolean {
  return node.visible === false && !hasDynamicVisibility(node);
}

/** Détecte une liaison, y compris dans `boundVariables.componentProperties`. */
function containsVariableAlias(value: unknown): boolean {
  if (variableAliases(value).length > 0) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).some(containsVariableAlias);
}

function hasVariableBindings(node: SceneNode): boolean {
  return containsVariableAlias(node.boundVariables);
}

/**
 * Un point à corriger poussé une seule fois, quel que soit le nombre de calques
 * qui l'ont produit. La déduplication porte sur la phrase, comme partout
 * ailleurs dans le moteur, et chaque calque reste inscrit comme cible du point.
 */
function pousserUneFois(warnings: string[], point: PointACorriger, sujetDuPoint: Sujet): void {
  const message = phraseDe(point);
  if (warnings.includes(message)) {
    noter(warnings, message, sujetDuPoint);
    return;
  }
  pousserNote(warnings, point, sujetDuPoint);
}

/**
 * Les composants unifiés imbriqués d'un sous-arbre : id de l'instance →
 * dépendance complète. Une seule structure sert les deux besoins : élaguer le
 * parcours (`has`) et décrire fidèlement le slot (`get`), visibilité comprise.
 */
export type ComposedInstances = ReadonlyMap<string, ComposedDependency>;

/**
 * Vrai si un ancêtre strict du node, sous la racine, est une instance composée.
 *
 * La remontée d'ancêtres vit ici, avec les autres règles de parcours, pour
 * n'exister qu'une fois : `getAllNodes` s'en sert pour élaguer, et
 * `composedComponents` pour ne déclarer que ses dépendances directes.
 */
export function hasAncestorIn(
  node: SceneNode,
  root: SceneNode,
  composed: ComposedInstances,
): boolean {
  return nearestAncestorIn(node, root, composed) !== null;
}

/**
 * Le plus proche ancêtre strict du node qui est une instance composée, ou null.
 *
 * Même remontée que `hasAncestorIn`, dont elle est devenue l'implémentation :
 * répondre « lequel » plutôt que « y en a-t-il un » suffit à rattacher chaque
 * dépendance imbriquée à celle qui la contient, sans qu'une seconde remontée
 * d'ancêtres existe ailleurs.
 *
 * Strictement ancêtre, comme son aînée : inclure le node lui-même ferait
 * élaguer l'instance de dépendance par `getAllNodes`, et le composé perdrait le
 * slot qui la rend.
 */
export function nearestAncestorIn(
  node: SceneNode,
  root: SceneNode,
  composed: ComposedInstances,
): ComposedDependency | null {
  if (composed.size === 0) return null;

  let current: BaseNode | null | undefined = node.parent;
  while (current && current !== root) {
    const dependency = composed.get(current.id);
    if (dependency) return dependency;
    current = current.parent;
  }
  return null;
}

/**
 * Renvoie la racine et les descendants qui peuvent être rendus.
 *
 * La racine contractée reste toujours lisible : sa visibilité sur le canvas
 * Figma ne décide pas si le composant lui-même existe. Pour les descendants,
 * un parent statiquement masqué élague tout son sous-arbre. Un seul warning
 * est produit si ce sous-arbre portait des variables ; un simple repère de
 * travail masqué est ignoré sans bruit.
 *
 * `composed` élague de la même façon les composants unifiés imbriqués, mais
 * sans avertir : leurs calques ne sont pas perdus, ils sont décrits par leur
 * propre contrat et l'instance reste listée dans `composes`.
 */
export function getAllNodes(
  root: SceneNode,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
): SceneNode[] {
  // `Date.now()` rend des millisecondes entières : un appel de 0,1 ms compte
  // 0 ou 1. Sur des milliers d'appels, la somme reste une estimation sans biais.
  const debut = Date.now();
  try {
    return releverLesNodes(root, warnings, composed);
  } finally {
    compter('msGetAllNodes', Date.now() - debut);
  }
}

function releverLesNodes(
  root: SceneNode,
  warnings: string[],
  composed: ComposedInstances,
): SceneNode[] {
  // La racine elle-même peut être un composant unifié : c'est la forme d'un
  // slot qui rend directement sa dépendance. `hasAncestorIn` ne teste que les
  // ancêtres stricts et ne la couvre donc pas ; sans cette ligne, le parent
  // décrirait les calques, les visibilités et les icônes d'un contrat voisin.
  compter('appelsGetAllNodes');
  if (composed.has(root.id)) return [root];

  const descendants = 'findAll' in root ? root.findAll(() => true) : [];
  compter('nodesParcourus', descendants.length);
  if (composed.size === 0 && !descendants.some(isStaticallyHidden)) return [root, ...descendants];
  const ignoredBindings = new Map<SceneNode, boolean>();
  const exportable: SceneNode[] = [root];
  type Etat = { hidden: SceneNode | null; composed: boolean };
  const visible: Etat = { hidden: null, composed: false };
  const etats = new Map<BaseNode, Etat>([[root, visible]]);

  // Un ancêtre se lit une fois par parcours. La pile accepte aussi un relevé
  // dont les descendants précèdent leurs parents, sans récursion profonde.
  const etatDe = (node: BaseNode | null): Etat => {
    const chemin: BaseNode[] = [];
    let parent = node;
    while (parent && !etats.has(parent)) {
      chemin.push(parent);
      parent = parent.parent;
    }
    let etat = parent ? etats.get(parent)! : visible;
    while (chemin.length > 0) {
      const courant = chemin.pop()!;
      etat = {
        hidden: etat.hidden ?? ('visible' in courant && isStaticallyHidden(courant as SceneNode)
          ? courant as SceneNode : null),
        composed: etat.composed || composed.has(courant.id),
      };
      etats.set(courant, etat);
    }
    return etat;
  };

  for (const node of descendants) {
    // L'instance composée elle-même n'est pas élaguée : seul son contenu l'est.
    if (etatDe(node.parent).composed) continue;

    const hidden = etatDe(node).hidden;
    if (!hidden) {
      exportable.push(node);
      continue;
    }
    ignoredBindings.set(hidden, (ignoredBindings.get(hidden) ?? false) || hasVariableBindings(node));
  }

  for (const [hidden, hasBindings] of ignoredBindings) {
    if (!hasBindings) continue;
    const sujetDuCalque = sujet('Layer', hidden);
    pousserUneFois(
      warnings,
      pointDe(sujetDuCalque.texte, {
        manque: `il est masqué, et aucune propriété booléenne ni variable ne pilote sa `
          + `visibilité.`,
        impact: `Le contrat l'exclut avec tout son contenu : le développeur ne le rendra jamais.`,
        action: `Si le composant doit pouvoir l'afficher, reliez sa visibilité à une boolean `
          + `property ou à une variable, puis réexportez.`,
      }),
      sujetDuCalque,
    );
  }

  return exportable;
}

/**
 * Vrai si la racine porte une instance que le contrat peut rendre : aucun
 * calque statiquement masqué entre elle et la racine, elle comprise.
 *
 * C'est `getAllNodes(racine).some(…)` sur le type `INSTANCE`, sans relever
 * tout l'arbre : le filtre natif ne rend que les instances, et chacune ne
 * remonte que ses ancêtres. Le repli sur `findAll` garde les runtimes qui ne
 * servent pas `findAllWithCriteria`.
 */
export function contientUneInstanceRendue(racine: SceneNode): boolean {
  if (!('findAll' in racine)) return false;
  const parCriteres = (racine as Partial<ChildrenMixin>).findAllWithCriteria;
  if (typeof parCriteres === 'function') compter('appelsFindAllWithCriteria');
  const instances = typeof parCriteres === 'function'
    ? (parCriteres.call(racine, { types: ['INSTANCE'] }) as SceneNode[])
    : racine.findAll((node) => node.type === 'INSTANCE');
  return instances.some((instance) => {
    let courant: BaseNode | null = instance;
    while (courant && courant !== racine) {
      if (isStaticallyHidden(courant as SceneNode)) return false;
      courant = courant.parent;
    }
    return true;
  });
}

/**
 * Renvoie tous les calques texte d'un sous-arbre, dans l'ordre du document.
 * Le libellé d'un composant embarqué n'en est pas un : sans l'élagage, une
 * Alert emprunterait la typographie du bouton qu'elle contient.
 *
 * Le compte importe autant que le premier élément : un calque qui en contient
 * plusieurs porte plusieurs typographies, et n'en retenir qu'une appliquerait
 * celle du titre à la description. Les deux besoins partagent donc ce parcours,
 * plutôt qu'un « premier texte » et un « compte des textes » libres de diverger.
 */
export function textNodes(
  node: SceneNode,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
): TextNode[] {
  if (node.type === 'TEXT') return [node];
  return getAllNodes(node, warnings, composed).filter(
    (child): child is TextNode => child.type === 'TEXT',
  );
}
