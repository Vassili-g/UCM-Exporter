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

const registres = new WeakMap<Canal, Map<string, string>>();

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
  suite: string,
): string {
  const message = `${sujet(genre, node).texte}${suite}`;
  canal.push(message);
  return noter(canal, message, sujet(genre, node));
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
  if (!depuis || depuis.size === 0) return;
  const vers = registreDe(cible);
  for (const [message, nodeId] of depuis) {
    if (!vers.has(message)) vers.set(message, nodeId);
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
