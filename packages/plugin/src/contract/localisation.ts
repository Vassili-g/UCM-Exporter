/**
 * Associe un diagnostic à son sujet Figma et conserve séparément son titre,
 * son impact et son action jusqu'à l'interface.
 *
 * La phrase reste l'identité du dédoublonnage : les registres sont indexés par
 * texte et par tableau d'accumulation, sans état global entre exports. Une
 * phrase garde tous les nodes qui l'ont produite. Les ids ne sont jamais
 * publiés dans le contrat. Toute copie d'un canal doit appeler
 * `reporterLocalisations`, sans quoi le message arrive à l'interface sans ses
 * parties ni ses cibles.
 */

/** Un canal d'accumulation de messages. L'identité du tableau est la clé. */
type Canal = readonly string[];

/** Ce que Figma nous donne d'un node, et tout ce dont ce module a besoin. */
type NodeLocalisable = { readonly id: string; readonly name: string };

/**
 * Les sujets qui désignent un node, et eux seuls.
 *
 * `CONTRIBUTING.md` prescrit la forme « {Élément Figma} : {constat}. {action}. »
 * pour tout message destiné au designer. L'élément peut être un calque, mais
 * aussi un text style, une component property, une variable ou une règle, et
 * ceux-là ne désignent aucun node unique du composant exporté. Les quatre
 * ci-dessous sont les seuls qui en désignent un, donc les seuls qu'un clic peut
 * suivre.
 */
export type SujetLocalisable = 'Layer' | 'Variant' | 'Component Set' | 'Frame';

/** Le sujet d'un message : son texte, et le node qu'il désigne. */
export type Sujet = { readonly texte: string; readonly nodeId: string };

/**
 * Pourquoi ce sujet nomme un élément sans pouvoir le localiser.
 *
 * Une exception qui se déclare vaut mieux qu'une exception qui se constate :
 * sans ce type, un site sans node se lit exactement comme un site qu'on a
 * oublié de convertir, et la loi de couverture ne distingue plus les deux.
 */
export type RaisonSansNode =
  /**
   * Le message ne tient qu'un nom, pas un node : la valeur vient d'un type
   * publié, où l'identité d'un calque est son nom. Le node existe dans le
   * document, mais seule une recherche inverse le retrouverait.
   */
  | 'nom-publie'
  /**
   * Le sujet est un agrégat sur la matrice : le calque vit sous N ids, et le
   * message dit précisément qu'il ne tient pas la même place selon les
   * variants. Élire un id serait choisir un variant en cachette.
   */
  | 'agrege-sur-la-matrice'
  /** Le sujet nommé n'existe pas dans le composant : c'est ce que le message dit. */
  | 'inexistant';

/**
 * Le texte d'un sujet qu'on ne sait pas localiser, et la raison écrite.
 *
 * Rend la même forme que `sujet`, sans rien enregistrer. Le second argument
 * n'est lu par personne à l'exécution : il existe pour qu'un lecteur du code, et
 * la revue qui l'accompagne, sachent que l'absence de cible est décidée.
 */
export function sujetSansNode(
  genre: SujetLocalisable,
  nom: string,
  _raison: RaisonSansNode,
): string {
  return `${genre} « ${nom} »`;
}

/**
 * Les trois parties d'un point à corriger, telles que le designer les lit.
 *
 * **Pourquoi trois et pas une phrase.** `CONTRIBUTING.md` exige qu'un
 * avertissement dise où, quoi et comment. Tenue dans une `string` que chaque
 * site concaténait, la règle était invérifiable et indécoupable à l'arrivée.
 * Les trois parties voyagent donc séparées du moteur jusqu'à l'UI, qui les met
 * en page, et une loi refuse un message dont l'une manque.
 *
 * La phrase compacte que `meta.diagnostics` publie se dérive de ces parties,
 * elle n'est pas rédigée une seconde fois.
 */
export type PointACorriger = {
  /** « Layer « Border » : l'alignement du stroke est illisible. » */
  readonly titre: string;
  /** Ce que le développeur n'aura pas. Une phrase, finie par un point. */
  readonly impact: string;
  /** Le geste exact à faire dans Figma. Une phrase impérative. */
  readonly action: string;
};

/** Ce qu'un site d'émission écrit ; le titre s'y compose du sujet et du manque. */
export type Constat = {
  /**
   * Le champ Figma précisé après le sujet, quand le message en vise un :
   * « Layer « Card », padding : … ». Absent le plus souvent.
   */
  readonly champ?: string;
  /** Ce qui manque, ou ce qui est illisible. Finit par un point. */
  readonly manque: string;
  readonly impact: string;
  readonly action: string;
};

/** La phrase compacte, dérivée des parties. Unique autorité sur cette jonction. */
export function phraseDe(point: PointACorriger): string {
  return `${point.titre} ${point.impact} ${point.action}`;
}

const registres = new WeakMap<Canal, Map<string, string[]>>();

/**
 * Les parties de chaque message, indexées par sa phrase compacte.
 *
 * Même mécanisme et même raison que le registre des cibles ci-dessus : le texte
 * reste l'identité d'un message, parce que quatre dédoublonnages en vivent. Un
 * canal d'objets ne déduplique rien.
 */
const parties = new WeakMap<Canal, Map<string, PointACorriger>>();

/**
 * Les messages qui nomment un élément sans pouvoir le localiser, et pourquoi.
 *
 * Séparé du registre des cibles, parce que ce n'est pas la même information :
 * l'un dit « voici où regarder », l'autre dit « il n'y a nulle part où
 * regarder, et voici pourquoi ». Les confondre (un id vide, un `null`) ferait
 * lire une absence décidée comme un site oublié, ce que la loi de couverture
 * existe précisément pour distinguer.
 */
const declarations = new WeakMap<Canal, Map<string, RaisonSansNode>>();

const registreDe = (canal: Canal): Map<string, string[]> => {
  let registre = registres.get(canal);
  if (!registre) {
    registre = new Map();
    registres.set(canal, registre);
  }
  return registre;
};

/**
 * Le sujet d'un message, formé une seule fois pour tout le moteur.
 *
 * C'est ici, et nulle part ailleurs, que s'écrit `Layer « … »` : un test de
 * source refuse ce littéral partout ailleurs. Sans cela la convention se
 * recopie à la main, et un site recopié est un site sans localisation : la
 * loi serait vraie sur les sites qu'on a pensé à convertir, ce qui ne prouve
 * rien.
 */
export function sujet(genre: SujetLocalisable, node: NodeLocalisable): Sujet {
  return { texte: `${genre} « ${node.name} »`, nodeId: node.id };
}

/**
 * Un sujet dont le nom affiché n'est pas celui du node.
 *
 * Le cas existe et n'est pas une bizarrerie : un conteneur de règles se
 * reconnaît à un calque et non à son nom, si bien que l'instance trouvée peut
 * s'appeler « Règles du bouton » quand le message doit nommer
 * « .componentRules », le composant que le designer doit chercher dans son
 * écran. Afficher `node.name` lui ferait chercher un nom qu'il a choisi.
 *
 * Séparé de `sujet` pour que ce découplage soit un choix visible à chaque
 * appel : partout ailleurs, afficher autre chose que le nom du node serait un
 * défaut.
 */
export function sujetNomme(
  genre: SujetLocalisable,
  nom: string,
  node: NodeLocalisable,
): Sujet {
  return { texte: `${genre} « ${nom} »`, nodeId: node.id };
}

/**
 * Enregistre un node de plus pour un message déjà formé.
 *
 * Deux calques qui produisent le même texte ne donnent qu'un constat, et ce
 * constat les garde tous les deux, dans l'ordre d'émission. Avec le premier
 * seul, le designer corrige un calque, réexporte, et retrouve le même message
 * pour le suivant. Un node déjà inscrit pour cette phrase ne l'est pas deux fois.
 */
export function noter(canal: Canal, message: string, sujetDuMessage: Sujet): string {
  const registre = registreDe(canal);
  const nodeIds = registre.get(message);
  if (!nodeIds) registre.set(message, [sujetDuMessage.nodeId]);
  else if (!nodeIds.includes(sujetDuMessage.nodeId)) nodeIds.push(sujetDuMessage.nodeId);
  return message;
}

/** Enregistre les trois parties d'un message déjà formé. Premier inscrit gagne. */
export function noterLesParties(canal: Canal, point: PointACorriger): string {
  const message = phraseDe(point);
  let table = parties.get(canal);
  if (!table) {
    table = new Map();
    parties.set(canal, table);
  }
  if (!table.has(message)) table.set(message, point);
  return message;
}

/** Ce que ce canal sait découper en parties, message par message. */
export function partiesDe(canal: Canal): Map<string, PointACorriger> {
  return new Map(parties.get(canal) ?? []);
}

/**
 * Forme le message, le pousse dans son canal, et retient où regarder.
 *
 * `suite` est tout ce qui suit le sujet, ponctuation comprise : le plus souvent
 * `' : …'`, parfois `', padding : …'` quand le message précise un champ avant
 * son deux-points. Le sujet ne décide pas de cette ponctuation, sans quoi il
 * faudrait un helper par forme de message.
 */
export function pousserLocalise(
  canal: string[],
  genre: SujetLocalisable,
  node: NodeLocalisable,
  constat: Constat,
): string {
  const point = pointDe(sujet(genre, node).texte, constat);
  const message = phraseDe(point);
  canal.push(message);
  noterLesParties(canal, point);
  return noter(canal, message, sujet(genre, node));
}

/** Compose le titre d'un point : son sujet, le champ visé s'il y en a un, le manque. */
export function pointDe(sujetTexte: string, constat: Constat): PointACorriger {
  return {
    titre: `${sujetTexte}${constat.champ ? `, ${constat.champ}` : ''} : ${constat.manque}`,
    impact: constat.impact,
    action: constat.action,
  };
}

/**
 * Pousse un point dont le sujet ne désigne aucun node localisable.
 *
 * Un text style, une variable, une component property, une règle : le message
 * les nomme en toutes lettres, mais aucun clic ne peut y mener. Il porte les
 * mêmes trois parties que les autres : l'absence de cible ne dispense de rien.
 */
export function pousserSansNode(
  canal: string[],
  sujetTexte: string,
  constat: Constat,
): string {
  const point = pointDe(sujetTexte, constat);
  const message = phraseDe(point);
  canal.push(message);
  return noterLesParties(canal, point);
}

/**
 * Pousse un message déjà formé dans son canal, et retient où regarder.
 *
 * `pousserLocalise` couvre le cas courant, où le message commence par son
 * sujet. Celui-ci couvre les autres : un constat d'agrégat nomme un variant
 * exemple au milieu de sa phrase, un message dont le sujet est une component
 * property nomme dans son corps le calque qui la référence. Dans les deux cas
 * la phrase montre un node du doigt, et le clic doit y mener.
 *
 * Ce n'est pas une porte dérobée à la convention de préfixe : le test de source
 * refuse toujours qu'un `Layer « … »` s'écrive ailleurs qu'ici.
 */
export function pousserNote(
  canal: string[],
  point: PointACorriger,
  sujetDuMessage: Sujet,
): string {
  const message = phraseDe(point);
  canal.push(message);
  noterLesParties(canal, point);
  return noter(canal, message, sujetDuMessage);
}

/**
 * Déclare qu'un message nomme un élément que rien ne peut localiser.
 *
 * À employer quand le message parle bien d'un calque, mais qu'aucun node unique
 * ne lui correspond : le nom vient d'un type publié, le constat agrège toute la
 * matrice, ou l'élément nommé n'existe pas. La raison n'est lue par personne à
 * l'exécution : elle existe pour que la loi de couverture, et la revue qui
 * l'accompagne, sachent que l'absence de cible est décidée.
 */
export function noterSansNode(canal: Canal, message: string, raison: RaisonSansNode): string {
  let table = declarations.get(canal);
  if (!table) {
    table = new Map();
    declarations.set(canal, table);
  }
  if (!table.has(message)) table.set(message, raison);
  return message;
}

/** Ce que ce canal déclare ne pas savoir localiser, et pourquoi. */
export function raisonsSansNode(canal: Canal): Map<string, RaisonSansNode> {
  return new Map(declarations.get(canal) ?? []);
}

/**
 * Reporte les localisations d'un canal vers un autre.
 *
 * À appeler partout où un tableau de messages est recopié, concaténé ou
 * dédoublonné : sans cela le message arrive à destination et ses ids restent
 * derrière. Les nodes que la destination connaît gardent leur rang, ceux de la
 * source s'ajoutent à la suite, sans doublon. Parties et déclarations gardent
 * la règle du premier inscrit : une même phrase porte les mêmes parties.
 */
export function reporterLocalisations(source: Canal, cible: Canal): void {
  const depuis = registres.get(source);
  if (depuis && depuis.size > 0) {
    const vers = registreDe(cible);
    for (const [message, nodeIds] of depuis) {
      const connus = vers.get(message) ?? [];
      vers.set(message, [...connus, ...nodeIds.filter((nodeId) => !connus.includes(nodeId))]);
    }
  }
  // Les parties voyagent par le même chemin, et pour la même raison : un
  // message qui arrive sans elles se lirait comme un site jamais converti.
  const decoupes = parties.get(source);
  if (decoupes && decoupes.size > 0) {
    let table = parties.get(cible);
    if (!table) {
      table = new Map();
      parties.set(cible, table);
    }
    for (const [message, point] of decoupes) {
      if (!table.has(message)) table.set(message, point);
    }
  }
  // Les déclarations voyagent avec les cibles : une exception laissée derrière
  // se lirait à l'arrivée comme un site qu'on a oublié de convertir, ce qui est
  // exactement la confusion que ces deux tables existent pour éviter.
  const raisons = declarations.get(source);
  if (!raisons || raisons.size === 0) return;
  let table = declarations.get(cible);
  if (!table) {
    table = new Map();
    declarations.set(cible, table);
  }
  for (const [message, raison] of raisons) {
    if (!table.has(message)) table.set(message, raison);
  }
}

/**
 * Ce que ce canal sait localiser : pour chaque message, ses nodes dans l'ordre
 * où ils ont été inscrits.
 *
 * Rendu en copie, listes comprises : le registre est un relevé interne au
 * moteur, et un appelant qui le modifierait déplacerait une cible sans passer
 * par un site d'émission.
 */
export function localisationsDe(canal: Canal): Map<string, readonly string[]> {
  const copie = new Map<string, readonly string[]>();
  for (const [message, nodeIds] of registres.get(canal) ?? []) copie.set(message, [...nodeIds]);
  return copie;
}
