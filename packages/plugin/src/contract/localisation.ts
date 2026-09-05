/**
 * OÙ, dans Figma, se trouve ce dont un diagnostic parle.
 *
 * Un message d'export nomme son sujet en toutes lettres — « Layer « Badge » :
 * … » — et le designer doit ensuite le retrouver à la main dans une matrice de
 * trente variants. Ce module porte de quoi le lui montrer : le node du SUJET,
 * joint au message qui le nomme.
 *
 * **Ce qu'il ne fait pas, et c'est une frontière du format (U4.3).** L'id
 * relevé ici ne rejoint JAMAIS le contrat publié : `meta.diagnostics` n'a pas
 * de champ `figma`, et une loi de `tests/lois.ts` le refuse. La localisation ne
 * traverse que la frontière sandbox ↔ UI, où elle sert un clic, pas un
 * artefact.
 *
 * ## Pourquoi un registre plutôt qu'un canal typé
 *
 * L'évidence serait de faire porter l'id par le message lui-même — un
 * `{ message, nodeId }` au lieu d'une `string`. Elle est fausse ici, et la
 * raison est mesurable : **le TEXTE d'un message est déjà son identité.**
 * Quatre mécanismes en vivent — le dédoublonnage final d'`exportComponent`,
 * celui de `composedComponents`, le `pushOnce` d'`exportableNodes`, et les deux
 * classificateurs qui décident le `code` publié de chaque diagnostic. Un `Set`
 * d'objets ne déduplique rien : un composant de trente variants imprimerait
 * trente fois le même avertissement dans le corps de la pull request, ce que le
 * commentaire de `composedComponents` explique avoir voulu éviter.
 *
 * La même mesure absout ce registre. Deux calques qui produisent le même texte
 * sont DÉJÀ fondus en un seul constat : il n'y a donc jamais qu'un id à porter
 * pour un message donné, et « le premier qui a écrit ce texte » est exactement
 * la réponse que le dédoublonnage donne déjà.
 *
 * ## Pourquoi indexé par le canal, et non par module
 *
 * Un registre au niveau du module serait de l'état mutable sans propriétaire,
 * qu'il faudrait vider au début de chaque export — un rituel dont l'oubli
 * serait muet. Celui-ci est indexé par le TABLEAU d'accumulation lui-même, que
 * les sites d'émission reçoivent déjà : aucun paramètre nouveau ne traverse
 * vingt modules, rien ne survit à l'export, et deux exports concurrents ne
 * peuvent pas se contaminer.
 *
 * Son prix est réel et vaut d'être écrit : les canaux sont recopiés et
 * fusionnés en plusieurs endroits, et chaque recopie doit reporter son
 * registre par `reporterLocalisations`. Un oubli y est silencieux — d'où la loi
 * qui l'accompagne, dont c'est tout l'objet.
 */

/** Un canal d'accumulation de messages. L'identité du tableau est la clé. */
type Canal = readonly string[];

/** Ce que Figma nous donne d'un node, et tout ce dont ce module a besoin. */
type NodeLocalisable = { readonly id: string; readonly name: string };

/**
 * Les sujets qui désignent un node, et EUX SEULS.
 *
 * `CONTRIBUTING.md` prescrit la forme « {Élément Figma} : {constat}. {action}. »
 * pour tout message destiné au designer. L'élément peut être un calque, mais
 * aussi un text style, une component property, une variable ou une règle — et
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
   * Le message ne tient qu'un NOM, pas un node — la valeur vient d'un type
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
  /** Le sujet nommé n'existe pas dans le composant — c'est ce que le message dit. */
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
 * Les trois parties d'un point à corriger, telles que le designer les lit
 * (U4.8).
 *
 * **Pourquoi trois et pas une phrase.** `CONTRIBUTING.md` exige depuis toujours
 * qu'un avertissement dise OÙ, QUOI et COMMENT. La règle était tenue à la main,
 * dans une `string` que chaque site concaténait — donc invérifiable, et
 * indécoupable à l'arrivée : l'interface ne pouvait qu'afficher un paragraphe
 * où le geste se lisait en dernier, après deux phrases de contexte. Les trois
 * parties voyagent maintenant séparées du moteur jusqu'à l'UI, qui les met en
 * page ; et une loi refuse un message dont l'une manque.
 *
 * La phrase compacte — celle que `meta.diagnostics` publie et que la pull
 * request liste — se DÉRIVE de ces parties, elle n'est pas rédigée une seconde
 * fois. C'est ce qui garantit que les deux disent la même chose.
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

/** La phrase compacte, DÉRIVÉE des parties. Unique autorité sur cette jonction. */
export function phraseDe(point: PointACorriger): string {
  return `${point.titre} ${point.impact} ${point.action}`;
}

const registres = new WeakMap<Canal, Map<string, string>>();

/**
 * Les parties de chaque message, indexées par sa phrase compacte.
 *
 * Même mécanisme et même raison que le registre des cibles ci-dessus : le TEXTE
 * reste l'identité d'un message, parce que quatre dédoublonnages en vivent. Un
 * canal d'objets ne déduplique rien.
 */
const parties = new WeakMap<Canal, Map<string, PointACorriger>>();

/**
 * Les messages qui nomment un élément sans pouvoir le localiser, et pourquoi.
 *
 * Séparé du registre des cibles, parce que ce n'est pas la même information :
 * l'un dit « voici où regarder », l'autre dit « il n'y a nulle part où
 * regarder, et voici pourquoi ». Les confondre — un id vide, un `null` — ferait
 * lire une absence décidée comme un site oublié, ce que la loi de couverture
 * existe précisément pour distinguer.
 */
const declarations = new WeakMap<Canal, Map<string, RaisonSansNode>>();

const registreDe = (canal: Canal): Map<string, string> => {
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
 * recopie à la main, et un site recopié est un site sans localisation — la
 * loi serait vraie sur les sites qu'on a pensé à convertir, ce qui ne prouve
 * rien.
 */
export function sujet(genre: SujetLocalisable, node: NodeLocalisable): Sujet {
  return { texte: `${genre} « ${node.name} »`, nodeId: node.id };
}

/**
 * Un sujet dont le nom AFFICHÉ n'est pas celui du node.
 *
 * Le cas existe et n'est pas une bizarrerie : la reconnaissance d'un conteneur
 * de règles tolère la casse et les espaces, si bien que le frame trouvé peut
 * s'appeler « button-rules » quand le message doit nommer « Button-Rules », la
 * forme canonique que le designer doit écrire. Afficher `node.name` dirait au
 * designer que son nom est déjà bon.
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
 * Enregistre où vit le sujet d'un message déjà formé.
 *
 * Le premier inscrit gagne : deux calques qui produisent le même texte ne
 * donnent qu'un constat, donc qu'une cible. Choisir le premier plutôt que le
 * dernier n'a rien d'arbitraire — c'est l'ordre que le dédoublonnage retient
 * déjà.
 */
export function noter(canal: Canal, message: string, sujetDuMessage: Sujet): string {
  const registre = registreDe(canal);
  if (!registre.has(message)) registre.set(message, sujetDuMessage.nodeId);
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
 * Pousse un point dont le sujet ne désigne AUCUN node localisable.
 *
 * Un text style, une variable, une component property, une règle : le message
 * les nomme en toutes lettres, mais aucun clic ne peut y mener. Il porte les
 * mêmes trois parties que les autres — l'absence de cible ne dispense de rien.
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
 * Pousse un message DÉJÀ FORMÉ dans son canal, et retient où regarder.
 *
 * `pousserLocalise` couvre le cas courant — le message commence par son sujet.
 * Celui-ci couvre les autres, et ils existent : un constat d'agrégat nomme un
 * variant EXEMPLE au milieu de sa phrase, un message dont le sujet est une
 * component property nomme dans son corps le calque qui la référence. Dans les
 * deux cas la phrase montre un node du doigt, et le clic doit y mener.
 *
 * Ce n'est pas une porte dérobée à la convention de préfixe : le test de source
 * refuse toujours qu'un `Layer « … »` s'écrive ailleurs qu'ici. Ce helper sert
 * les messages qui n'ont PAS cette forme, et qui doivent quand même conduire
 * quelque part.
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
 * l'exécution — elle existe pour que la loi de couverture, et la revue qui
 * l'accompagne, sachent que l'absence de cible est DÉCIDÉE.
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
 * dédoublonné : sans cela le message arrive à destination et son id reste
 * derrière. Ne reporte que ce que la cible ne connaît pas déjà, pour que la
 * règle du premier inscrit traverse les fusions.
 */
export function reporterLocalisations(source: Canal, cible: Canal): void {
  const depuis = registres.get(source);
  if (depuis && depuis.size > 0) {
    const vers = registreDe(cible);
    for (const [message, nodeId] of depuis) {
      if (!vers.has(message)) vers.set(message, nodeId);
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
 * Ce que ce canal sait localiser, message par message.
 *
 * Rendu en copie : le registre est un relevé interne au moteur, et un appelant
 * qui le modifierait déplacerait une cible sans passer par un site d'émission.
 */
export function localisationsDe(canal: Canal): Map<string, string> {
  return new Map(registres.get(canal) ?? []);
}
