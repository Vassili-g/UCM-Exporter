/**
 * Du contrat d'un composant au modèle de ses règles d'usage.
 *
 * Ce module ne touche ni Figma ni le document : il dit quelles règles poser,
 * dans quel ordre, et ce que chacune écrira dans son calque `prop`. Ce que le
 * template ne pose pas est aussi une décision : `@default`, `@do`, `@dont` et
 * `@pairs` demandent un jugement que le contrat ne porte pas, et les propriétés
 * `TEXT`, `INSTANCE_SWAP`, `SLOT` et les icônes runtime n'ont aucun tag qui les
 * documente.
 *
 * Une section se désigne par le tag de son exemple, jamais par son nom : le
 * moteur ignore les noms de section, et le maître range déjà un exemple de
 * chaque tag dans la sienne.
 */
import { isDisabledStateValue } from '../contract/parsers';
import type { RuleTag } from '../contract/rulesModel';
import type { Contract } from '@ucm-kit/core/format';

/** Ce que le modèle lit du contrat, et rien d'autre. */
export type ContratLu = Pick<Contract, 'props' | 'stateModel'>;

/**
 * Le contrat réduit aux propriétés que le composant sélectionné déclare
 * lui-même.
 *
 * La surface publiée fusionne celle d'un wrapper interne élu par
 * `findWrapperReference`. Ce wrapper n'est une coquille de mise en page que
 * tant qu'aucun vrai composant enfant n'est éligible : un enfant sans règles
 * n'est pas une dépendance, donc rien ne l'écarte de l'élection, et ses
 * propriétés entrent dans le contrat du parent. Les poser en règles ferait
 * documenter au designer l'API du voisin, sous le nom du parent.
 *
 * `stateModel` n'est pas filtré : son axe vient des variants du composant
 * sélectionné, jamais d'un wrapper.
 */
export function restreindreAuParent(
  contrat: ContratLu,
  clesDuParent: ReadonlySet<string>,
): ContratLu {
  const props = Object.fromEntries(
    Object.entries(contrat.props ?? {}).filter(([cle]) => clesDuParent.has(cle)),
  );
  return { props, stateModel: contrat.stateModel };
}

/**
 * Une règle à poser, ou un séparateur. `cible` est le texte du calque `prop` ;
 * son absence dit que la règle n'en écrit aucun, et que le calque garde le
 * texte d'aide du maître.
 */
export type ElementDeModele =
  | { genre: 'regle'; tag: RuleTag; cible?: string }
  | { genre: 'separateur' };

/** Les éléments d'une section, dans l'ordre où le template les pose. */
export type SectionDeModele = { tag: RuleTag; elements: ElementDeModele[] };

/** Le contenu complet d'un conteneur de règles, avant toute écriture. */
export type ModeleDeRegles = { nom: string; sections: SectionDeModele[] };

/**
 * Les cibles `@prop`, un groupe par axe : les axes d'API dans l'ordre de
 * `props`, puis l'axe d'états.
 *
 * La clé lue est celle que le contrat publie, jamais le nom Figma : un axe que
 * la couche sémantique a renommé en `size` ne se retrouve plus sous `Scale`,
 * et la règle posée ne documenterait personne.
 */
function groupesDeCibles(contrat: ContratLu): string[][] {
  const groupes: string[][] = [];
  for (const [cle, prop] of Object.entries(contrat.props ?? {})) {
    if (prop.type !== 'enum' || prop.values.length === 0) continue;
    groupes.push(prop.values.map((valeur) => `${cle}.${valeur}`));
  }
  const etats = contrat.stateModel;
  if (etats) {
    const valeurs = Object.keys(etats.states);
    if (valeurs.length > 0) groupes.push(valeurs.map((etat) => `${etats.axis}.${etat}`));
  }
  return groupes;
}

/** Les règles d'un groupe, séparées du groupe précédent par un `divider`. */
function reglesDesGroupes(groupes: string[][]): ElementDeModele[] {
  const elements: ElementDeModele[] = [];
  for (const groupe of groupes) {
    if (elements.length > 0) elements.push({ genre: 'separateur' });
    for (const cible of groupe) elements.push({ genre: 'regle', tag: 'prop', cible });
  }
  return elements;
}

/**
 * Les clés des boolean properties à documenter.
 *
 * `disabled` fabriquée depuis la valeur Disable de l'axe d'états n'en est pas
 * une : sa documentation appartient à la règle `@prop` de cet état, et deux
 * règles pour un même fait se contrediraient.
 */
function clesBooleennes(contrat: ContratLu): string[] {
  const etats = contrat.stateModel;
  const desactiveVientDeLAxe = etats !== undefined
    && Object.keys(etats.states).some(isDisabledStateValue);
  return Object.entries(contrat.props ?? {})
    .filter(([cle, prop]) =>
      prop.type === 'boolean' && !(desactiveVientDeLAxe && isDisabledStateValue(cle)))
    .map(([cle]) => cle);
}

/** Le modèle des règles d'un composant, tel que le template le posera. */
export function modeleDeRegles(nom: string, contrat: ContratLu): ModeleDeRegles {
  const sections: SectionDeModele[] = [
    { tag: 'usage', elements: [{ genre: 'regle', tag: 'usage' }] },
  ];

  const groupes = groupesDeCibles(contrat);
  if (groupes.length > 0) sections.push({ tag: 'prop', elements: reglesDesGroupes(groupes) });

  const booleennes = clesBooleennes(contrat);
  if (booleennes.length > 0) {
    sections.push({
      tag: 'boolean',
      elements: booleennes.map((cible) => ({ genre: 'regle', tag: 'boolean', cible })),
    });
  }

  // La section des icônes est posée même sans icône : le designer y nomme le
  // calque d'un dessin que l'analyse signale ensuite comme non déclaré.
  sections.push({ tag: 'icons', elements: [{ genre: 'regle', tag: 'icons' }] });
  return { nom, sections };
}

/** Le nombre de règles du modèle, séparateurs exclus. */
export function nombreDeRegles(modele: ModeleDeRegles): number {
  return modele.sections
    .flatMap((section) => section.elements)
    .filter((element) => element.genre === 'regle').length;
}
