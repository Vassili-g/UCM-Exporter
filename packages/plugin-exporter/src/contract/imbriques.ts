/**
 * Les composants imbriqués qui attendent leurs règles d'usage, et le point
 * bloquant qui le dit.
 *
 * Unique définition de « ce composant imbriqué attend ses règles » : publié (ni
 * `.` ni `_` en tête de son nom), sans conteneur de règles, et qui n'est pas une
 * icône. L'export la consulte deux fois : pour publier le point en tête de
 * `meta.diagnostics`, et pour taire les dessins internes de ces composants, dont
 * le point dit déjà la cause. La création des règles lit le relevé que l'export
 * lui rend.
 *
 * Le module est synchrone : les maîtres viennent de `scanComposedMatrix`, qui
 * les a lus une fois pour toute la matrice.
 */
import { compactName } from './extractRules';
import { getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import { noter, pousserNote } from './localisation';
import type { PointACorriger } from './localisation';
import { extractContractPropertyModel } from './parsers';
import { estUnDessinNonDeclare } from './structureTree';

/** Un composant imbriqué sans règles, ses propriétés et ses instances. */
export type ImbriqueSansRegles = {
  nom: string;
  /** Vrai d'un composant venu d'une bibliothèque : ses règles vivent ailleurs. */
  distant: boolean;
  cles: string[];
  nodeIds: string[];
};

/** Ce que le parcours du composant exporté apprend de ses imbriqués. */
export type ReleveDesImbriques = {
  /** Ce que sa propre architecture lui prête : à lui de le documenter. */
  auParent: string[];
  /** Un composant publié sans règles, un groupe par composant. */
  sansRegles: ImbriqueSansRegles[];
  /** Ce qu'aucun imbriqué lisible ne revendique. */
  sansPorteur: string[];
};

/**
 * Vrai d'un composant que Figma ne publie pas dans la bibliothèque.
 *
 * Figma retient de la bibliothèque tout composant dont le nom commence par un
 * point ou un tiret bas, et le design system s'en sert pour ses pièces
 * internes : un wrapper de dimensions, une coquille de mise en page. Personne
 * ne peut en poser une instance seule, donc aucune n'aura jamais de contrat ni
 * de règles à elle.
 *
 * Le nom, plutôt que `getPublishStatusAsync` : sur une bibliothèque jamais
 * publiée, ou sur une copie de travail, l'API dit tout le monde non publié, et
 * le vrai défaut (un composant à part entière absorbé faute de règles) passerait
 * alors sous silence.
 */
export function estUnePieceInterne(nom: string): boolean {
  const premier = nom.trimStart().charAt(0);
  return premier === '.' || premier === '_';
}

/**
 * Le composant nommé dont une instance est une occurrence : son component set
 * quand elle en a un, son maître sinon.
 *
 * Le set porte le nom que le designer lit, alors que le variant porte
 * « Size=Small », et Figma refuse `componentPropertyDefinitions` sur un variant.
 */
function porteurDuMaitre(main: ComponentNode): ComponentNode | ComponentSetNode {
  return main.parent?.type === 'COMPONENT_SET' ? main.parent : main;
}

/**
 * Les clés publiques qu'un composant déclare, ou `null` si la lecture échoue.
 *
 * La comparaison passe par `extractContractPropertyModel`, comme pour le
 * parent : un axe renommé par la couche sémantique porte des deux côtés sa clé
 * publiée.
 */
function clesDeclareesParLePorteur(
  porteur: ComponentNode | ComponentSetNode,
): string[] | null {
  try {
    const { props } = extractContractPropertyModel(porteur.componentPropertyDefinitions, []);
    return Object.keys(props);
  } catch {
    return null;
  }
}

/**
 * Ce qu'une instance imbriquée est, vue du composant exporté.
 *
 * `composant` nomme le composant publié le plus proche d'elle sur le chemin,
 * elle comprise : c'est lui qui possède ce qu'elle déclare. Le plus proche, et
 * non le plus extérieur, pour qu'un Button rangé dans un Alert reste un Button
 * et garde son propre geste.
 *
 * `null` dit que le chemin n'est fait que de pièces internes, et que le
 * composant exporté possède donc ce qu'elle déclare. Le nom seul ne suffit pas
 * à le dire : la même pièce interne se rencontre à deux profondeurs, dans le
 * composant exporté où elle est à lui, et dans un composant publié où elle est
 * à celui-là.
 *
 * `'elaguee'` dit qu'un composant publié qui a ses règles l'abrite : le contrat
 * s'arrête à cette dépendance et ne décrit rien de ce qu'elle contient.
 *
 * `'illisible'` dit qu'un maillon ne se laisse pas lire. Figma annonce parfois
 * un node qu'il ne sert plus, et un chemin incertain ne fait pas documenter au
 * parent ce qui n'est peut-être pas à lui.
 */
type Appartenance =
  | {
      composant: ComponentNode | ComponentSetNode;
      /**
       * L'instance de ce composant sur le chemin. Le verdict d'icône se prend
       * sur son sous-arbre : sans elle, une pièce interne ferait juger le
       * composant qui l'abrite sur le contenu du wrapper.
       */
      maillon: InstanceNode;
    }
  | null
  | 'elaguee'
  | 'illisible';

function aQuiAppartient(
  instance: InstanceNode,
  composant: ComponentNode | ComponentSetNode,
  porteurs: ReadonlyMap<string, ComponentNode | ComponentSetNode>,
  contractes: ReadonlySet<string>,
): Appartenance {
  const chaine: InstanceNode[] = [];
  try {
    let courant: BaseNode | null = instance;
    while (courant && courant.id !== composant.id) {
      if (courant.type === 'INSTANCE') chaine.unshift(courant);
      courant = courant.parent;
    }
  } catch {
    return 'illisible';
  }
  let proche: { composant: ComponentNode | ComponentSetNode; maillon: InstanceNode } | null = null;
  for (const maillon of chaine) {
    const porteur = porteurs.get(maillon.id);
    if (!porteur) return 'illisible';
    if (estUnePieceInterne(porteur.name)) continue;
    if (contractes.has(compactName(porteur.name))) return 'elaguee';
    proche = { composant: porteur, maillon };
  }
  return proche;
}

/**
 * Vrai d'un imbriqué qui est une icône, donc qui n'aura jamais de règles.
 *
 * Deux conditions, et aucune ne suffit seule. Il ne déclare **aucune propriété
 * publique** : une icône de jeu n'a pas d'API, alors qu'un `TileLink` sans
 * texte déclare `variant` et `chessName`. Et son sous-arbre **n'est qu'un
 * dessin**, au sens où le moteur l'entend déjà : un séparateur fait de
 * rectangles ne déclare rien non plus, et le contrat en décrit bien les
 * internes.
 *
 * Lui réclamer ses propres règles ne serait pas seulement un geste inutile.
 * Le conteneur posé le ferait entrer dans les contractés, son entrée `icons`
 * quitterait le contrat au profit d'une dépendance, et l'avertissement qui
 * demande une règle `@icons` se tairait : le designer fabriquerait un contrat
 * faux en croyant corriger celui-ci.
 *
 * Un porteur dont la lecture lève n'est jamais écarté : ne rien savoir n'est
 * pas savoir qu'il n'y a rien.
 */
function estUneIcone(
  maillon: InstanceNode,
  porteur: ComponentNode | ComponentSetNode,
  composed: ComposedInstances,
): boolean {
  const declarees = clesDeclareesParLePorteur(porteur);
  if (declarees === null || declarees.length > 0) return false;
  return estUnDessinNonDeclare(maillon, new Set(), composed);
}

/** Ce que le relevé lit de l'export en cours. */
export type SourcesDuReleve = {
  /** Le composant exporté : le set, ou le composant seul. */
  composant: ComponentNode | ComponentSetNode;
  /**
   * Les racines de la matrice, dans son ordre. Chacune est parcourue seule :
   * `getAllNodes` sur le set élaguerait un variant masqué, que le contrat
   * exporte pourtant.
   */
  variants: readonly SceneNode[];
  /** Le maître de chaque instance de la matrice, lu par `scanComposedMatrix`. */
  maitres: ReadonlyMap<string, ComponentNode>;
  /** Les noms compactés des composants qui ont leurs règles dans le document. */
  contractes: ReadonlySet<string>;
  composed: ComposedInstances;
  /** Les clés que le contrat publie sans que le composant exporté les déclare. */
  horsDuParent: readonly string[];
};

/**
 * Ce que le composant exporté abrite : les propriétés que sa propre
 * architecture lui prête, et les composants publiés qui n'ont pas leurs règles.
 *
 * Le parcours part des composants eux-mêmes, pas des propriétés absorbées par
 * le contrat : chacun de ceux qui n'ont pas leurs règles est un composant que le
 * contrat du parent décrira par ses internes, au lieu de le réutiliser, et
 * chacun demande le même geste au designer.
 *
 * Les propriétés d'un composant sans règles sont celles qu'il déclare et celles
 * que déclarent ses propres pièces internes : c'est sa surface publiée, et pas
 * une ligne n'en est documentée tant qu'il n'a pas de conteneur.
 *
 * Ce qu'un composant contracté abrite est élagué. `getAllNodes` élague les
 * sous-arbres statiquement masqués, comme le fait le contrat : un composant que
 * personne ne rendra ne demande aucun geste.
 */
export function releverLesImbriques(sources: SourcesDuReleve): ReleveDesImbriques {
  const { composant, maitres, contractes, composed, horsDuParent } = sources;
  const restantes = new Set(horsDuParent);
  const instances = sources.variants.flatMap((variant) => getAllNodes(variant).filter(
    (node): node is InstanceNode => node.type === 'INSTANCE',
  ));
  const porteurs = new Map<string, ComponentNode | ComponentSetNode>();
  for (const instance of instances) {
    const main = maitres.get(instance.id);
    if (main) porteurs.set(instance.id, porteurDuMaitre(main));
  }

  const auParent: string[] = [];
  const sansRegles: ImbriqueSansRegles[] = [];
  const parComposant = new Map<string, ImbriqueSansRegles | 'icone'>();
  const sansPorteur: string[] = [];
  for (const instance of instances) {
    const porteur = porteurs.get(instance.id);
    if (!porteur) continue;
    const appartenance = aQuiAppartient(instance, composant, porteurs, contractes);
    if (appartenance === 'elaguee') continue;
    const declarees = clesDeclareesParLePorteur(porteur) ?? [];
    for (const cle of declarees) restantes.delete(cle);

    if (appartenance === 'illisible') {
      sansPorteur.push(...declarees.filter((cle) => horsDuParent.includes(cle)));
      continue;
    }
    if (appartenance === null) {
      auParent.push(...declarees.filter((cle) => horsDuParent.includes(cle)));
      continue;
    }
    const proprietaire = appartenance.composant;
    const connu = parComposant.get(proprietaire.id);
    if (connu === 'icone') continue;
    if (connu) {
      for (const cle of declarees) if (!connu.cles.includes(cle)) connu.cles.push(cle);
      continue;
    }
    // Le verdict porte sur le composant, pas sur l'instance : il se prend une
    // fois, à l'ouverture du groupe, et vaut pour toutes ses instances.
    if (estUneIcone(appartenance.maillon, proprietaire, composed)) {
      parComposant.set(proprietaire.id, 'icone');
      continue;
    }
    // Toutes ses instances que rien de publié n'abrite : la carte offre d'aller
    // les voir, et celles qui vivent dans un autre composant publié relèvent de
    // celui-là.
    const nodeIds = instances.filter((autre) => {
      if (porteurs.get(autre.id)?.id !== proprietaire.id) return false;
      const sienne = aQuiAppartient(autre, composant, porteurs, contractes);
      return typeof sienne === 'object' && sienne !== null && sienne.composant === proprietaire;
    }).map((autre) => autre.id);
    const groupe: ImbriqueSansRegles = {
      nom: proprietaire.name,
      distant: proprietaire.remote === true,
      cles: [...declarees],
      nodeIds,
    };
    parComposant.set(proprietaire.id, groupe);
    sansRegles.push(groupe);
  }
  return { auParent, sansRegles, sansPorteur: [...sansPorteur, ...restantes] };
}

/** Un point bloquant et les nodes que sa carte sélectionne. */
export type PointDImbrique = { point: PointACorriger; nodeIds: readonly string[] };

/**
 * Les points bloquants du composant exporté : un par composant imbriqué qui
 * n'a pas ses règles, puis un dernier pour ce qui n'a pas de porteur.
 *
 * Un point par composant plutôt qu'une liste unique : le geste qu'il demande
 * vise un composant, et dix composants donneraient dix gestes noyés dans une
 * seule phrase.
 *
 * Le titre nomme les deux composants et le manque, parce que le designer a
 * sélectionné l'un et doit agir sur l'autre. Les propriétés viennent en liste :
 * il va les relever une à une dans Figma. Le point sans porteur cible le
 * composant exporté, seul node qu'il puisse nommer.
 */
export function pointsDesImbriques(
  composant: ComponentNode | ComponentSetNode,
  releve: ReleveDesImbriques,
): PointDImbrique[] {
  const parent = composant.name;
  const points: PointDImbrique[] = releve.sansRegles.map(({ nom, distant, cles, nodeIds }) => {
    const compte = cles.length === 1
      ? 'dont une propriété n’est pas documentée'
      : `dont ${cles.length} propriétés ne sont pas documentées`;
    return {
      point: {
        severite: 'danger',
        titre: cles.length === 0
          ? `Le composant « ${parent} » intègre « ${nom} », qui n’a pas ses règles d’usage.`
          : `Le composant « ${parent} » intègre « ${nom} », ${compte} :`,
        ...(cles.length > 0 ? { elements: [...cles] } : {}),
        impact: `Le contrat de « ${parent} » décrit les calques de « ${nom} » sans indiquer `
          + `qu’il faut réutiliser ce composant.`,
        // Un composant venu d'une bibliothèque ne peut pas recevoir son conteneur
        // ici : le geste demandé serait impossible à faire dans ce fichier.
        action: distant
          ? `Dans le fichier de la bibliothèque, créez et complétez les règles de « ${nom} ». `
            + `Republiez la bibliothèque, puis relancez l’analyse de « ${parent} ».`
          : `Sélectionnez le composant principal « ${nom} », puis créez et complétez ses règles `
            + `d’usage. Relancez ensuite l’analyse de « ${parent} ».`,
      },
      nodeIds,
    };
  });

  const orphelines = releve.sansPorteur;
  if (orphelines.length === 0) return points;
  const uneSeule = orphelines.length === 1;
  const compte = uneSeule
    ? `Une propriété de « ${parent} » n’est pas documentée`
    : `${orphelines.length} propriétés de « ${parent} » ne sont pas documentées`;
  const porte = uneSeule ? 'qui la porte' : 'qui les porte';
  points.push({
    point: {
      severite: 'danger',
      titre: `${compte}. Le composant imbriqué ${porte} n’a pas pu être identifié :`,
      elements: [...orphelines],
      impact: uneSeule
        ? `Le contrat de « ${parent} » la publie comme si elle était la sienne.`
        : `Le contrat de « ${parent} » les publie comme si elles étaient les siennes.`,
      action: `Recherchez ces propriétés dans les composants imbriqués de « ${parent} » et `
        + `complétez leurs règles d’usage. Relancez ensuite l’analyse.`,
    },
    nodeIds: [composant.id],
  });
  return points;
}

/**
 * Pousse les points bloquants dans un canal, chacun avec toutes ses instances.
 *
 * `pousserNote` n'inscrit qu'un node : les autres s'ajoutent par `noter`, sans
 * quoi la carte ne sélectionnerait qu'une instance sur dix.
 */
export function pousserLesImbriques(
  canal: string[],
  composant: ComponentNode | ComponentSetNode,
  releve: ReleveDesImbriques,
): void {
  for (const { point, nodeIds } of pointsDesImbriques(composant, releve)) {
    const [premier, ...autres] = nodeIds;
    const message = pousserNote(canal, point, { texte: '', nodeId: premier });
    for (const nodeId of autres) noter(canal, message, { texte: '', nodeId });
  }
}

/**
 * Les instances d'imbriqués sans règles, par canal.
 *
 * Le point bloquant dit la cause ; les dessins de ces composants n'en sont que
 * la conséquence, et leurs messages l'enterreraient. `describeNode` consulte ce
 * relevé avant d'avertir sur un dessin. Il est indexé par canal, comme les
 * racines de variant de `localisation.ts`, pour ne pas ajouter un paramètre à
 * une récursion qui en porte déjà treize.
 */
const imbriquesATaire = new WeakMap<readonly string[], ReadonlySet<string>>();

/** Déclare, pour ce canal, les instances dont les dessins se taisent. */
export function declarerLesImbriquesSansRegles(
  canal: readonly string[],
  releve: ReleveDesImbriques,
): void {
  imbriquesATaire.set(canal, new Set(releve.sansRegles.flatMap((groupe) => groupe.nodeIds)));
}

/**
 * Vrai si ce node, ou l'un de ses ancêtres, est une instance d'un imbriqué
 * sans règles déclarée pour ce canal.
 *
 * Un ancêtre illisible arrête la remontée sans rien taire : ne rien savoir
 * n'est pas savoir que le dessin appartient à un autre composant.
 */
export function sousUnImbriqueSansRegles(canal: readonly string[], node: SceneNode): boolean {
  const ids = imbriquesATaire.get(canal);
  if (!ids || ids.size === 0) return false;
  try {
    let courant: BaseNode | null = node;
    while (courant) {
      if (ids.has(courant.id)) return true;
      courant = courant.parent;
    }
  } catch {
    return false;
  }
  return false;
}
